import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { MailFailedService } from '../../../services/mail-failed.service';
import { MAIL_JOB_TYPE_LABELS, MailFailedJob, MailFailedStatus } from '../../../models/mail-failed.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { ColumnDef, ColumnVisibilityService } from '../../../shared/column-visibility/column-visibility.service';
import { ColumnVisibilityComponent } from '../../../shared/column-visibility/column-visibility.component';

type SortBy = 'createdAt' | 'attempts';

interface Filters {
  status: MailFailedStatus | '';
  search: string;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
}

// Persisté entre visites — jamais `search`, cf. CLAUDE.md § Filtres et recherche.
type PersistedFilters = Pick<Filters, 'status' | 'sortBy' | 'sortOrder'>;
const STORAGE_KEY = 'mailFailedFilters';

function loadPersistedFilters(): Partial<PersistedFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

// Colonnes masquables. "Destinataire", "Statut" et "Actions" restent toujours
// affichées — cf. ColumnVisibilityService.
const MAIL_FAILED_COLUMNS: ColumnDef[] = [
  { key: 'type', label: 'Type' },
  { key: 'lastError', label: 'Dernière erreur' },
  { key: 'attempts', label: 'Tentatives' },
  { key: 'createdAt', label: 'Créé le' },
];

@Component({
  selector: 'app-mail-failed-list',
  // Instances locales — pagination et colonnes propres à CETTE liste.
  providers: [PaginationService, ColumnVisibilityService],
  imports: [CommonModule, FormsModule, PaginationComponent, ColumnVisibilityComponent],
  templateUrl: './mail-failed-list.component.html',
  styleUrl: './mail-failed-list.component.scss',
})
export class MailFailedListComponent {
  private readonly mailFailedService = inject(MailFailedService);
  readonly pagination = inject(PaginationService);
  readonly columnVisibility = inject(ColumnVisibilityService);

  MailFailedStatus = MailFailedStatus;
  typeLabels = MAIL_JOB_TYPE_LABELS;

  constructor() {
    this.columnVisibility.init('mailFailed', MAIL_FAILED_COLUMNS);
  }

  private allJobs = this.mailFailedService.jobs;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.allJobs() === undefined);
  error = signal<string | null>(null);
  // Rechargement (filtre/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  filters = signal<Filters>({
    status: MailFailedStatus.pending,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...loadPersistedFilters(),
  });

  private persistFilters = effect(() => {
    const { status, sortBy, sortOrder } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, sortBy, sortOrder }));
  });

  // Recherche + tri appliqués côté client : la réponse de GET /mail/failed
  // (filtrée par statut côté serveur) est déjà entièrement téléchargée.
  private filteredJobs = computed(() => {
    const jobs = this.allJobs();
    if (!jobs) return undefined;
    const { search, sortBy, sortOrder } = this.filters();
    const term = search.trim().toLowerCase();
    const filtered = term ? jobs.filter((j) => j.to.toLowerCase().includes(term)) : jobs;
    return [...filtered].sort((a, b) => {
      const va = sortBy === 'attempts' ? a.attempts : new Date(a.createdAt).getTime();
      const vb = sortBy === 'attempts' ? b.attempts : new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? va - vb : vb - va;
    });
  });

  // Pagination CLIENT (cf. CLAUDE.md) : le total suit la liste filtrée dans un
  // effect dédié — setTotalOnly() ne doit pas être appelé depuis un computed
  // (side-effect interdit) ; slice(), lui, est pur et peut l'être.
  private syncPaginationTotal = effect(() => {
    const jobs = this.filteredJobs();
    if (jobs) this.pagination.setTotalOnly(jobs.length);
  });

  pagedJobs = computed(() => {
    const jobs = this.filteredJobs();
    return jobs ? this.pagination.slice(jobs) : undefined;
  });

  // Incrémenté pour forcer un rechargement (ex: après une action ou un clic
  // sur "Actualiser") — cf. UserListComponent pour le même besoin.
  private reloadTrigger = signal(0);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — distingue l'overlay Swal.showLoading() des rechargements
  // silencieux (changement de filtre statut).
  private isManualRefresh = false;

  private reload = effect(() => {
    const status = this.filters().status;
    this.reloadTrigger();

    const showLoader = this.isManualRefresh;
    this.isManualRefresh = false;

    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.mailFailedService.list(status || undefined).subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des emails échoués.');
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

  setStatusFilter(status: MailFailedStatus | ''): void {
    this.filters.update((f) => ({ ...f, status }));
    this.pagination.reset();
  }

  updateSearch(search: string): void {
    this.filters.update((f) => ({ ...f, search }));
    this.pagination.reset();
  }

  toggleSort(field: SortBy): void {
    this.filters.update((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }

  statusBadgeClass(status: MailFailedStatus): string {
    return status === MailFailedStatus.pending ? 'status-warning' : 'status-disabled';
  }

  retry(job: MailFailedJob): void {
    this.mailFailedService.retry(job.id).subscribe({
      next: () => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: "Email remis en file d'attente",
          showConfirmButton: false,
          timer: 2500,
        });
        this.forceReload();
      },
      error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Impossible de relancer cet email.', 'error'),
    });
  }

  abandon(job: MailFailedJob): void {
    Swal.fire({
      title: 'Abandonner cet email ?',
      text: `${job.to} ne sera plus proposé pour relance.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Abandonner',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.mailFailedService.abandon(job.id).subscribe({
        next: () => this.forceReload(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error'),
      });
    });
  }
}
