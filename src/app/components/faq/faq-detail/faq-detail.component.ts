import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { FaqService } from '../../../services/faq.service';
import { FAQ_CATEGORY_LABELS, Faq, FaqCategory } from '../../../models/faq.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-faq-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './faq-detail.component.html',
  styleUrl: './faq-detail.component.scss',
})
export class FaqDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly faqService = inject(FaqService);
  private readonly fb = inject(FormBuilder);

  private readonly faqId = this.route.snapshot.paramMap.get('id')!;
  // Stub venant de la liste (cf. FaqService.select / CLAUDE.md § Pages de
  // détail) — utilisable seulement s'il correspond bien à l'id demandé.
  private readonly stub = this.faqService.selected()?.id === this.faqId ? this.faqService.selected() : null;

  faq = signal<Faq | null>(this.stub);
  // Squelette uniquement si on n'a aucun stub à afficher en attendant le fetch complet.
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);
  togglingVisibility = signal(false);

  categoryList = Object.values(FaqCategory);
  categoryLabels = FAQ_CATEGORY_LABELS;

  form: FormGroup = this.fb.group({
    question: [this.stub?.question ?? ''],
    answer: [this.stub?.answer ?? ''],
    category: [this.stub?.category ?? ''],
    sortOrder: [this.stub?.sortOrder ?? 0],
  });

  // ── FieldSaveMixin — chaque champ est envoyé indépendamment (PATCH /faq/:id accepte un patch partiel) ──
  protected getFormGroup(): FormGroup { return this.form; }

  protected saveField(field: string, value: any): Observable<any> {
    const id = this.faq()!.id;
    // "Aucune" (select vide) doit envoyer `null`, jamais '' — @IsEnum côté
    // API rejette une chaîne vide, `null` seul retire la catégorie (@IsOptional
    // ignore null/undefined, TypeORM ne vide la colonne que sur `null` explicite).
    const patchValue = field === 'category' && value === '' ? null : value;
    return this.faqService.update(id, { [field]: patchValue });
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

    this.faqService.getById(this.faqId).subscribe({
      next: (faq) => {
        this.faq.set(faq);
        this.form.patchValue({
          question: faq.question,
          answer: faq.answer ?? '',
          category: faq.category ?? '',
          sortOrder: faq.sortOrder,
        });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement de la FAQ.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  isAnswered(): boolean {
    return !!this.faq()?.answeredAt;
  }

  isHidden(): boolean {
    return !!this.faq()?.hiddenAt;
  }

  // ── Visibilité — action instantanée (pas de save/undo, comme quickUpdateStatus sur les utilisateurs) ──
  toggleVisibility(): void {
    const faq = this.faq();
    if (!faq || this.togglingVisibility()) return;

    this.togglingVisibility.set(true);
    this.faqService.update(faq.id, { hidden: !this.isHidden() }).subscribe({
      next: (updated) => {
        this.faq.set(updated);
        this.togglingVisibility.set(false);
      },
      error: (err) => {
        this.togglingVisibility.set(false);
        Swal.fire('Erreur', err?.error?.msg ?? 'Action impossible.', 'error');
      },
    });
  }

  deleteFaq(): void {
    const faq = this.faq();
    if (!faq) return;

    Swal.fire({
      title: 'Supprimer cette FAQ ?',
      text: `« ${faq.question} » sera supprimée définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.faqService.delete(faq.id).subscribe({
        next: () => this.router.navigate(['/faq']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
