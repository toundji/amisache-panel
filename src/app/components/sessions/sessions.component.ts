import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { DeviceType, UserSessionInfo } from '../../models/session.model';

@Component({
  selector: 'app-sessions',
  imports: [CommonModule],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss',
})
export class SessionsComponent {
  private readonly sessionService = inject(SessionService);
  private readonly authService = inject(AuthService);

  DeviceType = DeviceType;
  sessions = this.sessionService.sessions;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.sessions() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.sessionService.getSessions().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des sessions.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  revoke(session: UserSessionInfo): void {
    Swal.fire({
      title: 'Déconnecter cet équipement ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Déconnecter',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.sessionService.revoke(session.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Impossible de déconnecter cet équipement.', 'error'),
      });
    });
  }

  logoutAll(): void {
    Swal.fire({
      title: 'Déconnecter tous les équipements ?',
      text: 'Vous serez également déconnecté de cet appareil.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Tout déconnecter',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (result.isConfirmed) this.authService.logoutAllDevices();
    });
  }

  deviceIcon(type?: DeviceType): string {
    switch (type) {
      case DeviceType.mobile: return 'fas fa-mobile-alt';
      case DeviceType.tablet: return 'fas fa-tablet-alt';
      case DeviceType.desktop: return 'fas fa-desktop';
      default: return 'fas fa-question-circle';
    }
  }
}
