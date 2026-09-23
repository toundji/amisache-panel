import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ChurchProfile, UpsertChurchProfileDto } from '../models/church-profile.model';

/** Miroir de ChurchProfileController (amisache-backend src/church/controllers/church-profile.controller.ts). */
@Injectable({ providedIn: 'root' })
export class ChurchProfileService {
  private readonly http = inject(HttpClient);

  getForChurch(churchId: string): Observable<ChurchProfile | null> {
    return this.http.get<ChurchProfile | null>(`church-profiles/church/${churchId}`);
  }

  upsertForChurch(churchId: string, body: UpsertChurchProfileDto): Observable<ChurchProfile> {
    return this.http.patch<ChurchProfile>(`church-profiles/church/${churchId}`, body);
  }
}
