// Doit rester synchronisé avec amisache-backend :
// src/church/church.enum.ts (EcclesialRole)
// src/church/entities/clergy-member.entity.ts
// src/church/dto/clergy-member.dto.ts

import { Church } from './church.model';
import { User } from './user.model';

export enum EcclesialRole {
  ARCHBISHOP = 'ARCHBISHOP',
  BISHOP = 'BISHOP',
  PRIEST = 'PRIEST',
  VICAR = 'VICAR',
  DEACON = 'DEACON',
  CATECHIST = 'CATECHIST',
  SECRETARY = 'SECRETARY',
  ADMIN = 'ADMIN',
}

export const ECCLESIAL_ROLE_LABELS: Record<EcclesialRole, string> = {
  [EcclesialRole.ARCHBISHOP]: 'Archevêque',
  [EcclesialRole.BISHOP]: 'Évêque',
  [EcclesialRole.PRIEST]: 'Prêtre',
  [EcclesialRole.VICAR]: 'Vicaire',
  [EcclesialRole.DEACON]: 'Diacre',
  [EcclesialRole.CATECHIST]: 'Catéchiste',
  [EcclesialRole.SECRETARY]: 'Secrétaire',
  [EcclesialRole.ADMIN]: 'Administrateur',
};

export interface ClergyMember {
  id: string;
  role: EcclesialRole;
  startDate: string;
  /** Vide = affectation toujours active. */
  endDate?: string;
  churchId: string;
  userId: string;
  church?: Church;
  user?: User;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClergyMemberDto {
  role: EcclesialRole;
  startDate: string;
  endDate?: string;
  churchId: string;
  userId: string;
}

export interface UpdateClergyMemberDto {
  role?: EcclesialRole;
  startDate?: string;
  endDate?: string;
}

export interface ListClergyMemberQuery {
  /** Absent → toutes les affectations (le back-end filtre seulement si fourni). */
  churchId?: string;
  activeOnly?: boolean;
}
