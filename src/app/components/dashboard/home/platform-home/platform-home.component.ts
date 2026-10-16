import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';

import { DashboardService } from '../../../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';
import { ChurchService } from '../../../../services/church.service';
import { UserService } from '../../../../services/user.service';
import { User, UserStatus } from '../../../../models/user.model';
import { DashboardStats } from '../../../../models/dashboard.model';
import { Church, ENTITY_TYPE_LABELS, ValidationStatus } from '../../../../models/church.model';
import { RequestStatus } from '../../../../models/request.model';
import { PaymentStatus } from '../../../../models/payment.model';
import { ContactMessageStatus } from '../../../../models/contact.model';
import { UserAvatarComponent } from '../../../../shared/avatar/user-avatar.component';
import { QuickLink, StatTile, TodoItem, todayLabel } from '../dashboard-ui';

interface UserBreakdownStats {
  total: number;
  active: number;
  unverified: number;
  blocked: number;
}

interface HealthCounts {
  newContacts: number;
  failedMails: number;
  apiErrors: number;
}

// Liens « ouvre la liste préfiltrée » — chaque clé de contexte passée (vide =
// « tous ») pour ne pas hériter d'un filtre persisté (cf. filtersFromQueryParams).
const pendingChurchesQuery = { status: ValidationStatus.PENDING, type: '' };

/**
 * Accueil des administrateurs de la plateforme (admin/engineer) — validation
 * des églises, comptes, santé technique. L'activité liturgique (demandes,
 * paiements) n'y est qu'en lecture : son traitement revient au clergé de
 * chaque église.
 */
