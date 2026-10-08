import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { TariffService } from '../../../services/tariff.service';
import { ChurchService } from '../../../services/church.service';
import { RequestTypeService } from '../../../services/request-type.service';
import { Tariff } from '../../../models/tariff.model';
import { RequestTypeScope } from '../../../models/request-type.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

const TARIFFABLE_SCOPES = [RequestTypeScope.INTENTION, RequestTypeScope.SACRAMENT];

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
  private readonly requestTypeService = inject(RequestTypeService);
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
    amount: [this.stub?.amount != null ? Number(this.stub.amount) : null],
    minLeadDays: [this.stub?.minLeadDays ?? null],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    // Champ vidé = null : la valeur se résout alors plus haut dans la hiérarchie.
    const normalized = value === null || value === '' ? null : Number(value);
    return this.tariffService.update(this.tariff()!.id, { [field]: normalized });
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
      if (this.requestTypeService.activeForScope(scope) === undefined) {
        this.requestTypeService.listActive(scope).subscribe({ error: () => undefined });
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
        this.form.patchValue({
          amount: tariff.amount != null ? Number(tariff.amount) : null,
          minLeadDays: tariff.minLeadDays,
        });
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
    const allTypes = TARIFFABLE_SCOPES.flatMap((s) => this.requestTypeService.activeForScope(s) ?? []);
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
