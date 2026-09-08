import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ScheduleService } from '../../../services/schedule.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import {
  FREQ_NEEDS_DAY_OF_WEEK,
  LITURGICAL_SEASON_LABELS,
  LiturgicalSeason,
  DAY_OF_WEEK_LABELS,
  SCHEDULE_FREQUENCY_LABELS,
  ScheduleFrequency,
} from '../../../models/schedule.model';
import { ServerError } from '../../../models/server-error.model';
import { FieldErrorsComponent } from '../../../shared/field-errors/field-errors.component';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

@Component({
  selector: 'app-schedule-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FieldErrorsComponent, BackButtonComponent],
  templateUrl: './schedule-create.component.html',
  styleUrl: './schedule-create.component.scss',
})
export class ScheduleCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly scheduleService = inject(ScheduleService);
  private readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);

  frequencyList = Object.values(ScheduleFrequency);
  frequencyLabels = SCHEDULE_FREQUENCY_LABELS;
  seasonList = Object.values(LiturgicalSeason);
  seasonLabels = LITURGICAL_SEASON_LABELS;
  dayLabels = DAY_OF_WEEK_LABELS;
  weekList = [1, 2, 3, 4, 5];

  churches = this.churchService.allForSelect;
  types = this.typeService.activeByScope;

  readonly form: FormGroup = this.fb.group({
    churchId: [this.route.snapshot.queryParamMap.get('churchId') ?? '', [Validators.required]],
    typeId: ['', [Validators.required]],
    frequency: ['', [Validators.required]],
    dayOfWeek: [''],
    weekOfMonth: [''],
    time: ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    duration: [60, [Validators.required, Validators.min(1)]],
    language: [''],
    season: [LiturgicalSeason.ORDINARY],
    startDate: [''],
    endDate: [''],
  });

  submitting = signal(false);
  error?: ServerError;

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.typeService.activeForScope(TypeScope.SCHEDULE) === undefined) {
      this.typeService.listActive(TypeScope.SCHEDULE).subscribe({ error: () => undefined });
    }
  }

  get scheduleTypes() {
    return this.types()[TypeScope.SCHEDULE] ?? [];
  }

  get frequency(): ScheduleFrequency | '' {
    return this.form.get('frequency')?.value ?? '';
  }

  get needsDayOfWeek(): boolean {
    return FREQ_NEEDS_DAY_OF_WEEK.includes(this.frequency as ScheduleFrequency);
  }

  get needsWeekOfMonth(): boolean {
    return this.frequency === ScheduleFrequency.MONTHLY;
  }

  get needsStartDate(): boolean {
    return this.frequency === ScheduleFrequency.ONCE;
  }

  invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.touched && control?.invalid);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    if (this.needsDayOfWeek && (v.dayOfWeek === '' || v.dayOfWeek == null)) {
      Swal.fire('Champ requis', 'Le jour de la semaine est requis pour cette fréquence.', 'warning');
      return;
    }
    if (this.needsWeekOfMonth && (v.weekOfMonth === '' || v.weekOfMonth == null)) {
      Swal.fire('Champ requis', 'La semaine du mois est requise pour la fréquence mensuelle.', 'warning');
      return;
    }
    if (this.needsStartDate && !v.startDate) {
      Swal.fire('Champ requis', "La date est requise pour un horaire ponctuel.", 'warning');
      return;
    }

    this.error = undefined;
    this.submitting.set(true);

    this.scheduleService
      .create({
        churchId: v.churchId,
        typeId: v.typeId,
        frequency: v.frequency,
        dayOfWeek: v.dayOfWeek === '' || v.dayOfWeek == null ? undefined : Number(v.dayOfWeek),
        weekOfMonth: v.weekOfMonth === '' || v.weekOfMonth == null ? undefined : Number(v.weekOfMonth),
        time: v.time,
        duration: Number(v.duration),
        language: v.language?.trim() || undefined,
        season: v.season || undefined,
        startDate: v.startDate || undefined,
        endDate: v.endDate || undefined,
      })
      .subscribe({
        next: (schedule) => {
          this.submitting.set(false);
          Swal.fire({ icon: 'success', title: 'Horaire créé', timer: 1200, showConfirmButton: false }).then(() => {
            this.router.navigate(['/liturgy/schedules', schedule.id]);
          });
        },
        error: (err: { error: ServerError }) => {
          this.submitting.set(false);
          this.error = err.error;
        },
      });
  }
}
