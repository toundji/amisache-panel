import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PaymentService } from '../../../services/payment.service';
import { ChurchService } from '../../../services/church.service';
import {
  PAYMENT_OPERATOR_LABELS,
  PAYMENT_STATUS_LABELS,
  Payment,
  PaymentOperator,
  PaymentStatus,
} from '../../../models/payment.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface PaymentFilters {
  status: PaymentStatus | '';
  operator: PaymentOperator | '';
  churchId: string;
  search: string;
}

const STORAGE_KEY = 'paymentFilters';

function loadPersisted(): Partial<Pick<PaymentFilters, 'status' | 'operator' | 'churchId'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  [PaymentStatus.SUBMITTED]: 'status-warning',
  [PaymentStatus.CONFIRMED]: 'status-success',
  [PaymentStatus.REJECTED]: 'status-danger',
};

@Component({
  selector: 'app-payment-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './payment-list.component.html',
  styleUrl: './payment-list.component.scss',
})
export class PaymentListComponent {
  readonly paymentService = inject(PaymentService);
  readonly churchService = inject(ChurchService);
  readonly pagination = inject(PaginationService);

  statusList = Object.values(PaymentStatus);
  statusLabels = PAYMENT_STATUS_LABELS;
  operatorList = Object.values(PaymentOperator);
  operatorLabels = PAYMENT_OPERATOR_LABELS;

  payments = this.paymentService.payments;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.payments() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<PaymentFilters>({ status: '', operator: '', churchId: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.status || !!f.operator || !!f.churchId || !!f.search;
  });

  filtered = computed(() => {
    const items = this.payments() ?? [];
    const { operator, churchId, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((p) => {
      if (operator && p.operator !== operator) return false;
      if (churchId && p.paymentMethod?.churchId !== churchId) return false;
      if (term) {
        const hay = `${p.reference} ${p.paymentMethod?.accountName ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  total = computed(() =>
    this.filtered()
      .filter((p) => p.status === PaymentStatus.CONFIRMED)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  );

  private persist = effect(() => {
    const { status, operator, churchId } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, operator, churchId }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  // Le statut est porté par l'API (/payments/admin?status=) — rechargement serveur.
  private reload = effect(() => {
    this.fetch(this.filters().status);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
  }

  private fetch(status: PaymentStatus | '', showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.paymentService.listAdmin({ status: status || undefined }).subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des paiements.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.fetch(this.filters().status, true);
  }

  updateFilter<K extends keyof PaymentFilters>(key: K, value: PaymentFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ status: '', operator: '', churchId: '', search: '' });
    this.pagination.reset();
  }

  churchName(p: Payment): string {
    const cid = p.paymentMethod?.churchId;
    if (!cid) return '—';
    return p.paymentMethod?.church?.name ?? (this.churches() ?? []).find((c) => c.id === cid)?.name ?? '—';
  }

  statusBadge(status: PaymentStatus): string {
    return STATUS_BADGE[status];
  }
}
