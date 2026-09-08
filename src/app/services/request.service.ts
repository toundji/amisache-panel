import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ListRequestQuery, Request, RequestStatus } from '../models/request.model';

/**
 * Miroir de RequestController (amisache-backend src/liturgy/controllers/request.controller.ts).
 * Le panel n'utilise que GET /requests/admin (toutes demandes, filtrable
 * église/statut), GET /requests/:id et PATCH /requests/:id/status. Le dépôt
 * d'une demande est du self-service fidèle, hors back-office. Liste non
 * paginée serveur, relations non chargées → pagination + libellés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);

  private requestsSignal = signal<Request[] | undefined>(undefined);
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
      tap((requests) => this.requestsSignal.set(requests)),
    );
  }

  getById(id: string): Observable<Request> {
    return this.http.get<Request>(`requests/${id}`);
  }

  updateStatus(id: string, status: RequestStatus): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`requests/${id}/status`, { status });
  }
}
