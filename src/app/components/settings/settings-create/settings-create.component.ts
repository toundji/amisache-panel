import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { SettingService } from '../../../services/setting.service';
import { SETTING_TYPE_LABELS, SettingType } from '../../../models/setting.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-settings-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './settings-create.component.html',
  styleUrl: './settings-create.component.scss',
})
export class SettingsCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly settingService = inject(SettingService);

  readonly form: FormGroup = this.fb.group({
    key: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    value: [''],
    type: [SettingType.string],
    category: [''],
    label: [''],
    description: [''],
    isPublic: [false],
    isEditable: [true],
  });

  typeList = Object.values(SettingType);
  typeLabels = SETTING_TYPE_LABELS;

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

    const body = {
      ...this.form.value,
      category: this.form.value.category || undefined,
      label: this.form.value.label || undefined,
      description: this.form.value.description || undefined,
    };

    this.settingService.create(body).subscribe({
      next: (setting) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'Setting créé', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/settings', setting.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
