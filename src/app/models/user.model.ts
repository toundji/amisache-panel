// Doit rester synchronisé avec nest-auth-base :
// src/shared/common.enum.ts (UserRole, UserStatus)
// src/users/entities/user.entity.ts (User)

export enum UserRole {
  user = 'user',
  agent = 'agent',
  investor = 'investor',
  manager = 'manager',
  admin = 'admin',
  engineer = 'engineer',
}

export enum UserStatus {
  active = 'active',
  unverified = 'unverified',
  disabled = 'disabled',
  blocked = 'blocked',
  deleted = 'deleted',
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profile?: string;
  status?: UserStatus;
  roles?: UserRole[];
  code?: string;
  idCountry?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ListUsersSortBy = 'firstName' | 'lastName' | 'email' | 'status' | 'createdAt';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  sortBy?: ListUsersSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
