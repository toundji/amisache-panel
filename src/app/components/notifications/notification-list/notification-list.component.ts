import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { NotificationService } from '../../../services/notification.service';
import { AppNotification } from '../../../models/notification.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({
  selector: 'app-notification-list',
  // Instance locale — pagination propre à CETTE liste.
  providers: [PaginationService],
  imports: [CommonModule, PaginationComponent],
  templateUrl: './notification-list.component.html',
  styleUrl: './notification-list.component.scss',
})
export class NotificationListComponent {
  readonly notificationService = inject(NotificationService);
  readonly pagination = inject(PaginationService);

  notifications = this.notificationService.notifications;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.notifications() === undefined);
  error = signal<string | null>(null);
  // Rechargement (page/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  hasUnread = computed(() => (this.notifications() ?? []).some((n) => !n.isRead));

  // Incrémenté pour forcer un rechargement de la page courante (ex: après une
  // action ou un clic sur "Actualiser") — cf. UserListComponent.
  private reloadTrigger = signal(0);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — cf. UserListComponent pour la même distinction.
  private isManualRefresh = false;

  // GET /notifications est paginé côté serveur : on relance un fetch à chaque
  // changement de page/taille de page ou de reloadTrigger (lus ici → dépendance réactive).
  private reload = effect(() => {
    const page = this.pagination.currentPage();
    const limit = this.pagination.itemsPerPage();
    this.reloadTrigger();

    const showLoader = this.isManualRefresh;
    this.isManualRefresh = false;

    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.notificationService.list({ page, limit }).subscribe({
      next: (result) => {
        this.pagination.setTotalOnly(result.total);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des notifications.');
        if (showLoader) Swal.close();
      },
    });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.forceReload();
  }

  private forceReload(): void {
    this.reloadTrigger.update((v) => v + 1);
  }

  markAsRead(notification: AppNotification): void {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.forceReload();
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Impossible de marquer comme lu.', 'error'),
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.forceReload();
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error'),
    });
  }

  dismiss(notification: AppNotification): void {
    this.notificationService.dismiss(notification.id).subscribe({
      next: () => {
        this.forceReload();
        this.notificationService.refreshUnreadCount();
      },
      error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
    });
  }
}
