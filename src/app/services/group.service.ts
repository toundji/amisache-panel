import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { CreateGroupDto, Group, ListGroupQuery, UpdateGroupDto } from '../models/group.model';

/**
 * Miroir de GroupController (amisache-backend src/community/controllers/group.controller.ts).
 * GET /groups : `churchId` optionnel côté panel. Liste non paginée serveur,
 * relations non chargées → pagination + libellés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http = inject(HttpClient);

  private groupsSignal = signal<Group[] | undefined>(undefined);
  private selectedSignal = signal<Group | null>(null);

  readonly groups = this.groupsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(group: Group): void {
    this.selectedSignal.set(group);
  }

  loaded(id: string): Group | undefined {
    return (this.groupsSignal() ?? []).find((g) => g.id === id);
  }

  list(query: ListGroupQuery = {}): Observable<Group[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Group[]>('groups', { params }).pipe(
      tap((groups) => this.groupsSignal.set(groups)),
    );
  }

  getById(id: string): Observable<Group> {
    return this.http.get<Group>(`groups/${id}`);
  }

  create(body: CreateGroupDto): Observable<Group> {
    return this.http.post<Group>('groups', body);
  }

  update(id: string, body: UpdateGroupDto): Observable<Group> {
    return this.http.patch<Group>(`groups/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`groups/${id}`);
  }
}
