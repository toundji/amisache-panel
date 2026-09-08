import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ZoneService } from '../../../services/zone.service';
import { RegionService } from '../../../services/region.service';
import { Zone } from '../../../models/zone.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface ZoneFilters {
  regionId: string;
  search: string;
}

const STORAGE_KEY = 'zoneFilters';

function loadPersisted(): Partial<Pick<ZoneFilters, 'regionId'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-zone-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './zone-list.component.html',
  styleUrl: './zone-list.component.scss',
})
export class ZoneListComponent {
  readonly zoneService = inject(ZoneService);
  readonly regionService = inject(RegionService);
  readonly pagination = inject(PaginationService);

  zones = this.zoneService.zones;
  regions = this.regionService.regions;

  isLoading = computed(() => this.zones() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<ZoneFilters>({ regionId: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => !!this.filters().regionId || !!this.filters().search);

  filteredZones = computed(() => {
    const items = this.zones() ?? [];
    const { regionId, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((z) => {
      if (regionId && z.regionId !== regionId) return false;
      if (term && !z.name.toLowerCase().includes(term) && !(z.parentSub ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  });

  pagedZones = computed(() => this.pagination.slice(this.filteredZones()));

  private persist = effect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ regionId: this.filters().regionId }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredZones().length);
  });

  constructor() {
    if (this.regions() === undefined) this.regionService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.zoneService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des zones.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof ZoneFilters>(key: K, value: ZoneFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ regionId: '', search: '' });
    this.pagination.reset();
  }

  regionLabel(id: string): string {
    return (this.regions() ?? []).find((r) => r.id === id)?.name ?? '—';
  }

  deleteZone(zone: Zone): void {
    Swal.fire({
      title: 'Supprimer cette zone ?',
      text: `« ${zone.name} » et tous ses villages seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.zoneService.delete(zone.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
