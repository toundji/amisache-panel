import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LEAD_TIME_UNIT_HOURS, LEAD_TIME_UNIT_LABELS, LeadTimeUnit, splitLeadTime } from './lead-time.util';

/**
 * Champ « délai minimum » : un nombre + une unité (heures / jours / semaines).
 * La valeur du contrôle reste un nombre d'HEURES (ce qu'attend l'API) — un
 * FieldSaveMixin la compare donc comme n'importe quel champ scalaire.
 * `nullable` : champ vide autorisé (valeur `null` = hérité, cf. tarifs).
 */
@Component({
  selector: 'app-lead-time-input',
  templateUrl: './lead-time-input.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LeadTimeInputComponent), multi: true }],
})
export class LeadTimeInputComponent implements ControlValueAccessor {
  nullable = input(false);
  /** États FieldSaveMixin (bordure orange / verte), comme un input classique. */
  modified = input(false);
  saved = input(false);

  readonly units = Object.keys(LEAD_TIME_UNIT_HOURS) as LeadTimeUnit[];
  readonly unitLabels = LEAD_TIME_UNIT_LABELS;

  amount = signal<number | null>(null);
  unit = signal<LeadTimeUnit>('days');
  disabled = signal(false);

  private onChange: (hours: number | null) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(hours: number | null): void {
    if (hours == null) {
      this.amount.set(null);
      return;
    }
    const { amount, unit } = splitLeadTime(Number(hours));
    // 0 garde l'unité courante (0 heure = 0 jour).
    this.amount.set(amount);
    if (hours > 0) this.unit.set(unit);
  }

  registerOnChange(fn: (hours: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  onAmountInput(raw: string): void {
    const value = raw === '' ? null : Math.max(0, Math.floor(Number(raw)));
    this.amount.set(value);
    this.emit();
  }

  onUnitChange(unit: string): void {
    this.unit.set(unit as LeadTimeUnit);
    this.emit();
  }

  private emit(): void {
    const amount = this.amount();
    if (amount == null || Number.isNaN(amount)) {
      this.onChange(this.nullable() ? null : 0);
      return;
    }
    this.onChange(amount * LEAD_TIME_UNIT_HOURS[this.unit()]);
  }
}
