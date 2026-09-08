import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ClergyMemberService } from '../../../services/clergy-member.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { ECCLESIAL_ROLE_LABELS, EcclesialRole } from '../../../models/clergy-member.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-clergy-member-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './clergy-member-create.component.html',
  styleUrl: './clergy-member-create.component.scss',
})
export class ClergyMemberCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clergyService = inject(ClergyMemberService);
  private readonly churchService = inject(ChurchService);
  private readonly userService = inject(UserService);

  roleList = Object.values(EcclesialRole);
  roleLabels = ECCLESIAL_ROLE_LABELS;

  churches = this.churchService.allForSelect;
  users = this.userService.allForSelect;

  readonly form: FormGroup = this.fb.group({
    role: ['', [Validators.required]],
    userId: ['', [Validators.required]],
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    startDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    endDate: [''],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    if (this.users() === undefined) this.userService.listAllForSelect().subscribe({ error: () => undefined });
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  userLabel(u: { firstName?: string; lastName?: string; email?: string }): string {
    const n = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return n ? `${n}${u.email ? ' — ' + u.email : ''}` : u.email ?? '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    this.error = undefined;
    this.submitting.set(true);

    this.clergyService
      .create({
        role: v.role,
        userId: v.userId,
        churchId: v.churchId,
        startDate: v.startDate,
        endDate: v.endDate || undefined,
      })
      .subscribe({
        next: (member) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Affectation créée', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/clergy-members', member.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
