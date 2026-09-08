import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { CountryService } from '../../../services/country.service';
import { Country } from '../../../models/country.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({
  selector: 'app-country-list',
  // Instance locale — pagination propre à CETTE liste (côté CLIENT : GET
  // /countries n'est pas paginé côté serveur, voir CountryService).
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './country-list.component.html',
  styleUrl: './country-list.component.scss',
})
export class CountryListComponent {
  // Non privé : le template appelle `countryService.select(country)` avant de naviguer vers le détail.
  readonly countryService = inject(CountryService);
  readonly pagination = inject(PaginationService);

  countries = this.countryService.countries;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.countries() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  // Recherche libre (texte) — jamais persistée, cf. CLAUDE.md § Filtres.
  search = signal('');

  filteredCountries = computed(() => {
    const items = this.countries() ?? [];
    const term = this.search().trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (c) =>
        c.isoCode.toLowerCase().includes(term) ||
        c.callingCode.toLowerCase().includes(term),
    );
  });

  pagedCountries = computed(() => this.pagination.slice(this.filteredCountries()));

  // Recalcule le total de la pagination CLIENT à chaque changement de liste filtrée.
  private syncPaginationTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredCountries().length);
  });

  constructor() {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.countryService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des pays.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.pagination.reset();
  }

  levels(country: Country): string {
    return country.subdivisions?.length ? country.subdivisions.join(' › ') : '—';
  }

  deleteCountry(country: Country): void {
    Swal.fire({
      title: 'Supprimer ce pays ?',
      text: `« ${country.isoCode} » et tout son découpage (régions, zones, villages) seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.countryService.delete(country.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
