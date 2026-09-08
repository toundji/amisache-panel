import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../services/church.service';
import {
  Church,
  ENTITY_TYPE_LABELS,
  EntityType,
  VALIDATION_STATUS_LABELS,
  ValidationStatus,
} from '../../../models/church.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { BackDismissDirective } from '../../../shared/navigation/back-dismiss.directive';

interface ChurchFilters {
  status: ValidationStatus | '';
  type: EntityType | '';
  search: string;
}

type PersistedChurchFilters = Pick<ChurchFilters, 'status' | 'type'>;
const STORAGE_KEY = 'churchFilters';

function loadPersistedFilters(): Partial<PersistedChurchFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-church-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, BackDismissDirective],
  templateUrl: './church-list.component.html',
  styleUrl: './church-list.component.scss',
})
export class ChurchListComponent {
  readonly churchService = inject(ChurchService);
  readonly pagination = inject(PaginationService);

  typeList = Object.values(EntityType);
  typeLabels = ENTITY_TYPE_LABELS;
  statusList = Object.values(ValidationStatus);
  statusLabels = VALIDATION_STATUS_LABELS;

  churches = this.churchService.churches;
  parents = this.churchService.allForSelect;

  isLoading = computed(() => this.churches() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<ChurchFilters>({
    status: '',
    type: '',
    search: '',
    ...loadPersistedFilters(),
  });
  hasAdvancedFilters = computed(() => this.filters().status !== '' || this.filters().type !== '');

  private persistFilters = effect(() => {
    const { status, type } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, type }));
  });

  private reloadTrigger = signal(0);
  private isManualRefresh = false;

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

    this.churchService
      .listAdmin({
        page,
        limit,
        status: filters.status || undefined,
        type: filters.type || undefined,
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
          this.error.set('Erreur lors du chargement des entités.');
          if (showLoader) Swal.close();
        },
      });
  });

  constructor() {
    if (this.parents() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
  }

  refresh(): void {
    this.isManualRefresh = true;
    this.reloadTrigger.update((v) => v + 1);
  }

  private forceReload(): void {
    this.reloadTrigger.update((v) => v + 1);
  }

  updateFilter<K extends keyof ChurchFilters>(key: K, value: ChurchFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.update((f) => ({ ...f, status: '', type: '', search: '' }));
    this.pagination.reset();
  }

  statusLabel(status: ValidationStatus | ''): string {
    return status ? this.statusLabels[status] : '';
  }

  typeLabel(type: EntityType | ''): string {
    return type ? this.typeLabels[type] : '';
  }

  statusBadgeClass(status: ValidationStatus): string {
    return {
      [ValidationStatus.APPROVED]: 'status-success',
      [ValidationStatus.PENDING]: 'status-warning',
      [ValidationStatus.SUSPENDED]: 'status-disabled',
    }[status];
  }

  parentLabel(id?: string): string {
    if (!id) return '—';
    return (this.parents() ?? []).find((c) => c.id === id)?.name ?? '—';
  }

  deleteChurch(church: Church): void {
    Swal.fire({
      title: 'Supprimer cette entité ?',
      text: `« ${church.name} » sera supprimée définitivement. Refusé tant qu'elle a des entités enfants.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.churchService.delete(church.id).subscribe({
        next: () => this.forceReload(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible (entités enfants ?).', 'error'),
      });
    });
  }
}
