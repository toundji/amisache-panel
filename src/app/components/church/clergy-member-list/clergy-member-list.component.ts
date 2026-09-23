import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ClergyMemberService } from '../../../services/clergy-member.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { ClergyMember, ECCLESIAL_ROLE_LABELS, EcclesialRole } from '../../../models/clergy-member.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface ClergyFilters {
  churchId: string;
  role: EcclesialRole | '';
  activeOnly: boolean;
  search: string;
}

const STORAGE_KEY = 'clergyFilters';

function loadPersisted(): Partial<Pick<ClergyFilters, 'churchId' | 'role' | 'activeOnly'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-clergy-member-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './clergy-member-list.component.html',
  styleUrl: './clergy-member-list.component.scss',
})
export class ClergyMemberListComponent {
  readonly clergyService = inject(ClergyMemberService);
  readonly churchService = inject(ChurchService);
  readonly userService = inject(UserService);
  readonly clergyContext = inject(ClergyContextService);
  readonly pagination = inject(PaginationService);

  roleList = Object.values(EcclesialRole);
  roleLabels = ECCLESIAL_ROLE_LABELS;

  members = this.clergyService.members;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.members() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<ClergyFilters>({ churchId: '', role: '', activeOnly: false, search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.role || f.activeOnly || !!f.search;
  });

  filteredMembers = computed(() => {
    const items = this.members() ?? [];
    const { churchId, role, activeOnly, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((m) => {
      if (churchId && m.churchId !== churchId) return false;
      if (role && m.role !== role) return false;
      if (activeOnly && m.endDate) return false;
      if (term) {
        const hay = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''} ${m.user?.email ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  pagedMembers = computed(() => this.pagination.slice(this.filteredMembers()));

  private persist = effect(() => {
    const { churchId, role, activeOnly } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, role, activeOnly }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filteredMembers().length);
  });

  constructor() {
    if (this.churches() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    this.load();
  }

  // Clergé sans accès complet : jamais la liste globale (/clergy-members,
  // publique mais toutes églises confondues) — uniquement son église active.
  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    const churchId = this.clergyContext.activeChurchId();
    const obs = this.clergyContext.isFullAccess()
      ? this.clergyService.list()
      : churchId
        ? this.clergyService.listForChurch(churchId)
        : null;

    if (!obs) {
      this.refreshing.set(false);
      if (showLoader) Swal.close();
      return;
    }

    obs.subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des affectations.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof ClergyFilters>(key: K, value: ClergyFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', role: '', activeOnly: false, search: '' });
    this.pagination.reset();
  }

  memberName(m: ClergyMember): string {
    const n = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim();
    return n || m.user?.email || m.userId;
  }

  churchName(m: ClergyMember): string {
    return m.church?.name ?? (this.churches() ?? []).find((c) => c.id === m.churchId)?.name ?? '—';
  }

  selectUser(m: ClergyMember): void {
    if (m.user) this.userService.select(m.user);
  }

  selectChurch(m: ClergyMember): void {
    if (m.church) this.churchService.select(m.church);
  }

  deleteMember(m: ClergyMember): void {
    Swal.fire({
      title: 'Supprimer cette affectation ?',
      text: `L'affectation de ${this.memberName(m)} sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.clergyService.delete(m.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
