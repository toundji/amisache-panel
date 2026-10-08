import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  CreateRequestTypeDto,
  ListRequestTypeAdminQuery,
  PaginatedRequestTypes,
  RequestTypeItem,
  RequestTypeScope,
  UpdateRequestTypeDto,
} from '../models/request-type.model';

/**
 * Miroir de RequestTypeController (amisache-backend
 * src/liturgy/controllers/request-type.controller.ts). Table dédiée aux
 * types de demande (intention de messe / sacrement), sortie de la table
 * mutualisée `types` le 2026-09-26 — voir TypeService pour les autres scopes
 * (don, publication, horaire), restés dans `types`.
 */
@Injectable({ providedIn: 'root' })
export class RequestTypeService {
  private readonly http = inject(HttpClient);

  private typesSignal = signal<RequestTypeItem[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<RequestTypeItem | null>(null);
  // Types actifs par scope (GET /request-types public) — alimente les
  // sélecteurs (formulaire de tarif, back-office).
  private activeByScopeSignal = signal<Partial<Record<RequestTypeScope, RequestTypeItem[]>>>({});

  readonly types = this.typesSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();
  readonly activeByScope = this.activeByScopeSignal.asReadonly();

  select(type: RequestTypeItem): void {
    this.selectedSignal.set(type);
  }

  /** Types actifs d'un scope donné, pour les sélecteurs (résultat mémorisé par scope). */
  activeForScope(scope: RequestTypeScope): RequestTypeItem[] | undefined {
    return this.activeByScopeSignal()[scope];
  }

  listActive(scope: RequestTypeScope): Observable<RequestTypeItem[]> {
    return this.http
      .get<RequestTypeItem[]>('request-types', { params: new HttpParams().set('scope', scope) })
      .pipe(tap((items) => this.activeByScopeSignal.update((m) => ({ ...m, [scope]: items }))));
  }

  listAdmin(query: ListRequestTypeAdminQuery = {}): Observable<PaginatedRequestTypes> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedRequestTypes>('request-types/admin', { params }).pipe(
      tap((result) => {
        this.typesSignal.set(result.data);
        this.paginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  getById(id: string): Observable<RequestTypeItem> {
    return this.http.get<RequestTypeItem>(`request-types/${id}`);
  }

  create(body: CreateRequestTypeDto): Observable<RequestTypeItem> {
    return this.http.post<RequestTypeItem>('request-types', body);
  }

  update(id: string, body: UpdateRequestTypeDto): Observable<RequestTypeItem> {
    return this.http.patch<RequestTypeItem>(`request-types/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`request-types/${id}`);
  }
}
