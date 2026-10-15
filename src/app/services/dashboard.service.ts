import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardStats } from '../models/dashboard.model';

/** Miroir de DashboardController (amisache-backend src/dashboard/dashboard.controller.ts). */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  /** Sans `churchId` : toute la plateforme (admin/engineer) ; avec : une seule église. */
  getStats(churchId?: string): Observable<DashboardStats> {
    const params = churchId ? new HttpParams().set('churchId', churchId) : undefined;
    return this.http.get<DashboardStats>('dashboard/stats', { params });
  }
}
