import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { PaymentMethodService } from '../../../services/payment-method.service';
import { ChurchService } from '../../../services/church.service';
import { PaymentMethod } from '../../../models/payment-method.model';
import { PAYMENT_OPERATOR_LABELS, PaymentOperator } from '../../../models/payment.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-payment-method-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './payment-method-detail.component.html',
  styleUrl: './payment-method-detail.component.scss',
})
export class PaymentMethodDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly methodService = inject(PaymentMethodService);
  private readonly churchService = inject(ChurchService);
  private readonly fb = inject(FormBuilder);

  private readonly methodId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.methodService.selected()?.id === this.methodId ? this.methodService.selected() : null;

  method = signal<PaymentMethod | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);
  activeSaving = signal(false);

  operatorList = Object.values(PaymentOperator);
  operatorLabels = PAYMENT_OPERATOR_LABELS;

  form: FormGroup = this.fb.group({
    operator: [this.stub?.operator ?? ''],
    phone: [this.stub?.phone ?? ''],
    accountName: [this.stub?.accountName ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.methodService.update(this.method()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.methodService.getById(this.methodId).subscribe({
      next: (method) => {
        this.method.set(method);
        this.form.patchValue({
          operator: method.operator,
          phone: method.phone,
          accountName: method.accountName,
        });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du moyen de paiement.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  churchName(): string {
    const m = this.method();
    if (!m) return '';
    return m.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === m.churchId)?.name ?? m.churchId;
  }

  toggleActive(): void {
    const m = this.method();
    if (!m || this.activeSaving()) return;

    this.activeSaving.set(true);
    this.methodService.update(m.id, { active: !m.active }).subscribe({
      next: (updated) => {
        this.method.set(updated);
        this.activeSaving.set(false);
      },
      error: (err) => {
        this.activeSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Changement impossible.', 'error');
      },
    });
  }

  deleteMethod(): void {
    const m = this.method();
    if (!m) return;

    Swal.fire({
      title: 'Supprimer ce moyen de paiement ?',
      text: 'Il sera supprimé définitivement.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.methodService.delete(m.id).subscribe({
        next: () => this.router.navigate(['/payment/methods']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
