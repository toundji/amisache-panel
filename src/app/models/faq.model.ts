// Doit rester synchronisé avec nest-auth-base :
// src/shared/common.enum.ts (FaqCategory)
// src/content/entities/faq.entity.ts
// src/content/dto/faq.dto.ts

// Placeholder générique — à adapter (valeurs, libellés) selon le domaine
// métier de chaque projet dérivé, cf. shared/common.enum.ts côté API.
export enum FaqCategory {
  general = 'general',
  account = 'account',
  billing = 'billing',
  security = 'security',
  technical = 'technical',
}

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  [FaqCategory.general]: 'Général',
  [FaqCategory.account]: 'Compte',
  [FaqCategory.billing]: 'Facturation',
  [FaqCategory.security]: 'Sécurité',
  [FaqCategory.technical]: 'Technique',
};

export interface Faq {
  id: string;
  question: string;
  answer?: string;
  category?: FaqCategory;
  sortOrder: number;
  // Renseigné automatiquement dès que `answer` est non vide — null/undefined = brouillon.
  answeredAt?: string;
  // Renseigné manuellement pour masquer une FAQ même répondue.
  hiddenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFaqDto {
  question: string;
  answer?: string;
  category?: FaqCategory;
  sortOrder?: number;
}

export interface UpdateFaqDto {
  question?: string;
  answer?: string;
  /** null → retire la catégorie */
  category?: FaqCategory | null;
  sortOrder?: number;
  /** true → masque la FAQ même répondue, false → la republie (hiddenAt) */
  hidden?: boolean;
}

export interface ListFaqAdminQuery {
  page?: number;
  limit?: number;
  category?: FaqCategory;
  /** Filtrer sur la présence d'une réponse (answeredAt renseigné ou non) */
  answered?: boolean;
  search?: string;
}

export interface PaginatedFaqs {
  data: Faq[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
