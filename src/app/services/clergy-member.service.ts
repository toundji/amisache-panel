import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  ClergyMember,
  CreateClergyMemberDto,
  ListClergyMemberQuery,
  UpdateClergyMemberDto,
} from '../models/clergy-member.model';

/**
 * Miroir de ClergyMemberController (amisache-backend src/church/controllers/clergy-member.controller.ts).
 * GET /clergy-members : `churchId` optionnel (absent → toutes). Liste non paginée
 * côté serveur → pagination + filtres côté CLIENT. Chaque affectation porte `user`
 * et `church` (relations chargées par le service).
 */
@Injectable({ providedIn: 'root' })
export class ClergyMemberService {
  private readonly http = inject(HttpClient);

  private membersSignal = signal<ClergyMember[] | undefined>(undefined);
  private selectedSignal = signal<ClergyMember | null>(null);

  readonly members = this.membersSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(member: ClergyMember): void {
    this.selectedSignal.set(member);
  }

  list(query: ListClergyMemberQuery = {}): Observable<ClergyMember[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ClergyMember[]>('clergy-members', { params }).pipe(
      tap((members) => this.membersSignal.set(members)),
    );
  }

  getById(id: string): Observable<ClergyMember> {
    return this.http.get<ClergyMember>(`clergy-members/${id}`);
  }

  create(body: CreateClergyMemberDto): Observable<ClergyMember> {
    return this.http.post<ClergyMember>('clergy-members', body);
  }

  update(id: string, body: UpdateClergyMemberDto): Observable<ClergyMember> {
    return this.http.patch<ClergyMember>(`clergy-members/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`clergy-members/${id}`);
  }
}
