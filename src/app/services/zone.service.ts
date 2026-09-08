import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CreateZoneDto, ListZoneQuery, UpdateZoneDto, Zone } from '../models/zone.model';

/**
 * Miroir de ZoneController (amisache-backend src/address/controllers/zone.controller.ts).
 * GET /zones : `regionId` optionnel (absent → toutes). Pagination + filtre région côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class ZoneService {
  private readonly http = inject(HttpClient);

  private zonesSignal = signal<Zone[] | undefined>(undefined);
  private selectedSignal = signal<Zone | null>(null);

  readonly zones = this.zonesSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(zone: Zone): void {
    this.selectedSignal.set(zone);
  }

  list(query: ListZoneQuery = {}): Observable<Zone[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Zone[]>('zones', { params }).pipe(
      tap((zones) => this.zonesSignal.set(zones)),
    );
  }

  getById(id: string): Observable<Zone> {
    return this.http.get<Zone>(`zones/${id}`);
  }

  create(body: CreateZoneDto): Observable<Zone> {
    return this.http.post<Zone>('zones', body);
  }

  update(id: string, body: UpdateZoneDto): Observable<Zone> {
    return this.http.patch<Zone>(`zones/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`zones/${id}`);
  }
}
