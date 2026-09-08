import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { EntranceService } from '../../../services/entrance.service';
import { Entrance, ENTRANCE_TYPE_LABELS, EntranceType } from '../../../models/entrance.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-entrance-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './entrance-detail.component.html',
  styleUrl: './entrance-detail.component.scss',
})
export class EntranceDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly entranceService = inject(EntranceService);
  private readonly fb = inject(FormBuilder);

  private readonly entranceId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.entranceService.selected()?.id === this.entranceId ? this.entranceService.selected() : null;

  entrance = signal<Entrance | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  typeList = Object.values(EntranceType);
  typeLabels = ENTRANCE_TYPE_LABELS;

  // Localisation : sauvegarde groupée (lat + lng) — le PATCH remplace le Point.
  private originalLoc: { lat: number | null; lng: number | null } = { lat: null, lng: null };
  locSaving = signal(false);
  locJustSaved = signal(false);

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    type: [this.stub?.type ?? ''],
    lat: [this.stub?.location?.coordinates?.[1] ?? null],
    lng: [this.stub?.location?.coordinates?.[0] ?? null],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.entranceService.update(this.entrance()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
    this.snapshotLoc();
  }

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.entranceService.getById(this.entranceId).subscribe({
      next: (entrance) => {
        this.entrance.set(entrance);
        this.form.patchValue({
          name: entrance.name,
          type: entrance.type,
          lat: entrance.location?.coordinates?.[1] ?? null,
          lng: entrance.location?.coordinates?.[0] ?? null,
        });
        this.initOriginalValues();
        this.snapshotLoc();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set("Erreur lors du chargement de l'entrée.");
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  private snapshotLoc(): void {
    this.originalLoc = { lat: this.form.value.lat, lng: this.form.value.lng };
  }

  isLocModified(): boolean {
    return this.form.value.lat !== this.originalLoc.lat || this.form.value.lng !== this.originalLoc.lng;
  }

  resetLoc(): void {
    this.form.patchValue({ lat: this.originalLoc.lat, lng: this.originalLoc.lng });
  }

  saveLoc(): void {
    if (!this.isLocModified() || this.locSaving()) return;
    const { lat, lng } = this.form.value;
    if (lat === null || lat === '' || lng === null || lng === '') {
      Swal.fire('Coordonnées requises', 'Latitude et longitude sont obligatoires.', 'warning');
      return;
    }
    this.locSaving.set(true);
    this.entranceService
      .update(this.entrance()!.id, { location: { lat: Number(lat), lng: Number(lng) } })
      .subscribe({
        next: (entrance) => {
          this.entrance.set(entrance);
          this.snapshotLoc();
          this.locSaving.set(false);
          this.locJustSaved.set(true);
          setTimeout(() => this.locJustSaved.set(false), 2000);
        },
        error: (err) => {
          this.locSaving.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Enregistrement impossible.', 'error');
        },
      });
  }

  deleteEntrance(): void {
    const entrance = this.entrance();
    if (!entrance) return;

    Swal.fire({
      title: 'Supprimer cette entrée ?',
      text: `« ${entrance.name} » sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.entranceService.delete(entrance.id).subscribe({
        next: () => this.router.navigate(['/entrances']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
