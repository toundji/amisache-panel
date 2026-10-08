// Doit rester synchronisé avec amisache-backend :
// src/liturgy/request-type.enum.ts (RequestTypeScope)
// src/liturgy/entities/request-type.entity.ts
// src/liturgy/dto/request-type.dto.ts

export enum RequestTypeScope {
  INTENTION = 'INTENTION',
  SACRAMENT = 'SACRAMENT',
}

export const REQUEST_TYPE_SCOPE_LABELS: Record<RequestTypeScope, string> = {
  [RequestTypeScope.INTENTION]: 'Intention de messe',
  [RequestTypeScope.SACRAMENT]: 'Sacrement',
};

export interface RequestTypeItem {
  id: string;
  name: string;
  scope: RequestTypeScope;
  /** Un type désactivé reste référencé par l'historique mais disparaît des listes actives. */
  active: boolean;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Ce type peut-il être demandé en célébration à domicile ? */
  allowHomeCelebration: boolean;
  /** Délai minimum, en jours, entre l'envoi d'une demande de ce type et la date souhaitée. */
  minLeadDays: number;
  /** La date doit correspondre à un horaire déjà publié par la paroisse (ignoré si elle n'en a aucun). */
  requiresScheduleMatch: boolean;
}

export interface CreateRequestTypeDto {
  name: string;
  scope: RequestTypeScope;
  allowHomeCelebration?: boolean;
  minLeadDays?: number;
  requiresScheduleMatch?: boolean;
}

export interface UpdateRequestTypeDto {
  name?: string;
  scope?: RequestTypeScope;
  active?: boolean;
  allowHomeCelebration?: boolean;
  minLeadDays?: number;
  requiresScheduleMatch?: boolean;
}

export interface ListRequestTypeAdminQuery {
  page?: number;
  limit?: number;
  scope?: RequestTypeScope;
  active?: boolean;
  search?: string;
}

export interface PaginatedRequestTypes {
  data: RequestTypeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
