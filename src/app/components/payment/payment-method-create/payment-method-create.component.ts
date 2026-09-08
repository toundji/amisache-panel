import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PaymentMethodService } from '../../../services/payment-method.service';
import { ChurchService } from '../../../services/church.service';
import { PAYMENT_OPERATOR_LABELS, PaymentOperator } from '../../../models/payment.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-payment-method-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './payment-method-create.component.html',
  styleUrl: './payment-method-create.component.scss',
})
export class PaymentMethodCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly methodService = inject(PaymentMethodService);
  private readonly churchService = inject(ChurchService);

  operatorList = Object.values(PaymentOperator);
  operatorLabels = PAYMENT_OPERATOR_LABELS;

  churches = this.churchService.allForSelect;

  readonly form: FormGroup = this.fb.group({
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    operator: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    accountName: ['', [Validators.required, Validators.maxLength(160)]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.error = undefined;
    this.submitting.set(true);

    this.methodService
      .create({
        churchId: v.churchId,
        operator: v.operator,
        phone: v.phone.trim(),
        accountName: v.accountName.trim(),
      })
      .subscribe({
        next: (method) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Moyen de paiement publié', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/payment/methods', method.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
