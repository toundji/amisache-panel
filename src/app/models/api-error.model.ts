// Doit rester synchronisé avec le backend Amisache :
// amisache-backend/src/core/entities/api-error.entity.ts

export interface ApiErrorLog {
  id: string;
  errorId: string;
  statusCode: number;
  method: string;
  path: string;
  userEmail?: string;
  ip?: string;
  message: string;
  stack?: string;
  createdAt: string;
}

export interface ListApiErrorsQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedApiErrors {
  data: ApiErrorLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
