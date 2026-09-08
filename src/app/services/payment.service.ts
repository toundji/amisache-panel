import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ListPaymentQuery, Payment, PaymentStatus } from '../models/payment.model';

/**
 * Miroir de PaymentController (amisache-backend src/payment/controllers/payment.controller.ts).
 * Listes complètes non paginées : `GET /payments/admin` (tout) et
 * `GET /payments/church/:churchId` (une paroisse, via paymentMethod.churchId).
 * Relations : chaque paiement porte son `paymentMethod`. La confirmation /
 * le rejet est réservé au clergé ACTIF de la paroisse concernée (§7.6) —
 * l'API renvoie 403 sinon, y compris pour un admin plateforme.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  private paymentsSignal = signal<Payment[] | undefined>(undefined);
  private selectedSignal = signal<Payment | null>(null);

  readonly payments = this.paymentsSignal.asReadonly();
  readonly selected = this.selectedSignal.asReadonly();

  select(payment: Payment): void {
    this.selectedSignal.set(payment);
  }

  listAdmin(query: ListPaymentQuery = {}): Observable<Payment[]> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    return this.http.get<Payment[]>('payments/admin', { params }).pipe(
      tap((payments) => this.paymentsSignal.set(payments)),
    );
  }

  listForChurch(churchId: string, query: ListPaymentQuery = {}): Observable<Payment[]> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    return this.http.get<Payment[]>(`payments/church/${churchId}`, { params }).pipe(
      tap((payments) => this.paymentsSignal.set(payments)),
    );
  }

  getById(id: string): Observable<Payment> {
    return this.http.get<Payment>(`payments/${id}`);
  }

  updateStatus(
    id: string,
    status: PaymentStatus.CONFIRMED | PaymentStatus.REJECTED,
  ): Observable<Payment> {
    return this.http.patch<Payment>(`payments/${id}/status`, { status });
  }
}
