import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ZoneService } from '../../../services/zone.service';
import { RegionService } from '../../../services/region.service';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-zone-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './zone-create.component.html',
  styleUrl: './zone-create.component.scss',
})
export class ZoneCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly zoneService = inject(ZoneService);
  private readonly regionService = inject(RegionService);

  regions = this.regionService.regions;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    regionId: [this.route.snapshot.queryParamMap.get('regionId') ?? '', [Validators.required]],
    parentSub: ['', [Validators.maxLength(120)]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.regions() === undefined) this.regionService.list().subscribe({ error: () => undefined });
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
      regionId: this.form.value.regionId,
      parentSub: this.form.value.parentSub?.trim() || undefined,
    };

    this.zoneService.create(body).subscribe({
      next: (zone) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'Zone créée', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/geo/zones', zone.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
