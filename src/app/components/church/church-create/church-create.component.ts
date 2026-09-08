import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../services/church.service';
import { CountryService } from '../../../services/country.service';
import { ZoneService } from '../../../services/zone.service';
import { VillageService } from '../../../services/village.service';
import {
  CreateChurchDto,
  ENTITY_TYPE_LABELS,
  EntityType,
} from '../../../models/church.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-church-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './church-create.component.html',
  styleUrl: './church-create.component.scss',
})
export class ChurchCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly churchService = inject(ChurchService);
  private readonly countryService = inject(CountryService);
  private readonly zoneService = inject(ZoneService);
  private readonly villageService = inject(VillageService);

  typeList = Object.values(EntityType);
  typeLabels = ENTITY_TYPE_LABELS;

  countries = this.countryService.countries;
  zones = this.zoneService.zones;
  villages = this.villageService.villages;
  parents = this.churchService.allForSelect;

  readonly form: FormGroup = this.fb.group({
    type: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    slug: ['', [Validators.maxLength(160)]],
    parentId: [''],
    countryId: [''],
    leaderMessage: [''],
    accentColor: [''],
    defaultLanguage: ['fr', [Validators.maxLength(10)]],
    // Adresse (objet-valeur embarqué)
    zoneId: ['', [Validators.required]],
    villageId: [''],
    locality: [''],
    landmark: [''],
    lat: [null],
    lng: [null],
  });

  submitting = signal(false);
  error?: ServerError;

  // CONFERENCE = racine : countryId requis, pas de parent. Les autres : l'inverse.
  isConference = computed(() => this.form.get('type')?.value === EntityType.CONFERENCE);

  villagesForZone = computed(() => {
    const zoneId = this.form.get('zoneId')?.value;
    return (this.villages() ?? []).filter((v) => v.zoneId === zoneId);
  });

  constructor() {
    if (this.countries() === undefined) this.countryService.list().subscribe({ error: () => undefined });
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
    if (this.villages() === undefined) this.villageService.list().subscribe({ error: () => undefined });
    if (this.parents() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });

    // Ajuste les validators parent/pays selon le type choisi.
    this.form.get('type')!.valueChanges.subscribe((type: EntityType) => {
      const parent = this.form.get('parentId')!;
      const country = this.form.get('countryId')!;
      if (type === EntityType.CONFERENCE) {
        parent.clearValidators();
        parent.setValue('');
        country.setValidators([Validators.required]);
      } else {
        country.clearValidators();
        country.setValue('');
        parent.setValidators([Validators.required]);
      }
      parent.updateValueAndValidity();
      country.updateValueAndValidity();
    });
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onZoneChange(): void {
    // Le village doit appartenir à la zone choisie — on le réinitialise.
    this.form.get('villageId')?.setValue('');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const hasCoords = v.lat !== null && v.lat !== '' && v.lng !== null && v.lng !== '';

    const body: CreateChurchDto = {
      type: v.type,
      name: String(v.name).trim(),
      slug: v.slug?.trim() || undefined,
      leaderMessage: v.leaderMessage?.trim() || undefined,
      accentColor: v.accentColor?.trim() || undefined,
      defaultLanguage: v.defaultLanguage?.trim() || undefined,
      parentId: this.isConference() ? undefined : v.parentId || undefined,
      countryId: this.isConference() ? v.countryId || undefined : undefined,
      address: {
        zoneId: v.zoneId,
        villageId: v.villageId || undefined,
        locality: v.locality?.trim() || undefined,
        landmark: v.landmark?.trim() || undefined,
        location: hasCoords ? { lat: Number(v.lat), lng: Number(v.lng) } : undefined,
      },
    };

    this.error = undefined;
    this.submitting.set(true);

    this.churchService.create(body).subscribe({
      next: (church) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'Entité créée', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/churches', church.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
