// Doit rester synchronisé avec amisache-backend :
// src/community/community.enum.ts (GroupType)
// src/community/entities/group.entity.ts + group-member.entity.ts
// src/community/dto/group.dto.ts + group-member.dto.ts

import { Church } from './church.model';
import { User } from './user.model';

export enum GroupType {
  CHOIR = 'CHOIR',
  MOVEMENT = 'MOVEMENT',
  ASSOCIATION = 'ASSOCIATION',
  OTHER = 'OTHER',
}

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  [GroupType.CHOIR]: 'Chorale',
  [GroupType.MOVEMENT]: 'Mouvement',
  [GroupType.ASSOCIATION]: 'Association',
  [GroupType.OTHER]: 'Autre',
};

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  churchId: string;
  church?: Church;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGroupDto {
  name: string;
  type: GroupType;
  churchId: string;
}

export interface UpdateGroupDto {
  name?: string;
  type?: GroupType;
}

/**
 * `churchId` marqué requis côté Swagger, toléré absent → gardé optionnel
 * côté panel pour une vue transversale, avec filtre église visible.
 */
export interface ListGroupQuery {
  churchId?: string;
}

/** Adhésion fidèle ⇄ groupe. Créée côté fidèle (self-service). */
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  group?: Group;
  user?: User;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}
