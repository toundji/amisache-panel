import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { VillageService } from '../../../services/village.service';
import { ZoneService } from '../../../services/zone.service';
import { VillageType, VILLAGE_TYPE_LABELS } from '../../../models/village.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-village-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './village-create.component.html',
  styleUrl: './village-create.component.scss',
})
export class VillageCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly villageService = inject(VillageService);
  private readonly zoneService = inject(ZoneService);

  zones = this.zoneService.zones;
  typeList = Object.values(VillageType);
  typeLabels = VILLAGE_TYPE_LABELS;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: [VillageType.VILLAGE, [Validators.required]],
    zoneId: [this.route.snapshot.queryParamMap.get('zoneId') ?? '', [Validators.required]],
    parentSub: ['', [Validators.maxLength(120)]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
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
      type: this.form.value.type as VillageType,
      zoneId: this.form.value.zoneId,
      parentSub: this.form.value.parentSub?.trim() || undefined,
    };

    this.villageService.create(body).subscribe({
      next: (village) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'Entrée créée', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/geo/villages', village.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
