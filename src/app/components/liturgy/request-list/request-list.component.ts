import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { RequestService } from '../../../services/request.service';
import { ChurchService } from '../../../services/church.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { UserService } from '../../../services/user.service';
import { Request, REQUEST_STATUS_LABELS, RequestStatus } from '../../../models/request.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { exportRequestsDocx, exportRequestsPdf, RequestExportRow } from './request-export';

interface RequestFilters {
  churchId: string;
  status: RequestStatus | '';
  search: string;
  // Filtres client (non persistés, comme la recherche) — ciblent un export
  // précis, ex. « messe du 25/04/2026 à 18h ».
  dateFrom: string;
  dateTo: string;
  time: string;
  typeId: string;
}

const EMPTY_FILTERS: RequestFilters = {
  churchId: '', status: '', search: '', dateFrom: '', dateTo: '', time: '', typeId: '',
};

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
  readonly clergyContext = inject(ClergyContextService);
  private readonly userService = inject(UserService);
  readonly pagination = inject(PaginationService);

  statusList = Object.values(RequestStatus);
  statusLabels = REQUEST_STATUS_LABELS;

  requests = this.requestService.requests;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.requests() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<RequestFilters>({ ...EMPTY_FILTERS, ...loadPersisted() });
  hasFilter = computed(() => Object.values(this.filters()).some((v) => !!v));

  /** Heures de célébration présentes dans les demandes chargées. */
  timeOptions = computed(() =>
    [...new Set((this.requests() ?? []).map((r) => this.timeOf(r)).filter((t) => !!t))].sort(),
  );

  /** Types présents dans les demandes chargées. */
  typeOptions = computed(() => {
    const map = new Map<string, string>();
    for (const r of this.requests() ?? []) map.set(r.typeId, this.typeName(r));
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  filtered = computed(() => {
    const items = this.requests() ?? [];
    const { search, dateFrom, dateTo, time, typeId } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((r) => {
      const day = r.date?.slice(0, 10) ?? '';
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (time && this.timeOf(r) !== time) return false;
      if (typeId && r.typeId !== typeId) return false;
      if (!term) return true;
      const hay = `${this.requesterName(r)} ${this.typeName(r)}`.toLowerCase();
      return hay.includes(term);
    });
  });

  exporting = signal(false);

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
    // GET /users est admin/manager/engineer uniquement — jamais pour un clergy
    // (403 garanti). Les demandes church-scoped embarquent déjà `user` (backend).
    if (this.clergyContext.isFullAccess() && this.userService.allForSelect() === undefined) {
      this.userService.listAllForSelect().subscribe({ error: () => undefined });
    }
  }

  // Clergé sans accès complet : jamais /requests/admin (403 garanti) —
  // uniquement les demandes de son église active.
  private fetch(churchId: string, status: RequestStatus | '', showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    const activeChurchId = this.clergyContext.activeChurchId();
    const obs = this.clergyContext.isFullAccess()
      ? this.requestService.listAdmin({ churchId: churchId || undefined, status: status || undefined })
      : activeChurchId
        ? this.requestService.listForChurch(activeChurchId, { status: status || undefined })
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
    this.filters.set({ ...EMPTY_FILTERS });
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

  /** Heure de la célébration (HH:mm), issue de l'horaire lié. */
  timeOf(r: Request): string {
    return r.schedule?.time?.slice(0, 5) ?? '';
  }

  async export(format: 'pdf' | 'docx'): Promise<void> {
    const items = this.filtered();
    if (items.length === 0) {
      Swal.fire('Aucune demande', 'Aucune demande ne correspond aux filtres.', 'info');
      return;
    }

    const f = this.filters();
    const fmt = (d: string) => d.split('-').reverse().join('/');
    const parts: string[] = [];
    if (f.dateFrom && f.dateFrom === f.dateTo) parts.push(`le ${fmt(f.dateFrom)}`);
    else {
      if (f.dateFrom) parts.push(`du ${fmt(f.dateFrom)}`);
      if (f.dateTo) parts.push(`au ${fmt(f.dateTo)}`);
    }
    if (f.time) parts.push(`à ${f.time.replace(':', 'h')}`);
    if (f.typeId) parts.push(`type : ${this.typeOptions().find((t) => t.id === f.typeId)?.name ?? ''}`);
    if (f.churchId) parts.push(`église : ${(this.churches() ?? []).find((c) => c.id === f.churchId)?.name ?? ''}`);
    if (f.status) parts.push(`statut : ${this.statusLabels[f.status]}`);
    if (f.search) parts.push(`recherche : « ${f.search} »`);

    const rows: RequestExportRow[] = items.map((r) => ({
      requester: this.requesterName(r),
      type: this.typeName(r),
      text: r.text ?? '',
      date: r.date ? fmt(r.date.slice(0, 10)) : '',
      time: this.timeOf(r),
      church: this.churchName(r),
      offering: r.offering ?? '',
      status: this.statusLabels[r.status],
    }));
    const meta = {
      title: 'Demandes',
      subtitle: `${items.length} demande(s)${parts.length ? ' · ' + parts.join(' · ') : ''} · exporté le ${new Date().toLocaleString('fr-FR')}`,
      fileName: `demandes-${new Date().toISOString().slice(0, 10)}`,
    };

    this.exporting.set(true);
    try {
      await (format === 'pdf' ? exportRequestsPdf(rows, meta) : exportRequestsDocx(rows, meta));
    } catch {
      Swal.fire('Erreur', "L'export a échoué.", 'error');
    } finally {
      this.exporting.set(false);
    }
  }
}
