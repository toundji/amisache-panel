import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { ZoneService } from '../../../services/zone.service';
import { RegionService } from '../../../services/region.service';
import { Zone } from '../../../models/zone.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-zone-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './zone-detail.component.html',
  styleUrl: './zone-detail.component.scss',
})
export class ZoneDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly zoneService = inject(ZoneService);
  private readonly regionService = inject(RegionService);
  private readonly fb = inject(FormBuilder);

  private readonly zoneId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.zoneService.selected()?.id === this.zoneId ? this.zoneService.selected() : null;

  zone = signal<Zone | null>(this.stub);
  regions = this.regionService.regions;
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    parentSub: [this.stub?.parentSub ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.zoneService.update(this.zone()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.regions() === undefined) this.regionService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.zoneService.getById(this.zoneId).subscribe({
      next: (zone) => {
        this.zone.set(zone);
        this.form.patchValue({ name: zone.name, parentSub: zone.parentSub ?? '' });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement de la zone.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  regionLabel(id?: string): string {
    if (!id) return '—';
    return (this.regions() ?? []).find((r) => r.id === id)?.name ?? id;
  }

  deleteZone(): void {
    const zone = this.zone();
    if (!zone) return;

    Swal.fire({
      title: 'Supprimer cette zone ?',
      text: `« ${zone.name} » et tous ses villages seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.zoneService.delete(zone.id).subscribe({
        next: () => this.router.navigate(['/geo/zones']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
