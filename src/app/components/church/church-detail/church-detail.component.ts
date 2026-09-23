import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { ChurchService } from '../../../services/church.service';
import { ChurchProfileService } from '../../../services/church-profile.service';
import { ZoneService } from '../../../services/zone.service';
import { VillageService } from '../../../services/village.service';
import {
  Church,
  ENTITY_TYPE_LABELS,
  VALIDATION_STATUS_LABELS,
  ValidationStatus,
} from '../../../models/church.model';
import { ChurchProfile } from '../../../models/church-profile.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';
import { LocationPickerComponent } from '../../../shared/location-picker/location-picker.component';
import { PerimeterPoint, PolygonPickerComponent } from '../../../shared/polygon-picker/polygon-picker.component';
import { ModalComponent } from '../../../shared/modal/modal.component';

@Component({
  selector: 'app-church-detail',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    BackButtonComponent,
    LocationPickerComponent,
    PolygonPickerComponent,
    ModalComponent,
  ],
  templateUrl: './church-detail.component.html',
  styleUrl: './church-detail.component.scss',
})
export class ChurchDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly churchService = inject(ChurchService);
  private readonly churchProfileService = inject(ChurchProfileService);
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
  // Carte GPS en pop-up : repère fixe sur la position de l'église parente,
  // pour se situer par rapport à elle plutôt que face à des lat/lng nus.
  locationMapOpen = signal(false);
  perimeterMapOpen = signal(false);
  parents = this.churchService.allForSelect;
  selectedParent = computed(() => (this.parents() ?? []).find((c) => c.id === this.church()?.parentId));

  bannerUploading = signal(false);
  logoUploading = signal(false);
  photosUploading = signal(false);
  photoRemoving = signal<string | null>(null);

  // Choix fichier/lien — chaque image de présentation peut soit être
  // uploadée, soit pointer vers un lien déjà hébergé ailleurs (ex.
  // Wikimedia Commons, cf. EVOLUTION.md).
  bannerMode = signal<'file' | 'link'>('file');
  bannerLinkInput = signal('');
  logoMode = signal<'file' | 'link'>('file');
  logoLinkInput = signal('');
  photoLinkInput = signal('');

  // ── Emprise géographique (polygone, 4 à 20 sommets — PATCH dédié) ──
  perimeterPoints = signal<{ lat: number | null; lng: number | null }[]>([]);
  perimeterSaving = signal(false);
  perimeterJustSaved = signal(false);
  private originalPerimeter = '[]';
  readonly PERIMETER_MIN = 4;
  readonly PERIMETER_MAX = 20;

  typeLabels = ENTITY_TYPE_LABELS;
  statusLabels = VALIDATION_STATUS_LABELS;
  statusList = Object.values(ValidationStatus);

  // ── Bloc adresse : sauvegarde groupée (PATCH remplace tout l'objet address) ──
  private originalAddress: Record<string, unknown> = {};
  addressSaving = signal(false);
  addressJustSaved = signal(false);

  // ── Message du responsable (ChurchProfile, table séparée de Church) ──
  churchProfile = signal<ChurchProfile | null>(null);
  leaderMessageControl = this.fb.control('');
  private originalLeaderMessage = '';
  profileSaving = signal(false);
  profileJustSaved = signal(false);

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    slug: [this.stub?.slug ?? ''],
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
    if (this.stub) this.seedPerimeter(this.stub);
  }

  ngOnInit(): void {
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
    if (this.villages() === undefined) this.villageService.list().subscribe({ error: () => undefined });
    if (this.parents() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
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
        this.seedPerimeter(church);

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set("Erreur lors du chargement de l'église.");
        if (showLoader) Swal.close();
      },
    });

    this.churchProfileService.getForChurch(this.churchId).subscribe({
      next: (profile) => {
        this.churchProfile.set(profile);
        this.leaderMessageControl.setValue(profile?.leaderMessage ?? '');
        this.originalLeaderMessage = profile?.leaderMessage ?? '';
      },
      error: () => undefined,
    });
  }

  // ── Message du responsable (ChurchProfile) ────────────────
  isLeaderMessageModified(): boolean {
    return (this.leaderMessageControl.value ?? '') !== this.originalLeaderMessage;
  }

  resetLeaderMessage(): void {
    this.leaderMessageControl.setValue(this.originalLeaderMessage);
  }

  saveLeaderMessage(): void {
    if (!this.isLeaderMessageModified() || this.profileSaving()) return;
    const leaderMessage = this.leaderMessageControl.value?.trim() || undefined;

    this.profileSaving.set(true);
    this.churchProfileService.upsertForChurch(this.churchId, { leaderMessage }).subscribe({
      next: (profile) => {
        this.churchProfile.set(profile);
        this.originalLeaderMessage = profile.leaderMessage ?? '';
        this.leaderMessageControl.setValue(this.originalLeaderMessage);
        this.profileSaving.set(false);
        this.profileJustSaved.set(true);
        setTimeout(() => this.profileJustSaved.set(false), 2000);
      },
      error: (err) => {
        this.profileSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Enregistrement impossible.', 'error');
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

  submitBannerLink(): void {
    const url = this.bannerLinkInput().trim();
    if (!url || this.bannerUploading()) return;

    this.bannerUploading.set(true);
    this.churchService.updateBanner(this.church()!.id, url).subscribe({
      next: (church) => {
        this.church.set(church);
        this.bannerUploading.set(false);
        this.bannerLinkInput.set('');
      },
      error: (err) => {
        this.bannerUploading.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Lien invalide.', 'error');
      },
    });
  }

  // ── Logo ─────────────────────────────────────────────────
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.logoUploading.set(true);
    this.churchService.updateLogo(this.church()!.id, file).subscribe({
      next: (church) => {
        this.church.set(church);
        this.logoUploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.logoUploading.set(false);
        input.value = '';
        Swal.fire('Erreur', err?.error?.msg ?? 'Upload impossible.', 'error');
      },
    });
  }

  submitLogoLink(): void {
    const url = this.logoLinkInput().trim();
    if (!url || this.logoUploading()) return;

    this.logoUploading.set(true);
    this.churchService.updateLogo(this.church()!.id, url).subscribe({
      next: (church) => {
        this.church.set(church);
        this.logoUploading.set(false);
        this.logoLinkInput.set('');
      },
      error: (err) => {
        this.logoUploading.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Lien invalide.', 'error');
      },
    });
  }

  // ── Galerie de photos ────────────────────────────────────
  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    this.photosUploading.set(true);
    this.churchService.addPhotos(this.church()!.id, files).subscribe({
      next: (church) => {
        this.church.set(church);
        this.photosUploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.photosUploading.set(false);
        input.value = '';
        Swal.fire('Erreur', err?.error?.msg ?? 'Upload impossible.', 'error');
      },
    });
  }

  addPhotoLink(): void {
    const url = this.photoLinkInput().trim();
    if (!url || this.photosUploading()) return;

    this.photosUploading.set(true);
    this.churchService.addPhotos(this.church()!.id, [url]).subscribe({
      next: (church) => {
        this.church.set(church);
        this.photosUploading.set(false);
        this.photoLinkInput.set('');
      },
      error: (err) => {
        this.photosUploading.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Lien invalide.', 'error');
      },
    });
  }

  removePhoto(url: string): void {
    const church = this.church();
    if (!church || this.photoRemoving()) return;

    Swal.fire({
      title: 'Retirer cette photo ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.photoRemoving.set(url);
      this.churchService.removePhoto(church.id, url).subscribe({
        next: (updated) => {
          this.church.set(updated);
          this.photoRemoving.set(null);
        },
        error: (err) => {
          this.photoRemoving.set(null);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }

  // ── Emprise géographique ─────────────────────────────────
  private seedPerimeter(church: Church): void {
    const ring = church.perimeter?.coordinates?.[0] ?? [];
    // Le ring renvoyé par l'API est fermé (dernier sommet = premier) — on le retire pour l'édition.
    const open = ring.length > 1 ? ring.slice(0, -1) : ring;
    const points = open.map(([lng, lat]) => ({ lat, lng }));
    this.perimeterPoints.set(points);
    this.originalPerimeter = JSON.stringify(points);
  }

  addPerimeterPoint(): void {
    if (this.perimeterPoints().length >= this.PERIMETER_MAX) return;
    this.perimeterPoints.update((pts) => [...pts, { lat: null, lng: null }]);
  }

  removePerimeterPoint(index: number): void {
    this.perimeterPoints.update((pts) => pts.filter((_, i) => i !== index));
  }

  updatePerimeterPoint(index: number, axis: 'lat' | 'lng', value: string): void {
    const num = value === '' ? null : Number(value);
    this.perimeterPoints.update((pts) =>
      pts.map((p, i) => (i === index ? { ...p, [axis]: num } : p)),
    );
  }

  onPerimeterPointsChange(points: PerimeterPoint[]): void {
    this.perimeterPoints.set(points);
  }

  isPerimeterModified(): boolean {
    return JSON.stringify(this.perimeterPoints()) !== this.originalPerimeter;
  }

  isPerimeterValid(): boolean {
    const pts = this.perimeterPoints();
    return (
      pts.length >= this.PERIMETER_MIN &&
      pts.length <= this.PERIMETER_MAX &&
      pts.every((p) => p.lat !== null && p.lng !== null && !Number.isNaN(p.lat) && !Number.isNaN(p.lng))
    );
  }

  resetPerimeter(): void {
    this.perimeterPoints.set(JSON.parse(this.originalPerimeter));
  }

  savePerimeter(): void {
    const church = this.church();
    if (!church || this.perimeterSaving() || !this.isPerimeterModified() || !this.isPerimeterValid()) return;

    this.perimeterSaving.set(true);
    this.churchService
      .setPerimeter(church.id, {
        points: this.perimeterPoints().map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })),
      })
      .subscribe({
        next: (updated) => {
          this.church.set(updated);
          this.seedPerimeter(updated);
          this.perimeterSaving.set(false);
          this.perimeterJustSaved.set(true);
          setTimeout(() => this.perimeterJustSaved.set(false), 2000);
        },
        error: (err) => {
          this.perimeterSaving.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? "Enregistrement de l'emprise impossible.", 'error');
        },
      });
  }

  deleteChurch(): void {
    const church = this.church();
    if (!church) return;

    Swal.fire({
      title: 'Supprimer cette église ?',
      text: `« ${church.name} » sera supprimée définitivement. Refusé tant qu'elle a des églises enfants.`,
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
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible (églises enfants ?).', 'error');
        },
      });
    });
  }
}
