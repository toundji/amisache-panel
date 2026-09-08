import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  CreatePaymentMethodDto,
  ListPaymentMethodQuery,
  PaymentMethod,
  UpdatePaymentMethodDto,
} from '../models/payment-method.model';

/**
 * Miroir de PaymentMethodController (amisache-backend src/payment/controllers/payment-method.controller.ts).
 * GET /payment-methods : `churchId` optionnel côté panel, `activeOnly=false`
 * pour tout voir. Liste non paginée serveur, relations non chargées →
 * pagination + résolution des libellés côté CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private readonly http = inject(HttpClient);

  private methodsSignal = signal<PaymentMethod[] | undefined>(undefined);
  private selectedSignal = signal<PaymentMethod | null>(null);

  readonly methods = this.methodsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(method: PaymentMethod): void {
    this.selectedSignal.set(method);
  }

  list(query: ListPaymentMethodQuery = {}): Observable<PaymentMethod[]> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaymentMethod[]>('payment-methods', { params }).pipe(
      tap((methods) => this.methodsSignal.set(methods)),
    );
  }

  getById(id: string): Observable<PaymentMethod> {
    return this.http.get<PaymentMethod>(`payment-methods/${id}`);
  }

  create(body: CreatePaymentMethodDto): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>('payment-methods', body);
  }

  update(id: string, body: UpdatePaymentMethodDto): Observable<PaymentMethod> {
    return this.http.patch<PaymentMethod>(`payment-methods/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`payment-methods/${id}`);
  }
}
