import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  ContactMessage,
  ContactMessageStatus,
  ListContactMessagesQuery,
  PaginatedContactMessages,
} from '../models/contact.model';

/**
 * Miroir de ContactController (nest-auth-base src/contact/controllers/contact.controller.ts).
 * Pas de création côté admin — les messages naissent uniquement via POST /contact
 * (formulaire public, hors panel). GET /contact est paginé côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  private messagesSignal = signal<ContactMessage[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<ContactMessage | null>(null);

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly messages = this.messagesSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  // Élément cliqué depuis la liste — stub affiché sur la page de détail le
  // temps que `getById` réponde (cf. CLAUDE.md § Pages de détail).
  readonly selected = this.selectedSignal.asReadonly();

  select(message: ContactMessage): void {
    this.selectedSignal.set(message);
  }

  list(query: ListContactMessagesQuery = {}): Observable<PaginatedContactMessages> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedContactMessages>('contact', { params }).pipe(
      tap((result) => {
        this.messagesSignal.set(result.data);
        this.paginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  getById(id: string): Observable<ContactMessage> {
    return this.http.get<ContactMessage>(`contact/${id}`);
  }

  updateStatus(
    id: string,
    body: { status: ContactMessageStatus; adminNote?: string },
  ): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`contact/${id}/status`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`contact/${id}`);
  }
}
