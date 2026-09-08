import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { VillageService } from '../../../services/village.service';
import { ZoneService } from '../../../services/zone.service';
import { Village, VillageType, VILLAGE_TYPE_LABELS } from '../../../models/village.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface VillageFilters {
  zoneId: string;
  type: VillageType | '';
  search: string;
}

const STORAGE_KEY = 'villageFilters';

function loadPersisted(): Partial<Pick<VillageFilters, 'zoneId' | 'type'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-village-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './village-list.component.html',
  styleUrl: './village-list.component.scss',
})
export class VillageListComponent {
  readonly villageService = inject(VillageService);
  readonly zoneService = inject(ZoneService);
  readonly pagination = inject(PaginationService);

  villages = this.villageService.villages;
  zones = this.zoneService.zones;

  typeList = Object.values(VillageType);
  typeLabels = VILLAGE_TYPE_LABELS;

  isLoading = computed(() => this.villages() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<VillageFilters>({ zoneId: '', type: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => !!this.filters().zoneId || !!this.filters().type || !!this.filters().search);

  filteredVillages = computed(() => {
    const items = this.villages() ?? [];
    const { zoneId, type, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((v) => {
      if (zoneId && v.zoneId !== zoneId) return false;
      if (type && v.type !== type) return false;
      if (term && !v.name.toLowerCase().includes(term) && !(v.parentSub ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  });

  pagedVillages = computed(() => this.pagination.slice(this.filteredVillages()));

  private persist = effect(() => {
    const { zoneId, type } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ zoneId, type }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredVillages().length);
  });

  constructor() {
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.villageService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des villages.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof VillageFilters>(key: K, value: VillageFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ zoneId: '', type: '', search: '' });
    this.pagination.reset();
  }

  zoneLabel(id: string): string {
    return (this.zones() ?? []).find((z) => z.id === id)?.name ?? '—';
  }

  deleteVillage(village: Village): void {
    Swal.fire({
      title: 'Supprimer ce village/quartier ?',
      text: `« ${village.name} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.villageService.delete(village.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
