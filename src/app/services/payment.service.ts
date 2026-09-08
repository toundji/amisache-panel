import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { Payment, PaymentStatus } from '../models/payment.model';

/**
 * Miroir de PaymentController (amisache-backend src/payment/controllers/payment.controller.ts).
 * Pas de liste exposée par l'API : un paiement se consulte par id depuis
 * la demande / le don qui le référence. La confirmation / le rejet est
 * réservé au clergé ACTIF de la paroisse concernée (§7.6) — l'API renvoie
 * 403 sinon, y compris pour un admin plateforme.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  private selectedSignal = signal<Payment | null>(null);
  readonly selected = this.selectedSignal.asReadonly();

  select(payment: Payment): void {
    this.selectedSignal.set(payment);
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
