import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CreateTariffDto, ListTariffQuery, Tariff, UpdateTariffDto } from '../models/tariff.model';

/**
 * Miroir de TariffController (amisache-backend src/liturgy/controllers/tariff.controller.ts).
 * GET /tariffs/admin (tous les tarifs, admin/engineer) et GET
 * /tariffs/church/:churchId (une église, clergé de cette église ou admin) —
 * même convention que ClergyMember/Entrance/Schedule/etc. Liste non paginée
 * serveur, relations non chargées → pagination + résolution des libellés
 * côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class TariffService {
  private readonly http = inject(HttpClient);

  private tariffsSignal = signal<Tariff[] | undefined>(undefined);
  private selectedSignal = signal<Tariff | null>(null);

  readonly tariffs = this.tariffsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(tariff: Tariff): void {
    this.selectedSignal.set(tariff);
  }

  listAdmin(query: ListTariffQuery = {}): Observable<Tariff[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Tariff[]>('tariffs/admin', { params }).pipe(
      tap((tariffs) => this.tariffsSignal.set(tariffs)),
    );
  }

  /** GET /tariffs/church/:churchId — tarifs propres à une église (clergé de cette église, ou admin). */
  listForChurch(churchId: string): Observable<Tariff[]> {
    return this.http.get<Tariff[]>(`tariffs/church/${churchId}`).pipe(
      tap((tariffs) => this.tariffsSignal.set(tariffs)),
    );
  }

  getById(id: string): Observable<Tariff> {
    return this.http.get<Tariff>(`tariffs/${id}`);
  }

  create(body: CreateTariffDto): Observable<Tariff> {
    return this.http.post<Tariff>('tariffs', body);
  }

  update(id: string, body: UpdateTariffDto): Observable<Tariff> {
    return this.http.patch<Tariff>(`tariffs/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`tariffs/${id}`);
  }
}
