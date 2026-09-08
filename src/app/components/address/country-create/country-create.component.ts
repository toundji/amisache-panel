import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { CountryService } from '../../../services/country.service';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

/** Convertit un textarea "une valeur par ligne" en tableau nettoyé. */
function linesToArray(text: string): string[] {
  return (text ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

@Component({
  selector: 'app-country-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './country-create.component.html',
  styleUrl: './country-create.component.scss',
})
export class CountryCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly countryService = inject(CountryService);

  readonly form: FormGroup = this.fb.group({
    isoCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    callingCode: ['', [Validators.required]],
    subdivisions: ['', [Validators.required]],
    allSub: ['', [Validators.required]],
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

    const subdivisions = linesToArray(this.form.value.subdivisions);
    const allSub = linesToArray(this.form.value.allSub);

    if (subdivisions.length === 0 || allSub.length === 0) {
      this.error = { msg: 'Renseignez au moins une valeur pour les niveaux modélisés et le découpage réel.' };
      return;
    }

    this.error = undefined;
    this.submitting.set(true);

    this.countryService
      .create({
        isoCode: String(this.form.value.isoCode).trim().toUpperCase(),
        callingCode: String(this.form.value.callingCode).trim(),
        subdivisions,
        allSub,
      })
      .subscribe({
        next: (country) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Pays créé', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/geo/countries', country.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
