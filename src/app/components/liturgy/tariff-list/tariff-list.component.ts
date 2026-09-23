import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { TariffService } from '../../../services/tariff.service';
import { ChurchService } from '../../../services/church.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { TypeService } from '../../../services/type.service';
import { Tariff } from '../../../models/tariff.model';
import { TYPE_SCOPE_LABELS, TypeScope } from '../../../models/type.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

// Un tarif ne porte que sur une intention de messe ou un sacrement (jamais
// un don — offrande libre par nature, cf. TariffService côté backend).
const TARIFFABLE_SCOPES = [TypeScope.INTENTION, TypeScope.SACRAMENT];

interface TariffFilters {
  churchId: string;
  scope: TypeScope | '';
  activeOnly: boolean;
  search: string;
}

const STORAGE_KEY = 'tariffFilters';

function loadPersisted(): Partial<Pick<TariffFilters, 'churchId' | 'scope' | 'activeOnly'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-tariff-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './tariff-list.component.html',
  styleUrl: './tariff-list.component.scss',
})
export class TariffListComponent {
  readonly tariffService = inject(TariffService);
  readonly churchService = inject(ChurchService);
  readonly clergyContext = inject(ClergyContextService);
  readonly typeService = inject(TypeService);

  readonly pagination = inject(PaginationService);

  scopeList = TARIFFABLE_SCOPES;
  scopeLabels = TYPE_SCOPE_LABELS;

  tariffs = this.tariffService.tariffs;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.tariffs() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<TariffFilters>({ churchId: '', scope: '', activeOnly: false, search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.scope || f.activeOnly || !!f.search;
  });

  filtered = computed(() => {
    const items = this.tariffs() ?? [];
    const { churchId, scope, activeOnly, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((t) => {
      if (churchId && t.churchId !== churchId) return false;
      if (scope && this.typeOf(t)?.scope !== scope) return false;
      if (activeOnly && !t.active) return false;
      if (term) {
        const hay = `${this.typeName(t)} ${this.churchName(t)}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    const { churchId, scope, activeOnly } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, scope, activeOnly }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    for (const scope of TARIFFABLE_SCOPES) {
      if (this.typeService.activeForScope(scope) === undefined) {
        this.typeService.listActive(scope).subscribe({ error: () => undefined });
      }
    }
    this.load();
  }

  // Clergé sans accès complet : jamais /tariffs/admin (403 garanti) —
  // uniquement les tarifs de son église active.
  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    const churchId = this.clergyContext.activeChurchId();
    const obs = this.clergyContext.isFullAccess()
      ? this.tariffService.listAdmin()
      : churchId
        ? this.tariffService.listForChurch(churchId)
        : null;

    if (!obs) {
      this.refreshing.set(false);
      if (showLoader) Swal.close();
      return;
    }

    obs.subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des tarifs.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof TariffFilters>(key: K, value: TariffFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', scope: '', activeOnly: false, search: '' });
    this.pagination.reset();
  }

  private allTypes() {
    return TARIFFABLE_SCOPES.flatMap((s) => this.typeService.activeForScope(s) ?? []);
  }

  typeOf(t: Tariff) {
    return t.type ?? this.allTypes().find((ty) => ty.id === t.typeId);
  }

  typeName(t: Tariff): string {
    return this.typeOf(t)?.name ?? '—';
  }

  churchName(t: Tariff): string {
    return t.church?.name ?? (this.churches() ?? []).find((c) => c.id === t.churchId)?.name ?? '—';
  }

  deleteTariff(t: Tariff): void {
    Swal.fire({
      title: 'Supprimer ce tarif ?',
      text: `« ${this.typeName(t)} — ${this.churchName(t)} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.tariffService.delete(t.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
