import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  CreateSettingDto,
  ListSettingAdminQuery,
  PaginatedSettings,
  Setting,
  UpdateSettingDto,
} from '../models/setting.model';

/**
 * Miroir de SettingController (nest-auth src/content/controllers/setting.controller.ts).
 * Le panel n'utilise que les routes admin (GET /settings/admin, CRUD) — la
 * route publique GET /settings/public est consommée par le frontend applicatif,
 * pas ici. GET /settings/admin n'est pas paginé côté serveur (nombre de clés
 * borné) : pagination CLIENT via PaginationService.setTotalOnly() + slice().
 */
@Injectable({ providedIn: 'root' })
export class SettingService {
  private readonly http = inject(HttpClient);

  private settingsSignal = signal<Setting[] | undefined>(undefined);
  private selectedSignal = signal<Setting | null>(null);

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly settings = this.settingsSignal.asReadonly();
  // Élément cliqué depuis la liste — stub affiché sur la page de détail le
  // temps que `getById` réponde (cf. CLAUDE.md § Pages de détail).
  readonly selected = this.selectedSignal.asReadonly();

  select(setting: Setting): void {
    this.selectedSignal.set(setting);
  }

  listAdmin(query: ListSettingAdminQuery = {}): Observable<PaginatedSettings> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedSettings>('settings/admin', { params }).pipe(
      tap((result) => this.settingsSignal.set(result.data)),
    );
  }

  getById(id: string): Observable<Setting> {
    return this.http.get<Setting>(`settings/${id}`);
  }

  create(body: CreateSettingDto): Observable<Setting> {
    return this.http.post<Setting>('settings', body);
  }

  update(id: string, body: UpdateSettingDto): Observable<Setting> {
    return this.http.patch<Setting>(`settings/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`settings/${id}`);
  }
}
