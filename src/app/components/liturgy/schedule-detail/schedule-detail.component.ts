import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { ScheduleService } from '../../../services/schedule.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import {
  DAY_OF_WEEK_LABELS,
  FREQ_NEEDS_DAY_OF_WEEK,
  LITURGICAL_SEASON_LABELS,
  LiturgicalSeason,
  Schedule,
  SCHEDULE_FREQUENCY_LABELS,
  ScheduleFrequency,
} from '../../../models/schedule.model';
import { FieldSaveMixin } from '../../../shared/mixins/field-save.mixin';
import { BackButtonComponent } from '../../../shared/navigation/back-button.component';

const NUMERIC_FIELDS = ['dayOfWeek', 'weekOfMonth', 'duration'];
const NULLABLE_FIELDS = ['dayOfWeek', 'weekOfMonth', 'language', 'startDate', 'endDate'];

@Component({
  selector: 'app-schedule-detail',
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  templateUrl: './schedule-detail.component.html',
  styleUrl: './schedule-detail.component.scss',
})
export class ScheduleDetailComponent extends FieldSaveMixin implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scheduleService = inject(ScheduleService);
  private readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);
  private readonly fb = inject(FormBuilder);

  private readonly scheduleId = this.route.snapshot.paramMap.get('id')!;
  private readonly stub =
    this.scheduleService.selected()?.id === this.scheduleId ? this.scheduleService.selected() : null;

  schedule = signal<Schedule | null>(this.stub);
  loading = signal(!this.stub);
  refreshing = signal(false);
  error = signal<string | null>(null);
  deleting = signal(false);

  frequencyList = Object.values(ScheduleFrequency);
  frequencyLabels = SCHEDULE_FREQUENCY_LABELS;
  seasonList = Object.values(LiturgicalSeason);
  seasonLabels = LITURGICAL_SEASON_LABELS;
  dayLabels = DAY_OF_WEEK_LABELS;
  weekList = [1, 2, 3, 4, 5];

  form: FormGroup = this.fb.group({
    frequency: [this.stub?.frequency ?? ''],
    dayOfWeek: [this.stub?.dayOfWeek ?? ''],
    weekOfMonth: [this.stub?.weekOfMonth ?? ''],
    time: [this.stub?.time?.slice(0, 5) ?? ''],
    duration: [this.stub?.duration ?? 60],
    language: [this.stub?.language ?? ''],
    season: [this.stub?.season ?? LiturgicalSeason.ORDINARY],
    startDate: [this.stub?.startDate ?? ''],
    endDate: [this.stub?.endDate ?? ''],
  });

  protected getFormGroup(): FormGroup {
    return this.form;
  }

  protected saveField(field: string, value: any): Observable<any> {
    let payload: any = value;
    if (value === '' || value === null) {
      payload = NULLABLE_FIELDS.includes(field) ? undefined : value;
    } else if (NUMERIC_FIELDS.includes(field)) {
      payload = Number(value);
    }
    return this.scheduleService.update(this.schedule()!.id, { [field]: payload });
  }

  constructor() {
    super();
    this.initOriginalValues();
  }

  ngOnInit(): void {
    if (this.churchService.allForSelect() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.typeService.activeForScope(TypeScope.SCHEDULE) === undefined) {
      this.typeService.listActive(TypeScope.SCHEDULE).subscribe({ error: () => undefined });
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    this.error.set(null);

    this.scheduleService.getById(this.scheduleId).subscribe({
      next: (schedule) => {
        this.schedule.set(schedule);
        this.form.patchValue({
          frequency: schedule.frequency,
          dayOfWeek: schedule.dayOfWeek ?? '',
          weekOfMonth: schedule.weekOfMonth ?? '',
          time: schedule.time?.slice(0, 5) ?? '',
          duration: schedule.duration,
          language: schedule.language ?? '',
          season: schedule.season,
          startDate: schedule.startDate ?? '',
          endDate: schedule.endDate ?? '',
        });
        this.initOriginalValues();

        this.loading.set(false);
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set("Erreur lors du chargement de l'horaire.");
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(true);
  }

  get needsDayOfWeek(): boolean {
    return FREQ_NEEDS_DAY_OF_WEEK.includes(this.form.get('frequency')?.value);
  }

  get needsWeekOfMonth(): boolean {
    return this.form.get('frequency')?.value === ScheduleFrequency.MONTHLY;
  }

  churchName(): string {
    const s = this.schedule();
    if (!s) return '';
    return s.church?.name ?? (this.churchService.allForSelect() ?? []).find((c) => c.id === s.churchId)?.name ?? s.churchId;
  }

  typeName(): string {
    const s = this.schedule();
    if (!s) return '';
    return (
      s.type?.name ??
      (this.typeService.activeForScope(TypeScope.SCHEDULE) ?? []).find((t) => t.id === s.typeId)?.name ??
      s.typeId
    );
  }

  deleteSchedule(): void {
    const s = this.schedule();
    if (!s) return;

    Swal.fire({
      title: 'Supprimer cet horaire ?',
      text: 'Cet horaire liturgique sera supprimé définitivement.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.deleting.set(true);
      this.scheduleService.delete(s.id).subscribe({
        next: () => this.router.navigate(['/liturgy/schedules']),
        error: (err) => {
          this.deleting.set(false);
          Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error');
        },
      });
    });
  }
}
