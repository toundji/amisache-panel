import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../services/church.service';
import { ZoneService } from '../../../services/zone.service';
import { VillageService } from '../../../services/village.service';
import {
  Church,
  ENTITY_TYPE_LABELS,
  VALIDATION_STATUS_LABELS,
  ValidationStatus,
} from '../../../models/church.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-church-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './church-detail.component.html',
  styleUrl: './church-detail.component.scss',
})
export class ChurchDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly churchService = inject(ChurchService);
  private readonly zoneService = inject(ZoneService);
  private readonly villageService = inject(VillageService);
  private readonly fb = inject(FormBuilder);

  private readonly churchId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.churchService.selected()?.id === this.churchId ? this.churchService.selected() : null;

  church = signal<Church | null>(this.stub);
  zones = this.zoneService.zones;
  villages = this.villageService.villages;
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);
  statusSaving = signal(false);
  bannerUploading = signal(false);

  typeLabels = ENTITY_TYPE_LABELS;
  statusLabels = VALIDATION_STATUS_LABELS;
  statusList = Object.values(ValidationStatus);

  // ── Bloc adresse : sauvegarde groupée (PATCH remplace tout l'objet address) ──
  private originalAddress: Record<string, unknown> = {};
  addressSaving = signal(false);
  addressJustSaved = signal(false);

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    slug: [this.stub?.slug ?? ''],
    leaderMessage: [this.stub?.leaderMessage ?? ''],
    accentColor: [this.stub?.accentColor ?? '#16235C'],
    defaultLanguage: [this.stub?.defaultLanguage ?? 'fr'],
    zoneId: [this.stub?.address?.zoneId ?? ''],
    villageId: [this.stub?.address?.villageId ?? ''],
    locality: [this.stub?.address?.locality ?? ''],
    landmark: [this.stub?.address?.landmark ?? ''],
    lat: [this.stub?.address?.location?.coordinates?.[1] ?? null],
    lng: [this.stub?.address?.location?.coordinates?.[0] ?? null],
  });

  private readonly addressKeys = ['zoneId', 'villageId', 'locality', 'landmark', 'lat', 'lng'];

  villagesForZone = computed(() => {
    const zoneId = this.form.get('zoneId')?.value;
    return (this.villages() ?? []).filter((v) => v.zoneId === zoneId);
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.churchService.update(this.church()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
    this.snapshotAddress();
  }

  ngOnInit(): void {
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
    if (this.villages() === undefined) this.villageService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.churchService.getById(this.churchId).subscribe({
      next: (church) => {
        this.church.set(church);
        this.form.patchValue({
          name: church.name,
          slug: church.slug,
          leaderMessage: church.leaderMessage ?? '',
          accentColor: church.accentColor ?? '#16235C',
          defaultLanguage: church.defaultLanguage ?? 'fr',
          zoneId: church.address?.zoneId ?? '',
          villageId: church.address?.villageId ?? '',
          locality: church.address?.locality ?? '',
          landmark: church.address?.landmark ?? '',
          lat: church.address?.location?.coordinates?.[1] ?? null,
          lng: church.address?.location?.coordinates?.[0] ?? null,
        });
        this.initOriginalValues();
        this.snapshotAddress();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set("Erreur lors du chargement de l'entité.");
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  // ── Adresse groupée ──────────────────────────────────────
  private snapshotAddress(): void {
    const v = this.form.value;
    this.originalAddress = {};
    this.addressKeys.forEach((k) => (this.originalAddress[k] = v[k]));
  }

  isAddressModified(): boolean {
    const v = this.form.value;
    return this.addressKeys.some((k) => JSON.stringify(v[k]) !== JSON.stringify(this.originalAddress[k]));
  }

  resetAddress(): void {
    const patch: Record<string, unknown> = {};
    this.addressKeys.forEach((k) => (patch[k] = this.originalAddress[k]));
    this.form.patchValue(patch);
  }

  onZoneChange(): void {
    this.form.get('villageId')?.setValue('');
  }

  saveAddress(): void {
    if (!this.isAddressModified() || this.addressSaving()) return;
    const v = this.form.value;
    if (!v.zoneId) {
      Swal.fire('Zone requise', 'Une adresse doit référencer au moins sa zone.', 'warning');
      return;
    }
    const hasCoords = v.lat !== null && v.lat !== '' && v.lng !== null && v.lng !== '';

    this.addressSaving.set(true);
    this.churchService
      .update(this.church()!.id, {
        address: {
          zoneId: v.zoneId,
          villageId: v.villageId || undefined,
          locality: v.locality?.trim() || undefined,
          landmark: v.landmark?.trim() || undefined,
          location: hasCoords ? { lat: Number(v.lat), lng: Number(v.lng) } : undefined,
        },
      })
      .subscribe({
        next: (church) => {
          this.church.set(church);
          this.snapshotAddress();
          this.addressSaving.set(false);
          this.addressJustSaved.set(true);
          setTimeout(() => this.addressJustSaved.set(false), 2000);
        },
        error: (err) => {
          this.addressSaving.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Enregistrement impossible.', 'error');
        },
      });
  }

  // ── Statut ───────────────────────────────────────────────
  setStatus(status: ValidationStatus): void {
    const church = this.church();
    if (!church || this.statusSaving() || church.status === status) return;

    this.statusSaving.set(true);
    this.churchService.updateStatus(church.id, status).subscribe({
      next: () => {
        this.church.update((c) => (c ? { ...c, status } : c));
        this.statusSaving.set(false);
      },
      error: (err) => {
        this.statusSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Changement de statut impossible.', 'error');
      },
    });
  }

  // ── Bannière ─────────────────────────────────────────────
  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.bannerUploading.set(true);
    this.churchService.updateBanner(this.church()!.id, file).subscribe({
      next: (church) => {
        this.church.set(church);
        this.bannerUploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.bannerUploading.set(false);
        input.value = '';
        Swal.fire('Erreur', err?.error?.msg ?? 'Upload impossible.', 'error');
      },
    });
  }

  deleteChurch(): void {
    const church = this.church();
    if (!church) return;

    Swal.fire({
      title: 'Supprimer cette entité ?',
      text: `« ${church.name} » sera supprimée définitivement. Refusé tant qu'elle a des entités enfants.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.churchService.delete(church.id).subscribe({
        next: () => this.router.navigate(['/churches']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible (entités enfants ?).', 'error');
        },
      });
    });
  }
}
