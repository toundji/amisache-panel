import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { UserService } from '../../../services/user.service';
import { User, UserRole, UserStatus } from '../../../models/user.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { UserAvatarComponent } from '../../../shared/avatar/user-avatar.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-user-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, UserAvatarComponent, BackButtonComponent],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  private readonly userId = this.route.snapshot.paramMap.get('id')!;
  // Stub venant de la liste (cf. UserService.select / CLAUDE.md § Pages de
  // détail) — utilisable seulement s'il correspond bien à l'id demandé,
  // sinon une navigation directe sur un autre utilisateur afficherait un
  // instant les données du précédent.
  private readonly stub = this.userService.selected()?.id === this.userId ? this.userService.selected() : null;

  user = signal<User | null>(this.stub);
  // Squelette uniquement si on n'a aucun stub à afficher en attendant le fetch complet.
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);

  statusList = Object.values(UserStatus);
  roleList = Object.values(UserRole);

  // Formulaire à un seul champ scalaire → FieldSaveMixin standard.
  // Préremplit avec le stub s'il existe, corrigé par le fetch complet ensuite.
  statusForm: FormGroup = this.fb.group({ status: [this.stub?.status ?? UserStatus.active] });

  // Rôles — tableau, pas un champ scalaire → pattern "champs groupés" manuel
  selectedRoles = signal<UserRole[]>([...(this.stub?.roles ?? [])]);
  private _rolesSaving = signal(false);
  private _rolesJustSaved = signal(false);
  private originalRoles: UserRole[] = [...(this.stub?.roles ?? [])];

  newPassword = '';
  resettingPassword = signal(false);

  // ── FieldSaveMixin ──────────────────────────────────────────────────────
  protected getFormGroup(): FormGroup { return this.statusForm; }

  protected saveField(field: string, value: any): Observable<any> {
    const id = this.user()!.id;
    return this.userService.updateStatus(id, value);
  }

  constructor() {
    super();
    // Si un stub a préempli statusForm, sa valeur devient la référence tout
    // de suite — sinon isFieldModified('status') la comparerait à `undefined`
    // (originalFormValues vide) et afficherait à tort les boutons save/undo.
    this.initOriginalValues();
  }

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.userService.getById(this.userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.statusForm.patchValue({ status: user.status ?? UserStatus.active });
        this.initOriginalValues();

        this.originalRoles = [...(user.roles ?? [])];
        this.selectedRoles.set([...this.originalRoles]);

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set("Erreur lors du chargement de l'utilisateur.");
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  // ── Rôles — champs groupés (pattern manuel, cf. skill ambassade-benin-site) ──
  toggleRole(role: UserRole): void {
    this.selectedRoles.update((roles) => (roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]));
  }

  isRolesModified(): boolean {
    const before = [...this.originalRoles].sort();
    const after = [...this.selectedRoles()].sort();
    return before.length !== after.length || before.some((r, i) => r !== after[i]);
  }

  isRolesSaving(): boolean { return this._rolesSaving(); }
  isRolesJustSaved(): boolean { return this._rolesJustSaved(); }

  saveRoles(): void {
    const user = this.user();
    if (!user || this._rolesSaving()) return;
    this._rolesSaving.set(true);

    this.userService.updateRoles(user.id, this.selectedRoles()).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.originalRoles = [...this.selectedRoles()];
        this._rolesSaving.set(false);
        this._rolesJustSaved.set(true);
        setTimeout(() => this._rolesJustSaved.set(false), 2000);
      },
      error: (err) => {
        this._rolesSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Mise à jour des rôles impossible.', 'error');
      },
    });
  }

  resetRoles(): void {
    this.selectedRoles.set([...this.originalRoles]);
  }

  // ── Mot de passe ──────────────────────────────────────────────────────────
  resetPassword(): void {
    const user = this.user();
    if (!user || this.newPassword.length < 8) {
      Swal.fire('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.', 'warning');
      return;
    }
    this.resettingPassword.set(true);
    this.userService.adminResetPassword(user.id, this.newPassword).subscribe({
      next: () => {
        this.resettingPassword.set(false);
        this.newPassword = '';
        Swal.fire({ icon: 'success', title: 'Mot de passe réinitialisé', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.resettingPassword.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Réinitialisation impossible.', 'error');
      },
    });
  }

  getFullName(): string {
    const u = this.user();
    return [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || '—';
  }
}
