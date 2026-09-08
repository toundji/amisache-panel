import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Membership } from '../models/membership.model';

/**
 * Miroir de MembershipController (amisache-backend src/church/controllers/membership.controller.ts).
 * Le panel n'utilise que GET /memberships/admin (abonnements fidèle⇄paroisse,
 * churchId optionnel) et DELETE /memberships/:id. La création/définition de
 * paroisse de référence est du self-service fidèle, hors back-office.
 */
@Injectable({ providedIn: 'root' })
export class MembershipService {
  private readonly http = inject(HttpClient);

  private membershipsSignal = signal<Membership[] | undefined>(undefined);
  readonly memberships = this.membershipsSignal.asReadonly();

  listAdmin(churchId?: string): Observable<Membership[]> {
    let params = new HttpParams();
    if (churchId) params = params.set('churchId', churchId);
    return this.http.get<Membership[]>('memberships/admin', { params }).pipe(
      tap((memberships) => this.membershipsSignal.set(memberships)),
    );
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`memberships/${id}`);
  }
}
