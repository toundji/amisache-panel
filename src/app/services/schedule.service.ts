import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  CreateScheduleDto,
  ListScheduleQuery,
  Schedule,
  UpdateScheduleDto,
} from '../models/schedule.model';

/**
 * Miroir de ScheduleController (amisache-backend src/liturgy/controllers/schedule.controller.ts).
 * GET /schedules : `churchId` optionnel côté panel (voir ListScheduleQuery).
 * Liste non paginée serveur, relations non chargées → pagination + résolution
 * des libellés (église, type) côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  private schedulesSignal = signal<Schedule[] | undefined>(undefined);
  private selectedSignal = signal<Schedule | null>(null);

  readonly schedules = this.schedulesSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(schedule: Schedule): void {
    this.selectedSignal.set(schedule);
  }

  list(query: ListScheduleQuery = {}): Observable<Schedule[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Schedule[]>('schedules', { params }).pipe(
      tap((schedules) => this.schedulesSignal.set(schedules)),
    );
  }

  getById(id: string): Observable<Schedule> {
    return this.http.get<Schedule>(`schedules/${id}`);
  }

  create(body: CreateScheduleDto): Observable<Schedule> {
    return this.http.post<Schedule>('schedules', body);
  }

  update(id: string, body: UpdateScheduleDto): Observable<Schedule> {
    return this.http.patch<Schedule>(`schedules/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`schedules/${id}`);
  }
}
