import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MailFailedJob, MailFailedStatus } from '../models/mail-failed.model';

/**
 * Miroir de MailController (nest-auth-base src/mail/mail.controller.ts).
 * GET /mail/failed n'est PAS paginé côté serveur (renvoie un tableau brut,
 * filtrable par `status`) — pagination CLIENT via PaginationService dans le
 * composant liste, cf. CLAUDE.md § Pagination (mode "client").
 */
@Injectable({ providedIn: 'root' })
export class MailFailedService {
  private readonly http = inject(HttpClient);

  private jobsSignal = signal<MailFailedJob[] | undefined>(undefined);
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly jobs = this.jobsSignal.asReadonly();

  list(status?: MailFailedStatus): Observable<MailFailedJob[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<MailFailedJob[]>('mail/failed', { params })
      .pipe(tap((jobs) => this.jobsSignal.set(jobs)));
  }

  /** Remet le job dans la queue BullMQ. Le succès réel n'est confirmé qu'au prochain rechargement (traitement asynchrone). */
  retry(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`mail/failed/${id}/retry`, {});
  }

  /** Abandon logique (pas de suppression DB) — passe le job en statut `abandoned`. */
  abandon(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`mail/failed/${id}`);
  }
}
