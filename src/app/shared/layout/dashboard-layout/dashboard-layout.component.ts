import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { OverlayHistoryService } from '../../navigation/overlay-history.service';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
})
export class DashboardLayoutComponent {
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;
  isMobile = false;
  currentYear = new Date().getFullYear();

  private readonly overlayHistory = inject(OverlayHistoryService);
  // Vrai tant qu'un cran d'historique est posé pour le drawer mobile.
  private drawerRegistered = false;

  ngOnInit(): void { this.checkScreenSize(); }

  @HostListener('window:resize')
  onResize(): void { this.checkScreenSize(); }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isSidebarCollapsed = false; // mobile = pas collapsed, juste caché par transform
    } else if (this.isMobileSidebarOpen) {
      this.closeMobileSidebar();
    }
  }

  // La topbar émet un simple signal "toggle demandé" sans valeur — on inverse l'état courant
  onSidebarToggled(): void {
    if (!this.isMobile) {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      return;
    }
    if (this.isMobileSidebarOpen) this.closeMobileSidebar();
    else this.openMobileSidebar();
  }

  private openMobileSidebar(): void {
    this.isMobileSidebarOpen = true;
    this.drawerRegistered = true;
    // Bouton « retour » de l'OS / du navigateur → referme le drawer.
    this.overlayHistory.register(() => {
      this.drawerRegistered = false;
      this.isMobileSidebarOpen = false;
    });
  }

  /** Fermeture par le backdrop ou le bouton × — retire le cran d'historique. */
  closeMobileSidebar(): void {
    if (!this.isMobileSidebarOpen) return;
    this.isMobileSidebarOpen = false;
    if (this.drawerRegistered) {
      this.drawerRegistered = false;
      this.overlayHistory.release();
    }
  }

  /** Fermeture provoquée par un clic sur un lien du menu — pas de history.back(). */
  closeMobileSidebarForNav(): void {
    if (!this.isMobileSidebarOpen) return;
    this.isMobileSidebarOpen = false;
    if (this.drawerRegistered) {
      this.drawerRegistered = false;
      this.overlayHistory.discardTop();
    }
  }
}
