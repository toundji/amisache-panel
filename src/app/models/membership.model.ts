// Doit rester synchronisé avec amisache-backend :
// src/church/entities/membership.entity.ts
// src/church/controllers/membership.controller.ts

import { Church } from './church.model';
import { User } from './user.model';

/** Abonnement fidèle ⇄ paroisse (sans rôle). Créé côté fidèle (self-service). */
export interface Membership {
  id: string;
  since: string;
  churchId: string;
  userId: string;
  church?: Church;
  user?: User;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}
