// Briques d'affichage partagées par les deux accueils (plateforme / église) —
// styles dans home.component.scss.

export type TileColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

/** Tuile statistique — toujours cliquable, vers la liste dédiée préfiltrée. */
export interface StatTile {
  label: string;
  icon: string;
  color: TileColor;
  value: number;
  route: string;
  queryParams?: Record<string, string>;
}

export interface QuickLink {
  title: string;
  desc: string;
  icon: string;
  color: TileColor;
  route: string;
}

export interface TodoItem {
  title: string;
  desc: string;
  icon: string;
  level: 'warning' | 'danger' | 'info';
  count: number;
  route: string;
  queryParams?: Record<string, string>;
}

export const todayLabel = (): string =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
