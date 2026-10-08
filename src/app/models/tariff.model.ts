// Doit rester synchronisé avec amisache-backend :
// src/liturgy/entities/tariff.entity.ts
// src/liturgy/dto/tariff.dto.ts
// src/liturgy/controllers/tariff.controller.ts

import { Church } from './church.model';
import { RequestTypeItem } from './request-type.model';

/**
 * Tarif d'une intention/d'un sacrement, publié par une église. Résolu avec
 * repli hiérarchique côté portail public (`GET /tariffs/resolve`) — ce
 * modèle-ci ne porte que les tarifs PROPRES à une église (pas la résolution).
 */
export interface Tariff {
  id: string;
  /** null : l'église ne fixe que le délai, le montant se résout plus haut */
  amount: string | null;
  /** Délai minimum (jours) — null : se résout plus haut, puis Type.minLeadDays */
  minLeadDays: number | null;
  active: boolean;
  churchId: string;
  church?: Church;
  typeId: string;
  type?: RequestTypeItem;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTariffDto {
  churchId: string;
  typeId: string;
  amount?: number;
  minLeadDays?: number;
}

export interface UpdateTariffDto {
  amount?: number | null;
  minLeadDays?: number | null;
  active?: boolean;
}

export interface ListTariffQuery {
  churchId?: string;
}
