// Délai minimum d'une demande (RequestType/Tariff.minLeadHours) — stocké en
// HEURES côté API, saisi dans l'unité la plus parlante (heures, jours, semaines).

export type LeadTimeUnit = 'hours' | 'days' | 'weeks';

export const LEAD_TIME_UNIT_HOURS: Record<LeadTimeUnit, number> = { hours: 1, days: 24, weeks: 168 };

export const LEAD_TIME_UNIT_LABELS: Record<LeadTimeUnit, string> = {
  hours: 'heure(s)',
  days: 'jour(s)',
  weeks: 'semaine(s)',
};

/** Plus grande unité qui divise exactement `hours` (48 → 2 jours, 336 → 2 semaines, 36 → 36 heures). */
export function splitLeadTime(hours: number): { amount: number; unit: LeadTimeUnit } {
  if (hours > 0 && hours % 168 === 0) return { amount: hours / 168, unit: 'weeks' };
  if (hours > 0 && hours % 24 === 0) return { amount: hours / 24, unit: 'days' };
  return { amount: hours, unit: 'hours' };
}

/** « 2 jours », « 1 semaine », « 12 heures » — « — » si non défini. */
export function formatLeadTime(hours: number | null | undefined): string {
  if (hours == null) return '—';
  const { amount, unit } = splitLeadTime(hours);
  const word = { hours: 'heure', days: 'jour', weeks: 'semaine' }[unit];
  return `${amount} ${word}${amount > 1 ? 's' : ''}`;
}
