import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PublicationService } from '../../../services/publication.service';
import { GroupService } from '../../../services/group.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-publication-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './publication-create.component.html',
  styleUrl: './publication-create.component.scss',
})
export class PublicationCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly publicationService = inject(PublicationService);
  private readonly groupService = inject(GroupService);
  private readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);

  churches = this.churchService.allForSelect;
  private groups = this.groupService.groups;
  types = this.typeService.activeByScope;

  readonly form: FormGroup = this.fb.group({
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    typeId: ['', [Validators.required]],
    groupId: [''],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    content: ['', [Validators.required]],
    startDate: [''],
    endDate: [''],
  });

  submitting = signal(false);
  error?: ServerError;

  // Signal miroir de churchId pour recalculer les groupes disponibles.
  private churchIdSig = signal<string>(this.form.get('churchId')!.value);
  groupsForChurch = computed(() => {
    const cid = this.churchIdSig();
    return (this.groups() ?? []).filter((g) => g.churchId === cid);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.groups() === undefined) {
      this.groupService.list().subscribe({ error: () => undefined });
    }
    if (this.typeService.activeForScope(TypeScope.PUBLICATION) === undefined) {
      this.typeService.listActive(TypeScope.PUBLICATION).subscribe({ error: () => undefined });
    }
    this.form.get('churchId')!.valueChanges.subscribe((v) => {
      this.churchIdSig.set(v);
      this.form.get('groupId')!.setValue('');
    });
  }

  get publicationTypes() {
    return this.types()[TypeScope.PUBLICATION] ?? [];
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

    this.publicationService
      .create({
        churchId: v.churchId,
        typeId: v.typeId,
        groupId: v.groupId || undefined,
        title: v.title.trim(),
        content: v.content,
        startDate: v.startDate || undefined,
        endDate: v.endDate || undefined,
      })
      .subscribe({
        next: (publication) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Publication créée (brouillon)', timer: 1300, showConfirmButton: false }).then(() => {
            this.publicationService.select(publication);
            this.router.navigate(['/community/publications', publication.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
