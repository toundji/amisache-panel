import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { TypeService } from '../../../services/type.service';
import { TYPE_SCOPE_LABELS, TypeScope } from '../../../models/type.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-type-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './type-create.component.html',
  styleUrl: './type-create.component.scss',
})
export class TypeCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly typeService = inject(TypeService);

  scopeList = Object.values(TypeScope);
  scopeLabels = TYPE_SCOPE_LABELS;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    scope: ['', [Validators.required]],
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

    this.typeService
      .create({
        name: String(this.form.value.name).trim(),
        scope: this.form.value.scope as TypeScope,
      })
      .subscribe({
        next: (type) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Type créé', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/types', type.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
