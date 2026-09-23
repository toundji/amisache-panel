import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ClergyMemberService } from '../../../services/clergy-member.service';
import { ChurchService } from '../../../services/church.service';
import { UserService } from '../../../services/user.service';
import { ClergyContextService } from '../../../services/clergy-context.service';
import { MembershipService } from '../../../services/membership.service';
import { ECCLESIAL_ROLE_LABELS, EcclesialRole } from '../../../models/clergy-member.model';
import { ServerError } from '../../../models/server-error.model';
import { UserLookup } from '../../../models/user.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-clergy-member-create',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
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
  private readonly membershipService = inject(MembershipService);
  readonly clergyContext = inject(ClergyContextService);

  roleList = Object.values(EcclesialRole);
  roleLabels = ECCLESIAL_ROLE_LABELS;

  churches = this.churchService.allForSelect;

  // Admin/engineer : annuaire complet (GET /users). Clergé : jamais cette
  // route (403 garanti) — uniquement les fidèles qui suivent sa propre
  // église (Membership), complétés à la volée par une recherche email
  // ciblée (voir searchByEmail) pour affecter quelqu'un hors de ce cercle.
  private clergyUserOptionsSignal = signal<UserLookup[]>([]);
  userOptions = computed<UserLookup[]>(() =>
    this.clergyContext.isFullAccess() ? (this.userService.allForSelect() ?? []) : this.clergyUserOptionsSignal(),
  );

  emailSearch = signal('');
  searchingEmail = signal(false);
  emailSearchError = signal<string | null>(null);

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

    if (this.clergyContext.isFullAccess()) {
      if (this.userService.allForSelect() === undefined) {
        this.userService.listAllForSelect().subscribe({ error: () => undefined });
      }
      return;
    }

    const churchId = this.clergyContext.activeChurchId();
    if (!churchId) return;
    this.membershipService.listForChurch(churchId).subscribe({
      next: (memberships) => {
        this.clergyUserOptionsSignal.set(
          memberships.map((m) => m.user).filter((u): u is UserLookup => !!u),
        );
      },
      error: () => undefined,
    });
  }

  /** Recherche ciblée par email exact — voir UserService.lookupByEmail. */
  searchByEmail(): void {
    const email = this.emailSearch().trim();
    if (!email || this.searchingEmail()) return;

    this.searchingEmail.set(true);
    this.emailSearchError.set(null);
    this.userService.lookupByEmail(email).subscribe({
      next: (user) => {
        this.searchingEmail.set(false);
        if (!user) {
          this.emailSearchError.set('Aucun compte trouvé avec cet email.');
          return;
        }
        this.clergyUserOptionsSignal.update((list) =>
          list.some((u) => u.id === user.id) ? list : [...list, user],
        );
        this.form.patchValue({ userId: user.id });
      },
      error: () => {
        this.searchingEmail.set(false);
        this.emailSearchError.set('Recherche impossible.');
      },
    });
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
