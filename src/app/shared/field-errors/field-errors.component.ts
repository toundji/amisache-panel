import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { displayFieldErrors, ServerValidationErrors } from '../../core/utils/form.util';

@Component({
  selector: 'app-field-errors',
  imports: [ReactiveFormsModule],
  template: `
    @if (showErrors) {
      <div class="error-messages">
        @for (error of errorMessages; track $index) {
          <div class="error-message">{{ error }}</div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .error-message { color: #dc3545; font-size: 0.875rem; margin: 2px 0; }
  `],
})
export class FieldErrorsComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) controlName!: string;
  @Input() fieldLabel = '';
  @Input() serverErrors?: ServerValidationErrors;

  showErrors = false;
  errorMessages: string[] = [];
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.formGroup?.get(this.controlName)?.valueChanges.subscribe(() => this.updateErrors());
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.updateErrors();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private updateErrors(): void {
    if (!this.formGroup || !this.controlName) return;
    const result = displayFieldErrors(this.formGroup, this.controlName, {
      fieldName: this.fieldLabel,
      serverErrors: this.serverErrors,
    });
    this.showErrors = result.show;
    this.errorMessages = result.messages;
  }
}
