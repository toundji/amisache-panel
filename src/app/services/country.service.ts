import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Country, CreateCountryDto, ListCountryQuery, UpdateCountryDto } from '../models/country.model';

/**
 * Miroir de CountryController (amisache-backend src/address/controllers/country.controller.ts).
 * GET /countries n'est pas paginé côté serveur (nombre de pays borné) :
 * pagination CLIENT via PaginationService.setTotalOnly() + slice(), comme SettingService.
 */
@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly http = inject(HttpClient);

  private countriesSignal = signal<Country[] | undefined>(undefined);
  private selectedSignal = signal<Country | null>(null);

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly countries = this.countriesSignal.asReadonly();
  // Élément cliqué depuis la liste — stub affiché sur la page de détail le
  // temps que `getById` réponde (cf. CLAUDE.md § Pages de détail).
  readonly selected = this.selectedSignal.asReadonly();

  select(country: Country): void {
    this.selectedSignal.set(country);
  }

  list(query: ListCountryQuery = {}): Observable<Country[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Country[]>('countries', { params }).pipe(
      tap((countries) => this.countriesSignal.set(countries)),
    );
  }

  getById(id: string): Observable<Country> {
    return this.http.get<Country>(`countries/${id}`);
  }

  create(body: CreateCountryDto): Observable<Country> {
    return this.http.post<Country>('countries', body);
  }

  update(id: string, body: UpdateCountryDto): Observable<Country> {
    return this.http.patch<Country>(`countries/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`countries/${id}`);
  }
}
