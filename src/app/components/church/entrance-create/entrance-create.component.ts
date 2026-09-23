import { Component, computed, inject, signal } from '@angular/core';
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
import { ModalComponent } from '../../../shared/modal/modal.component';
import { LocationPickerComponent } from '../../../shared/location-picker/location-picker.component';

@Component({
  selector: 'app-entrance-create',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FieldErrorsComponent,
    BackButtonComponent,
    ModalComponent,
    LocationPickerComponent,
  ],
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

  // Carte en pop-up : repère fixe sur la position de l'église choisie, pour
  // situer l'entrée par rapport à elle plutôt que de saisir lat/lng à l'aveugle.
  mapOpen = signal(false);
  private selectedChurchId = signal(this.form.value.churchId as string);
  selectedChurch = computed(() => (this.churches() ?? []).find((c) => c.id === this.selectedChurchId()));

  constructor() {
    if (this.churches() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    this.form.get('churchId')!.valueChanges.subscribe((id) => this.selectedChurchId.set(id));
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onMapPosition(position: { lat: number; lng: number }): void {
    this.form.patchValue({ lat: position.lat, lng: position.lng });
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
