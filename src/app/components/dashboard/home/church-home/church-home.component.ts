import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import Swal from 'sweetalert2';

import { DashboardService } from '../../../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';
import { ClergyContextService } from '../../../../services/clergy-context.service';
import { RequestService } from '../../../../services/request.service';
import { DashboardStats } from '../../../../models/dashboard.model';
import { Request, REQUEST_STATUS_LABELS, RequestStatus } from '../../../../models/request.model';
import { PaymentStatus } from '../../../../models/payment.model';
import { QuickLink, StatTile, TodoItem, todayLabel } from '../dashboard-ui';

const TO_HANDLE_LIMIT = 8;

/** Statuts qui attendent encore une action du clergé. */
const OPEN_STATUSES = new Set<RequestStatus>([RequestStatus.SUBMITTED, RequestStatus.IN_PROGRESS]);

const REQUEST_STATUS_BADGE: Record<RequestStatus, string> = {
  [RequestStatus.SUBMITTED]: 'status-warning',
  [RequestStatus.IN_PROGRESS]: 'status-info',
  [RequestStatus.CONFIRMED]: 'status-success',
  [RequestStatus.COMPLETED]: 'status-disabled',
  [RequestStatus.REJECTED]: 'status-danger',
};

const REQUEST_STATUS_ICON: Record<RequestStatus, string> = {
  [RequestStatus.SUBMITTED]: 'fas fa-inbox',
  [RequestStatus.IN_PROGRESS]: 'fas fa-hourglass-half',
  [RequestStatus.CONFIRMED]: 'fas fa-check',
  [RequestStatus.COMPLETED]: 'fas fa-check-double',
  [RequestStatus.REJECTED]: 'fas fa-times',
};

// Liens « ouvre la liste préfiltrée » : chaque clé de filtre de contexte est
// passée, vide si non voulue — sinon un filtre persisté d'une visite
// précédente fausserait le chiffre cliqué (cf. filtersFromQueryParams).
const requestsQuery = (status: RequestStatus | '') => ({ status, churchId: '' });
const paymentsQuery = (status: PaymentStatus | '') => ({ status, operator: '', churchId: '' });

/**
 * Accueil du clergé — l'église active (sélecteur du topbar) et ce qui attend
 * une action : les demandes des fidèles d'abord, puis les paiements.
 */
