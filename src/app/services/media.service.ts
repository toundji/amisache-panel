import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AddMediaDto, Media } from '../models/media.model';

/**
 * Miroir de MediaController (amisache-backend src/community/controllers/media.controller.ts).
 * GET /media?publicationId (public), POST /media (rattacher une URL),
 * DELETE /media/:id. L'upload de fichier (POST /media/upload) n'est pas
 * couvert ici — on rattache des URLs (YouTube, Facebook, fichier déjà hébergé).
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);

  private mediaSignal = signal<Media[] | undefined>(undefined);
  readonly media = this.mediaSignal.asReadonly();

  listForPublication(publicationId: string): Observable<Media[]> {
    return this.http
      .get<Media[]>('media', { params: new HttpParams().set('publicationId', publicationId) })
      .pipe(tap((media) => this.mediaSignal.set(media)));
  }

  add(body: AddMediaDto): Observable<Media> {
    return this.http.post<Media>('media', body);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`media/${id}`);
  }
}
