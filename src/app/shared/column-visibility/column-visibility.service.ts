import { Injectable, signal } from '@angular/core';

export interface ColumnDef {
  /** Doit correspondre à la clé utilisée dans le template (`@if (columnVisibility.isVisible('email'))`). */
  key: string;
  label: string;
  /** false = masquée par défaut au premier chargement. Défaut : true. */
  defaultVisible?: boolean;
}

/**
 * Visibilité de colonnes configurable par l'utilisateur, persistée en
 * localStorage. Générique et sans connaissance d'aucune entité — chaque
 * tableau définit sa propre liste de colonnes (y compris des colonnes
 * dérivées d'une sous-entité liée, ex. `service.name`) et son propre
 * `storageKey` via `init()`.
 *
 * Instance PAR COMPOSANT (`providers: [ColumnVisibilityService]`, comme
 * `PaginationService`) — jamais `providedIn: 'root'`, sinon toutes les
 * listes de l'appli partageraient le même état.
 *
 * Les colonnes qui ne doivent jamais être masquables (ex. la colonne
 * "Utilisateur" ou "Actions") ne sont simplement pas déclarées ici —
 * le template les affiche sans passer par `isVisible()`.
 */
@Injectable()
export class ColumnVisibilityService {
  private storageKey = '';
  private columnsSignal = signal<ColumnDef[]>([]);
  private visibleKeysSignal = signal<Set<string>>(new Set());

  readonly columns = this.columnsSignal.asReadonly();

  init(storageKey: string, columns: ColumnDef[]): void {
    this.storageKey = `columns:${storageKey}`;
    this.columnsSignal.set(columns);
    this.visibleKeysSignal.set(this.loadFromStorage(columns) ?? this.defaultsOf(columns));
  }

  isVisible(key: string): boolean {
    return this.visibleKeysSignal().has(key);
  }

  toggle(key: string): void {
    const next = new Set(this.visibleKeysSignal());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.visibleKeysSignal.set(next);
    this.persist(next);
  }

  resetToDefaults(): void {
    const defaults = this.defaultsOf(this.columnsSignal());
    this.visibleKeysSignal.set(defaults);
    this.persist(defaults);
  }

  private defaultsOf(columns: ColumnDef[]): Set<string> {
    return new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key));
  }

  private persist(keys: Set<string>): void {
    localStorage.setItem(this.storageKey, JSON.stringify([...keys]));
  }

  /** Ignore les clés stockées qui ne correspondent plus à une colonne déclarée (ex. après une évolution du template). */
  private loadFromStorage(columns: ColumnDef[]): Set<string> | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const savedKeys: string[] = JSON.parse(raw);
      const validKeys = new Set(columns.map((c) => c.key));
      return new Set(savedKeys.filter((k) => validKeys.has(k)));
    } catch {
      return null;
    }
  }
}
