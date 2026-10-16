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
  /** Le fidèle peut-il joindre un fichier à sa demande ? Désactivé par défaut. */
  allowAttachment: boolean;
  /** Délai minimum, en heures (24 = 1 jour, 168 = 1 semaine), entre l'envoi d'une demande et la date souhaitée. */
  minLeadHours: number;
  /** La date doit correspondre à un horaire déjà publié par la paroisse (ignoré si elle n'en a aucun). */
  requiresScheduleMatch: boolean;
}

export interface CreateRequestTypeDto {
  name: string;
  scope: RequestTypeScope;
  allowHomeCelebration?: boolean;
  allowAttachment?: boolean;
  minLeadHours?: number;
  requiresScheduleMatch?: boolean;
}

export interface UpdateRequestTypeDto {
  name?: string;
  scope?: RequestTypeScope;
  active?: boolean;
  allowHomeCelebration?: boolean;
  allowAttachment?: boolean;
  minLeadHours?: number;
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
