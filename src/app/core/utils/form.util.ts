// Aide à l'affichage des erreurs de formulaire — combine erreurs Angular
// locales et erreurs serveur (format `validations: { field: [msg] }` de
// nest-auth-base, voir CLAUDE.md § Erreurs).
import { AbstractControl, FormGroup } from '@angular/forms';

export interface ServerValidationErrors {
  [fieldName: string]: string[] | Record<string, any>;
}

export interface FieldErrorConfig {
  fieldName?: string;
  customMessages?: { [key: string]: string };
  serverErrors?: ServerValidationErrors;
}

export function shouldShowErrors(
  control: AbstractControl | null,
  serverErrors?: ServerValidationErrors,
  controlName?: string,
): boolean {
  const hasLocalErrors = !!(control && control.invalid && (control.touched || control.dirty));
  const hasServerErrors = !!(serverErrors && controlName && serverErrors[controlName]);
  return hasLocalErrors || hasServerErrors;
}

export function getErrorMessages(
  control: AbstractControl | null,
  fieldName: string = 'Ce champ',
  serverErrors?: ServerValidationErrors,
  controlName?: string,
): string[] {
  const messages: string[] = [];

  if (control?.errors && control.invalid && (control.touched || control.dirty)) {
    for (const [errorKey, errorValue] of Object.entries(control.errors)) {
      const message = getErrorMessage(errorKey, errorValue, fieldName);
      if (message) messages.push(message);
    }
  }

  if (serverErrors && controlName && serverErrors[controlName]) {
    const serverError = serverErrors[controlName];
    if (Array.isArray(serverError)) {
      messages.push(...serverError);
    } else if (typeof serverError === 'string') {
      messages.push(serverError);
    } else {
      Object.values(serverError).forEach((error) => {
        if (Array.isArray(error)) messages.push(...error);
        else if (typeof error === 'string') messages.push(error);
      });
    }
  }

  return messages;
}

function getErrorMessage(errorKey: string, errorValue: any, fieldName: string): string | null {
  const errorMessages: { [key: string]: string } = {
    required: `${fieldName} est obligatoire`,
    email: `Veuillez entrer un email valide`,
    minlength: `Minimum ${errorValue.requiredLength} caractères requis`,
    maxlength: `Maximum ${errorValue.requiredLength} caractères autorisés`,
    min: `La valeur minimale est ${errorValue.min}`,
    max: `La valeur maximale est ${errorValue.max}`,
    pattern: `Format invalide`,
  };
  return errorMessages[errorKey] || null;
}

export function displayFieldErrors(
  formGroup: FormGroup,
  controlName: string,
  config: FieldErrorConfig = {},
): { show: boolean; messages: string[] } {
  const control = formGroup.get(controlName);
  const show = shouldShowErrors(control, config.serverErrors, controlName);
  const messages = getErrorMessages(control, config.fieldName, config.serverErrors, controlName);
  return { show, messages };
}

/** Extrait `validations` de la réponse d'erreur HTTP de l'API. */
export function extractServerErrors(error: any): ServerValidationErrors {
  if (error?.error?.validations) return error.error.validations;
  if (error?.error?.msg) return { general: [error.error.msg] };
  return {};
}
