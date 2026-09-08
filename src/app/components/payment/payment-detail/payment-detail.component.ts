import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PaymentService } from '../../../services/payment.service';
import {
  PAYMENT_OPERATOR_LABELS,
  PAYMENT_STATUS_LABELS,
  Payment,
  PaymentStatus,
} from '../../../models/payment.model';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-payment-detail',
  imports: [CommonModule, RouterLink, BackButtonComponent],
  templateUrl: './payment-detail.component.html',
  styleUrl: './payment-detail.component.scss',
})
export class PaymentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly paymentService = inject(PaymentService);

  private readonly paymentId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.paymentService.selected()?.id === this.paymentId ? this.paymentService.selected() : null;

  payment = signal<Payment | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  statusSaving = signal(false);

  operatorLabels = PAYMENT_OPERATOR_LABELS;
  statusLabels = PAYMENT_STATUS_LABELS;
  readonly SUBMITTED = PaymentStatus.SUBMITTED;
  readonly CONFIRMED = PaymentStatus.CONFIRMED;
  readonly REJECTED = PaymentStatus.REJECTED;

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.paymentService.getById(this.paymentId).subscribe({
      next: (payment) => {
        this.payment.set(payment);
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du paiement.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  statusBadge(status: PaymentStatus): string {
    return {
      [PaymentStatus.SUBMITTED]: 'status-warning',
      [PaymentStatus.CONFIRMED]: 'status-success',
      [PaymentStatus.REJECTED]: 'status-danger',
    }[status];
  }

  setStatus(status: PaymentStatus.CONFIRMED | PaymentStatus.REJECTED): void {
    const payment = this.payment();
    if (!payment || this.statusSaving() || payment.status !== PaymentStatus.SUBMITTED) return;

    const label = status === PaymentStatus.CONFIRMED ? 'Confirmer' : 'Rejeter';
    Swal.fire({
      title: `${label} ce paiement ?`,
      text: "Réservé au clergé actif de la paroisse concernée (§7.6) — l'API refuse sinon.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: label,
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.statusSaving.set(true);
      this.paymentService.updateStatus(payment.id, status).subscribe({
        next: (updated) => {
          this.payment.set(updated);
          this.statusSaving.set(false);
        },
        error: (err) => {
          this.statusSaving.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error');
        },
      });
    });
  }
}
