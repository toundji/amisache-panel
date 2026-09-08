import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { VillageService } from '../../../services/village.service';
import { ZoneService } from '../../../services/zone.service';
import { Village, VillageType, VILLAGE_TYPE_LABELS } from '../../../models/village.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-village-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './village-detail.component.html',
  styleUrl: './village-detail.component.scss',
})
export class VillageDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly villageService = inject(VillageService);
  private readonly zoneService = inject(ZoneService);
  private readonly fb = inject(FormBuilder);

  private readonly villageId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.villageService.selected()?.id === this.villageId ? this.villageService.selected() : null;

  village = signal<Village | null>(this.stub);
  zones = this.zoneService.zones;
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  typeList = Object.values(VillageType);
  typeLabels = VILLAGE_TYPE_LABELS;

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    type: [this.stub?.type ?? VillageType.VILLAGE],
    parentSub: [this.stub?.parentSub ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.villageService.update(this.village()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.zones() === undefined) this.zoneService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.villageService.getById(this.villageId).subscribe({
      next: (village) => {
        this.village.set(village);
        this.form.patchValue({
          name: village.name,
          type: village.type,
          parentSub: village.parentSub ?? '',
        });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du village.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  zoneLabel(id?: string): string {
    if (!id) return '—';
    return (this.zones() ?? []).find((z) => z.id === id)?.name ?? id;
  }

  deleteVillage(): void {
    const village = this.village();
    if (!village) return;

    Swal.fire({
      title: 'Supprimer ce village/quartier ?',
      text: `« ${village.name} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.villageService.delete(village.id).subscribe({
        next: () => this.router.navigate(['/geo/villages']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
