// Doit rester synchronisé avec amisache-backend :
// src/address/entities/country.entity.ts
// src/address/dto/country.dto.ts

export interface Country {
  id: string;
  /** ISO 3166-1 alpha-2, ex. "BJ" — immuable après création */
  isoCode: string;
  /** Indicatif téléphonique, ex. "+229" */
  callingCode: string;
  /**
   * Libellés d'affichage des niveaux modélisés (Region → Zone → Village),
   * dans cet ordre. Ex. ["Département", "Commune", "Village/Quartier"].
   */
  subdivisions: string[];
  /** Hiérarchie administrative réelle complète du pays (niveaux sautés inclus). */
  allSub: string[];
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCountryDto {
  isoCode: string;
  callingCode: string;
  subdivisions: string[];
  allSub: string[];
}

export interface UpdateCountryDto {
  callingCode?: string;
  subdivisions?: string[];
  allSub?: string[];
}

export interface ListCountryQuery {
  search?: string;
}
