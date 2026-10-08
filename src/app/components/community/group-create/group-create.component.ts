import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { GroupService } from '../../../services/group.service';
import { ChurchService } from '../../../services/church.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { GROUP_TYPE_LABELS, GroupType } from '../../../models/group.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-group-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './group-create.component.html',
  styleUrl: './group-create.component.scss',
})
export class GroupCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly groupService = inject(GroupService);
  private readonly churchService = inject(ChurchService);
  readonly clergyContext = inject(ClergyContextService);

  typeList = Object.values(GroupType);
  typeLabels = GROUP_TYPE_LABELS;
  churches = this.churchService.allForSelect;

  readonly form: FormGroup = this.fb.group({
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['', [Validators.required]],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.error = undefined;
    this.submitting.set(true);

    this.groupService
      .create({ churchId: v.churchId, name: v.name.trim(), type: v.type })
      .subscribe({
        next: (group) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Groupe créé', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/community/groups', group.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
