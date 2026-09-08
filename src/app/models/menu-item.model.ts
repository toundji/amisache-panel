export interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  badge?: string;
  badgeClass?: string;
  isExpanded?: boolean;
  children?: MenuItem[];
}
