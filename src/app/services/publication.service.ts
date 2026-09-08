import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  CreatePublicationDto,
  ListPublicationAdminQuery,
  Publication,
  PublicationStatus,
  UpdatePublicationDto,
} from '../models/publication.model';

/**
 * Miroir de PublicationController (amisache-backend src/community/controllers/publication.controller.ts).
 * ⚠️ GET /publications/:id est PUBLIC et ne renvoie que les publications
 * PUBLISHED. Le panel ne peut donc pas recharger un brouillon/archive par
 * id → la page de détail travaille à partir de la liste admin (tous
 * statuts), pas d'un getById. Liste non paginée serveur, relations non
 * chargées → pagination + libellés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class PublicationService {
  private readonly http = inject(HttpClient);

  private publicationsSignal = signal<Publication[] | undefined>(undefined);
  private selectedSignal = signal<Publication | null>(null);

  readonly publications = this.publicationsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(publication: Publication): void {
    this.selectedSignal.set(publication);
  }

  loaded(id: string): Publication | undefined {
    return (this.publicationsSignal() ?? []).find((p) => p.id === id);
  }

  private upsert(publication: Publication): void {
    this.publicationsSignal.update((list) => {
      if (!list) return [publication];
      const i = list.findIndex((p) => p.id === publication.id);
      if (i === -1) return [publication, ...list];
      const next = [...list];
      next[i] = publication;
      return next;
    });
    if (this.selectedSignal()?.id === publication.id) this.selectedSignal.set(publication);
  }

  listAdmin(query: ListPublicationAdminQuery = {}): Observable<Publication[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Publication[]>('publications/admin', { params }).pipe(
      tap((publications) => this.publicationsSignal.set(publications)),
    );
  }

  create(body: CreatePublicationDto): Observable<Publication> {
    return this.http.post<Publication>('publications', body);
  }

  update(id: string, body: UpdatePublicationDto): Observable<Publication> {
    return this.http.patch<Publication>(`publications/${id}`, body).pipe(tap((p) => this.upsert(p)));
  }

  updateStatus(id: string, status: PublicationStatus): Observable<Publication> {
    return this.http
      .patch<Publication>(`publications/${id}/status`, { status })
      .pipe(tap((p) => this.upsert(p)));
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`publications/${id}`);
  }
}
