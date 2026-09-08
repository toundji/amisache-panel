import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AvatarHelper } from '../../avatar/avatar.helper';
import { NotificationBellComponent } from '../../notification-bell/notification-bell.component';
import { NavigationHistoryService } from '../../navigation/navigation-history.service';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, RouterLink, NotificationBellComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  readonly authService = inject(AuthService);
  readonly navHistory = inject(NavigationHistoryService);

  // Émet un simple signal "toggle" sans valeur — le layout inverse son état
  @Output() sidebarToggled = new EventEmitter<void>();

  // État réel du menu, fourni par le layout (drawer ouvert sur mobile, sidebar
  // déployée sur desktop) — pilote uniquement l'icône bars/times.
  @Input() menuOpen = false;

  toggleSidebar(): void {
    this.sidebarToggled.emit();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  logout(): void {
    this.authService.logout();
  }

  get initials(): string {
    const u = this.authService.user();
    return AvatarHelper.initials(u?.firstName, u?.lastName, u?.email);
  }
}
