import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { GroupService } from '../../../services/group.service';
import { GroupMemberService } from '../../../services/group-member.service';
import { ChurchService } from '../../../services/church.service';
import { GROUP_TYPE_LABELS, Group, GroupMember, GroupType } from '../../../models/group.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-group-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupService = inject(GroupService);
  private readonly memberService = inject(GroupMemberService);
  private readonly churchService = inject(ChurchService);
  private readonly fb = inject(FormBuilder);

  private readonly groupId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.groupService.selected()?.id === this.groupId ? this.groupService.selected() : null;

  group = signal<Group | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  members = this.memberService.members;
  membersLoading = signal(true);
  membersError = signal<string | null>(null);

  typeList = Object.values(GroupType);
  typeLabels = GROUP_TYPE_LABELS;

  form: FormGroup = this.fb.group({
    name: [this.stub?.name ?? ''],
    type: [this.stub?.type ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    return this.groupService.update(this.group()!.id, { [field]: value });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    this.load();
    this.loadMembers();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.groupService.getById(this.groupId).subscribe({
      next: (group) => {
        this.group.set(group);
        this.form.patchValue({ name: group.name, type: group.type });
        this.initOriginalValues();
        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du groupe.');
        if (showLoader) Swal.close();
      },
    });
  }

  private loadMembers(): void {
    this.membersLoading.set(true);
    this.membersError.set(null);
    this.memberService.listForGroup(this.groupId).subscribe({
      next: () => this.membersLoading.set(false),
      error: () => {
        this.membersLoading.set(false);
        this.membersError.set('Erreur lors du chargement des membres.');
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
    this.loadMembers();
  }

  churchName(): string {
    const g = this.group();
    if (!g) return '';
    return g.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === g.churchId)?.name ?? g.churchId;
  }

  memberName(m: GroupMember): string {
    const n = `${m.user?.firstName ?? ''} ${m.user?.lastName ?? ''}`.trim();
    return n || m.user?.email || m.userId;
  }

  removeMember(m: GroupMember): void {
    Swal.fire({
      title: 'Retirer ce membre ?',
      text: `${this.memberName(m)} sera retiré du groupe.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.memberService.remove(m.id).subscribe({
        next: () => this.loadMembers(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Retrait impossible.', 'error'),
      });
    });
  }

  deleteGroup(): void {
    const g = this.group();
    if (!g) return;

    Swal.fire({
      title: 'Supprimer ce groupe ?',
      text: `« ${g.name} » et toutes ses adhésions seront supprimés définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.groupService.delete(g.id).subscribe({
        next: () => this.router.navigate(['/community/groups']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
