import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { RegionService } from '../../../services/region.service';
import { CountryService } from '../../../services/country.service';
import { Region } from '../../../models/region.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface RegionFilters {
  countryId: string;
  search: string;
}

// countryId persisté entre visites (choix de contexte de travail durable,
// comme `status` ailleurs) — jamais `search` (texte libre), cf. CLAUDE.md § Filtres.
const STORAGE_KEY = 'regionFilters';

function loadPersisted(): Partial<Pick<RegionFilters, 'countryId'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-region-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './region-list.component.html',
  styleUrl: './region-list.component.scss',
})
export class RegionListComponent {
  readonly regionService = inject(RegionService);
  readonly countryService = inject(CountryService);
  readonly pagination = inject(PaginationService);

  regions = this.regionService.regions;
  countries = this.countryService.countries;

  isLoading = computed(() => this.regions() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<RegionFilters>({ countryId: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => !!this.filters().countryId || !!this.filters().search);

  filteredRegions = computed(() => {
    const items = this.regions() ?? [];
    const { countryId, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((r) => {
      if (countryId && r.countryId !== countryId) return false;
      if (term && !r.name.toLowerCase().includes(term) && !(r.parentSub ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  });

  pagedRegions = computed(() => this.pagination.slice(this.filteredRegions()));

  private persist = effect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ countryId: this.filters().countryId }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredRegions().length);
  });

  constructor() {
    // Table de référence faible cardinalité : chargée une fois, résolution FK locale.
    if (this.countries() === undefined) this.countryService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.regionService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des régions.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof RegionFilters>(key: K, value: RegionFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ countryId: '', search: '' });
    this.pagination.reset();
  }

  countryLabel(id: string): string {
    return (this.countries() ?? []).find((c) => c.id === id)?.isoCode ?? '—';
  }

  deleteRegion(region: Region): void {
    Swal.fire({
      title: 'Supprimer cette région ?',
      text: `« ${region.name} » et tout son découpage (zones, villages) seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.regionService.delete(region.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
