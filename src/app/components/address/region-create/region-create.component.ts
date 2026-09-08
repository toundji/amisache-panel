import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { RegionService } from '../../../services/region.service';
import { CountryService } from '../../../services/country.service';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-region-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './region-create.component.html',
  styleUrl: './region-create.component.scss',
})
export class RegionCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly regionService = inject(RegionService);
  private readonly countryService = inject(CountryService);

  countries = this.countryService.countries;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    countryId: [this.route.snapshot.queryParamMap.get('countryId') ?? '', [Validators.required]],
    parentSub: ['', [Validators.maxLength(120)]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.countries() === undefined) this.countryService.list().subscribe({ error: () => undefined });
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

    this.error = undefined;
    this.submitting.set(true);

    const body = {
      name: String(this.form.value.name).trim(),
      countryId: this.form.value.countryId,
      parentSub: this.form.value.parentSub?.trim() || undefined,
    };

    this.regionService.create(body).subscribe({
      next: (region) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'Région créée', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/geo/regions', region.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
