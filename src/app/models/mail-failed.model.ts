// Doit rester synchronisé avec MailFailedJob / MailJobType (nest-auth-base
// src/mail/entities/mail-failed.entity.ts, src/mail/mail.types.ts).

export enum MailJobType {
  CONFIRM_EMAIL = 'confirm-email',
  RESET_PASSWORD = 'reset-password',
  RESET_PIN = 'reset-pin',
  RESET_LINK = 'reset-link',
}

export enum MailFailedStatus {
  pending = 'pending',
  abandoned = 'abandoned',
}

export const MAIL_JOB_TYPE_LABELS: Record<MailJobType, string> = {
  [MailJobType.CONFIRM_EMAIL]: 'Confirmation email',
  [MailJobType.RESET_PASSWORD]: 'Réinitialisation mot de passe',
  [MailJobType.RESET_PIN]: 'Réinitialisation PIN',
  [MailJobType.RESET_LINK]: 'Lien de réinitialisation',
};

export interface MailFailedJob {
  id: string;
  type: MailJobType;
  to: string;
  payload: Record<string, unknown>;
  lastError?: string;
  attempts: number;
  status: MailFailedStatus;
  createdAt: string;
  updatedAt: string;
}
