import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { TariffService } from '../../../services/tariff.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { Tariff } from '../../../models/tariff.model';
import { TypeScope } from '../../../models/type.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

const TARIFFABLE_SCOPES = [TypeScope.INTENTION, TypeScope.SACRAMENT];

@Component({
  selector: 'app-tariff-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './tariff-detail.component.html',
  styleUrl: './tariff-detail.component.scss',
})
export class TariffDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tariffService = inject(TariffService);
  private readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);
  private readonly fb = inject(FormBuilder);

  private readonly tariffId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.tariffService.selected()?.id === this.tariffId ? this.tariffService.selected() : null;

  tariff = signal<Tariff | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);
  activeSaving = signal(false);

  form: FormGroup = this.fb.group({
    amount: [this.stub?.amount ? Number(this.stub.amount) : null],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.tariffService.update(this.tariff()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    for (const scope of TARIFFABLE_SCOPES) {
      if (this.typeService.activeForScope(scope) === undefined) {
        this.typeService.listActive(scope).subscribe({ error: () => undefined });
      }
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.tariffService.getById(this.tariffId).subscribe({
      next: (tariff) => {
        this.tariff.set(tariff);
        this.form.patchValue({ amount: Number(tariff.amount) });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du tarif.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  churchName(): string {
    const t = this.tariff();
    if (!t) return '';
    return t.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === t.churchId)?.name ?? t.churchId;
  }

  typeName(): string {
    const t = this.tariff();
    if (!t) return '';
    if (t.type) return t.type.name;
    const allTypes = TARIFFABLE_SCOPES.flatMap((s) => this.typeService.activeForScope(s) ?? []);
    return allTypes.find((ty) => ty.id === t.typeId)?.name ?? t.typeId;
  }

  toggleActive(): void {
    const t = this.tariff();
    if (!t || this.activeSaving()) return;

    this.activeSaving.set(true);
    this.tariffService.update(t.id, { active: !t.active }).subscribe({
      next: (updated) => {
        this.tariff.set(updated);
        this.activeSaving.set(false);
      },
      error: (err) => {
        this.activeSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Changement impossible.', 'error');
      },
    });
  }

  deleteTariff(): void {
    const t = this.tariff();
    if (!t) return;

    Swal.fire({
      title: 'Supprimer ce tarif ?',
      text: 'Il sera supprimé définitivement.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.tariffService.delete(t.id).subscribe({
        next: () => this.router.navigate(['/liturgy/tariffs']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
