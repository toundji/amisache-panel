export interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  badge?: string;
  badgeClass?: string;
  isExpanded?: boolean;
  children?: MenuItem[];
  /** Masqué pour un compte clergy sans rôle admin/engineer — voir RoleGuard. */
  adminOnly?: boolean;
}
