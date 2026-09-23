import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { TariffService } from '../../../services/tariff.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

// Un tarif ne porte que sur une intention de messe ou un sacrement (jamais
// un don — offrande libre par nature, cf. TariffService côté backend).
const TARIFFABLE_SCOPES = [TypeScope.INTENTION, TypeScope.SACRAMENT];

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
  private readonly typeService = inject(TypeService);

  churches = this.churchService.allForSelect;
  intentionTypes = () => this.typeService.activeForScope(TypeScope.INTENTION);
  sacramentTypes = () => this.typeService.activeForScope(TypeScope.SACRAMENT);

  readonly form: FormGroup = this.fb.group({
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    typeId: ['', [Validators.required]],
    amount: [null, [Validators.required, Validators.min(1)]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    for (const scope of TARIFFABLE_SCOPES) {
      if (this.typeService.activeForScope(scope) === undefined) {
        this.typeService.listActive(scope).subscribe({ error: () => undefined });
      }
    }
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid) {
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
        amount: Number(v.amount),
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
