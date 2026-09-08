// ─────────────────────────────────────────────────────────────────────────────
// field-save.mixin.ts — Logique de sauvegarde champ par champ réutilisable.
// À étendre dans tout formulaire d'édition ayant des champs scalaires.
//
// Usage :
//   export class MyFormComponent extends FieldSaveMixin {
//     protected getFormGroup() { return this.myForm; }
//     protected saveField(field: string, value: any): Observable<any> {
//       return this.myService.updateField(this.id, { [field]: value });
//     }
//     // Après avoir peuplé le formulaire : this.initOriginalValues();
//   }
//
// Règle absolue : zéro déclencheur automatique. saveSingleField() ne doit
// jamais être appelé depuis (blur)/(change)/(input)/valueChanges — uniquement
// via un bouton "save" cliqué explicitement.
// ─────────────────────────────────────────────────────────────────────────────
import { signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';

export abstract class FieldSaveMixin {
  private _savingFields = signal<Set<string>>(new Set());
  private _savedFields = signal<Set<string>>(new Set());
  protected originalFormValues: Record<string, any> = {};

  protected abstract getFormGroup(): FormGroup;
  protected abstract saveField(field: string, value: any): Observable<any>;

  isFieldModified(field: string): boolean {
    const current = this.getFormGroup().get(field)?.value;
    const original = this.originalFormValues[field];
    return JSON.stringify(current) !== JSON.stringify(original);
  }

  isFieldSaving(field: string): boolean {
    return this._savingFields().has(field);
  }

  isFieldJustSaved(field: string): boolean {
    return this._savedFields().has(field);
  }

  saveSingleField(field: string): void {
    if (!this.isFieldModified(field) || this.isFieldSaving(field)) return;

    const value = this.getFormGroup().get(field)?.value;
    this._savingFields.update((s) => new Set(s).add(field));

    this.saveField(field, value).subscribe({
      next: () => {
        this.originalFormValues[field] = value;
        this._savingFields.update((s) => { const n = new Set(s); n.delete(field); return n; });
        this._savedFields.update((s) => new Set(s).add(field));
        setTimeout(() => {
          this._savedFields.update((s) => { const n = new Set(s); n.delete(field); return n; });
        }, 2000);
      },
      error: () => {
        this._savingFields.update((s) => { const n = new Set(s); n.delete(field); return n; });
      },
    });
  }

  resetField(field: string): void {
    const original = this.originalFormValues[field];
    if (original !== undefined) {
      this.getFormGroup().get(field)?.setValue(original);
    }
  }

  protected initOriginalValues(): void {
    this.originalFormValues = { ...this.getFormGroup().value };
  }
}
