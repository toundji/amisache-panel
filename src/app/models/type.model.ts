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
}

export interface CreateTypeDto {
  name: string;
  scope: TypeScope;
}

export interface UpdateTypeDto {
  name?: string;
  scope?: TypeScope;
  active?: boolean;
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
