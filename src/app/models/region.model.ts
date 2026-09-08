// Doit rester synchronisé avec amisache-backend :
// src/address/entities/region.entity.ts
// src/address/dto/region.dto.ts

export interface Region {
  id: string;
  name: string;
  /** Libellé du niveau administratif réel sauté entre Country et Region, s'il existe. */
  parentSub?: string;
  countryId: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRegionDto {
  name: string;
  parentSub?: string;
  countryId: string;
}

export interface UpdateRegionDto {
  name?: string;
  parentSub?: string;
}

export interface ListRegionQuery {
  /** Absent → toutes les régions (le back-end filtre seulement si fourni). */
  countryId?: string;
  search?: string;
}
