import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { CountryService } from '../../../services/country.service';
import { Country } from '../../../models/country.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

/** textarea "une valeur par ligne" ↔ tableau. */
function linesToArray(text: string): string[] {
  return (text ?? '').split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
}
function arrayToLines(arr?: string[]): string {
  return (arr ?? []).join('\n');
}

@Component({
  selector: 'app-country-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './country-detail.component.html',
  styleUrl: './country-detail.component.scss',
})
export class CountryDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly countryService = inject(CountryService);
  private readonly fb = inject(FormBuilder);

  private readonly countryId = this.route.snapshot.paramMap.get('id')!;
  // Stub venant de la liste (cf. CountryService.select / CLAUDE.md § Pages de détail).
  private readonly stub =
    this.countryService.selected()?.id === this.countryId ? this.countryService.selected() : null;

  country = signal<Country | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  form: FormGroup = this.fb.group({
    callingCode: [this.stub?.callingCode ?? ''],
    subdivisions: [arrayToLines(this.stub?.subdivisions)],
    allSub: [arrayToLines(this.stub?.allSub)],
  });

  // ── FieldSaveMixin — PATCH /countries/:id accepte un patch partiel ──
  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    const id = this.country()!.id;
    const patch =
      field === 'subdivisions' || field === 'allSub'
        ? { [field]: linesToArray(value) }
        : { [field]: value };
    return this.countryService.update(id, patch);
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.countryService.getById(this.countryId).subscribe({
      next: (country) => {
        this.country.set(country);
        this.form.patchValue({
          callingCode: country.callingCode,
          subdivisions: arrayToLines(country.subdivisions),
          allSub: arrayToLines(country.allSub),
        });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du pays.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  deleteCountry(): void {
    const country = this.country();
    if (!country) return;

    Swal.fire({
      title: 'Supprimer ce pays ?',
      text: `« ${country.isoCode} » et tout son découpage (régions, zones, villages) seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.countryService.delete(country.id).subscribe({
        next: () => this.router.navigate(['/geo/countries']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
