// Doit rester synchronisé avec amisache-backend :
// src/liturgy/liturgy.enum.ts (ScheduleFrequency, LiturgicalSeason)
// src/liturgy/entities/schedule.entity.ts
// src/liturgy/dto/schedule.dto.ts

import { Church } from './church.model';
import { TypeItem } from './type.model';

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  ONCE = 'ONCE',
}

export const SCHEDULE_FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  [ScheduleFrequency.DAILY]: 'Quotidien',
  [ScheduleFrequency.WEEKLY]: 'Hebdomadaire',
  [ScheduleFrequency.BIWEEKLY]: 'Bimensuel',
  [ScheduleFrequency.MONTHLY]: 'Mensuel',
  [ScheduleFrequency.ONCE]: 'Ponctuel',
};

export enum LiturgicalSeason {
  ORDINARY = 'ORDINARY',
  LENT = 'LENT',
  ADVENT = 'ADVENT',
  PATRON_FEAST = 'PATRON_FEAST',
}

export const LITURGICAL_SEASON_LABELS: Record<LiturgicalSeason, string> = {
  [LiturgicalSeason.ORDINARY]: 'Temps ordinaire',
  [LiturgicalSeason.LENT]: 'Carême',
  [LiturgicalSeason.ADVENT]: 'Avent',
  [LiturgicalSeason.PATRON_FEAST]: 'Fête patronale',
};

/** 0 = dimanche ... 6 = samedi (convention back-end). */
export const DAY_OF_WEEK_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

/** Fréquences qui exigent un `dayOfWeek` (règle métier §4.5). */
export const FREQ_NEEDS_DAY_OF_WEEK: ScheduleFrequency[] = [
  ScheduleFrequency.WEEKLY,
  ScheduleFrequency.BIWEEKLY,
  ScheduleFrequency.MONTHLY,
];

export interface Schedule {
  id: string;
  frequency: ScheduleFrequency;
  /** 0 (dimanche) à 6 (samedi) — requis pour WEEKLY/BIWEEKLY/MONTHLY. */
  dayOfWeek?: number;
  /** 1 à 5 (« 2ᵉ dimanche du mois ») — requis pour MONTHLY uniquement. */
  weekOfMonth?: number;
  time: string;
  /** Durée en minutes. */
  duration: number;
  language?: string;
  season: LiturgicalSeason;
  /** ONCE : la date de l'occurrence. Autres : début de validité (horaires temporaires). */
  startDate?: string;
  endDate?: string;
  churchId: string;
  typeId: string;
  church?: Church;
  type?: TypeItem;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateScheduleDto {
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  weekOfMonth?: number;
  time: string;
  duration: number;
  language?: string;
  season?: LiturgicalSeason;
  startDate?: string;
  endDate?: string;
  churchId: string;
  /** Doit appartenir au scope SCHEDULE (validé côté service). */
  typeId: string;
}

export interface UpdateScheduleDto {
  frequency?: ScheduleFrequency;
  dayOfWeek?: number;
  weekOfMonth?: number;
  time?: string;
  duration?: number;
  language?: string;
  season?: LiturgicalSeason;
  startDate?: string;
  endDate?: string;
}

/**
 * `churchId` est marqué requis côté Swagger, mais l'endpoint tolère son
 * absence (renvoie alors tous les horaires) — on le garde optionnel pour
 * une vue admin transversale, avec un filtre église bien visible.
 */
export interface ListScheduleQuery {
  churchId?: string;
}
