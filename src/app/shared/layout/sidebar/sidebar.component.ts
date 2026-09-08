import { Component, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../../models/menu-item.model';
import { AuthService } from '../../../services/auth.service';
import { AvatarHelper } from '../../avatar/avatar.helper';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isCollapsed = false;
  @Input() isMobileOpen = false;
  // Fermeture « franche » du drawer : backdrop ou bouton ×.
  @Output() mobileSidebarClosed = new EventEmitter<void>();
  // Fermeture provoquée par un clic sur un lien du menu (navigation en cours).
  @Output() navigated = new EventEmitter<void>();

  readonly authService = inject(AuthService);

  isMobile = false;
  currentYear = new Date().getFullYear();
  private resizeListener?: () => void;

  // Profil/Sessions : accessibles depuis le dropdown du topbar, pas dupliqués ici
  // (cf. CLAUDE.md § Sidebar).
  menuItems: MenuItem[] = [
    { title: 'Tableau de bord', icon: 'fas fa-th-large', route: '/' },
    { title: 'Utilisateurs', icon: 'fas fa-users', route: '/users' },
    { title: 'Notifications', icon: 'fas fa-bell', route: '/notifications' },
    { title: 'Chat', icon: 'fas fa-comments', route: '/chat' },
    {
      title: 'Découpage géo', icon: 'fas fa-map-location-dot',
      children: [
        { title: 'Pays', icon: 'fas fa-flag', route: '/geo/countries' },
        { title: 'Régions', icon: 'fas fa-map', route: '/geo/regions' },
        { title: 'Zones', icon: 'fas fa-draw-polygon', route: '/geo/zones' },
        { title: 'Villages / Quartiers', icon: 'fas fa-house-chimney', route: '/geo/villages' },
      ],
    },
    { title: 'Types', icon: 'fas fa-tags', route: '/types' },
    {
      title: 'Hiérarchie ecclésiale', icon: 'fas fa-church',
      children: [
        { title: 'Entités', icon: 'fas fa-sitemap', route: '/churches' },
        { title: 'Clergé & personnel', icon: 'fas fa-user-tie', route: '/clergy-members' },
        { title: 'Entrées', icon: 'fas fa-door-open', route: '/entrances' },
        { title: 'Abonnements fidèles', icon: 'fas fa-hand-holding-heart', route: '/memberships' },
      ],
    },
    {
      title: 'Contenu', icon: 'fas fa-file-alt',
      children: [
        { title: 'Messages de contact', icon: 'fas fa-envelope', route: '/contact' },
        { title: 'FAQ', icon: 'fas fa-question-circle', route: '/faq' },
      ],
    },
    {
      title: 'Système', icon: 'fas fa-cog',
      children: [
        { title: 'Emails échoués', icon: 'fas fa-envelope-open-text', route: '/mail/failed' },
        { title: 'Paramètres', icon: 'fas fa-sliders-h', route: '/settings' },
      ],
    },
  ];

  ngOnInit(): void {
    this.checkScreenSize();
    this.resizeListener = () => this.checkScreenSize();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
  }

  @HostListener('window:resize')
  onResize(): void { this.checkScreenSize(); }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  toggleSubMenu(item: MenuItem): void {
    if (item.children) item.isExpanded = !item.isExpanded;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarClosed.emit();
  }

  onNavigate(): void {
    this.navigated.emit();
  }

  trackByFn(_index: number, item: MenuItem): string {
    return item.title;
  }

  get showText(): boolean {
    return (!this.isCollapsed && !this.isMobile) || this.isMobileOpen;
  }

  get initials(): string {
    const u = this.authService.user();
    return AvatarHelper.initials(u?.firstName, u?.lastName, u?.email);
  }
}
