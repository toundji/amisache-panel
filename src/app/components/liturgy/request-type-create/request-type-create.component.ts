import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { RequestTypeService } from '../../../services/request-type.service';
import { REQUEST_TYPE_SCOPE_LABELS, RequestTypeScope } from '../../../models/request-type.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-request-type-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './request-type-create.component.html',
  styleUrl: './request-type-create.component.scss',
})
export class RequestTypeCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly requestTypeService = inject(RequestTypeService);

  scopeList = Object.values(RequestTypeScope);
  scopeLabels = REQUEST_TYPE_SCOPE_LABELS;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    scope: ['', [Validators.required]],
    allowHomeCelebration: [false],
    minLeadDays: [2, [Validators.required, Validators.min(0)]],
    requiresScheduleMatch: [false],
  });

  submitting = signal(false);
  error?: ServerError;

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = undefined;
    this.submitting.set(true);

    this.requestTypeService
      .create({
        name: String(this.form.value.name).trim(),
        scope: this.form.value.scope as RequestTypeScope,
        allowHomeCelebration: !!this.form.value.allowHomeCelebration,
        minLeadDays: Number(this.form.value.minLeadDays),
        requiresScheduleMatch: !!this.form.value.requiresScheduleMatch,
      })
      .subscribe({
        next: (type) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Type de demande créé', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/request-types', type.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
