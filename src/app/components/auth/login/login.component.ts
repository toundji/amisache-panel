import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../../services/auth.service';
import { LoginCredentials } from '../../../models/auth.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, FieldErrorsComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true],
  });

  showPassword = signal(false);
  submitting = signal(false);
  googleSubmitting = signal(false);
  error?: ServerError;

  ngOnDestroy(): void {
    this.authService.clearError();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.error = undefined;
    this.submitting.set(true);
    const credentials: LoginCredentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (error: ServerError) => {
        this.submitting.set(false);
        this.error = error;
        Swal.fire({ title: 'Connexion impossible', text: error?.msg, icon: 'error', confirmButtonText: 'OK' });
      },
    });
  }

  loginWithGoogle(): void {
    if (this.googleSubmitting()) {
      return;
    }

    this.error = undefined;
    this.googleSubmitting.set(true);
    const rememberMe = !!this.loginForm.get('rememberMe')?.value;

    this.authService.loginWithGoogle(rememberMe).subscribe({
      next: () => {
        this.googleSubmitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (error: ServerError & { silent?: boolean }) => {
        this.googleSubmitting.set(false);
        if (error?.silent) {
          return;
        }
        this.error = error;
        Swal.fire({ title: 'Connexion Google impossible', text: error?.msg, icon: 'error', confirmButtonText: 'OK' });
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  invalid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  clearError(): void {
    this.error = undefined;
  }
}
