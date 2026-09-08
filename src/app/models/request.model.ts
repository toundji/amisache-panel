// Doit rester synchronisé avec amisache-backend :
// src/liturgy/liturgy.enum.ts (RequestStatus)
// src/liturgy/entities/request.entity.ts
// src/liturgy/dto/request.dto.ts

import { Church } from './church.model';
import { Schedule } from './schedule.model';
import { TypeItem } from './type.model';
import { User } from './user.model';

export enum RequestStatus {
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.SUBMITTED]: 'Soumise',
  [RequestStatus.IN_PROGRESS]: 'En cours',
  [RequestStatus.CONFIRMED]: 'Confirmée',
  [RequestStatus.COMPLETED]: 'Terminée',
  [RequestStatus.REJECTED]: 'Rejetée',
};

/**
 * Demande unifiée : intention de messe OU sacrement, discriminée par le
 * scope du `Type` lié. Déposée par le fidèle (self-service) ; le back-office
 * ne fait que suivre et changer le statut.
 */
export interface Request {
  id: string;
  date: string;
  text?: string;
  offering?: string;
  attachments?: string;
  status: RequestStatus;
  churchId: string;
  userId: string;
  scheduleId?: string;
  typeId: string;
  paymentId?: string;
  church?: Church;
  user?: User;
  schedule?: Schedule;
  type?: TypeItem;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateRequestStatusDto {
  status: RequestStatus;
}

export interface ListRequestQuery {
  churchId?: string;
  status?: RequestStatus;
}
