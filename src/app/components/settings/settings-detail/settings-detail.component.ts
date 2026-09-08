import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { SettingService } from '../../../services/setting.service';
import { SETTING_TYPE_LABELS, Setting, SettingType } from '../../../models/setting.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-settings-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './settings-detail.component.html',
  styleUrl: './settings-detail.component.scss',
})
export class SettingsDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly settingService = inject(SettingService);
  private readonly fb = inject(FormBuilder);

  private readonly settingId = this.route.snapshot.paramMap.get('id')!;
  // Stub venant de la liste (cf. SettingService.select / CLAUDE.md § Pages de
  // détail) — utilisable seulement s'il correspond bien à l'id demandé.
  private readonly stub = this.settingService.selected()?.id === this.settingId ? this.settingService.selected() : null;

  setting = signal<Setting | null>(this.stub);
  // Squelette uniquement si on n'a aucun stub à afficher en attendant le fetch complet.
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  typeList = Object.values(SettingType);
  typeLabels = SETTING_TYPE_LABELS;

  form: FormGroup = this.fb.group({
    value: [this.stub?.value ?? ''],
    type: [this.stub?.type ?? SettingType.string],
    category: [this.stub?.category ?? ''],
    label: [this.stub?.label ?? ''],
    description: [this.stub?.description ?? ''],
  });

  // ── FieldSaveMixin — chaque champ est envoyé indépendamment (PATCH /settings/:id accepte un patch partiel) ──
  protected getFormGroup(): FormGroup { return this.form; }

  protected saveField(field: string, value: any): Observable<any> {
    const id = this.setting()!.id;
    return this.settingService.update(id, { [field]: value });
  }

  constructor() {
    super();
    // Si un stub a préempli le formulaire, sa valeur devient la référence
    // tout de suite — sinon isFieldModified() la comparerait à `undefined`.
    this.initOriginalValues();
  }

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.settingService.getById(this.settingId).subscribe({
      next: (setting) => {
        this.setting.set(setting);
        this.form.patchValue({
          value: setting.value ?? '',
          type: setting.type,
          category: setting.category ?? '',
          label: setting.label ?? '',
          description: setting.description ?? '',
        });
        // Une constante (isEditable=false) n'accepte plus de modification de
        // valeur côté API — désactivée côté formulaire pour éviter un PATCH
        // silencieusement ignoré.
        if (!setting.isEditable) this.form.get('value')?.disable();
        else this.form.get('value')?.enable();
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du setting.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  // ── Visibilité — action instantanée (pas de save/undo, comme quickUpdateStatus sur les utilisateurs) ──
  private togglingPublic = signal(false);
  isTogglingPublic = this.togglingPublic.asReadonly();

  togglePublic(): void {
    const setting = this.setting();
    if (!setting || this.togglingPublic()) return;

    this.togglingPublic.set(true);
    this.settingService.update(setting.id, { isPublic: !setting.isPublic }).subscribe({
      next: (updated) => {
        this.setting.set(updated);
        this.togglingPublic.set(false);
      },
      error: (err) => {
        this.togglingPublic.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error');
      },
    });
  }

  deleteSetting(): void {
    const setting = this.setting();
    if (!setting) return;

    Swal.fire({
      title: 'Supprimer ce setting ?',
      text: `« ${setting.key} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.settingService.delete(setting.id).subscribe({
        next: () => this.router.navigate(['/settings']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
