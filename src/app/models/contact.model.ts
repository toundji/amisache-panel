// Doit rester synchronisé avec nest-auth-base :
// src/shared/common.enum.ts (ContactMessageStatus)
// src/contact/entities/contact-message.entity.ts (ContactMessage)
// src/contact/dto/contact.dto.ts

export enum ContactMessageStatus {
  new = 'new',
  read = 'read',
  treated = 'treated',
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: ContactMessageStatus;
  adminNote?: string;
  ip?: string;
  readAt?: string;
  answeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ListContactMessagesSortBy = 'createdAt' | 'status';

export interface ListContactMessagesQuery {
  page?: number;
  limit?: number;
  status?: ContactMessageStatus;
  search?: string;
  sortBy?: ListContactMessagesSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedContactMessages {
  data: ContactMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
