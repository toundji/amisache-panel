import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { EntranceService } from '../../../services/entrance.service';
import { ChurchService } from '../../../services/church.service';
import { Entrance, ENTRANCE_TYPE_LABELS, EntranceType } from '../../../models/entrance.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface EntranceFilters {
  churchId: string;
  type: EntranceType | '';
  search: string;
}

const STORAGE_KEY = 'entranceFilters';

function loadPersisted(): Partial<Pick<EntranceFilters, 'churchId' | 'type'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-entrance-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './entrance-list.component.html',
  styleUrl: './entrance-list.component.scss',
})
export class EntranceListComponent {
  readonly entranceService = inject(EntranceService);
  readonly churchService = inject(ChurchService);
  readonly pagination = inject(PaginationService);

  typeList = Object.values(EntranceType);
  typeLabels = ENTRANCE_TYPE_LABELS;

  entrances = this.entranceService.entrances;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.entrances() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<EntranceFilters>({ churchId: '', type: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => !!this.filters().churchId || !!this.filters().type || !!this.filters().search);

  filteredEntrances = computed(() => {
    const items = this.entrances() ?? [];
    const { churchId, type, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((e) => {
      if (churchId && e.churchId !== churchId) return false;
      if (type && e.type !== type) return false;
      if (term && !e.name.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  pagedEntrances = computed(() => this.pagination.slice(this.filteredEntrances()));

  private persist = effect(() => {
    const { churchId, type } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, type }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredEntrances().length);
  });

  constructor() {
    if (this.churches() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.entranceService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des entrées.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof EntranceFilters>(key: K, value: EntranceFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', type: '', search: '' });
    this.pagination.reset();
  }

  churchName(e: Entrance): string {
    return e.church?.name ?? (this.churches() ?? []).find((c) => c.id === e.churchId)?.name ?? '—';
  }

  coords(e: Entrance): string {
    const c = e.location?.coordinates;
    return c ? `${c[1].toFixed(5)}, ${c[0].toFixed(5)}` : '—';
  }

  deleteEntrance(e: Entrance): void {
    Swal.fire({
      title: 'Supprimer cette entrée ?',
      text: `« ${e.name} » sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.entranceService.delete(e.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
