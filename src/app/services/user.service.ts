import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { AuthResponse } from '../models/auth.model';
import { ListUsersQuery, PaginatedUsers, User, UserRole, UserStatus } from '../models/user.model';

/**
 * Miroir de UserController (nest-auth-base src/users/controllers/user.controller.ts).
 * Pas de endpoint de création directe côté admin : les comptes naissent via
 * POST /auth/register (self-service) — un back-office ne peut que consulter,
 * changer statut/rôles, réinitialiser le mot de passe ou supprimer.
 *
 * GET /users est paginé côté serveur (potentiellement des milliers de comptes) —
 * contrairement au pattern "liste chargée en une fois + pagination client" utilisé
 * ailleurs dans ce template, `usersSignal` ne contient que la page courante.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  private usersSignal = signal<User[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<User | null>(null);
  // Liste allégée pour les sélecteurs (ex: affecter un membre du clergé) —
  // signal distinct de la page courante paginée.
  private allForSelectSignal = signal<User[] | undefined>(undefined);

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly users = this.usersSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  readonly allForSelect = this.allForSelectSignal.asReadonly();
  // Élément cliqué depuis la liste — stub affiché sur la page de détail le
  // temps que `getById` réponde (cf. CLAUDE.md § Pages de détail).
  readonly selected = this.selectedSignal.asReadonly();

  select(user: User): void {
    this.selectedSignal.set(user);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>('users/me');
  }

  /**
   * [Admin] Créer un utilisateur.
   * UserController n'expose pas de création admin — on réutilise
   * POST /auth/register (self-service), qui accepte email/password/firstName/
   * lastName et crée toujours le compte en rôle `user` / statut `unverified`.
   * Les tokens renvoyés sont volontairement ignorés (ne pas usurper la session
   * admin courante) — seul l'utilisateur créé est retourné. L'admin ajuste
   * ensuite statut/rôles depuis la page de détail.
   */
  createUser(body: { email: string; password: string; firstName?: string; lastName?: string }): Observable<User> {
    return this.http.post<AuthResponse>('auth/register', body).pipe(map((response) => response.user));
  }

  updateProfile(body: { firstName?: string; lastName?: string; profile?: string }): Observable<User> {
    return this.http.patch<User>('users/me', body);
  }

  /** Charge jusqu'à 500 comptes pour peupler les sélecteurs d'utilisateur. */
  listAllForSelect(): Observable<PaginatedUsers> {
    return this.http
      .get<PaginatedUsers>('users', { params: new HttpParams().set('limit', '500') })
      .pipe(tap((result) => this.allForSelectSignal.set(result.data)));
  }

  listUsers(query: ListUsersQuery = {}): Observable<PaginatedUsers> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedUsers>('users', { params }).pipe(
      tap((result) => {
        this.usersSignal.set(result.data);
        this.paginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`users/${id}`);
  }

  updateStatus(id: string, status: UserStatus): Observable<User> {
    return this.http.patch<User>(`users/${id}/status`, { status });
  }

  updateRoles(id: string, roles: UserRole[]): Observable<User> {
    return this.http.patch<User>(`users/${id}/roles`, { roles });
  }

  adminResetPassword(userIdOrEmail: string, newPassword: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>('users/admin/reset-password', {
      userIdOrEmail,
      newPassword,
    });
  }

  hardDelete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`users/${id}`);
  }

  uploadProfileImage(file: File): Observable<User> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<User>('users/profile/image', form);
  }

  adminUploadProfileImage(id: string, file: File): Observable<User> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<User>(`users/${id}/profile/image`, form);
  }
}
