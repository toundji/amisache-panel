import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { MembershipService } from '../../../services/membership.service';
import { ChurchService } from '../../../services/church.service';
import { Membership } from '../../../models/membership.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

const STORAGE_KEY = 'membershipFilters';

function loadPersisted(): { churchId?: string } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-membership-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './membership-list.component.html',
  styleUrl: './membership-list.component.scss',
})
export class MembershipListComponent {
  readonly membershipService = inject(MembershipService);
  readonly churchService = inject(ChurchService);
  readonly pagination = inject(PaginationService);

  memberships = this.membershipService.memberships;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.memberships() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  churchId = signal<string>(loadPersisted().churchId ?? '');
  search = signal('');

  filtered = computed(() => {
    const items = this.memberships() ?? [];
    const cid = this.churchId();
    const term = this.search().trim().toLowerCase();
    return items.filter((m) => {
      if (cid && m.churchId !== cid) return false;
      if (term) {
        const hay = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''} ${m.user?.email ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId: this.churchId() }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  constructor() {
    if (this.churches() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.membershipService.listAdmin().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des abonnements.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateChurch(value: string): void {
    this.churchId.set(value);
    this.pagination.reset();
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.pagination.reset();
  }

  reset(): void {
    this.churchId.set('');
    this.search.set('');
    this.pagination.reset();
  }

  userName(m: Membership): string {
    const n = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim();
    return n || m.user?.email || m.userId;
  }

  churchName(m: Membership): string {
    return m.church?.name ?? (this.churches() ?? []).find((c) => c.id === m.churchId)?.name ?? '—';
  }

  deleteMembership(m: Membership): void {
    Swal.fire({
      title: 'Retirer cet abonnement ?',
      text: `${this.userName(m)} ne suivra plus « ${this.churchName(m)} ».`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.membershipService.delete(m.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error'),
      });
    });
  }
}
