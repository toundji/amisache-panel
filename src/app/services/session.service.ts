import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UserSessionInfo } from '../models/session.model';

/** Miroir des routes /auth/sessions* (nest-auth-base AuthController). */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);

  private sessionsSignal = signal<UserSessionInfo[] | undefined>(undefined);
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly sessions = this.sessionsSignal.asReadonly();

  getSessions(): Observable<UserSessionInfo[]> {
    return this.http
      .get<UserSessionInfo[]>('auth/sessions')
      .pipe(tap((sessions) => this.sessionsSignal.set(sessions)));
  }

  revoke(sessionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`auth/sessions/${sessionId}`);
  }

  updatePassword(oldPassword: string, newPassword: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('auth/update-password', { oldPassword, newPassword });
  }
}
