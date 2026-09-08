import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { RegionService } from '../../../services/region.service';
import { CountryService } from '../../../services/country.service';
import { Region } from '../../../models/region.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-region-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './region-detail.component.html',
  styleUrl: './region-detail.component.scss',
})
export class RegionDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly regionService = inject(RegionService);
  private readonly countryService = inject(CountryService);
  private readonly fb = inject(FormBuilder);

  private readonly regionId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.regionService.selected()?.id === this.regionId ? this.regionService.selected() : null;

  region = signal<Region | null>(this.stub);
  countries = this.countryService.countries;
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
    const id = this.region()!.id;
    // parentSub vidé → '' ; l'API (IsOptional) l'ignore, on envoie donc la chaîne telle quelle.
    return this.regionService.update(id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.countries() === undefined) this.countryService.list().subscribe({ error: () => undefined });
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.regionService.getById(this.regionId).subscribe({
      next: (region) => {
        this.region.set(region);
        this.form.patchValue({ name: region.name, parentSub: region.parentSub ?? '' });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement de la région.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  countryLabel(id?: string): string {
    if (!id) return '—';
    return (this.countries() ?? []).find((c) => c.id === id)?.isoCode ?? id;
  }

  deleteRegion(): void {
    const region = this.region();
    if (!region) return;

    Swal.fire({
      title: 'Supprimer cette région ?',
      text: `« ${region.name} » et tout son découpage (zones, villages) seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.regionService.delete(region.id).subscribe({
        next: () => this.router.navigate(['/geo/regions']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
