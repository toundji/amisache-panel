import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { EntranceService } from '../../../services/entrance.service';
import { ChurchService } from '../../../services/church.service';
import { ENTRANCE_TYPE_LABELS, EntranceType } from '../../../models/entrance.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-entrance-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './entrance-create.component.html',
  styleUrl: './entrance-create.component.scss',
})
export class EntranceCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly entranceService = inject(EntranceService);
  private readonly churchService = inject(ChurchService);

  typeList = Object.values(EntranceType);
  typeLabels = ENTRANCE_TYPE_LABELS;
  churches = this.churchService.allForSelect;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['', [Validators.required]],
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    lat: [null, [Validators.required]],
    lng: [null, [Validators.required]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
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

    this.entranceService
      .create({
        name: String(v.name).trim(),
        type: v.type,
        churchId: v.churchId,
        location: { lat: Number(v.lat), lng: Number(v.lng) },
      })
      .subscribe({
        next: (entrance) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Entrée créée', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/entrances', entrance.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
