import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../services/church.service';
import { CountryService } from '../../../services/country.service';
import { RegionService } from '../../../services/region.service';
import { ZoneService } from '../../../services/zone.service';
import { VillageService } from '../../../services/village.service';
import {
  CHURCH_NATURE_LABELS,
  ChurchNature,
  CreateChurchDto,
  defaultNatureFor,
  ENTITY_TYPE_LABELS,
  EntityType,
  SELECTABLE_ENTITY_TYPES,
} from '../../../models/church.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';
import { LocationPickerComponent } from '../../../shared/location-picker/location-picker.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { SearchSelectComponent } from '../../../shared/search-select/search-select.component';

@Component({
  selector: 'app-church-create',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    FieldErrorsComponent,
    BackButtonComponent,
    LocationPickerComponent,
    ModalComponent,
    SearchSelectComponent,
  ],
  templateUrl: './church-create.component.html',
  styleUrl: './church-create.component.scss',
})
export class ChurchCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly churchService = inject(ChurchService);
  private readonly countryService = inject(CountryService);
  private readonly regionService = inject(RegionService);
  private readonly zoneService = inject(ZoneService);
  private readonly villageService = inject(VillageService);

  typeList = SELECTABLE_ENTITY_TYPES;
  typeLabels = ENTITY_TYPE_LABELS;
  natureList = Object.values(ChurchNature);
  natureLabels = CHURCH_NATURE_LABELS;

  countries = this.countryService.countries;
  regions = this.regionService.regions;
  zones = this.zoneService.zones;
  villages = this.villageService.villages;
  parents = this.churchService.allForSelect;

  readonly form: FormGroup = this.fb.group({
    type: ['', [Validators.required]],
    nature: [ChurchNature.VIRTUAL, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    slug: ['', [Validators.maxLength(160)]],
    parentId: [''],
    countryId: [''],
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

  locating = signal(false);
  locateError = signal<string | null>(null);

  // CONFERENCE = racine : countryId requis, pas de parent. Les autres : l'inverse.
  isConference = computed(() => this.form.get('type')?.value === EntityType.CONFERENCE);

  // Région : simple filtre de la liste des zones (non envoyée). Elle suit la
  // zone choisie, mais reste en place quand la zone est vidée.
  private zoneId = toSignal(this.form.get('zoneId')!.valueChanges, { initialValue: '' as string });
  regionId = linkedSignal({
    source: () => ({ zoneId: this.zoneId(), zones: this.zones() }),
    computation: ({ zoneId, zones }, previous) =>
      (zones ?? []).find((z) => z.id === zoneId)?.regionId ?? previous?.value ?? ('' as string),
  });

  regionOptions = computed(() => (this.regions() ?? []).map((r) => ({ value: r.id, label: r.name })));
  zoneOptions = computed(() =>
    (this.zones() ?? [])
      .filter((z) => !this.regionId() || z.regionId === this.regionId())
      .map((z) => ({ value: z.id, label: z.name })),
  );
  parentOptions = computed(() =>
    (this.parents() ?? []).map((p) => ({ value: p.id, label: `${p.name} — ${this.typeLabels[p.type]}` })),
  );
  villageOptions = computed(() =>
    (this.villages() ?? []).filter((v) => v.zoneId === this.zoneId()).map((v) => ({ value: v.id, label: v.name })),
  );

  // Carte en pop-up : repère fixe sur la position de l'église parente
  // choisie, pour situer la nouvelle église par rapport à elle.
  mapOpen = signal(false);
  private selectedParentId = signal(this.form.value.parentId as string);
  selectedParent = computed(() => (this.parents() ?? []).find((c) => c.id === this.selectedParentId()));

  constructor() {
    if (this.countries() === undefined) this.countryService.list().subscribe({ error: () => undefined });
    if (this.regions() === undefined) this.regionService.list().subscribe({ error: () => undefined });
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
    if (this.villages() === undefined) this.villageService.list().subscribe({ error: () => undefined });
    if (this.parents() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    this.form.get('parentId')!.valueChanges.subscribe((id) => this.selectedParentId.set(id));

    // Ajuste les validators parent/pays selon le type choisi.
    this.form.get('type')!.valueChanges.subscribe((type: EntityType) => {
      if (type) this.form.get('nature')!.setValue(defaultNatureFor(type));
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

  onRegionChange(regionId: string): void {
    this.regionId.set(regionId);
    // La zone doit appartenir à la région choisie.
    const zone = (this.zones() ?? []).find((z) => z.id === this.form.get('zoneId')?.value);
    if (zone && regionId && zone.regionId !== regionId) {
      this.form.get('zoneId')?.setValue('');
      this.onZoneChange();
    }
  }

  onZoneChange(): void {
    // Le village doit appartenir à la zone choisie — on le réinitialise.
    this.form.get('villageId')?.setValue('');
  }

  /** Remplit lat/lng avec la position de l'appareil — à faire sur place, à l'église. */
  useCurrentPosition(): void {
    if (!navigator.geolocation) {
      this.locateError.set("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    this.locating.set(true);
    this.locateError.set(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        this.form.patchValue({
          lat: Math.round(position.coords.latitude * 1e6) / 1e6,
          lng: Math.round(position.coords.longitude * 1e6) / 1e6,
        });
      },
      (err) => {
        this.locating.set(false);
        this.locateError.set(
          err.code === err.PERMISSION_DENIED
            ? "Autorisez l'accès à votre position dans le navigateur, puis réessayez."
            : 'Position introuvable pour le moment. Réessayez.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
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
      nature: v.nature,
      name: String(v.name).trim(),
      slug: v.slug?.trim() || undefined,
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
        Swal.fire({ icon: 'success', title: 'Église créée', timer: 1200, showConfirmButton: false }).then(() => {
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
