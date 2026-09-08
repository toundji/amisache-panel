// Doit rester synchronisé avec amisache-backend :
// src/church/church.enum.ts (EntranceType)
// src/church/entities/entrance.entity.ts
// src/church/dto/entrance.dto.ts

import { Church } from './church.model';

export enum EntranceType {
  VEHICLE = 'VEHICLE',
  PEDESTRIAN = 'PEDESTRIAN',
  MIXED = 'MIXED',
  SERVICE = 'SERVICE',
}

export const ENTRANCE_TYPE_LABELS: Record<EntranceType, string> = {
  [EntranceType.VEHICLE]: 'Véhicule',
  [EntranceType.PEDESTRIAN]: 'Piéton',
  [EntranceType.MIXED]: 'Mixte',
  [EntranceType.SERVICE]: 'Service',
};

export interface Entrance {
  id: string;
  type: EntranceType;
  name: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  churchId: string;
  church?: Church;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEntranceDto {
  type: EntranceType;
  name: string;
  location: { lat: number; lng: number };
  churchId: string;
}

export interface UpdateEntranceDto {
  type?: EntranceType;
  name?: string;
  location?: { lat: number; lng: number };
}

export interface ListEntranceQuery {
  /** Absent → toutes les entrées (le back-end filtre seulement si fourni). */
  churchId?: string;
}
