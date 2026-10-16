import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';

import { DashboardService } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { RequestService } from '../../../services/request.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { UserStatus } from '../../../models/user.model';
import { DashboardStats } from '../../../models/dashboard.model';
import { Request, REQUEST_STATUS_LABELS, RequestStatus } from '../../../models/request.model';
import { PaymentStatus } from '../../../models/payment.model';
import { ValidationStatus } from '../../../models/church.model';
import { ContactMessageStatus } from '../../../models/contact.model';

type TileColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface UserBreakdownStats {
  total: number;
  active: number;
  unverified: number;
  blocked: number;
}

/** Tuile statistique — toujours cliquable, vers la liste dédiée préfiltrée. */
interface StatTile {
  label: string;
  icon: string;
  color: TileColor;
  value: number;
  route: string;
  queryParams?: Record<string, string>;
}

interface QuickLink {
  title: string;
  desc: string;
  icon: string;
  color: TileColor;
  route: string;
}

interface TodoItem {
  title: string;
  desc: string;
  icon: string;
  level: 'warning' | 'danger' | 'info';
  count: number;
  route: string;
  queryParams?: Record<string, string>;
}

const RECENT_REQUESTS_LIMIT = 6;

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

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly churchService = inject(ChurchService);
  private readonly userService = inject(UserService);
  readonly clergyContext = inject(ClergyContextService);
  // Non privé : le template pose le stub de détail avant navigation (cf. CLAUDE.md § Pages de détail).
  readonly requestService = inject(RequestService);

  readonly requestStatusLabels = REQUEST_STATUS_LABELS;
  readonly requestBadge = REQUEST_STATUS_BADGE;
  readonly requestIcon = REQUEST_STATUS_ICON;
  readonly today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  readonly firstName = computed(() => this.authService.user()?.firstName ?? '');

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  stats = signal<UserBreakdownStats>({ total: 0, active: 0, unverified: 0, blocked: 0 });
  // Chiffres métier (demandes, paiements, publications, églises) — plateforme
  // pour admin/engineer, église active pour le clergé. `null` = pas encore
  // chargé (ou aucune église active), distinct de 0.
  amisacheStats = signal<DashboardStats | null>(null);

  // Sections secondaires : `undefined` = en cours (skeleton), `null` = échec
  // (la section affiche son propre message, sans bloquer le reste du tableau de bord).
  requests = signal<Request[] | null | undefined>(undefined);
  todoCounts = signal<{ newContacts: number; failedMails: number } | null | undefined>(undefined);

  readonly userTiles = computed<StatTile[]>(() => {
    if (!this.clergyContext.isFullAccess()) return [];
    const s = this.stats();
    return [
      // `status: ''` explicite → la liste ignore un filtre persisté d'une visite précédente.
      { label: 'Utilisateurs', icon: 'fas fa-users', color: 'primary', value: s.total, route: '/users', queryParams: { status: '', role: '' } },
      { label: 'Actifs', icon: 'fas fa-user-check', color: 'success', value: s.active, route: '/users', queryParams: { status: UserStatus.active, role: '' } },
      { label: 'Non vérifiés', icon: 'fas fa-user-clock', color: 'warning', value: s.unverified, route: '/users', queryParams: { status: UserStatus.unverified, role: '' } },
      { label: 'Bloqués', icon: 'fas fa-user-slash', color: 'danger', value: s.blocked, route: '/users', queryParams: { status: UserStatus.blocked, role: '' } },
    ];
  });

  readonly amisacheTiles = computed<StatTile[]>(() => {
    const ds = this.amisacheStats();
    if (!ds) return [];
    const tiles: StatTile[] = [
      { label: 'Demandes reçues', icon: 'fas fa-inbox', color: 'warning', value: ds.pendingRequests, route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.SUBMITTED) },
      { label: 'Demandes en cours', icon: 'fas fa-hourglass-half', color: 'info', value: ds.inProgressRequests, route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.IN_PROGRESS) },
      { label: 'Paiements à confirmer', icon: 'fas fa-receipt', color: 'danger', value: ds.pendingPayments, route: '/payment/transactions', queryParams: paymentsQuery(PaymentStatus.SUBMITTED) },
    ];
    // `pendingChurches` n'existe qu'à l'échelle plateforme (null pour une seule église).
    tiles.push(ds.pendingChurches !== null
      ? { label: 'Églises à valider', icon: 'fas fa-church', color: 'primary', value: ds.pendingChurches, route: '/churches', queryParams: { status: ValidationStatus.PENDING, type: '' } }
      : { label: 'Publications en ligne', icon: 'fas fa-bullhorn', color: 'success', value: ds.publishedPublications, route: '/community/publications' });
    return tiles;
  });

  readonly recentRequests = computed(() => {
    const items = this.requests();
    if (!items) return items;
    return [...items]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, RECENT_REQUESTS_LIMIT);
  });

  readonly requestBreakdown = computed(() => {
    const items = this.requests();
    if (!items) return [];
    const total = items.length;
    return Object.values(RequestStatus).map((status) => {
      const count = items.filter((r) => r.status === status).length;
      return {
        status,
        label: REQUEST_STATUS_LABELS[status],
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      };
    });
  });

  readonly requestTotal = computed(() => this.requests()?.length ?? 0);

  readonly todoItems = computed<TodoItem[]>(() => {
    const ds = this.amisacheStats();
    const todo = this.todoCounts();
    const items: TodoItem[] = [];
    if (ds) {
      items.push({
        title: 'Demandes à traiter', desc: 'Demandes reçues, pas encore prises en charge',
        icon: 'fas fa-inbox', level: 'warning', count: ds.pendingRequests,
        route: '/liturgy/requests', queryParams: requestsQuery(RequestStatus.SUBMITTED),
      });
      items.push({
        title: 'Paiements à confirmer', desc: 'Reçus déclarés par les fidèles, en attente de vérification',
        icon: 'fas fa-receipt', level: 'danger', count: ds.pendingPayments,
        route: '/payment/transactions', queryParams: paymentsQuery(PaymentStatus.SUBMITTED),
      });
      if (ds.pendingChurches !== null) {
        items.push({
          title: 'Églises à valider', desc: 'Inscriptions en attente de validation',
          icon: 'fas fa-church', level: 'info', count: ds.pendingChurches,
          route: '/churches', queryParams: { status: ValidationStatus.PENDING, type: '' },
        });
      }
    }
    if (todo) {
      items.push({
        title: 'Messages non lus', desc: 'Formulaire de contact — nouveaux messages',
        icon: 'fas fa-envelope', level: 'info', count: todo.newContacts,
        route: '/contact', queryParams: { status: ContactMessageStatus.new },
      });
      items.push({
        title: 'Emails échoués', desc: 'En attente de relance ou d’abandon',
        icon: 'fas fa-envelope-open-text', level: 'danger', count: todo.failedMails,
        route: '/mail/failed',
      });
    }
    return items;
  });

  readonly allClear = computed(() => this.todoItems().length > 0 && this.todoItems().every((i) => i.count === 0));

  readonly quickLinks = computed<QuickLink[]>(() => {
    const links: QuickLink[] = [
      { title: 'Demandes', desc: 'Intentions de messe et sacrements', icon: 'fas fa-inbox', color: 'warning', route: '/liturgy/requests' },
      { title: 'Paiements', desc: 'Reçus à confirmer ou rejeter', icon: 'fas fa-receipt', color: 'danger', route: '/payment/transactions' },
      { title: 'Horaires', desc: 'Messes et célébrations', icon: 'fas fa-clock', color: 'info', route: '/liturgy/schedules' },
      { title: 'Publications', desc: 'Annonces aux fidèles', icon: 'fas fa-bullhorn', color: 'success', route: '/community/publications' },
      { title: 'Tarifs & délais', desc: 'Offrandes et délais de dépôt', icon: 'fas fa-tags', color: 'primary', route: '/liturgy/tariffs' },
    ];
    if (this.clergyContext.isFullAccess()) {
      links.push(
        { title: 'Églises', desc: 'Paroisses, validation et structure', icon: 'fas fa-church', color: 'primary', route: '/churches' },
        { title: 'Types de demande', desc: 'Catalogue proposé aux fidèles', icon: 'fas fa-list-ul', color: 'info', route: '/request-types' },
        { title: 'Paramètres', desc: "Configuration de l'application", icon: 'fas fa-sliders-h', color: 'primary', route: '/settings' },
      );
    } else {
      links.push({ title: 'Mon église', desc: 'Profil, clergé et entrées', icon: 'fas fa-church', color: 'primary', route: '/churches' });
    }
    return links;
  });

  constructor() {
    // Recharge quand le clergé change d'église active (sélecteur du topbar).
    effect(() => {
      this.clergyContext.activeChurchId();
      this.clergyContext.isFullAccess();
      untracked(() => this.load());
    });
  }

  // Clergé sans accès complet : jamais GET /users ni les routes admin (403
  // garanti, statistiques plateforme sans rapport avec son périmètre) —
  // chiffres de son église active.
  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    const fullAccess = this.clergyContext.isFullAccess();
    const churchId = fullAccess ? undefined : (this.clergyContext.activeChurchId() ?? undefined);

    forkJoin({
      total: fullAccess ? this.dashboardService.countUsers() : of(0),
      active: fullAccess ? this.dashboardService.countUsers(UserStatus.active) : of(0),
      unverified: fullAccess ? this.dashboardService.countUsers(UserStatus.unverified) : of(0),
      blocked: fullAccess ? this.dashboardService.countUsers(UserStatus.blocked) : of(0),
      amisacheStats: fullAccess || churchId ? this.dashboardService.getStats(churchId) : of(null),
    }).subscribe({
      next: ({ total, active, unverified, blocked, amisacheStats }) => {
        this.stats.set({ total, active, unverified, blocked });
        this.amisacheStats.set(amisacheStats);
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

    this.loadSecondary(fullAccess, churchId);
  }

  /** Sections indépendantes — l'échec de l'une n'empêche pas l'affichage des autres. */
  private loadSecondary(fullAccess: boolean, churchId: string | undefined): void {
    if (fullAccess || churchId) {
      this.dashboardService
        .requests(churchId)
        .pipe(catchError(() => of(null)))
        .subscribe((requests) => this.requests.set(requests));
    } else {
      this.requests.set([]);
    }

    // Libellés des demandes récentes : églises (référentiel déjà mis en cache
    // par les sélecteurs) et, pour l'admin, fidèles — les demandes de
    // /requests/admin n'embarquent pas `user`.
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (fullAccess && this.userService.allForSelect() === undefined) {
      this.userService.listAllForSelect().subscribe({ error: () => undefined });
    }

    if (fullAccess) {
      forkJoin({
        newContacts: this.dashboardService.countContactMessages(ContactMessageStatus.new),
        failedMails: this.dashboardService.countFailedMails(),
      })
        .pipe(catchError(() => of(null)))
        .subscribe((todo) => this.todoCounts.set(todo));
    } else {
      this.todoCounts.set(null);
    }
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  requesterName(r: Request): string {
    const u = r.user ?? (this.userService.allForSelect() ?? []).find((x) => x.id === r.userId);
    if (!u) return 'Fidèle';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'Fidèle';
  }

  churchName(r: Request): string {
    return r.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === r.churchId)?.name ?? '';
  }

  requestSubtitle(r: Request): string {
    const parts = [this.requesterName(r), this.churchName(r)];
    if (r.date) parts.push(`le ${r.date.slice(0, 10).split('-').reverse().join('/')}`);
    return parts.filter((p) => !!p).join(' · ');
  }
}
