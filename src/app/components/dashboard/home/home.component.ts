import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../../services/user.service';
import { SessionService } from '../../../services/session.service';
import { UserStatus } from '../../../models/user.model';
import { UserSessionInfo } from '../../../models/session.model';

interface DashboardStats {
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

  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  stats = signal<DashboardStats>({ total: 0, active: 0, unverified: 0, blocked: 0 });
  recentSessions = signal<UserSessionInfo[]>([]);

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    forkJoin({
      total: this.userService.listUsers({ limit: 1 }),
      active: this.userService.listUsers({ limit: 1, status: UserStatus.active }),
      unverified: this.userService.listUsers({ limit: 1, status: UserStatus.unverified }),
      blocked: this.userService.listUsers({ limit: 1, status: UserStatus.blocked }),
      sessions: this.sessionService.getSessions(),
    }).subscribe({
      next: ({ total, active, unverified, blocked, sessions }) => {
        this.stats.set({
          total: total.total,
          active: active.total,
          unverified: unverified.total,
          blocked: blocked.total,
        });
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
