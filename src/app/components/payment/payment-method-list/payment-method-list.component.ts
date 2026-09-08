import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PaymentMethodService } from '../../../services/payment-method.service';
import { ChurchService } from '../../../services/church.service';
import { PaymentMethod } from '../../../models/payment-method.model';
import { PAYMENT_OPERATOR_LABELS, PaymentOperator } from '../../../models/payment.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface MethodFilters {
  churchId: string;
  operator: PaymentOperator | '';
  activeOnly: boolean;
  search: string;
}

const STORAGE_KEY = 'paymentMethodFilters';

function loadPersisted(): Partial<Pick<MethodFilters, 'churchId' | 'operator' | 'activeOnly'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-payment-method-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './payment-method-list.component.html',
  styleUrl: './payment-method-list.component.scss',
})
export class PaymentMethodListComponent {
  readonly methodService = inject(PaymentMethodService);
  readonly churchService = inject(ChurchService);
  readonly pagination = inject(PaginationService);

  operatorList = Object.values(PaymentOperator);
  operatorLabels = PAYMENT_OPERATOR_LABELS;

  methods = this.methodService.methods;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.methods() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<MethodFilters>({ churchId: '', operator: '', activeOnly: false, search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.operator || f.activeOnly || !!f.search;
  });

  filtered = computed(() => {
    const items = this.methods() ?? [];
    const { churchId, operator, activeOnly, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((m) => {
      if (churchId && m.churchId !== churchId) return false;
      if (operator && m.operator !== operator) return false;
      if (activeOnly && !m.active) return false;
      if (term) {
        const hay = `${m.accountName} ${m.phone} ${this.churchName(m)}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    const { churchId, operator, activeOnly } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, operator, activeOnly }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    // activeOnly=false → l'API renvoie aussi les méthodes désactivées.
    this.methodService.list({ activeOnly: false }).subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des moyens de paiement.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof MethodFilters>(key: K, value: MethodFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', operator: '', activeOnly: false, search: '' });
    this.pagination.reset();
  }

  churchName(m: PaymentMethod): string {
    return m.church?.name ?? (this.churches() ?? []).find((c) => c.id === m.churchId)?.name ?? '—';
  }

  deleteMethod(m: PaymentMethod): void {
    Swal.fire({
      title: 'Supprimer ce moyen de paiement ?',
      text: `« ${this.operatorLabels[m.operator]} — ${m.phone} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.methodService.delete(m.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
