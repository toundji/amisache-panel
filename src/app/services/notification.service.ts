import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AppNotification, ListNotificationsQuery, PaginatedNotifications } from '../models/notification.model';

/**
 * Miroir de NotificationController (nest-auth-base src/notifications/controllers/notification.controller.ts).
 * Liste fusionnée (ciblées + groupe), paginée côté serveur — même pattern que UserService.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  private notificationsSignal = signal<AppNotification[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private unreadCountSignal = signal(0);

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();

  list(query: ListNotificationsQuery = {}): Observable<PaginatedNotifications> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedNotifications>('notifications', { params }).pipe(
      tap((result) => {
        this.notificationsSignal.set(result.data);
        this.paginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  refreshUnreadCount(): void {
    this.http.get<number>('notifications/unread-count').subscribe((count) => this.unreadCountSignal.set(count));
  }

  /**
   * Variante sans effet de bord sur `notifications`/`paginationMeta` — utilisée
   * par le dropdown du topbar (NotificationBellComponent), qui ne doit pas
   * écraser l'état de la page /notifications si les deux sont montés en même temps.
   */
  fetchRecent(limit: number): Observable<PaginatedNotifications> {
    const params = new HttpParams().set('page', 1).set('limit', limit);
    return this.http.get<PaginatedNotifications>('notifications', { params });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>('notifications/read-all', {});
  }

  /** Ciblée -> suppression. Groupe -> masquée (dismiss côté backend). */
  dismiss(id: string): Observable<void> {
    return this.http.delete<void>(`notifications/${id}`);
  }
}
