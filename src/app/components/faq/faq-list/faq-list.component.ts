import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { FaqService } from '../../../services/faq.service';
import { FAQ_CATEGORY_LABELS, Faq, FaqCategory } from '../../../models/faq.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { BackDismissDirective } from '../../../shared/navigation/back-dismiss.directive';

interface FaqFilters {
  answered: 'true' | 'false' | '';
  category: FaqCategory | '';
  search: string;
}

// Persisté entre visites — jamais `search` (texte libre), cf. CLAUDE.md §
// Filtres et recherche. `category` est maintenant un enum, comme `status`
// ailleurs — c'est un choix de contexte de travail durable, pas du texte libre.
type PersistedFaqFilters = Pick<FaqFilters, 'answered' | 'category'>;
const STORAGE_KEY = 'faqFilters';

function loadPersistedFilters(): Partial<PersistedFaqFilters> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-faq-list',
  // Instance locale — pagination propre à CETTE liste.
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, BackDismissDirective],
  templateUrl: './faq-list.component.html',
  styleUrl: './faq-list.component.scss',
})
export class FaqListComponent {
  // Non privé : le template appelle `faqService.select(faq)` avant de naviguer vers le détail.
  readonly faqService = inject(FaqService);
  readonly pagination = inject(PaginationService);

  categoryList = Object.values(FaqCategory);
  categoryLabels = FAQ_CATEGORY_LABELS;

  faqs = this.faqService.faqs;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.faqs() === undefined);
  error = signal<string | null>(null);
  // Rechargement (page/filtre/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  filters = signal<FaqFilters>({
    answered: '',
    category: '',
    search: '',
    ...loadPersistedFilters(),
  });
  hasAdvancedFilters = computed(() => this.filters().answered !== '' || !!this.filters().category);

  private persistFilters = effect(() => {
    const { answered, category } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answered, category }));
  });

  // Incrémenté pour forcer un rechargement de la page courante (ex: après une
  // suppression ou un clic sur "Actualiser") sans changer page/filtres.
  private reloadTrigger = signal(0);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — distingue l'overlay Swal.showLoading() des rechargements silencieux.
  private isManualRefresh = false;

  // GET /faq/admin est paginé côté serveur (ordre fixe : sortOrder puis
  // createdAt, pas de tri dynamique côté API) : on relance un fetch à chaque
  // changement de page/taille de page, de filtres, ou de reloadTrigger.
  private reload = effect(() => {
    const page = this.pagination.currentPage();
    const limit = this.pagination.itemsPerPage();
    const filters = this.filters();
    this.reloadTrigger();

    const showLoader = this.isManualRefresh;
    this.isManualRefresh = false;

    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.faqService
      .listAdmin({
        page,
        limit,
        category: filters.category || undefined,
        answered: filters.answered === '' ? undefined : filters.answered === 'true',
        search: filters.search || undefined,
      })
      .subscribe({
        next: (result) => {
          this.pagination.setTotalOnly(result.total);
          this.refreshing.set(false);
          if (showLoader) Swal.close();
        },
        error: () => {
          this.refreshing.set(false);
          this.error.set('Erreur lors du chargement des FAQ.');
          if (showLoader) Swal.close();
        },
      });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.forceReload();
  }

  updateFilter<K extends keyof FaqFilters>(key: K, value: FaqFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.update((f) => ({ ...f, answered: '', category: '', search: '' }));
    this.pagination.reset();
  }

  private forceReload(): void {
    this.reloadTrigger.update((v) => v + 1);
  }

  categoryLabel(category: FaqCategory | ''): string {
    return category ? this.categoryLabels[category] : '';
  }

  isAnswered(faq: Faq): boolean {
    return !!faq.answeredAt;
  }

  isHidden(faq: Faq): boolean {
    return !!faq.hiddenAt;
  }

  deleteFaq(faq: Faq): void {
    Swal.fire({
      title: 'Supprimer cette FAQ ?',
      text: `« ${faq.question} » sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.faqService.delete(faq.id).subscribe({
        next: () => this.forceReload(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
