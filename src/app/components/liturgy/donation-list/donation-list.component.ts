import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { DonationService } from '../../../services/donation.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { Donation } from '../../../models/donation.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface DonationFilters {
  churchId: string;
  search: string;
}

const STORAGE_KEY = 'donationFilters';

function loadPersisted(): Partial<Pick<DonationFilters, 'churchId'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-donation-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './donation-list.component.html',
  styleUrl: './donation-list.component.scss',
})
export class DonationListComponent {
  readonly donationService = inject(DonationService);
  readonly churchService = inject(ChurchService);
  private readonly userService = inject(UserService);
  readonly pagination = inject(PaginationService);

  donations = this.donationService.donations;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.donations() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<DonationFilters>({ churchId: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => !!this.filters().churchId || !!this.filters().search);

  filtered = computed(() => {
    const items = this.donations() ?? [];
    const term = this.filters().search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((d) => {
      const hay = `${this.donorName(d)} ${this.typeName(d)}`.toLowerCase();
      return hay.includes(term);
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  total = computed(() =>
    this.filtered().reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
  );

  private persist = effect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId: this.filters().churchId }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  private reload = effect(() => {
    this.fetch(this.filters().churchId);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.userService.allForSelect() === undefined) {
      this.userService.listAllForSelect().subscribe({ error: () => undefined });
    }
  }

  private fetch(churchId: string, showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.donationService.listAdmin({ churchId: churchId || undefined }).subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des dons.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.fetch(this.filters().churchId, true);
  }

  updateFilter<K extends keyof DonationFilters>(key: K, value: DonationFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', search: '' });
    this.pagination.reset();
  }

  donorName(d: Donation): string {
    if (d.user) {
      const n = `${d.user.firstName ?? ''} ${d.user.lastName ?? ''}`.trim();
      return n || d.user.email || d.userId;
    }
    const u = (this.userService.allForSelect() ?? []).find((x) => x.id === d.userId);
    if (!u) return d.userId;
    const n = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return n || u.email || d.userId;
  }

  churchName(d: Donation): string {
    return d.church?.name ?? (this.churches() ?? []).find((c) => c.id === d.churchId)?.name ?? '—';
  }

  typeName(d: Donation): string {
    return d.type?.name ?? '—';
  }
}
