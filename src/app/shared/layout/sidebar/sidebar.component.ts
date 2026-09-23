import { Component, computed, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../../models/menu-item.model';
import { AuthService } from '../../../services/auth.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
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
  readonly clergyContext = inject(ClergyContextService);

  isMobile = false;
  currentYear = new Date().getFullYear();
  private resizeListener?: () => void;

  // Profil/Sessions : accessibles depuis le dropdown du topbar, pas dupliqués ici
  // (cf. CLAUDE.md § Sidebar).
  menuItems: MenuItem[] = [
    { title: 'Tableau de bord', icon: 'fas fa-th-large', route: '/' },
    { title: 'Utilisateurs', icon: 'fas fa-users', route: '/users', adminOnly: true },
    { title: 'Notifications', icon: 'fas fa-bell', route: '/notifications' },
    { title: 'Chat', icon: 'fas fa-comments', route: '/chat', adminOnly: true },
    {
      title: 'Découpage géo', icon: 'fas fa-map-location-dot',
      children: [
        { title: 'Pays', icon: 'fas fa-flag', route: '/geo/countries' },
        { title: 'Régions', icon: 'fas fa-map', route: '/geo/regions' },
        { title: 'Zones', icon: 'fas fa-draw-polygon', route: '/geo/zones' },
        { title: 'Villages / Quartiers', icon: 'fas fa-house-chimney', route: '/geo/villages' },
      ],
    },
    { title: 'Types', icon: 'fas fa-tags', route: '/types', adminOnly: true },
    {
      title: 'Hiérarchie ecclésiale', icon: 'fas fa-church',
      children: [
        { title: 'Églises', icon: 'fas fa-sitemap', route: '/churches' },
        { title: 'Arborescence', icon: 'fas fa-diagram-project', route: '/churches/tree', adminOnly: true },
        { title: 'Clergé & personnel', icon: 'fas fa-user-tie', route: '/clergy-members' },
        { title: 'Entrées', icon: 'fas fa-door-open', route: '/entrances' },
        { title: 'Abonnements fidèles', icon: 'fas fa-hand-holding-heart', route: '/memberships' },
      ],
    },
    {
      title: 'Vie liturgique', icon: 'fas fa-hands-praying',
      children: [
        { title: 'Horaires', icon: 'fas fa-calendar-day', route: '/liturgy/schedules' },
        { title: 'Demandes', icon: 'fas fa-envelope-open-text', route: '/liturgy/requests' },
        { title: 'Dons', icon: 'fas fa-hand-holding-dollar', route: '/liturgy/donations' },
        { title: 'Tarifs', icon: 'fas fa-coins', route: '/liturgy/tariffs' },
      ],
    },
    {
      title: 'Paiements', icon: 'fas fa-money-bill-transfer',
      children: [
        { title: 'Paiements', icon: 'fas fa-receipt', route: '/payment/transactions' },
        { title: 'Moyens de paiement', icon: 'fas fa-wallet', route: '/payment/methods' },
      ],
    },
    {
      title: 'Communauté', icon: 'fas fa-people-group',
      children: [
        { title: 'Groupes', icon: 'fas fa-people-line', route: '/community/groups' },
        { title: 'Publications', icon: 'fas fa-newspaper', route: '/community/publications' },
      ],
    },
    {
      title: 'Contenu', icon: 'fas fa-file-alt',
      children: [
        { title: 'Messages de contact', icon: 'fas fa-envelope', route: '/contact' },
        { title: 'FAQ', icon: 'fas fa-question-circle', route: '/faq', adminOnly: true },
      ],
    },
    {
      title: 'Système', icon: 'fas fa-cog', adminOnly: true,
      children: [
        { title: 'Emails échoués', icon: 'fas fa-envelope-open-text', route: '/mail/failed' },
        { title: 'Paramètres', icon: 'fas fa-sliders-h', route: '/settings' },
      ],
    },
  ];

  /**
   * Sidebar effective — retire les entrées admin-only pour un compte clergy
   * sans accès complet, et les groupes qui n'ont plus aucun enfant visible.
   * `computed()`, pas un getter : un getter est réévalué à CHAQUE cycle de
   * détection de changement Angular, ce qui reconstruisait un objet
   * `{ ...item, children: [...] }` neuf à chaque fois — `toggleSubMenu`
   * mutait bien `isExpanded` sur l'objet du rendu courant, mais le cycle
   * suivant repartait d'une copie fraîche de `menuItems` (jamais mutée) et
   * perdait l'état, donnant l'impression qu'aucun sous-menu ne s'ouvrait
   * (pour un clergy uniquement — l'admin, qui reçoit `menuItems` tel quel,
   * n'était pas affecté). `computed()` ne recalcule que quand
   * `isFullAccess()` change, donc les objets renvoyés restent stables et
   * mutables entre deux rendus.
   */
  visibleMenuItems = computed<MenuItem[]>(() => {
    if (this.clergyContext.isFullAccess()) return this.menuItems;

    return this.menuItems
      .filter((item) => !item.adminOnly)
      .map((item) =>
        item.children ? { ...item, children: item.children.filter((c) => !c.adminOnly) } : item,
      )
      .filter((item) => !item.children || item.children.length > 0);
  });

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