@Component({
  selector: 'app-platform-home',
  imports: [CommonModule, RouterLink, UserAvatarComponent],
  templateUrl: './platform-home.component.html',
  styleUrl: '../home.component.scss',
})
export class PlatformHomeComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  // Non privés : le template pose le stub de détail avant navigation (cf. CLAUDE.md § Pages de détail).
  readonly churchService = inject(ChurchService);
  readonly userService = inject(UserService);

  readonly entityTypeLabels = ENTITY_TYPE_LABELS;
  readonly pendingChurchesQuery = pendingChurchesQuery;
  readonly today = todayLabel();
  readonly firstName = computed(() => this.authService.user()?.firstName ?? '');

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  users = signal<UserBreakdownStats>({ total: 0, active: 0, unverified: 0, blocked: 0 });
  stats = signal<DashboardStats | null>(null);

  // Sections secondaires : `undefined` = en cours (skeleton), `null` = échec
  // (la section affiche son propre message, sans bloquer le reste du tableau de bord).
  pendingChurches = signal<Church[] | null | undefined>(undefined);
  latestUsers = signal<User[] | null | undefined>(undefined);
  health = signal<HealthCounts | null | undefined>(undefined);

  readonly userTiles = computed<StatTile[]>(() => {
    const s = this.users();
    return [
      { label: 'Utilisateurs', icon: 'fas fa-users', color: 'primary', value: s.total, route: '/users', queryParams: { status: '', role: '' } },
      { label: 'Actifs', icon: 'fas fa-user-check', color: 'success', value: s.active, route: '/users', queryParams: { status: UserStatus.active, role: '' } },
      { label: 'Non vérifiés', icon: 'fas fa-user-clock', color: 'warning', value: s.unverified, route: '/users', queryParams: { status: UserStatus.unverified, role: '' } },
      { label: 'Bloqués', icon: 'fas fa-user-slash', color: 'danger', value: s.blocked, route: '/users', queryParams: { status: UserStatus.blocked, role: '' } },
    ];
  });

  readonly churchTiles = computed<StatTile[]>(() => {
    const ds = this.stats();
    if (!ds) return [];
    return [
      { label: 'Églises inscrites', icon: 'fas fa-church', color: 'primary', value: ds.churches ?? 0, route: '/churches', queryParams: { status: '', type: '' } },
      { label: 'Églises à valider', icon: 'fas fa-hourglass-half', color: 'warning', value: ds.pendingChurches ?? 0, route: '/churches', queryParams: pendingChurchesQuery },
    ];
  });

  readonly tiles = computed(() => [...this.churchTiles(), ...this.userTiles()]);

  /** Activité liturgique de toute la plateforme — en lecture, pas une file de travail. */
  readonly activity = computed(() => {
    const ds = this.stats();
    if (!ds) return [];
    return [
      { label: 'Demandes reçues', icon: 'fas fa-inbox', value: ds.pendingRequests, route: '/liturgy/requests', queryParams: { status: RequestStatus.SUBMITTED, churchId: '' } },
      { label: 'Demandes en cours', icon: 'fas fa-hourglass-half', value: ds.inProgressRequests, route: '/liturgy/requests', queryParams: { status: RequestStatus.IN_PROGRESS, churchId: '' } },
      { label: 'Paiements en attente', icon: 'fas fa-receipt', value: ds.pendingPayments, route: '/payment/transactions', queryParams: { status: PaymentStatus.SUBMITTED, operator: '', churchId: '' } },
      { label: 'Publications en ligne', icon: 'fas fa-bullhorn', value: ds.publishedPublications, route: '/community/publications', queryParams: undefined },
    ];
  });

  readonly watchItems = computed<TodoItem[]>(() => {
    const ds = this.stats();
    const h = this.health();
    const items: TodoItem[] = [];
    if (ds) {
      items.push({
        title: 'Églises à valider', desc: 'Inscriptions en attente de validation',
        icon: 'fas fa-church', level: 'warning', count: ds.pendingChurches ?? 0,
        route: '/churches', queryParams: pendingChurchesQuery,
      });
    }
    if (h) {
      items.push(
        {
          title: 'Messages non lus', desc: 'Formulaire de contact — nouveaux messages',
          icon: 'fas fa-envelope', level: 'info', count: h.newContacts,
          route: '/contact', queryParams: { status: ContactMessageStatus.new },
        },
        {
          title: 'Emails échoués', desc: 'En attente de relance ou d’abandon',
          icon: 'fas fa-envelope-open-text', level: 'danger', count: h.failedMails,
          route: '/mail/failed',
        },
        {
          title: 'Erreurs serveur', desc: 'Erreurs API journalisées',
          icon: 'fas fa-triangle-exclamation', level: 'danger', count: h.apiErrors,
          route: '/api-errors',
        },
      );
    }
    return items;
  });

  readonly allClear = computed(() => this.watchItems().length > 0 && this.watchItems().every((i) => i.count === 0));

  readonly quickLinks: QuickLink[] = [
    { title: 'Églises', desc: 'Paroisses, validation et structure', icon: 'fas fa-church', color: 'primary', route: '/churches' },
    { title: 'Arborescence', desc: 'Hiérarchie diocèses → paroisses', icon: 'fas fa-diagram-project', color: 'info', route: '/churches/tree' },
    { title: 'Utilisateurs', desc: 'Comptes, statuts et rôles', icon: 'fas fa-users', color: 'success', route: '/users' },
    { title: 'Types de demande', desc: 'Catalogue proposé aux fidèles', icon: 'fas fa-book', color: 'warning', route: '/request-types' },
    { title: 'Paramètres', desc: "Configuration de l'application", icon: 'fas fa-sliders-h', color: 'primary', route: '/settings' },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    forkJoin({
      total: this.dashboardService.countUsers(),
      active: this.dashboardService.countUsers(UserStatus.active),
      unverified: this.dashboardService.countUsers(UserStatus.unverified),
      blocked: this.dashboardService.countUsers(UserStatus.blocked),
      stats: this.dashboardService.getStats(),
    }).subscribe({
      next: ({ total, active, unverified, blocked, stats }) => {
        this.users.set({ total, active, unverified, blocked });
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

    this.loadSecondary();
  }

  /** Sections indépendantes — l'échec de l'une n'empêche pas l'affichage des autres. */
  private loadSecondary(): void {
    this.dashboardService
      .pendingChurches()
      .pipe(catchError(() => of(null)))
      .subscribe((result) => this.pendingChurches.set(result ? result.data : null));

    this.dashboardService
      .latestUsers()
      .pipe(catchError(() => of(null)))
      .subscribe((users) => this.latestUsers.set(users));

    // Chaque compteur tolère son propre échec : un endpoint indisponible ne
    // doit pas masquer les deux autres.
    forkJoin({
      newContacts: this.dashboardService.countContactMessages(ContactMessageStatus.new).pipe(catchError(() => of(0))),
      failedMails: this.dashboardService.countFailedMails().pipe(catchError(() => of(0))),
      apiErrors: this.dashboardService.countApiErrors().pipe(catchError(() => of(0))),
    }).subscribe((health) => this.health.set(health));
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  userName(u: User): string {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || '—';
  }

  churchPlace(c: Church): string {
    return [this.entityTypeLabels[c.type], c.address?.locality].filter((p) => !!p).join(' · ');
  }
}
