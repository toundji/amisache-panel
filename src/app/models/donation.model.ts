// Doit rester synchronisé avec amisache-backend :
// src/liturgy/entities/donation.entity.ts
// src/liturgy/dto/donation.dto.ts
// src/liturgy/controllers/donation.controller.ts

import { Church } from './church.model';
import { TypeItem } from './type.model';
import { User } from './user.model';

/**
 * Don spontané du fidèle (distinct de Request). Paiement toujours requis à
 * la création — self-service fidèle. Le back-office ne fait que consulter.
 */
export interface Donation {
  id: string;
  amount: string;
  date: string;
  churchId: string;
  userId: string;
  typeId: string;
  paymentId: string;
  church?: Church;
  user?: User;
  type?: TypeItem;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListDonationQuery {
  churchId?: string;
}