@Component({
  selector: 'app-church-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './church-home.component.html',
  styleUrl: '../home.component.scss',
})
export class ChurchHomeComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  readonly clergyContext = inject(ClergyContextService);
  // Non privé : le template pose le stub de détail avant navigation (cf. CLAUDE.md § Pages de détail).
  readonly requestService = inject(RequestService);

  readonly requestStatusLabels = REQUEST_STATUS_LABELS;
  readonly requestBadge = REQUEST_STATUS_BADGE;
  readonly requestIcon = REQUEST_STATUS_ICON;
  readonly submittedQuery = requestsQuery(RequestStatus.SUBMITTED);
  readonly today = todayLabel();
  private readonly todayIso = new Date().toISOString().slice(0, 10);
  readonly firstName = computed(() => this.authService.user()?.firstName ?? '');

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  // `null` = pas encore chargé (ou aucune église active), distinct de 0.
  stats = signal<DashboardStats | null>(null);
  // `undefined` = en cours (skeleton), `null` = échec (message propre à la section).
  requests = signal<Request[] | null | undefined>(undefined);

  readonly tiles = computed<StatTile[]>(() => {
    const ds = this.stats();
    if (!ds) return [];
    return [
      { label: 'Demandes reçues', icon: 'fas fa-inbox', color: 'warning', value: ds.pendingRequests, route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.SUBMITTED) },
      { label: 'Demandes en cours', icon: 'fas fa-hourglass-half', color: 'info', value: ds.inProgressRequests, route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.IN_PROGRESS) },
      { label: 'Paiements à confirmer', icon: 'fas fa-receipt', color: 'danger', value: ds.pendingPayments, route: '/payment/transactions', queryParams: paymentsQuery(PaymentStatus.SUBMITTED) },
      { label: 'Publications en ligne', icon: 'fas fa-bullhorn', color: 'success', value: ds.publishedPublications, route: '/community/publications' },
    ];
  });

  /** Demandes encore ouvertes, la célébration la plus proche d'abord. */
  readonly toHandle = computed(() => {
    const items = this.requests();
    if (!items) return items;
    return items
      .filter((r) => OPEN_STATUSES.has(r.status))
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      .slice(0, TO_HANDLE_LIMIT);
  });

  readonly openCount = computed(() => (this.requests() ?? []).filter((r) => OPEN_STATUSES.has(r.status)).length);

  readonly requestBreakdown = computed(() => {
    const items = this.requests();
    if (!items) return [];
    const total = items.length;
    return Object.values(RequestStatus).map((status) => {
      const count = items.filter((r) => r.status === status).length;
      return { status, label: REQUEST_STATUS_LABELS[status], count, pct: total ? Math.round((count / total) * 100) : 0 };
    });
  });

  readonly requestTotal = computed(() => this.requests()?.length ?? 0);

  readonly todoItems = computed<TodoItem[]>(() => {
    const ds = this.stats();
    if (!ds) return [];
    return [
      {
        title: 'Demandes à prendre en charge', desc: 'Reçues des fidèles, pas encore ouvertes',
        icon: 'fas fa-inbox', level: 'warning', count: ds.pendingRequests,
        route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.SUBMITTED),
      },
      {
        title: 'Demandes en cours', desc: 'À confirmer ou à clôturer',
        icon: 'fas fa-hourglass-half', level: 'info', count: ds.inProgressRequests,
        route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.IN_PROGRESS),
      },
      {
        title: 'Paiements à confirmer', desc: 'Reçus déclarés, en attente de vérification',
        icon: 'fas fa-receipt', level: 'danger', count: ds.pendingPayments,
        route: '/payment/transactions', queryParams: paymentsQuery(PaymentStatus.SUBMITTED),
      },
    ];
  });

  readonly allClear = computed(() => this.todoItems().length > 0 && this.todoItems().every((i) => i.count === 0));

  readonly quickLinks: QuickLink[] = [
    { title: 'Demandes', desc: 'Intentions de messe et sacrements', icon: 'fas fa-inbox', color: 'warning', route: '/liturgy/requests' },
    { title: 'Paiements', desc: 'Reçus à confirmer ou rejeter', icon: 'fas fa-receipt', color: 'danger', route: '/payment/transactions' },
    { title: 'Horaires', desc: 'Messes et célébrations', icon: 'fas fa-clock', color: 'info', route: '/liturgy/schedules' },
    { title: 'Publications', desc: 'Annonces aux fidèles', icon: 'fas fa-bullhorn', color: 'success', route: '/community/publications' },
    { title: 'Tarifs & délais', desc: 'Offrandes et délais de dépôt', icon: 'fas fa-tags', color: 'primary', route: '/liturgy/tariffs' },
    { title: 'Mon église', desc: 'Profil, clergé et entrées', icon: 'fas fa-church', color: 'primary', route: '/churches' },
  ];

  constructor() {
    // Recharge quand le clergé change d'église active (sélecteur du topbar).
    // `myChurches()` aussi : tant que les affectations ne sont pas chargées,
    // l'absence d'église active n'est pas encore significative.
    effect(() => {
      this.clergyContext.activeChurchId();
      this.clergyContext.myChurches();
      untracked(() => this.load());
    });
  }

  // Jamais les routes `/xxx/admin` (403 garanti pour le clergé) — uniquement
  // l'église active.
  private load(showLoader = false): void {
    if (this.clergyContext.myChurches() === undefined) {
      this.refreshing.set(false);
      return; // skeleton maintenu jusqu'au chargement des affectations
    }
    const churchId = this.clergyContext.activeChurchId();
    if (!churchId) {
      this.stats.set(null);
      this.requests.set([]);
      this.loading.set(false);
      this.refreshing.set(false);
      return;
    }

    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.dashboardService.getStats(churchId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du tableau de bord.');
        if (showLoader) Swal.close();
      },
    });

    this.dashboardService
      .requests(churchId)
      .pipe(catchError(() => of(null)))
      .subscribe((requests) => this.requests.set(requests));
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  requesterName(r: Request): string {
    const u = r.user;
    if (!u) return 'Fidèle';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'Fidèle';
  }

  /** Date de célébration passée alors que la demande est encore ouverte. */
  isOverdue(r: Request): boolean {
    return !!r.date && r.date.slice(0, 10) < this.todayIso;
  }

  celebrationLabel(r: Request): string {
    if (!r.date) return '';
    const day = r.date.slice(0, 10).split('-').reverse().join('/');
    const time = r.schedule?.time?.slice(0, 5);
    return time ? `${day} à ${time.replace(':', 'h')}` : day;
  }
}
