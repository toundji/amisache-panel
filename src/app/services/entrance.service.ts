import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CreateEntranceDto, Entrance, ListEntranceQuery, UpdateEntranceDto } from '../models/entrance.model';

/**
 * Miroir de EntranceController (amisache-backend src/church/controllers/entrance.controller.ts).
 * GET /entrances : `churchId` optionnel (absent → toutes). Non paginé serveur →
 * pagination + filtres côté CLIENT. Chaque entrée porte `church`.
 */
@Injectable({ providedIn: 'root' })
export class EntranceService {
  private readonly http = inject(HttpClient);

  private entrancesSignal = signal<Entrance[] | undefined>(undefined);
  private selectedSignal = signal<Entrance | null>(null);

  readonly entrances = this.entrancesSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(entrance: Entrance): void {
    this.selectedSignal.set(entrance);
  }

  list(query: ListEntranceQuery = {}): Observable<Entrance[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Entrance[]>('entrances', { params }).pipe(
      tap((entrances) => this.entrancesSignal.set(entrances)),
    );
  }

  getById(id: string): Observable<Entrance> {
    return this.http.get<Entrance>(`entrances/${id}`);
  }

  create(body: CreateEntranceDto): Observable<Entrance> {
    return this.http.post<Entrance>('entrances', body);
  }

  update(id: string, body: UpdateEntranceDto): Observable<Entrance> {
    return this.http.patch<Entrance>(`entrances/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`entrances/${id}`);
  }
}
