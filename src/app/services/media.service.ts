import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AddMediaDto, Media } from '../models/media.model';

/**
 * Miroir de MediaController (amisache-backend src/community/controllers/media.controller.ts).
 * GET /media?publicationId (public), POST /media (rattacher une URL),
 * POST /media/upload (uploader un fichier — renvoie son URL, à rattacher
 * ensuite via `add` avec `provider: UPLOAD`), DELETE /media/:id.
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

  /** Uploade un fichier image/vidéo et renvoie son URL — ne l'attache pas encore à une publication. */
  upload(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<{ url: string }>('media/upload', fd);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`media/${id}`);
  }
}
