// Doit rester synchronisé avec amisache-backend :
// src/liturgy/entities/tariff.entity.ts
// src/liturgy/dto/tariff.dto.ts
// src/liturgy/controllers/tariff.controller.ts

import { Church } from './church.model';
import { TypeItem } from './type.model';

/**
 * Tarif d'une intention/d'un sacrement, publié par une église. Résolu avec
 * repli hiérarchique côté portail public (`GET /tariffs/resolve`) — ce
 * modèle-ci ne porte que les tarifs PROPRES à une église (pas la résolution).
 */
export interface Tariff {
  id: string;
  amount: string;
  active: boolean;
  churchId: string;
  church?: Church;
  typeId: string;
  type?: TypeItem;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTariffDto {
  churchId: string;
  typeId: string;
  amount: number;
}

export interface UpdateTariffDto {
  amount?: number;
  active?: boolean;
}

export interface ListTariffQuery {
  churchId?: string;
}
