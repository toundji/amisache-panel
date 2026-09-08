// Doit rester synchronisé avec amisache-backend :
// src/address/entities/zone.entity.ts
// src/address/dto/zone.dto.ts

export interface Zone {
  id: string;
  name: string;
  /** Libellé du niveau administratif réel sauté entre Region et Zone, s'il existe. */
  parentSub?: string;
  regionId: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateZoneDto {
  name: string;
  parentSub?: string;
  regionId: string;
}

export interface UpdateZoneDto {
  name?: string;
  parentSub?: string;
}

export interface ListZoneQuery {
  /** Absent → toutes les zones (le back-end filtre seulement si fourni). */
  regionId?: string;
  search?: string;
}
