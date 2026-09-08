import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { GroupMember } from '../models/group.model';

/**
 * Miroir de GroupMemberController (amisache-backend src/community/controllers/group-member.controller.ts).
 * Le panel n'utilise que GET /group-members/admin?groupId (membres d'un
 * groupe, avec `user`) et DELETE /group-members/:id. Rejoindre un groupe
 * est du self-service fidèle, hors back-office.
 */
@Injectable({ providedIn: 'root' })
export class GroupMemberService {
  private readonly http = inject(HttpClient);

  private membersSignal = signal<GroupMember[] | undefined>(undefined);
  readonly members = this.membersSignal.asReadonly();

  listForGroup(groupId: string): Observable<GroupMember[]> {
    return this.http
      .get<GroupMember[]>('group-members/admin', { params: new HttpParams().set('groupId', groupId) })
      .pipe(tap((members) => this.membersSignal.set(members)));
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`group-members/${id}`);
  }
}
