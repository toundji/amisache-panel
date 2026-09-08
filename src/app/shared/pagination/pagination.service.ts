import { Injectable, signal, computed, untracked } from '@angular/core';

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

/**
 * Deux usages possibles :
 * - Pagination CLIENT (liste chargée en une fois) : `setTotalOnly()` +
 *   `slice()` dans un `computed`, comme ambassade-benin-ru l'utilise pour ses
 *   listes non paginées côté API.
 * - Pagination SERVEUR (ex: GET /users, paginé côté nest-auth-base) : ignorer
 *   `slice()`, appeler `setTotalOnly(response.total)` après chaque fetch, et
 *   déclencher un nouveau fetch sur changement de `currentPage`/`itemsPerPage`.
 */
@Injectable()
export class PaginationService {
  private state = signal<PaginationState>({
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
  });

  readonly currentPage = computed(() => this.state().currentPage);
  readonly itemsPerPage = computed(() => this.state().itemsPerPage);
  readonly totalItems = computed(() => this.state().totalItems);

  readonly totalPages = computed(() => Math.ceil(this.state().totalItems / this.state().itemsPerPage) || 1);

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  });

  readonly startItem = computed(() => (this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.itemsPerPage() + 1));

  readonly endItem = computed(() => Math.min(this.currentPage() * this.itemsPerPage(), this.totalItems()));

  setItemsPerPage(n: number): void {
    this.state.update((s) => ({ ...s, itemsPerPage: n, currentPage: 1 }));
  }

  goTo(page: number): void {
    const total = untracked(() => this.totalPages());
    if (page < 1 || page > total) return;
    this.state.update((s) => ({ ...s, currentPage: page }));
  }

  next(): void { this.goTo(untracked(() => this.currentPage()) + 1); }
  prev(): void { this.goTo(untracked(() => this.currentPage()) - 1); }

  reset(): void {
    untracked(() => this.state.update((s) => ({ ...s, currentPage: 1 })));
  }

  /** Renseigne le total sans déclencher de recalcul — à appeler après un fetch serveur. */
  setTotalOnly(total: number): void {
    untracked(() => this.state.update((s) => ({ ...s, totalItems: total })));
  }

  /** Slice pur — pagination CLIENT uniquement. Lit currentPage/itemsPerPage → dépendance réactive. */
  slice<T>(items: T[]): T[] {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }
}
