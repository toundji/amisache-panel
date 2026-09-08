import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, from, Observable, switchMap, tap, throwError } from 'rxjs';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { signInWithPopup, signOut } from 'firebase/auth';

import { AuthResponse, LoginCredentials } from '../models/auth.model';
import { User } from '../models/user.model';
import { bearerTokenKey, refreshTokenKey, userDataKey } from '../core/utils/storage-keys';
import { firebaseAuth, googleProvider } from '../core/firebase';

interface AuthState {
  user: User | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly state = signal<AuthState>({ user: null, error: null });

  readonly user = computed(() => this.state().user);
  readonly error = computed(() => this.state().error);
  readonly isAuthenticated = computed(() => !!this.state().user && !this.isTokenExpired());

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = this.getToken();
    const userData = localStorage.getItem(userDataKey) ?? sessionStorage.getItem(userDataKey);

    if (!token || !userData || this.isTokenValid(token) === false) {
      return;
    }

    try {
      this.state.update((s) => ({ ...s, user: JSON.parse(userData) }));
    } catch {
      this.clearSession();
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.state.update((s) => ({ ...s, error: null }));

    return this.http.post<AuthResponse>('auth/login', credentials).pipe(
      tap((response) => this.persistSession(response, credentials.rememberMe)),
      catchError((error) => {
        this.state.update((s) => ({ ...s, error: error?.error?.msg ?? 'Connexion impossible' }));
        return throwError(() => error.error ?? error);
      }),
    );
  }

  /**
   * Connexion via Google : popup Firebase → idToken → POST /auth/google.
   * Le backend crée/lie le compte et vérifie le rôle admin (clé back-office).
   */
  loginWithGoogle(rememberMe = true): Observable<AuthResponse> {
    this.state.update((s) => ({ ...s, error: null }));

    return from(signInWithPopup(firebaseAuth, googleProvider())).pipe(
      switchMap((cred) => from(cred.user.getIdToken())),
      switchMap((idToken) => this.http.post<AuthResponse>('auth/google', { idToken })),
      tap((response) => this.persistSession(response, rememberMe)),
      // La session Firebase ne sert qu'à récupérer l'idToken : on la ferme aussitôt.
      tap(() => void signOut(firebaseAuth).catch(() => undefined)),
      catchError((error) => {
        void signOut(firebaseAuth).catch(() => undefined);

        // Popup fermée / annulée par l'utilisateur : pas une vraie erreur.
        if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
          return throwError(() => ({ silent: true }));
        }

        const msg = error?.error?.msg ?? error?.message ?? 'Connexion Google impossible';
        this.state.update((s) => ({ ...s, error: msg }));
        return throwError(() => error?.error ?? error);
      }),
    );
  }

  logout(): void {
    this.http.post('auth/logout', {}).subscribe({ complete: () => this.finishLogout() });
  }

  logoutAllDevices(): void {
    this.http.post('auth/logout-all', {}).subscribe({ complete: () => this.finishLogout() });
  }

  private finishLogout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  /** Nettoie l'état local sans appeler l'API — utilisé sur 401 (session déjà invalide côté serveur). */
  clearSession(): void {
    localStorage.removeItem(bearerTokenKey);
    localStorage.removeItem(refreshTokenKey);
    localStorage.removeItem(userDataKey);
    sessionStorage.removeItem(bearerTokenKey);
    sessionStorage.removeItem(refreshTokenKey);
    sessionStorage.removeItem(userDataKey);
    this.state.set({ user: null, error: null });
  }

  clearError(): void {
    this.state.update((s) => ({ ...s, error: null }));
  }

  /** Met à jour le profil en mémoire + storage après un PATCH /users/me réussi. */
  setUser(user: User): void {
    const storage = localStorage.getItem(userDataKey) ? localStorage : sessionStorage;
    storage.setItem(userDataKey, JSON.stringify(user));
    this.state.update((s) => ({ ...s, user }));
  }

  getToken(): string | null {
    return localStorage.getItem(bearerTokenKey) ?? sessionStorage.getItem(bearerTokenKey);
  }

  private persistSession(response: AuthResponse, rememberMe = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(bearerTokenKey, response.accessToken);
    storage.setItem(refreshTokenKey, response.refreshToken);
    storage.setItem(userDataKey, JSON.stringify(response.user));
    this.state.set({ user: response.user, error: null });
  }

  private isTokenValid(token: string): boolean {
    try {
      const { exp } = jwtDecode<JwtPayload>(token);
      return !!exp && exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private isTokenExpired(): boolean {
    const token = this.getToken();
    return !token || !this.isTokenValid(token);
  }
}
