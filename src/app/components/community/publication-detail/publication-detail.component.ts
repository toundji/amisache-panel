import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { PublicationService } from '../../../services/publication.service';
import { MediaService } from '../../../services/media.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import {
  Publication,
  PUBLICATION_STATUS_LABELS,
  PublicationStatus,
} from '../../../models/publication.model';
import {
  MEDIA_KIND_LABELS,
  MEDIA_PROVIDER_LABELS,
  Media,
  MediaKind,
  MediaProvider,
} from '../../../models/media.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

const NULLABLE_FIELDS = ['startDate', 'endDate'];

@Component({
  selector: 'app-publication-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './publication-detail.component.html',
  styleUrl: './publication-detail.component.scss',
})
export class PublicationDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publicationService = inject(PublicationService);
  private readonly mediaService = inject(MediaService);
  private readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);
  private readonly fb = inject(FormBuilder);

  private readonly publicationId = this.route.snapshot.paramMap.get('id')!;

  publication = signal<Publication | null>(null);
  loading = signal(true);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);
  statusSaving = signal(false);

  media = this.mediaService.media;
  mediaLoading = signal(true);
  mediaError = signal<string | null>(null);
  mediaAdding = signal(false);

  statusList = Object.values(PublicationStatus);
  statusLabels = PUBLICATION_STATUS_LABELS;
  kindList = Object.values(MediaKind);
  kindLabels = MEDIA_KIND_LABELS;
  providerList = Object.values(MediaProvider);
  providerLabels = MEDIA_PROVIDER_LABELS;

  form: FormGroup = this.fb.group({
    title: [''],
    content: [''],
    startDate: [''],
    endDate: [''],
  });

  mediaForm: FormGroup = this.fb.group({
    kind: [MediaKind.VIDEO, [Validators.required]],
    provider: [MediaProvider.YOUTUBE, [Validators.required]],
    url: ['', [Validators.required]],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    const payload = (value === '' || value === null) && NULLABLE_FIELDS.includes(field) ? undefined : value;
    return this.publicationService.update(this.publication()!.id, { [field]: payload });
  }

  constructor() {
    super();
  }

  ngOnInit(): void {
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.typeService.activeForScope(TypeScope.PUBLICATION) === undefined) {
      this.typeService.listActive(TypeScope.PUBLICATION).subscribe({ error: () => undefined });
    }
    this.resolvePublication();
    this.loadMedia();
  }

  /**
   * GET /publications/:id est public (PUBLISHED only) — inutilisable pour un
   * brouillon. On prend donc le stub sélectionné, sinon on cherche dans la
   * liste admin déjà chargée, sinon on recharge la liste admin complète.
   */
  private resolvePublication(refresh = false): void {
    const fromStub = this.publicationService.selected();
    const fromList = this.publicationService.loaded(this.publicationId);
    const known = (fromStub?.id === this.publicationId && fromStub) || fromList || null;

    if (known && !refresh) {
      this.applyPublication(known);
      return;
    }

    if (refresh) Swal.showLoading();
    this.error.set(null);
    this.publicationService.listAdmin().subscribe({
      next: () => {
        const found = this.publicationService.loaded(this.publicationId);
        if (found) {
          this.applyPublication(found);
        } else {
          this.error.set('Publication introuvable. Ouvrez-la depuis la liste.');
          this.loading.set(false);
        }
        this.refreshing.set(false);
        if (refresh) Swal.close();
      },
      error: () => {
        this.error.set('Erreur lors du chargement de la publication.');
        this.loading.set(false);
        this.refreshing.set(false);
        if (refresh) Swal.close();
      },
    });
  }

  private applyPublication(p: Publication): void {
    this.publication.set(p);
    this.form.patchValue({
      title: p.title,
      content: p.content,
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
    });
    this.initOriginalValues();
    this.loading.set(false);
    this.refreshing.set(false);
  }

  private loadMedia(): void {
    this.mediaLoading.set(true);
    this.mediaError.set(null);
    this.mediaService.listForPublication(this.publicationId).subscribe({
      next: () => this.mediaLoading.set(false),
      error: () => {
        this.mediaLoading.set(false);
        this.mediaError.set('Erreur lors du chargement des médias.');
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.resolvePublication(true);
    this.loadMedia();
  }

  churchName(): string {
    const p = this.publication();
    if (!p) return '';
    return p.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === p.churchId)?.name ?? p.churchId;
  }

  typeName(): string {
    const p = this.publication();
    if (!p) return '';
    return (
      p.type?.name ??
      (this.typeService.activeForScope(TypeScope.PUBLICATION) ?? []).find((t) => t.id === p.typeId)?.name ??
      p.typeId
    );
  }

  statusBadge(status: PublicationStatus): string {
    return {
      [PublicationStatus.DRAFT]: 'status-warning',
      [PublicationStatus.PUBLISHED]: 'status-success',
      [PublicationStatus.ARCHIVED]: 'status-disabled',
    }[status];
  }

  setStatus(status: PublicationStatus): void {
    const p = this.publication();
    if (!p || this.statusSaving() || p.status === status) return;

    this.statusSaving.set(true);
    this.publicationService.updateStatus(p.id, status).subscribe({
      next: (updated) => {
        this.publication.set(updated);
        this.statusSaving.set(false);
      },
      error: (err) => {
        this.statusSaving.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Changement de statut impossible.', 'error');
      },
    });
  }

  addMedia(): void {
    if (this.mediaForm.invalid || this.mediaAdding()) {
      this.mediaForm.markAllAsTouched();
      return;
    }
    const v = this.mediaForm.value;
    this.mediaAdding.set(true);
    this.mediaService
      .add({ kind: v.kind, provider: v.provider, url: v.url.trim(), publicationId: this.publicationId })
      .subscribe({
        next: () => {
          this.mediaAdding.set(false);
          this.mediaForm.patchValue({ url: '' });
          this.loadMedia();
        },
        error: (err) => {
          this.mediaAdding.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? "Ajout du média impossible.", 'error');
        },
      });
  }

  removeMedia(m: Media): void {
    Swal.fire({
      title: 'Retirer ce média ?',
      text: 'Il sera détaché de la publication définitivement.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.mediaService.remove(m.id).subscribe({
        next: () => this.loadMedia(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Retrait impossible.', 'error'),
      });
    });
  }

  deletePublication(): void {
    const p = this.publication();
    if (!p) return;

    Swal.fire({
      title: 'Supprimer cette publication ?',
      text: `« ${p.title} » sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.publicationService.delete(p.id).subscribe({
        next: () => this.router.navigate(['/community/publications']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
