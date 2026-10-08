import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiErrorLog, ListApiErrorsQuery, PaginatedApiErrors } from '../models/api-error.model';

/**
 * Miroir d'ApiErrorController (amisache-backend src/core/controllers/api-error.controller.ts).
 * GET /api-errors/admin est paginé côté serveur — même schéma que UserService.listUsers.
 */
@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  private readonly http = inject(HttpClient);

  private errorsSignal = signal<ApiErrorLog[] | undefined>(undefined);
  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly errors = this.errorsSignal.asReadonly();

  list(query: ListApiErrorsQuery = {}): Observable<PaginatedApiErrors> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params = params.set(key, String(value));
    });
    return this.http.get<PaginatedApiErrors>('api-errors/admin', { params }).pipe(
      tap((result) => this.errorsSignal.set(result.data)),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`api-errors/${id}`);
  }
}
