import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { ClergyMemberService } from '../../../services/clergy-member.service';
import { ClergyMember, ECCLESIAL_ROLE_LABELS, EcclesialRole } from '../../../models/clergy-member.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-clergy-member-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './clergy-member-detail.component.html',
  styleUrl: './clergy-member-detail.component.scss',
})
export class ClergyMemberDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clergyService = inject(ClergyMemberService);
  private readonly fb = inject(FormBuilder);

  private readonly memberId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.clergyService.selected()?.id === this.memberId ? this.clergyService.selected() : null;

  member = signal<ClergyMember | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  roleList = Object.values(EcclesialRole);
  roleLabels = ECCLESIAL_ROLE_LABELS;

  form: FormGroup = this.fb.group({
    role: [this.stub?.role ?? ''],
    startDate: [this.stub?.startDate ?? ''],
    endDate: [this.stub?.endDate ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.clergyService.update(this.member()!.id, { [field]: value || undefined });
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

    this.clergyService.getById(this.memberId).subscribe({
      next: (member) => {
        this.member.set(member);
        this.form.patchValue({
          role: member.role,
          startDate: member.startDate,
          endDate: member.endDate ?? '',
        });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set("Erreur lors du chargement de l'affectation.");
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  memberName(): string {
    const m = this.member();
    const n = `${m?.user?.firstName ?? ''} ${m?.user?.lastName ?? ''}`.trim();
    return n || m?.user?.email || m?.userId || '';
  }

  deleteMember(): void {
    const member = this.member();
    if (!member) return;

    Swal.fire({
      title: 'Supprimer cette affectation ?',
      text: `L'affectation de ${this.memberName()} sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.clergyService.delete(member.id).subscribe({
        next: () => this.router.navigate(['/clergy-members']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
