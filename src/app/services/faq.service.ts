import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CreateFaqDto, Faq, ListFaqAdminQuery, PaginatedFaqs, UpdateFaqDto } from '../models/faq.model';

/**
 * Miroir de FaqController (nest-auth-base src/faq/controllers/faq.controller.ts).
 * Le panel n'utilise que les routes admin (GET /faq/admin, CRUD) — la route
 * publique GET /faq est consommée par le site vitrine, pas ici.
 * GET /faq/admin est paginé côté serveur.
 */
@Injectable({ providedIn: 'root' })
export class FaqService {
  private readonly http = inject(HttpClient);

  private faqsSignal = signal<Faq[] | undefined>(undefined);
  private paginationMetaSignal = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  private selectedSignal = signal<Faq | null>(null);

  // undefined = pas encore chargé → skeleton ; [] = chargé mais vide → empty-state
  readonly faqs = this.faqsSignal.asReadonly();
  readonly paginationMeta = this.paginationMetaSignal.asReadonly();
  // Élément cliqué depuis la liste — stub affiché sur la page de détail le
  // temps que `getById` réponde (cf. CLAUDE.md § Pages de détail).
  readonly selected = this.selectedSignal.asReadonly();

  select(faq: Faq): void {
    this.selectedSignal.set(faq);
  }

  listAdmin(query: ListFaqAdminQuery = {}): Observable<PaginatedFaqs> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedFaqs>('faq/admin', { params }).pipe(
      tap((result) => {
        this.faqsSignal.set(result.data);
        this.paginationMetaSignal.set({
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        });
      }),
    );
  }

  getById(id: string): Observable<Faq> {
    return this.http.get<Faq>(`faq/${id}`);
  }

  create(body: CreateFaqDto): Observable<Faq> {
    return this.http.post<Faq>('faq', body);
  }

  update(id: string, body: UpdateFaqDto): Observable<Faq> {
    return this.http.patch<Faq>(`faq/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`faq/${id}`);
  }
}
