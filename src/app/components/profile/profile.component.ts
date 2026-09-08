import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, tap } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../services/user.service';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { FieldErrorsComponent } from '../../shared/field-errors/field-errors.component';
import { FieldSaveMixin } from '../../shared/mixins/field-save.mixin';
import { UserAvatarComponent } from '../../shared/avatar/user-avatar.component';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, FieldErrorsComponent, UserAvatarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent extends FieldSaveMixin {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly sessionService = inject(SessionService);
  readonly authService = inject(AuthService);

  // AuthService.user() sert de stub : dernier profil connu (login ou save
  // précédent), affiché immédiatement pendant que getProfile() confirme.
  loading = signal(!this.authService.user());
  refreshing = signal(false);
  error = signal<string | null>(null);
  savingPassword = signal(false);

  readonly profileForm: FormGroup = this.fb.group({
    firstName: [this.authService.user()?.firstName ?? ''],
    lastName: [this.authService.user()?.lastName ?? ''],
  });

  readonly passwordForm: FormGroup = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  // ── FieldSaveMixin — firstName/lastName sauvegardés champ par champ ────────
  protected getFormGroup(): FormGroup { return this.profileForm; }

  protected saveField(field: string, value: any): Observable<any> {
    return this.userService.updateProfile({ [field]: value }).pipe(tap((user) => this.authService.setUser(user)));
  }

  constructor() {
    super();
    // Si le stub AuthService.user() a préempli le formulaire, sa valeur
    // devient la référence tout de suite — sinon isFieldModified() la
    // comparerait à `undefined` (originalFormValues vide) et afficherait à
    // tort les boutons save/undo avant même le premier fetch.
    this.initOriginalValues();
  }

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.userService.getProfile().subscribe({
      next: (user) => {
        this.profileForm.patchValue({ firstName: user.firstName, lastName: user.lastName });
        this.initOriginalValues();
        this.authService.setUser(user);
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du profil.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const { oldPassword, newPassword } = this.passwordForm.value;
    this.sessionService.updatePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        Swal.fire({ icon: 'success', title: 'Mot de passe modifié', timer: 1200, showConfirmButton: false });
      },
      error: (err) => {
        this.savingPassword.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Changement impossible.', 'error');
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.userService.uploadProfileImage(file).subscribe({
      next: (user) => this.authService.setUser(user),
      error: (err) => Swal.fire('Erreur', err?.error?.msg ?? "Envoi de l'image impossible.", 'error'),
    });
  }
}
