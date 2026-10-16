import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { DashboardStats } from '../models/dashboard.model';
import { Request } from '../models/request.model';
import { User, UserStatus } from '../models/user.model';
import { Church, ValidationStatus } from '../models/church.model';
import { ContactMessageStatus } from '../models/contact.model';
import { MailFailedJob, MailFailedStatus } from '../models/mail-failed.model';
import { toHttpParams } from '../core/utils/http-params.util';

interface Paginated<T> {
  data: T[];
  total: number;
}

/**
 * Miroir de DashboardController (amisache-backend src/dashboard/dashboard.controller.ts)
 * + lectures « tableau de bord » sur les autres routes admin.
 *
 * Ces lectures passent volontairement par `HttpClient` directement, **sans**
 * les services de liste (UserService, RequestService…) : ceux-ci écrivent la
 * réponse dans leur signal partagé (`tap`), et un comptage en `limit=1`
 * écraserait la dernière page connue de la liste correspondante
 * (stale-while-revalidate, cf. CLAUDE.md § Pages de liste).
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  /** Sans `churchId` : toute la plateforme (admin/engineer) ; avec : une seule église. */
  getStats(churchId?: string): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('dashboard/stats', { params: toHttpParams({ churchId }) });
  }

  /** Nombre d'utilisateurs, tous statuts confondus si `status` est omis. */
  countUsers(status?: UserStatus): Observable<number> {
    return this.count('users', { status });
  }

  countContactMessages(status?: ContactMessageStatus): Observable<number> {
    return this.count('contact', { status });
  }

  /**
   * Demandes — `GET /requests/church/:id`, ou `GET /requests/admin` (plateforme)
   * (une église). Non paginé serveur : la liste complète sert à la fois aux
   * demandes à traiter et à la répartition par statut de l'accueil église.
   */
  requests(churchId?: string): Observable<Request[]> {
    return this.http.get<Request[]>(churchId ? `requests/church/${churchId}` : 'requests/admin');
  }

  /** Dernières inscriptions d'églises en attente de validation, et leur nombre total. */
  pendingChurches(limit = 6): Observable<Paginated<Church>> {
    return this.http.get<Paginated<Church>>('churches/admin', {
      params: toHttpParams({ status: ValidationStatus.PENDING, page: 1, limit }),
    });
  }

  /** Derniers comptes créés. */
  latestUsers(limit = 5): Observable<User[]> {
    return this.http
      .get<Paginated<User>>('users', { params: toHttpParams({ page: 1, limit, sortBy: 'createdAt', sortOrder: 'desc' }) })
      .pipe(map((result) => result.data));
  }

  /** Erreurs serveur journalisées (GET /api-errors/admin, paginé). */
  countApiErrors(): Observable<number> {
    return this.count('api-errors/admin', {});
  }

  /** GET /mail/failed n'est pas paginé — renvoie la liste complète. */
  countFailedMails(status: MailFailedStatus = MailFailedStatus.pending): Observable<number> {
    return this.http
      .get<MailFailedJob[]>('mail/failed', { params: toHttpParams({ status }) })
      .pipe(map((jobs) => jobs.length));
  }

  private count(path: string, filters: Record<string, string | undefined>): Observable<number> {
    return this.http
      .get<Paginated<unknown>>(path, { params: toHttpParams({ ...filters, page: 1, limit: 1 }) })
      .pipe(map((result) => result.total));
  }
}
