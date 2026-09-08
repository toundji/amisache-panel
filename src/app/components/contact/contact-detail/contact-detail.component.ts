import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { ContactService } from '../../../services/contact.service';
import { ContactMessage, ContactMessageStatus } from '../../../models/contact.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-contact-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './contact-detail.component.html',
  styleUrl: './contact-detail.component.scss',
})
export class ContactDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactService = inject(ContactService);
  private readonly fb = inject(FormBuilder);

  private readonly messageId = this.route.snapshot.paramMap.get('id')!;
  // Stub venant de la liste (cf. ContactService.select / CLAUDE.md § Pages de
  // détail) — utilisable seulement s'il correspond bien à l'id demandé.
  private readonly stub = this.contactService.selected()?.id === this.messageId ? this.contactService.selected() : null;

  message = signal<ContactMessage | null>(this.stub);
  // Squelette uniquement si on n'a aucun stub à afficher en attendant le fetch complet.
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  statusList = Object.values(ContactMessageStatus);

  // Statut + note interne partagent le même endpoint côté API (PATCH
  // /contact/:id/status attend {status, adminNote} ensemble) — un seul
  // FormGroup à deux champs scalaires, chacun gardant son propre bouton
  // save/undo grâce à FieldSaveMixin (qui suit l'état par nom de champ).
  form: FormGroup = this.fb.group({
    status: [this.stub?.status ?? ContactMessageStatus.new],
    adminNote: [this.stub?.adminNote ?? ''],
  });

  // ── FieldSaveMixin ──────────────────────────────────────────────────────
  protected getFormGroup(): FormGroup { return this.form; }

  protected saveField(_field: string, _value: any): Observable<any> {
    const id = this.message()!.id;
    return this.contactService.updateStatus(id, {
      status: this.form.value.status,
      adminNote: this.form.value.adminNote || undefined,
    });
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

    this.contactService.getById(this.messageId).subscribe({
      next: (message) => {
        this.message.set(message);
        this.form.patchValue({ status: message.status, adminNote: message.adminNote ?? '' });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement du message.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  deleteMessage(): void {
    const message = this.message();
    if (!message) return;

    Swal.fire({
      title: 'Supprimer ce message ?',
      text: `Le message de ${message.name} sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.contactService.delete(message.id).subscribe({
        next: () => this.router.navigate(['/contact']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
