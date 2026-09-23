import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

import {
  Church,
  CreateChurchDto,
  ListChurchAdminQuery,
  PaginatedChurches,
  SetPerimeterDto,
  UpdateChurchDto,
  ValidationStatus,
} from '../models/church.model';
import { ClergyContextService } from './clergy-context.service';

/**
 * Miroir de ChurchController (amisache-backend src/church/controllers/church.controller.ts).
 * Le panel utilise GET /churches/admin (paginé serveur, tous statuts) + le CRUD /
 * workflow admin. La liste publique GET /churches (approuvées) sert l'annuaire, pas ici.
 */
@Injectable({ providedIn: 'root' })
export class ChurchService {
  private readonly http = inject(HttpClient);
  private readonly clergyContext = inject(ClergyContextService);

  private churchesSignal = signal<Church[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<Church | null>(null);
  // Liste allégée (toutes entités) pour les sélecteurs de parent — signal distinct
  // de la liste paginée pour ne pas les faire s'écraser mutuellement.
  private allForSelectSignal = signal<Church[] | undefined>(undefined);

  readonly churches = this.churchesSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();
  readonly allForSelect = this.allForSelectSignal.asReadonly();

  select(church: Church): void {
    this.selectedSignal.set(church);
  }

  listAdmin(query: ListChurchAdminQuery = {}): Observable<PaginatedChurches> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedChurches>('churches/admin', { params }).pipe(
      tap((result) => {
        this.churchesSignal.set(result.data);
        this.paginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  /**
   * Charge jusqu'à 500 entités pour peupler les sélecteurs de parent/filtre.
   * Clergé sans accès complet : jamais /churches/admin (403 garanti) — la liste
   * vient de ses propres affectations actives, déjà chargées par ClergyContextService,
   * sans appel réseau supplémentaire.
   */
  listAllForSelect(): Observable<PaginatedChurches> {
    if (!this.clergyContext.isFullAccess()) {
      const data = (this.clergyContext.myChurches() ?? [])
        .map((m) => m.church)
        .filter((c): c is Church => !!c);
      this.allForSelectSignal.set(data);
      return of({ data, total: data.length, page: 1, limit: data.length, totalPages: 1 });
    }
    return this.http
      .get<PaginatedChurches>('churches/admin', { params: new HttpParams().set('limit', '500') })
      .pipe(tap((result) => this.allForSelectSignal.set(result.data)));
  }

  getById(id: string): Observable<Church> {
    return this.http.get<Church>(`churches/${id}`);
  }

  create(body: CreateChurchDto): Observable<Church> {
    return this.http.post<Church>('churches', body);
  }

  update(id: string, body: UpdateChurchDto): Observable<Church> {
    return this.http.patch<Church>(`churches/${id}`, body);
  }

  updateStatus(id: string, status: ValidationStatus): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`churches/${id}/status`, { status });
  }

  /** Définit l'emprise géographique (4 à 20 sommets). */
  setPerimeter(id: string, body: SetPerimeterDto): Observable<Church> {
    return this.http.patch<Church>(`churches/${id}/perimeter`, body);
  }

  /** `source` : fichier à uploader, OU chaîne = lien déjà hébergé ailleurs. */
  updateBanner(id: string, source: File | string): Observable<Church> {
    const fd = new FormData();
    if (typeof source === 'string') fd.append('imageUrl', source);
    else fd.append('image', source);
    return this.http.post<Church>(`churches/${id}/banner`, fd);
  }

  updateLogo(id: string, source: File | string): Observable<Church> {
    const fd = new FormData();
    if (typeof source === 'string') fd.append('imageUrl', source);
    else fd.append('image', source);
    return this.http.post<Church>(`churches/${id}/logo`, fd);
  }

  /** `sources` : mélange de fichiers à uploader et de liens déjà hébergés ailleurs. */
  addPhotos(id: string, sources: (File | string)[]): Observable<Church> {
    const fd = new FormData();
    for (const source of sources) {
      if (typeof source === 'string') fd.append('photoUrls', source);
      else fd.append('images', source);
    }
    return this.http.post<Church>(`churches/${id}/photos`, fd);
  }

  removePhoto(id: string, url: string): Observable<Church> {
    return this.http.delete<Church>(`churches/${id}/photos`, { body: { url } });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`churches/${id}`);
  }
}
