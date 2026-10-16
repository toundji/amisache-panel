import { ParamMap } from '@angular/router';

/**
 * Filtres persistés en localStorage (cf. CLAUDE.md § Filtres et recherche) —
 * lecture tolérante : storage indisponible ou JSON corrompu → aucun filtre.
 */
export function loadPersistedFilters<T>(storageKey: string): Partial<T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function persistFilters(storageKey: string, value: object): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Storage plein ou bloqué — la persistance est un confort, pas une exigence.
  }
}

/**
 * Filtres passés dans l'URL (ex. tuile statistique du tableau de bord →
 * `/users?status=unverified`). Dès qu'au moins une des clés connues est
 * présente, l'URL décrit l'intégralité du contexte voulu : on repart des
 * valeurs par défaut + ces paramètres, **sans** les filtres persistés (un
 * rôle mémorisé d'une visite précédente fausserait le chiffre cliqué).
 * `null` si l'URL ne porte aucun filtre → l'appelant garde les filtres persistés.
 */
export function filtersFromQueryParams<T extends object>(
  params: ParamMap,
  keys: (keyof T & string)[],
): Partial<T> | null {
  if (!keys.some((key) => params.has(key))) return null;

  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null) result[key] = value;
  }
  return result as Partial<T>;
}
