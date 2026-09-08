import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { RequestService } from '../../../services/request.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { Request, REQUEST_STATUS_LABELS, RequestStatus } from '../../../models/request.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface RequestFilters {
  churchId: string;
  status: RequestStatus | '';
  search: string;
}

const STORAGE_KEY = 'requestFilters';

function loadPersisted(): Partial<Pick<RequestFilters, 'churchId' | 'status'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  [RequestStatus.SUBMITTED]: 'status-warning',
  [RequestStatus.IN_PROGRESS]: 'status-info',
  [RequestStatus.CONFIRMED]: 'status-success',
  [RequestStatus.COMPLETED]: 'status-disabled',
  [RequestStatus.REJECTED]: 'status-danger',
};

@Component({
  selector: 'app-request-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './request-list.component.html',
  styleUrl: './request-list.component.scss',
})
export class RequestListComponent {
  readonly requestService = inject(RequestService);
  readonly churchService = inject(ChurchService);
  private readonly userService = inject(UserService);
  readonly pagination = inject(PaginationService);

  statusList = Object.values(RequestStatus);
  statusLabels = REQUEST_STATUS_LABELS;

  requests = this.requestService.requests;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.requests() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<RequestFilters>({ churchId: '', status: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.status || !!f.search;
  });

  filtered = computed(() => {
    const items = this.requests() ?? [];
    const { search } = this.filters();
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((r) => {
      const hay = `${this.requesterName(r)} ${this.typeName(r)}`.toLowerCase();
      return hay.includes(term);
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    const { churchId, status } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, status }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  // Rechargement serveur quand église/statut changent (filtres portés par l'API admin).
  private reload = effect(() => {
    const { churchId, status } = this.filters();
    this.fetch(churchId, status);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.userService.allForSelect() === undefined) {
      this.userService.listAllForSelect().subscribe({ error: () => undefined });
    }
  }

  private fetch(churchId: string, status: RequestStatus | '', showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.requestService
      .listAdmin({ churchId: churchId || undefined, status: status || undefined })
      .subscribe({
        next: () => {
          this.refreshing.set(false);
          if (showLoader) Swal.close();
        },
        error: () => {
          this.refreshing.set(false);
          this.error.set('Erreur lors du chargement des demandes.');
          if (showLoader) Swal.close();
        },
      });
  }

  refresh(): void {
    const { churchId, status } = this.filters();
    this.fetch(churchId, status, true);
  }

  updateFilter<K extends keyof RequestFilters>(key: K, value: RequestFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', status: '', search: '' });
    this.pagination.reset();
  }

  requesterName(r: Request): string {
    if (r.user) {
      const n = `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim();
      return n || r.user.email || r.userId;
    }
    const u = (this.userService.allForSelect() ?? []).find((x) => x.id === r.userId);
    if (!u) return r.userId;
    const n = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return n || u.email || r.userId;
  }

  churchName(r: Request): string {
    return r.church?.name ?? (this.churches() ?? []).find((c) => c.id === r.churchId)?.name ?? '—';
  }

  typeName(r: Request): string {
    return r.type?.name ?? '—';
  }

  statusBadge(status: RequestStatus): string {
    return STATUS_BADGE[status];
  }
}
