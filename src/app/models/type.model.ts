// Doit rester synchronisé avec amisache-backend :
// src/type/type.enum.ts (TypeScope)
// src/type/entities/type.entity.ts
// src/type/dto/type.dto.ts

export enum TypeScope {
  INTENTION = 'INTENTION',
  SACRAMENT = 'SACRAMENT',
  DONATION = 'DONATION',
  PUBLICATION = 'PUBLICATION',
  SCHEDULE = 'SCHEDULE',
}

export const TYPE_SCOPE_LABELS: Record<TypeScope, string> = {
  [TypeScope.INTENTION]: 'Intention de messe',
  [TypeScope.SACRAMENT]: 'Sacrement',
  [TypeScope.DONATION]: 'Don',
  [TypeScope.PUBLICATION]: 'Publication',
  [TypeScope.SCHEDULE]: 'Horaire',
};

/** `Type` côté API — nommé TypeItem ici pour ne pas masquer le mot-clé TS. */
export interface TypeItem {
  id: string;
  name: string;
  scope: TypeScope;
  /** Un type désactivé reste référencé par l'historique mais disparaît des listes actives. */
  active: boolean;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Ce type (INTENTION/SACRAMENT) peut-il être demandé en célébration à domicile ? */
  allowHomeCelebration: boolean;
  /** Délai minimum, en jours, entre l'envoi d'une demande de ce type et la date souhaitée. */
  minLeadDays: number;
  /** La date doit correspondre à un horaire déjà publié par la paroisse (ignoré si elle n'en a aucun). */
  requiresScheduleMatch: boolean;
}

export interface CreateTypeDto {
  name: string;
  scope: TypeScope;
  allowHomeCelebration?: boolean;
  minLeadDays?: number;
  requiresScheduleMatch?: boolean;
}

export interface UpdateTypeDto {
  name?: string;
  scope?: TypeScope;
  active?: boolean;
  allowHomeCelebration?: boolean;
  minLeadDays?: number;
  requiresScheduleMatch?: boolean;
}

export interface ListTypeAdminQuery {
  page?: number;
  limit?: number;
  scope?: TypeScope;
  active?: boolean;
  search?: string;
}

export interface PaginatedTypes {
  data: TypeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
