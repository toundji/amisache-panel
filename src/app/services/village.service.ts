import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CreateVillageDto, ListVillageQuery, UpdateVillageDto, Village } from '../models/village.model';

/**
 * Miroir de VillageController (amisache-backend src/address/controllers/village.controller.ts).
 * GET /villages : `zoneId` optionnel (absent → tous). Pagination + filtre zone côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class VillageService {
  private readonly http = inject(HttpClient);

  private villagesSignal = signal<Village[] | undefined>(undefined);
  private selectedSignal = signal<Village | null>(null);

  readonly villages = this.villagesSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(village: Village): void {
    this.selectedSignal.set(village);
  }

  list(query: ListVillageQuery = {}): Observable<Village[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Village[]>('villages', { params }).pipe(
      tap((villages) => this.villagesSignal.set(villages)),
    );
  }

  getById(id: string): Observable<Village> {
    return this.http.get<Village>(`villages/${id}`);
  }

  create(body: CreateVillageDto): Observable<Village> {
    return this.http.post<Village>('villages', body);
  }

  update(id: string, body: UpdateVillageDto): Observable<Village> {
    return this.http.patch<Village>(`villages/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`villages/${id}`);
  }
}
