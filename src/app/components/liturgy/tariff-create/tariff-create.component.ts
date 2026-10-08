import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { TariffService } from '../../../services/tariff.service';
import { ChurchService } from '../../../services/church.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { RequestTypeService } from '../../../services/request-type.service';
import { RequestTypeScope } from '../../../models/request-type.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

// Un tarif ne porte que sur une intention de messe ou un sacrement (jamais
// un don — offrande libre par nature, cf. TariffService côté backend).
const TARIFFABLE_SCOPES = [RequestTypeScope.INTENTION, RequestTypeScope.SACRAMENT];

@Component({
  selector: 'app-tariff-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './tariff-create.component.html',
  styleUrl: './tariff-create.component.scss',
})
export class TariffCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tariffService = inject(TariffService);
  private readonly churchService = inject(ChurchService);
  readonly clergyContext = inject(ClergyContextService);
  private readonly requestTypeService = inject(RequestTypeService);

  churches = this.churchService.allForSelect;
  intentionTypes = () => this.requestTypeService.activeForScope(RequestTypeScope.INTENTION);
  sacramentTypes = () => this.requestTypeService.activeForScope(RequestTypeScope.SACRAMENT);

  readonly form: FormGroup = this.fb.group({
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    typeId: ['', [Validators.required]],
    amount: [null, [Validators.min(1)]],
    minLeadDays: [null, [Validators.min(0), Validators.max(365)]],
  });

  // Un tarif fixe un montant, un délai, ou les deux — jamais aucun.
  private isBlank(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  missingBoth(): boolean {
    const v = this.form.value;
    return this.isBlank(v.amount) && this.isBlank(v.minLeadDays);
  }

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    for (const scope of TARIFFABLE_SCOPES) {
      if (this.requestTypeService.activeForScope(scope) === undefined) {
        this.requestTypeService.listActive(scope).subscribe({ error: () => undefined });
      }
    }

    // Clergé (pas admin/engineer) : jamais de choix d'église — c'est déjà celle qu'il
    // administre (topbar). `effect()` plutôt qu'une lecture ponctuelle : `activeChurchId()`
    // peut encore être vide à la construction (chargement des affectations en cours).
    effect(() => {
      if (this.clergyContext.isFullAccess()) return;
      const churchId = this.clergyContext.activeChurchId();
      if (churchId) this.form.patchValue({ churchId });
    });
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid || this.missingBoth()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.error = undefined;
    this.submitting.set(true);

    this.tariffService
      .create({
        churchId: v.churchId,
        typeId: v.typeId,
        ...(this.isBlank(v.amount) ? {} : { amount: Number(v.amount) }),
        ...(this.isBlank(v.minLeadDays) ? {} : { minLeadDays: Number(v.minLeadDays) }),
      })
      .subscribe({
        next: (tariff) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Tarif publié', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/liturgy/tariffs', tariff.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
