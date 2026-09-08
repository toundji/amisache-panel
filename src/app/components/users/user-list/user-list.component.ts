import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { UserService } from '../../../services/user.service';
import { ListUsersSortBy, User, UserRole, UserStatus } from '../../../models/user.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { UserAvatarComponent } from '../../../shared/avatar/user-avatar.component';
import { ColumnDef, ColumnVisibilityService } from '../../../shared/column-visibility/column-visibility.service';
import { ColumnVisibilityComponent } from '../../../shared/column-visibility/column-visibility.component';
import { BackDismissDirective } from '../../../shared/navigation/back-dismiss.directive';

interface UserFilters {
  status: UserStatus | '';
  role: UserRole | '';
  search: string;
  sortBy: ListUsersSortBy;
  sortOrder: 'asc' | 'desc';
}

// Persistée entre visites — jamais `search` : un terme de recherche oublié qui
// se réapplique silencieusement à la prochaine visite serait déroutant.
type PersistedUserFilters = Pick<UserFilters, 'status' | 'role' | 'sortBy' | 'sortOrder'>;
const USERS_FILTERS_STORAGE_KEY = 'usersFilters';

function loadPersistedFilters(): Partial<PersistedUserFilters> {
  try {
    return JSON.parse(localStorage.getItem(USERS_FILTERS_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

// Colonnes réellement masquables. "Utilisateur" (avatar+nom) et "Actions"
// restent toujours affichées — pas de sens à les cacher — donc elles ne
// sont pas déclarées ici, cf. ColumnVisibilityService.
const USER_COLUMNS: ColumnDef[] = [
  { key: 'email', label: 'Email' },
  { key: 'roles', label: 'Rôle(s)' },
  { key: 'status', label: 'Statut' },
  { key: 'createdAt', label: 'Créé le' },
];

@Component({
  selector: 'app-user-list',
  // Instances locales — pagination et colonnes propres à CETTE liste, isolées d'une future liste (ex. commandes).
  providers: [PaginationService, ColumnVisibilityService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, UserAvatarComponent, ColumnVisibilityComponent, BackDismissDirective],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  // Non privé : le template appelle `userService.select(user)` avant de naviguer vers le détail.
  readonly userService = inject(UserService);
  readonly pagination = inject(PaginationService);
  readonly columnVisibility = inject(ColumnVisibilityService);

  constructor() {
    this.columnVisibility.init('users', USER_COLUMNS);
  }

  UserStatus = UserStatus;
  UserRole = UserRole;
  statusList = Object.values(UserStatus);
  roleList = Object.values(UserRole);

  users = this.userService.users;
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  isLoading = computed(() => this.users() === undefined);
  error = signal<string | null>(null);
  // Rechargement (page/filtre/refresh manuel) après le premier chargement — pas de skeleton, juste l'icône qui tourne
  refreshing = signal(false);

  filters = signal<UserFilters>({
    status: '',
    role: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...loadPersistedFilters(),
  });
  hasAdvancedFilters = computed(() => !!(this.filters().status || this.filters().role));

  // Persiste statut/rôle/tri à chaque changement — cf. loadPersistedFilters() ci-dessus.
  private persistFilters = effect(() => {
    const { status, role, sortBy, sortOrder } = this.filters();
    localStorage.setItem(USERS_FILTERS_STORAGE_KEY, JSON.stringify({ status, role, sortBy, sortOrder }));
  });

  // Incrémenté pour forcer un rechargement de la page courante (ex: après une
  // action ou un clic sur "Actualiser") sans changer page/filtres — sur quoi
  // `pagination.reset()` seul ne suffit pas si on est déjà en page 1 (signal
  // computed, no-op si valeur identique).
  private reloadTrigger = signal(0);

  // true uniquement pour le prochain fetch déclenché par un clic explicite sur
  // "Actualiser" — distingue l'overlay Swal.showLoading() (bloquant, visible)
  // des rechargements silencieux (page/filtre/tri), qui ne montrent que
  // l'icône du bouton qui tourne.
  private isManualRefresh = false;

  // GET /users est paginé et triée côté serveur : on relance un fetch à chaque
  // changement de page/taille de page, de filtres/tri, ou de reloadTrigger
  // (lus ici → dépendance réactive).
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

    this.userService
      .listUsers({
        page,
        limit,
        status: filters.status || undefined,
        role: filters.role || undefined,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })
      .subscribe({
        next: (result) => {
          this.pagination.setTotalOnly(result.total);
          this.refreshing.set(false);
          if (showLoader) Swal.close();
        },
        error: () => {
          this.refreshing.set(false);
          this.error.set('Erreur lors du chargement des utilisateurs.');
          if (showLoader) Swal.close();
        },
      });
  });

  refresh(): void {
    this.isManualRefresh = true;
    this.forceReload();
  }

  updateFilter<K extends keyof UserFilters>(key: K, value: UserFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.update((f) => ({ ...f, status: '', role: '', search: '' }));
    this.pagination.reset();
  }

  toggleSort(field: ListUsersSortBy): void {
    this.filters.update((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
    this.pagination.reset();
  }

  private forceReload(): void {
    this.reloadTrigger.update((v) => v + 1);
  }

  quickUpdateStatus(user: User, status: UserStatus): void {
    this.userService.updateStatus(user.id, status).subscribe({
      next: () => this.forceReload(),
      error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Impossible de changer le statut.', 'error'),
    });
  }

  deleteUser(user: User): void {
    Swal.fire({
      title: 'Supprimer cet utilisateur ?',
      text: `${user.email} sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.userService.hardDelete(user.id).subscribe({
        next: () => this.forceReload(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }

  getFullName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
  }
}
