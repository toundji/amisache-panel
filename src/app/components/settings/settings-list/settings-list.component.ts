import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { SettingService } from '../../../services/setting.service';
import { SETTING_TYPE_LABELS, Setting } from '../../../models/setting.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { BackDismissDirective } from '../../../shared/navigation/back-dismiss.directive';

interface SettingFilters {
  category: string;
  search: string;
}

// Persisté entre visites — jamais `search` (texte libre), cf. CLAUDE.md §
// Filtres et recherche.
type PersistedSettingFilters = Pick<SettingFilters, 'category'>;
const STORAGE_KEY = 'settingsFilters';

function loadPersistedFilters(): Partial<PersistedSettingFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-settings-list',
  // Instance locale — pagination propre à CETTE liste (côté CLIENT : GET
  // /settings/admin n'est pas paginé côté serveur, voir SettingService).
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, BackDismissDirective],
  templateUrl: './settings-list.component.html',
  styleUrl: './settings-list.component.scss',
})
export class SettingsListComponent {
  // Non privé : le template appelle `settingService.select(setting)` avant de naviguer vers le détail.
  readonly settingService = inject(SettingService);
  readonly pagination = inject(PaginationService);

  typeLabels = SETTING_TYPE_LABELS;

  settings = this.settingService.settings;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.settings() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<SettingFilters>({
    category: '',
    search: '',
    ...loadPersistedFilters(),
  });
  hasAdvancedFilters = computed(() => !!this.filters().category);

  categoryList = computed(() => {
    const items = this.settings() ?? [];
    return [...new Set(items.map((s) => s.category).filter((c): c is string => !!c))].sort();
  });

  // Liste filtrée par recherche libre + catégorie, avant pagination CLIENT.
  filteredSettings = computed(() => {
    const items = this.settings() ?? [];
    const { category, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((s) => {
      if (category && s.category !== category) return false;
      if (term && !s.key.toLowerCase().includes(term) && !(s.label ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  });

  pagedSettings = computed(() => this.pagination.slice(this.filteredSettings()));

  private persistFilters = effect(() => {
    const { category } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ category }));
  });

  // Recalcule le total de la pagination CLIENT à chaque changement de liste filtrée.
  private syncPaginationTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredSettings().length);
  });

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.settingService.listAdmin().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des settings.');
        if (showLoader) Swal.close();
      },
    });
  }

  constructor() {
    this.load();
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof SettingFilters>(key: K, value: SettingFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.update((f) => ({ ...f, category: '', search: '' }));
    this.pagination.reset();
  }

  deleteSetting(setting: Setting): void {
    Swal.fire({
      title: 'Supprimer ce setting ?',
      text: `« ${setting.key} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.settingService.delete(setting.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
