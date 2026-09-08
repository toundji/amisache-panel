import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { TypeService } from '../../../services/type.service';
import { TYPE_SCOPE_LABELS, TypeItem, TypeScope } from '../../../models/type.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { BackDismissDirective } from '../../../shared/navigation/back-dismiss.directive';

interface TypeFilters {
  scope: TypeScope | '';
  active: 'true' | 'false' | '';
  search: string;
}

type PersistedTypeFilters = Pick<TypeFilters, 'scope' | 'active'>;
const STORAGE_KEY = 'typeFilters';

function loadPersistedFilters(): Partial<PersistedTypeFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-type-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, BackDismissDirective],
  templateUrl: './type-list.component.html',
  styleUrl: './type-list.component.scss',
})
export class TypeListComponent {
  readonly typeService = inject(TypeService);
  readonly pagination = inject(PaginationService);

  scopeList = Object.values(TypeScope);
  scopeLabels = TYPE_SCOPE_LABELS;

  types = this.typeService.types;
  isLoading = computed(() => this.types() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);
  togglingId = signal<string | null>(null);

  filters = signal<TypeFilters>({
    scope: '',
    active: '',
    search: '',
    ...loadPersistedFilters(),
  });
  hasAdvancedFilters = computed(() => this.filters().scope !== '' || this.filters().active !== '');

  private persistFilters = effect(() => {
    const { scope, active } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scope, active }));
  });

  private reloadTrigger = signal(0);
  private isManualRefresh = false;

  // GET /types/admin est paginé côté serveur (ordre fixe scope puis name) :
  // on relance un fetch à chaque changement de page/taille, de filtres, ou de reloadTrigger.
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

    this.typeService
      .listAdmin({
        page,
        limit,
        scope: filters.scope || undefined,
        active: filters.active === '' ? undefined : filters.active === 'true',
        search: filters.search || undefined,
      })
      .subscribe({
        next: (result) => {
          this.pagination.setTotalOnly(result.total);
          this.refreshing.set(false);
          if (showLoader) Swal.close();
        },
        error: () => {
          this.refreshing.set(false);
          this.error.set('Erreur lors du chargement des types.');
          if (showLoader) Swal.close();
        },
      });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.forceReload();
  }

  private forceReload(): void {
    this.reloadTrigger.update((v) => v + 1);
  }

  updateFilter<K extends keyof TypeFilters>(key: K, value: TypeFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.update((f) => ({ ...f, scope: '', active: '', search: '' }));
    this.pagination.reset();
  }

  scopeLabel(scope: TypeScope | ''): string {
    return scope ? this.scopeLabels[scope] : '';
  }

  // ── Activer / désactiver — action instantanée (pas de save/undo) ──
  toggleActive(type: TypeItem): void {
    if (this.togglingId()) return;
    this.togglingId.set(type.id);
    this.typeService.update(type.id, { active: !type.active }).subscribe({
      next: () => {
        this.togglingId.set(null);
        this.forceReload();
      },
      error: (err) => {
        this.togglingId.set(null);
        Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error');
      },
    });
  }

  deleteType(type: TypeItem): void {
    Swal.fire({
      title: 'Supprimer ce type ?',
      text: `« ${type.name} » sera supprimé définitivement. L'historique qui le référence peut être impacté.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.typeService.delete(type.id).subscribe({
        next: () => this.forceReload(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
