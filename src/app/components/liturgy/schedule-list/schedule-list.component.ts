import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ScheduleService } from '../../../services/schedule.service';
import { ChurchService } from '../../../services/church.service';
import { TypeService } from '../../../services/type.service';
import { TypeScope } from '../../../models/type.model';
import {
  DAY_OF_WEEK_LABELS,
  Schedule,
  SCHEDULE_FREQUENCY_LABELS,
  ScheduleFrequency,
} from '../../../models/schedule.model';
import { PaginationService } from '../../../shared/pagination/pagination.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface ScheduleFilters {
  churchId: string;
  frequency: ScheduleFrequency | '';
  search: string;
}

const STORAGE_KEY = 'scheduleFilters';

function loadPersisted(): Partial<Pick<ScheduleFilters, 'churchId' | 'frequency'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-schedule-list',
  providers: [PaginationService],
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './schedule-list.component.html',
  styleUrl: './schedule-list.component.scss',
})
export class ScheduleListComponent {
  readonly scheduleService = inject(ScheduleService);
  readonly churchService = inject(ChurchService);
  private readonly typeService = inject(TypeService);
  readonly pagination = inject(PaginationService);

  frequencyList = Object.values(ScheduleFrequency);
  frequencyLabels = SCHEDULE_FREQUENCY_LABELS;
  dayLabels = DAY_OF_WEEK_LABELS;

  schedules = this.scheduleService.schedules;
  churches = this.churchService.allForSelect;

  isLoading = computed(() => this.schedules() === undefined);
  error = signal<string | null>(null);
  refreshing = signal(false);

  filters = signal<ScheduleFilters>({ churchId: '', frequency: '', search: '', ...loadPersisted() });
  hasFilter = computed(() => {
    const f = this.filters();
    return !!f.churchId || !!f.frequency || !!f.search;
  });

  filtered = computed(() => {
    const items = this.schedules() ?? [];
    const { churchId, frequency, search } = this.filters();
    const term = search.trim().toLowerCase();
    return items.filter((s) => {
      if (churchId && s.churchId !== churchId) return false;
      if (frequency && s.frequency !== frequency) return false;
      if (term) {
        const hay = `${this.typeName(s)} ${this.churchName(s)}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  });

  paged = computed(() => this.pagination.slice(this.filtered()));

  private persist = effect(() => {
    const { churchId, frequency } = this.filters();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ churchId, frequency }));
  });

  private syncTotal = effect(() => {
    this.pagination.setTotalOnly(this.filtered().length);
  });

  constructor() {
    if (this.churches() === undefined) {
      this.churchService.listAllForSelect().subscribe({ error: () => undefined });
    }
    if (this.typeService.activeForScope(TypeScope.SCHEDULE) === undefined) {
      this.typeService.listActive(TypeScope.SCHEDULE).subscribe({ error: () => undefined });
    }
    this.load();
  }

  private load(showLoader = false): void {
    if (showLoader) Swal.showLoading();
    else this.refreshing.set(true);
    this.error.set(null);

    this.scheduleService.list().subscribe({
      next: () => {
        this.refreshing.set(false);
        if (showLoader) Swal.close();
      },
      error: () => {
        this.refreshing.set(false);
        this.error.set('Erreur lors du chargement des horaires.');
        if (showLoader) Swal.close();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  updateFilter<K extends keyof ScheduleFilters>(key: K, value: ScheduleFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.set({ churchId: '', frequency: '', search: '' });
    this.pagination.reset();
  }

  churchName(s: Schedule): string {
    return s.church?.name ?? (this.churches() ?? []).find((c) => c.id === s.churchId)?.name ?? '—';
  }

  typeName(s: Schedule): string {
    return (
      s.type?.name ??
      (this.typeService.activeForScope(TypeScope.SCHEDULE) ?? []).find((t) => t.id === s.typeId)?.name ??
      '—'
    );
  }

  /** Ex : « Dimanche · 09:00 · 60 min » ou « Ponctuel · 25/12/2026 · 07:00 ». */
  recurrenceSummary(s: Schedule): string {
    const parts: string[] = [];
    if (s.frequency === ScheduleFrequency.ONCE) {
      if (s.startDate) parts.push(new Date(s.startDate).toLocaleDateString('fr-FR'));
    } else if (s.dayOfWeek != null) {
      const day = this.dayLabels[s.dayOfWeek] ?? '';
      parts.push(s.weekOfMonth ? `${s.weekOfMonth}ᵉ ${day.toLowerCase()} du mois` : day);
    }
    if (s.time) parts.push(s.time.slice(0, 5));
    parts.push(`${s.duration} min`);
    return parts.filter(Boolean).join(' · ');
  }

  deleteSchedule(s: Schedule): void {
    Swal.fire({
      title: 'Supprimer cet horaire ?',
      text: `L'horaire « ${this.typeName(s)} — ${this.recurrenceSummary(s)} » sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.scheduleService.delete(s.id).subscribe({
        next: () => this.load(),
        error: (err) => Swal.fire('Erreur', err?.error?.msg ?? 'Suppression impossible.', 'error'),
      });
    });
  }
}
