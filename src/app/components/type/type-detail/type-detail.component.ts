import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { TypeService } from '../../../services/type.service';
import { TYPE_SCOPE_LABELS, TypeItem, TypeScope } from '../../../models/type.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-type-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './type-detail.component.html',
  styleUrl: './type-detail.component.scss',
})
export class TypeDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly typeService = inject(TypeService);
  private readonly fb = inject(FormBuilder);

  private readonly typeId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.typeService.selected()?.id === this.typeId ? this.typeService.selected() : null;

  type = signal<TypeItem | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);
  togglingActive = signal(false);

  scopeList = Object.values(TypeScope);
  scopeLabels = TYPE_SCOPE_LABELS;

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    scope: [this.stub?.scope ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.typeService.update(this.type()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.typeService.getById(this.typeId).subscribe({
      next: (type) => {
        this.type.set(type);
        this.form.patchValue({ name: type.name, scope: type.scope });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du type.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  toggleActive(): void {
    const type = this.type();
    if (!type || this.togglingActive()) return;

    this.togglingActive.set(true);
    this.typeService.update(type.id, { active: !type.active }).subscribe({
      next: (updated) => {
        this.type.set(updated);
        this.togglingActive.set(false);
      },
      error: (err) => {
        this.togglingActive.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error');
      },
    });
  }

  deleteType(): void {
    const type = this.type();
    if (!type) return;

    Swal.fire({
      title: 'Supprimer ce type ?',
      text: `« ${type.name} » sera supprimé définitivement. L'historique qui le référence peut être impacté.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.typeService.delete(type.id).subscribe({
        next: () => this.router.navigate(['/types']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
