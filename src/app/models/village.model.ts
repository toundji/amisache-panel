// Doit rester synchronisé avec amisache-backend :
// src/address/entities/village.entity.ts
// src/address/address.enum.ts (VillageType)
// src/address/dto/village.dto.ts

export enum VillageType {
  VILLAGE = 'VILLAGE',
  NEIGHBORHOOD = 'NEIGHBORHOOD',
}

export const VILLAGE_TYPE_LABELS: Record<VillageType, string> = {
  [VillageType.VILLAGE]: 'Village',
  [VillageType.NEIGHBORHOOD]: 'Quartier',
};

export interface Village {
  id: string;
  name: string;
  type: VillageType;
  /** Libellé du niveau administratif réel sauté entre Zone et Village, s'il existe. */
  parentSub?: string;
  zoneId: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVillageDto {
  name: string;
  type: VillageType;
  parentSub?: string;
  zoneId: string;
}

export interface UpdateVillageDto {
  name?: string;
  type?: VillageType;
  parentSub?: string;
}

export interface ListVillageQuery {
  /** Absent → tous les villages (le back-end filtre seulement si fourni). */
  zoneId?: string;
  search?: string;
}
