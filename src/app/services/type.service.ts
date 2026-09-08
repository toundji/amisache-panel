import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  CreateTypeDto,
  ListTypeAdminQuery,
  PaginatedTypes,
  TypeItem,
  TypeScope,
  UpdateTypeDto,
} from '../models/type.model';

/**
 * Miroir de TypeController (amisache-backend src/type/controllers/type.controller.ts).
 * Le panel utilise GET /types/admin (paginé côté serveur, y compris types inactifs)
 * + le CRUD admin. La route publique GET /types (types actifs par scope) sert les
 * sélecteurs des modules métier, pas le back-office.
 */
@Injectable({ providedIn: 'root' })
export class TypeService {
  private readonly http = inject(HttpClient);

  private typesSignal = signal<TypeItem[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<TypeItem | null>(null);
  // Types actifs par scope (GET /types public) — alimente les sélecteurs des
  // modules métier (horaire, intention, sacrement, don...).
  private activeByScopeSignal = signal<Partial<Record<TypeScope, TypeItem[]>>>({});

  readonly types = this.typesSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();
  readonly activeByScope = this.activeByScopeSignal.asReadonly();

  select(type: TypeItem): void {
    this.selectedSignal.set(type);
  }

  /** Types actifs d'un scope donné, pour les sélecteurs (résultat mémorisé par scope). */
  activeForScope(scope: TypeScope): TypeItem[] | undefined {
    return this.activeByScopeSignal()[scope];
  }

  listActive(scope: TypeScope): Observable<TypeItem[]> {
    return this.http
      .get<TypeItem[]>('types', { params: new HttpParams().set('scope', scope) })
      .pipe(tap((items) => this.activeByScopeSignal.update((m) => ({ ...m, [scope]: items }))));
  }

  listAdmin(query: ListTypeAdminQuery = {}): Observable<PaginatedTypes> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedTypes>('types/admin', { params }).pipe(
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

  getById(id: string): Observable<TypeItem> {
    return this.http.get<TypeItem>(`types/${id}`);
  }

  create(body: CreateTypeDto): Observable<TypeItem> {
    return this.http.post<TypeItem>('types', body);
  }

  update(id: string, body: UpdateTypeDto): Observable<TypeItem> {
    return this.http.patch<TypeItem>(`types/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`types/${id}`);
  }
}
