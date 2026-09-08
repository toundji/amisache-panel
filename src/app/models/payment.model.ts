// Doit rester synchronisé avec amisache-backend :
// src/payment/payment.enum.ts (PaymentOperator, PaymentStatus)
// src/payment/entities/payment.entity.ts
// src/payment/dto/payment.dto.ts

import { ClergyMember } from './clergy-member.model';
import { PaymentMethod } from './payment-method.model';

export enum PaymentOperator {
  MTN_MOMO = 'MTN_MOMO',
  MOOV_MONEY = 'MOOV_MONEY',
  BANK_CARD = 'BANK_CARD',
}

export const PAYMENT_OPERATOR_LABELS: Record<PaymentOperator, string> = {
  [PaymentOperator.MTN_MOMO]: 'MTN MoMo',
  [PaymentOperator.MOOV_MONEY]: 'Moov Money',
  [PaymentOperator.BANK_CARD]: 'Carte bancaire',
};

export enum PaymentStatus {
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.SUBMITTED]: 'Soumis',
  [PaymentStatus.CONFIRMED]: 'Confirmé',
  [PaymentStatus.REJECTED]: 'Rejeté',
};

/**
 * Paiement déclaratif, mutualisé entre Request et Donation. Ne porte ni
 * churchId ni userId directs : la paroisse se déduit de `paymentMethod`,
 * le payeur de l'entité hôte.
 */
export interface Payment {
  id: string;
  amount: string;
  operator: PaymentOperator;
  reference: string;
  receiptImage: string;
  paidAt: string;
  status: PaymentStatus;
  confirmedAt?: string;
  paymentMethodId: string;
  confirmedById?: string;
  paymentMethod?: PaymentMethod;
  confirmedBy?: ClergyMember;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Confirmer / rejeter — jamais repasser à SUBMITTED (§4.7). */
export interface UpdatePaymentStatusDto {
  status: PaymentStatus.CONFIRMED | PaymentStatus.REJECTED;
}
