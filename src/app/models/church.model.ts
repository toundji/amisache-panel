// Doit rester synchronisé avec amisache-backend :
// src/church/church.enum.ts (EntityType, ValidationStatus)
// src/church/entities/church.entity.ts + src/address/entities/address.embeddable.ts
// src/church/dto/church.dto.ts

export enum EntityType {
  CONFERENCE = 'CONFERENCE',
  ARCHDIOCESE = 'ARCHDIOCESE',
  DIOCESE = 'DIOCESE',
  DOYENNE = 'DOYENNE',
  PAROISSE = 'PAROISSE',
  COMMUNAUTE = 'COMMUNAUTE',
  CHURCH = 'CHURCH',
  CHAPEL = 'CHAPEL',
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.CONFERENCE]: 'Conférence épiscopale',
  [EntityType.ARCHDIOCESE]: 'Archidiocèse',
  [EntityType.DIOCESE]: 'Diocèse',
  [EntityType.DOYENNE]: 'Doyenné',
  [EntityType.PAROISSE]: 'Paroisse',
  [EntityType.COMMUNAUTE]: 'Communauté',
  [EntityType.CHURCH]: 'Église',
  [EntityType.CHAPEL]: 'Chapelle',
};

export enum ValidationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
}

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  [ValidationStatus.PENDING]: 'En attente',
  [ValidationStatus.APPROVED]: 'Approuvée',
  [ValidationStatus.SUSPENDED]: 'Suspendue',
};

/** Objet-valeur embarqué dans Church (pas de table dédiée). */
export interface Address {
  locality?: string;
  landmark?: string;
  location?: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  zoneId: string;
  villageId?: string;
}

/**
 * Emprise géographique de l'entité (paroisse notamment). GeoJSON Polygon
 * simple renvoyé par l'API : un seul ring fermé (dernier sommet = premier).
 * `coordinates[0]` = [[lng, lat], ...].
 */
export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface Church {
  id: string;
  type: EntityType;
  name: string;
  slug: string;
  leaderMessage?: string;
  bannerPhoto?: string;
  accentColor?: string;
  defaultLanguage?: string;
  status: ValidationStatus;
  parentId?: string;
  countryId?: string;
  address: Address;
  /** Absent tant qu'aucune emprise n'a été définie. */
  perimeter?: GeoPolygon;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Coordonnées saisies séparément côté formulaire — reconstruites en Address à l'envoi. */
export interface AddressInput {
  zoneId: string;
  villageId?: string;
  locality?: string;
  landmark?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface CreateChurchDto {
  type: EntityType;
  name: string;
  slug?: string;
  leaderMessage?: string;
  accentColor?: string;
  defaultLanguage?: string;
  parentId?: string;
  countryId?: string;
  address: {
    zoneId: string;
    villageId?: string;
    locality?: string;
    landmark?: string;
    location?: { lat: number; lng: number };
  };
}

export interface UpdateChurchDto {
  name?: string;
  slug?: string;
  leaderMessage?: string;
  accentColor?: string;
  defaultLanguage?: string;
  address?: {
    zoneId: string;
    villageId?: string;
    locality?: string;
    landmark?: string;
    location?: { lat: number; lng: number };
  };
}

/**
 * Corps de PATCH /churches/:id/perimeter. 4 à 20 sommets ; le ring fermé
 * (dernier point = premier) est reconstitué côté serveur.
 */
export interface SetPerimeterDto {
  points: { lat: number; lng: number }[];
}

export interface ListChurchAdminQuery {
  page?: number;
  limit?: number;
  status?: ValidationStatus;
  type?: EntityType;
  parentId?: string;
  search?: string;
}

export interface PaginatedChurches {
  data: Church[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
