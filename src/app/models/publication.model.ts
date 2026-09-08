// Doit rester synchronisé avec amisache-backend :
// src/community/community.enum.ts (PublicationStatus)
// src/community/entities/publication.entity.ts
// src/community/dto/publication.dto.ts

import { Church } from './church.model';
import { Group } from './group.model';
import { TypeItem } from './type.model';

export enum PublicationStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  [PublicationStatus.DRAFT]: 'Brouillon',
  [PublicationStatus.PUBLISHED]: 'Publiée',
  [PublicationStatus.ARCHIVED]: 'Archivée',
};

export interface Publication {
  id: string;
  title: string;
  content: string;
  publishedAt?: string;
  status: PublicationStatus;
  /** Fenêtre d'affichage temporaire (événement) — absente = permanent. */
  startDate?: string;
  endDate?: string;
  churchId: string;
  groupId?: string;
  typeId: string;
  church?: Church;
  group?: Group;
  type?: TypeItem;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePublicationDto {
  title: string;
  content: string;
  churchId: string;
  groupId?: string;
  /** Doit appartenir au scope PUBLICATION (validé côté service). */
  typeId: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdatePublicationDto {
  title?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdatePublicationStatusDto {
  status: PublicationStatus;
}

export interface ListPublicationAdminQuery {
  churchId?: string;
  groupId?: string;
  status?: PublicationStatus;
}
