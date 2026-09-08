// ─────────────────────────────────────────────────────────────────────────────
// NotificationBellComponent — cloche + badge non-lus dans le topbar.
// Usage : <app-notification-bell></app-notification-bell>
// Le compteur est rafraîchi au chargement puis toutes les 30s (interval) —
// pas de websocket dans ce template, cf. notifications backend § in-app channel.
// ─────────────────────────────────────────────────────────────────────────────
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, startWith, switchMap } from 'rxjs';

import { NotificationService } from '../../services/notification.service';
import { AppNotification } from '../../models/notification.model';

const UNREAD_COUNT_POLL_MS = 30_000;
const DROPDOWN_PREVIEW_LIMIT = 5;

@Component({
  selector: 'app-notification-bell',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="nav-item dropdown">
      <button class="btn-nav-icon position-relative" data-bs-toggle="dropdown" (click)="onOpen()" title="Notifications">
        <i class="fas fa-bell"></i>
        @if (unreadCount() > 0) {
          <span class="notif-badge">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
        }
      </button>
      <div class="dropdown-menu dropdown-menu-end notif-dropdown">
        <div class="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
          <span class="fw-semibold small">Notifications</span>
          @if (unreadCount() > 0) {
            <button class="btn btn-link btn-sm p-0 text-decoration-none" (click)="markAllAsRead()">Tout marquer comme lu</button>
          }
        </div>

        @if (loading()) {
          <div class="px-3 py-4 text-center text-muted small">Chargement...</div>
        } @else if (recent().length === 0) {
          <div class="px-3 py-4 text-center text-muted small">
            <i class="fas fa-bell-slash d-block mb-2" style="font-size:1.25rem;"></i>Aucune notification
          </div>
        } @else {
          @for (notification of recent(); track notification.id) {
            <div class="dropdown-item notif-item" [class.unread]="!notification.isRead" (click)="markAsRead(notification)">
              <div class="fw-semibold small">{{ notification.title }}</div>
              <div class="text-muted text-truncate" style="font-size:.8rem;">{{ notification.body }}</div>
            </div>
          }
        }

        <div class="dropdown-divider"></div>
        <a class="dropdown-item text-center small" routerLink="/notifications">Voir toutes les notifications</a>
      </div>
    </div>
  `,
  styles: [`
    .notif-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: #dc2626;
      color: #fff;
      font-size: .65rem;
      line-height: 16px;
      text-align: center;
    }
    .notif-dropdown { width: 320px; max-height: 400px; overflow-y: auto; padding: 0; }
    .notif-item { cursor: pointer; white-space: normal; border-bottom: 1px solid var(--border-color, #eee); }
    .notif-item.unread { background: rgba(13, 110, 253, .06); }
  `],
})
export class NotificationBellComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly unreadCount = this.notificationService.unreadCount;
  recent = signal<AppNotification[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    interval(UNREAD_COUNT_POLL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.notificationService.refreshUnreadCount());
  }

  onOpen(): void {
    this.loading.set(true);
    this.notificationService.fetchRecent(DROPDOWN_PREVIEW_LIMIT).subscribe({
      next: (result) => {
        this.recent.set(result.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markAsRead(notification: AppNotification): void {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.id).subscribe(() => {
      notification.isRead = true;
      this.notificationService.refreshUnreadCount();
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.recent.update((items) => items.map((n) => ({ ...n, isRead: true })));
      this.notificationService.refreshUnreadCount();
    });
  }
}
