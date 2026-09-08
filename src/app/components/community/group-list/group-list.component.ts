import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { GroupService } from '../../../services/group.service';
import { ChurchService } from '../../../services/church.service';
import { GROUP_TYPE_LABELS, Group, GroupType } from '../../../models/group.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface GroupFilters {
  churchId: string;
  type: GroupType | '';
  search: string;
}

const STORAGE_KEY = 'groupFilters';

function loadPersisted(): Partial<Pick<GroupFilters, 'churchId' | 'type'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-group-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss',
})
export class GroupListComponent {
  readonly groupService = inject(GroupService);
  readonly churchService = inject(ChurchService);
  readonly pagination = inject(PaginationService);

  typeList = Object.values(GroupType);
  typeLabels = GROUP_TYPE_LABELS;

  groups = this.groupService.groups;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.groups() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<GroupFilters>({ churchId: '', type: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.type || !!f.search;
  });

  filtered = computed(() => {
    const items = this.groups() ?? [];
    const { churchId, type, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((g) => {
      if (churchId && g.churchId !== churchId) return false;
      if (type && g.type !== type) return false;
      if (term && !`${g.name} ${this.churchName(g)}`.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    const { churchId, type } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, type }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.groupService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des groupes.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof GroupFilters>(key: K, value: GroupFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', type: '', search: '' });
    this.pagination.reset();
  }

  churchName(g: Group): string {
    return g.church?.name ?? (this.churches() ?? []).find((c) => c.id === g.churchId)?.name ?? '—';
  }

  deleteGroup(g: Group): void {
    Swal.fire({
      title: 'Supprimer ce groupe ?',
      text: `« ${g.name} » et toutes ses adhésions seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.groupService.delete(g.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
