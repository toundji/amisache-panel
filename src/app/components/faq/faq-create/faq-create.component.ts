import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { FaqService } from '../../../services/faq.service';
import { FAQ_CATEGORY_LABELS, FaqCategory } from '../../../models/faq.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-faq-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './faq-create.component.html',
  styleUrl: './faq-create.component.scss',
})
export class FaqCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly faqService = inject(FaqService);

  readonly form: FormGroup = this.fb.group({
    question: ['', [Validators.required]],
    answer: [''],
    category: [''],
    sortOrder: [0],
  });

  categoryList = Object.values(FaqCategory);
  categoryLabels = FAQ_CATEGORY_LABELS;

  submitting = signal(false);
  error?: ServerError;

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = undefined;
    this.submitting.set(true);

    // category envoyé uniquement si renseigné — chaîne vide rejetée par
    // @IsEnum côté API (IsOptional ne couvre que null/undefined, pas '').
    const body = { ...this.form.value, category: this.form.value.category || undefined };

    this.faqService.create(body).subscribe({
      next: (faq) => {
        this.submitting.set(false);
        Swal.fire({ icon: 'success', title: 'FAQ créée', timer: 1200, showConfirmButton: false }).then(() => {
          this.router.navigate(['/faq', faq.id]);
        });
      },
      error: (err: { error: ServerError }) => {
        this.submitting.set(false);
        this.error = err.error;
      },
    });
  }
}
