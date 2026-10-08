import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { ApiErrorService } from '../../../services/api-error.service';
import { ApiErrorLog } from '../../../models/api-error.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({
  selector: 'app-api-error-list',
  // Instance locale — pagination propre à cette liste.
  providers: [PaginationService],
  imports: [CommonModule, PaginationComponent],
  templateUrl: './api-error-list.component.html',
  styleUrl: './api-error-list.component.scss',
})
export class ApiErrorListComponent {
  private readonly apiErrorService = inject(ApiErrorService);
  readonly pagination = inject(PaginationService);

  errors = this.apiErrorService.errors;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.errors() === undefined);
  error = signal<string | null>(null);
  // Rechargement (page/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — cf. UserListComponent pour le même besoin.
  private isManualRefresh = false;
  private reloadTrigger = signal(0);

  // GET /api-errors/admin est paginé côté serveur.
  private reload = effect(() => {
    const page = this.pagination.currentPage();
    const limit = this.pagination.itemsPerPage();
    this.reloadTrigger();

    const showLoader = this.isManualRefresh;
    this.isManualRefresh = false;

    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.apiErrorService.list({ page, limit }).subscribe({
      next: (result) => {
        this.pagination.setTotalOnly(result.total);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des erreurs.');
        if (showLoader) Swal.close();
      },
    });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.reloadTrigger.update((v) => v + 1);
  }

  statusBadgeClass(statusCode: number): string {
    return statusCode >= 500 ? 'status-disabled' : 'status-warning';
  }

  showStack(item: ApiErrorLog): void {
    Swal.fire({
      title: `Erreur ${item.errorId}`,
      html: `
        <div class="text-start small">
          <p class="mb-2"><strong>${item.method} ${item.path}</strong> — ${item.statusCode}</p>
          <p class="mb-2">${item.message}</p>
          ${item.userEmail ? `<p class="mb-2 text-muted">Utilisateur : ${item.userEmail} (${item.ip ?? 'IP inconnue'})</p>` : ''}
          <pre class="bg-light p-2 rounded" style="max-height:300px;overflow:auto;white-space:pre-wrap;">${item.stack ?? 'Pas de pile disponible.'}</pre>
        </div>
      `,
      width: 700,
      confirmButtonText: 'Fermer',
    });
  }

  delete(item: ApiErrorLog): void {
    Swal.fire({
      title: 'Supprimer cette erreur ?',
      text: `Erreur ${item.errorId} — à faire une fois corrigée.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.apiErrorService.delete(item.id).subscribe({
        next: () => this.refresh(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
