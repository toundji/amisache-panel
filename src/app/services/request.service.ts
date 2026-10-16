import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ListRequestQuery, Request, RequestStatus } from '../models/request.model';

/**
 * Miroir de RequestController (amisache-backend src/liturgy/controllers/request.controller.ts).
 * Le panel utilise GET /requests/admin (toutes demandes, admin/engineer),
 * GET /requests/church/:churchId (clergé : son église seulement),
 * GET /requests/:id et PATCH /requests/:id/status. Le dépôt
 * d'une demande est du self-service fidèle, hors back-office. Liste non
 * paginée serveur, relations non chargées → pagination + libellés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);

  private requestsSignal = signal<Request[] | undefined>(undefined);
  // Périmètre de la dernière liste chargée : 'admin' (toutes églises) ou
  // 'church:<id>'. Le signal survit à la navigation et au changement de
  // compte (service root) — le composant n'affiche la liste que si ce
  // périmètre correspond au sien, sinon un clergé pourrait voir, le temps
  // d'un rechargement, les demandes d'autres églises chargées avant lui.
  private scopeSignal = signal<string | null>(null);
  readonly scope = this.scopeSignal.asReadonly();
  private selectedSignal = signal<Request | null>(null);

  readonly requests = this.requestsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(request: Request): void {
    this.selectedSignal.set(request);
  }

  listAdmin(query: ListRequestQuery = {}): Observable<Request[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Request[]>('requests/admin', { params }).pipe(
      tap((requests) => {
        this.requestsSignal.set(requests);
        this.scopeSignal.set('admin');
      }),
    );
  }

  /** GET /requests/church/:churchId — demandes d'une église (clergé de cette église, ou admin). */
  listForChurch(churchId: string, query: Pick<ListRequestQuery, 'status'> = {}): Observable<Request[]> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    return this.http.get<Request[]>(`requests/church/${churchId}`, { params }).pipe(
      tap((requests) => {
        this.requestsSignal.set(requests);
        this.scopeSignal.set(`church:${churchId}`);
      }),
    );
  }

  getById(id: string): Observable<Request> {
    return this.http.get<Request>(`requests/${id}`);
  }

  updateStatus(id: string, status: RequestStatus): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`requests/${id}/status`, { status });
  }
}
