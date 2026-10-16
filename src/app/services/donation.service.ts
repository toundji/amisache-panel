import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Donation, ListDonationQuery } from '../models/donation.model';

/**
 * Miroir de DonationController (amisache-backend src/liturgy/controllers/donation.controller.ts).
 * Le panel n'utilise que GET /donations/admin (tous les dons, filtrable par
 * église) et GET /donations/:id — un don est déposé par le fidèle, jamais
 * modifié. Liste non paginée serveur, relations non chargées → pagination +
 * résolution des libellés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class DonationService {
  private readonly http = inject(HttpClient);

  private donationsSignal = signal<Donation[] | undefined>(undefined);
  // Périmètre de la dernière liste chargée : 'admin' (toutes églises) ou
  // 'church:<id>' — le composant ne l'affiche que si c'est le sien (cf.
  // RequestService, même raison).
  private scopeSignal = signal<string | null>(null);
  readonly scope = this.scopeSignal.asReadonly();
  private selectedSignal = signal<Donation | null>(null);

  readonly donations = this.donationsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(donation: Donation): void {
    this.selectedSignal.set(donation);
  }

  listAdmin(query: ListDonationQuery = {}): Observable<Donation[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Donation[]>('donations/admin', { params }).pipe(
      tap((donations) => {
        this.donationsSignal.set(donations);
        this.scopeSignal.set('admin');
      }),
    );
  }

  /** GET /donations/church/:churchId — dons d'une église (clergé de cette église, ou admin). */
  listForChurch(churchId: string): Observable<Donation[]> {
    return this.http.get<Donation[]>(`donations/church/${churchId}`).pipe(
      tap((donations) => {
        this.donationsSignal.set(donations);
        this.scopeSignal.set(`church:${churchId}`);
      }),
    );
  }

  getById(id: string): Observable<Donation> {
    return this.http.get<Donation>(`donations/${id}`);
  }
}
