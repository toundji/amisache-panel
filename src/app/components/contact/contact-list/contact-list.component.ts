import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ContactService } from '../../../services/contact.service';
import { ContactMessage, ContactMessageStatus, ListContactMessagesSortBy } from '../../../models/contact.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { BackDismissDirective } from '../../../shared/navigation/back-dismiss.directive';

interface ContactFilters {
  status: ContactMessageStatus | '';
  search: string;
  sortBy: ListContactMessagesSortBy;
  sortOrder: 'asc' | 'desc';
}

// Persisté entre visites — jamais `search`, cf. CLAUDE.md § Filtres et recherche.
type PersistedContactFilters = Pick<ContactFilters, 'status' | 'sortBy' | 'sortOrder'>;
const STORAGE_KEY = 'contactFilters';

function loadPersistedFilters(): Partial<PersistedContactFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-contact-list',
  // Instance locale — pagination propre à CETTE liste.
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, BackDismissDirective],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent {
  // Non privé : le template appelle `contactService.select(message)` avant de naviguer vers le détail.
  readonly contactService = inject(ContactService);
  readonly pagination = inject(PaginationService);

  ContactMessageStatus = ContactMessageStatus;
  statusList = Object.values(ContactMessageStatus);

  messages = this.contactService.messages;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.messages() === undefined);
  error = signal<string | null>(null);
  // Rechargement (page/filtre/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  filters = signal<ContactFilters>({
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...loadPersistedFilters(),
  });
  hasAdvancedFilters = computed(() => !!this.filters().status);

  private persistFilters = effect(() => {
    const { status, sortBy, sortOrder } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, sortBy, sortOrder }));
  });

  // Incrémenté pour forcer un rechargement de la page courante (ex: après une
  // suppression ou un clic sur "Actualiser") sans changer page/filtres.
  private reloadTrigger = signal(0);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — distingue l'overlay Swal.showLoading() des rechargements silencieux.
  private isManualRefresh = false;

  // GET /contact est paginé et trié côté serveur : on relance un fetch à chaque
  // changement de page/taille de page, de filtres/tri, ou de reloadTrigger.
  private reload = effect(() => {
    const page = this.pagination.currentPage();
    const limit = this.pagination.itemsPerPage();
    const filters = this.filters();
    this.reloadTrigger();

    const showLoader = this.isManualRefresh;
    this.isManualRefresh = false;

    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.contactService
      .list({
        page,
        limit,
        status: filters.status || undefined,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })
      .subscribe({
        next: (result) => {
          this.pagination.setTotalOnly(result.total);
          this.refreshing.set(false);
          if (showLoader) Swal.close();
        },
        error: () => {
          this.refreshing.set(false);
          this.error.set('Erreur lors du chargement des messages.');
          if (showLoader) Swal.close();
        },
      });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.forceReload();
  }

  updateFilter<K extends keyof ContactFilters>(key: K, value: ContactFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.update((f) => ({ ...f, status: '', search: '' }));
    this.pagination.reset();
  }

  toggleSort(field: ListContactMessagesSortBy): void {
    this.filters.update((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
    this.pagination.reset();
  }

  private forceReload(): void {
    this.reloadTrigger.update((v) => v + 1);
  }

  statusBadgeClass(status: ContactMessageStatus): string {
    switch (status) {
      case ContactMessageStatus.new: return 'status-warning';
      case ContactMessageStatus.read: return 'status-info';
      case ContactMessageStatus.treated: return 'status-success';
    }
  }

  deleteMessage(message: ContactMessage): void {
    Swal.fire({
      title: 'Supprimer ce message ?',
      text: `Le message de ${message.name} sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.contactService.delete(message.id).subscribe({
        next: () => this.forceReload(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
