import { Component, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../../services/user.service';
import { SessionService } from '../../../services/session.service';
import { DashboardService } from '../../../services/dashboard.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { UserStatus } from '../../../models/user.model';
import { UserSessionInfo } from '../../../models/session.model';
import { DashboardStats } from '../../../models/dashboard.model';

interface UserBreakdownStats {
  total: number;
  active: number;
  unverified: number;
  blocked: number;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly userService = inject(UserService);
  private readonly sessionService = inject(SessionService);
  private readonly dashboardService = inject(DashboardService);
  readonly clergyContext = inject(ClergyContextService);

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  stats = signal<UserBreakdownStats>({ total: 0, active: 0, unverified: 0, blocked: 0 });
  // Chiffres métier (demandes, paiements, publications, églises) — plateforme
  // pour admin/engineer, église active pour le clergé. `null` = pas encore
  // chargé (ou aucune église active), distinct de 0.
  amisacheStats = signal<DashboardStats | null>(null);
  recentSessions = signal<UserSessionInfo[]>([]);

  constructor() {
    // Recharge quand le clergé change d'église active (sélecteur du topbar).
    effect(() => {
      this.clergyContext.activeChurchId();
      this.clergyContext.isFullAccess();
      untracked(() => this.load());
    });
  }

  // Clergé sans accès complet : jamais GET /users (403 garanti, statistiques
  // plateforme sans rapport avec son périmètre) — chiffres de son église active.
  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    const fullAccess = this.clergyContext.isFullAccess();
    const churchId = fullAccess ? undefined : (this.clergyContext.activeChurchId() ?? undefined);
    const empty = { total: 0 };

    forkJoin({
      total: fullAccess ? this.userService.listUsers({ limit: 1 }) : of(empty),
      active: fullAccess ? this.userService.listUsers({ limit: 1, status: UserStatus.active }) : of(empty),
      unverified: fullAccess ? this.userService.listUsers({ limit: 1, status: UserStatus.unverified }) : of(empty),
      blocked: fullAccess ? this.userService.listUsers({ limit: 1, status: UserStatus.blocked }) : of(empty),
      sessions: this.sessionService.getSessions(),
      amisacheStats: fullAccess || churchId ? this.dashboardService.getStats(churchId) : of(null),
    }).subscribe({
      next: ({ total, active, unverified, blocked, sessions, amisacheStats }) => {
        this.stats.set({
          total: total.total,
          active: active.total,
          unverified: unverified.total,
          blocked: blocked.total,
        });
        this.amisacheStats.set(amisacheStats);
        this.recentSessions.set(sessions.slice(0, 5));
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
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }
}
