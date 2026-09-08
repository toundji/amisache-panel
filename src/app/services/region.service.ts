import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CreateRegionDto, ListRegionQuery, Region, UpdateRegionDto } from '../models/region.model';

/**
 * Miroir de RegionController (amisache-backend src/address/controllers/region.controller.ts).
 * GET /regions n'est pas paginé côté serveur ; `countryId` est optionnel
 * (absent → toutes les régions). Pagination + filtre pays gérés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly http = inject(HttpClient);

  private regionsSignal = signal<Region[] | undefined>(undefined);
  private selectedSignal = signal<Region | null>(null);

  readonly regions = this.regionsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(region: Region): void {
    this.selectedSignal.set(region);
  }

  list(query: ListRegionQuery = {}): Observable<Region[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Region[]>('regions', { params }).pipe(
      tap((regions) => this.regionsSignal.set(regions)),
    );
  }

  getById(id: string): Observable<Region> {
    return this.http.get<Region>(`regions/${id}`);
  }

  create(body: CreateRegionDto): Observable<Region> {
    return this.http.post<Region>('regions', body);
  }

  update(id: string, body: UpdateRegionDto): Observable<Region> {
    return this.http.patch<Region>(`regions/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`regions/${id}`);
  }
}
