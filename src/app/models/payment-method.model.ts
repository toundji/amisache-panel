// Doit rester synchronisé avec amisache-backend :
// src/payment/entities/payment-method.entity.ts
// src/payment/dto/payment-method.dto.ts
// src/payment/controllers/payment-method.controller.ts

import { Church } from './church.model';
import { PaymentOperator } from './payment.model';

/** Coordonnées d'encaissement Mobile Money publiées par une église. */
export interface PaymentMethod {
  id: string;
  operator: PaymentOperator;
  phone: string;
  accountName: string;
  /** Désactivée = ne doit plus apparaître dans les sélecteurs de paiement. */
  active: boolean;
  churchId: string;
  church?: Church;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentMethodDto {
  operator: PaymentOperator;
  phone: string;
  accountName: string;
  churchId: string;
}

export interface UpdatePaymentMethodDto {
  operator?: PaymentOperator;
  phone?: string;
  accountName?: string;
  active?: boolean;
}

/**
 * `churchId` est marqué requis côté Swagger. On le garde optionnel côté
 * panel pour une vue admin transversale, avec un filtre église visible.
 * `activeOnly` par défaut true côté serveur → on passe `false` pour tout voir.
 */
export interface ListPaymentMethodQuery {
  churchId?: string;
  activeOnly?: boolean;
}
