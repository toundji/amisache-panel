import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PublicationService } from '../../../services/publication.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import {
  Publication,
  PUBLICATION_STATUS_LABELS,
  PublicationStatus,
} from '../../../models/publication.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface PublicationFilters {
  churchId: string;
  status: PublicationStatus | '';
  search: string;
}

const STORAGE_KEY = 'publicationFilters';

function loadPersisted(): Partial<Pick<PublicationFilters, 'churchId' | 'status'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const STATUS_BADGE: Record<PublicationStatus, string> = {
  [PublicationStatus.DRAFT]: 'status-warning',
  [PublicationStatus.PUBLISHED]: 'status-success',
  [PublicationStatus.ARCHIVED]: 'status-disabled',
};

@Component({
  selector: 'app-publication-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './publication-list.component.html',
  styleUrl: './publication-list.component.scss',
})
export class PublicationListComponent {
  readonly publicationService = inject(PublicationService);
  readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);
  readonly pagination = inject(PaginationService);

  statusList = Object.values(PublicationStatus);
  statusLabels = PUBLICATION_STATUS_LABELS;

  publications = this.publicationService.publications;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.publications() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<PublicationFilters>({ churchId: '', status: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.status || !!f.search;
  });

  filtered = computed(() => {
    const items = this.publications() ?? [];
    const term = this.filters().search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((p) => `${p.title} ${this.typeName(p)}`.toLowerCase().includes(term));
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    const { churchId, status } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, status }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  private reload = effect(() => {
    const { churchId, status } = this.filters();
    this.fetch(churchId, status);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.typeService.activeForScope(TypeScope.PUBLICATION) === undefined) {
      this.typeService.listActive(TypeScope.PUBLICATION).subscribe({ error: () => undefined });
    }
  }

  private fetch(churchId: string, status: PublicationStatus | '', showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.publicationService
      .listAdmin({ churchId: churchId || undefined, status: status || undefined })
      .subscribe({
        next: () => {
          this.refreshing.set(false);
          if (showLoader) Swal.close();
        },
        error: () => {
          this.refreshing.set(false);
          this.error.set('Erreur lors du chargement des publications.');
          if (showLoader) Swal.close();
        },
      });
  }

  refresh(): void {
    const { churchId, status } = this.filters();
    this.fetch(churchId, status, true);
  }

  updateFilter<K extends keyof PublicationFilters>(key: K, value: PublicationFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', status: '', search: '' });
    this.pagination.reset();
  }

  churchName(p: Publication): string {
    return p.church?.name ?? (this.churches() ?? []).find((c) => c.id === p.churchId)?.name ?? '—';
  }

  typeName(p: Publication): string {
    return (
      p.type?.name ??
      (this.typeService.activeForScope(TypeScope.PUBLICATION) ?? []).find((t) => t.id === p.typeId)?.name ??
      '—'
    );
  }

  statusBadge(status: PublicationStatus): string {
    return STATUS_BADGE[status];
  }

  deletePublication(p: Publication): void {
    Swal.fire({
      title: 'Supprimer cette publication ?',
      text: `« ${p.title} » sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.publicationService.delete(p.id).subscribe({
        next: () => this.refresh(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
