// Doit rester synchronisé avec nest-auth-base :
// src/shared/common.enum.ts (UserRole, UserStatus)
// src/users/entities/user.entity.ts (User)

// Amisache : agent/investor (hérités du template) retirés, clergy ajouté —
// voir amisache-backend AMISACHE.md §5. clergy est un marqueur plateforme
// grossier ; le rôle ecclésial précis (curé, diacre...) et l'église
// concernée vivent dans ClergyMember, pas ici (clergy-member.model.ts).
export enum UserRole {
  user = 'user',
  manager = 'manager',
  admin = 'admin',
  engineer = 'engineer',
  clergy = 'clergy',
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

/** Projection minimale de GET /users/lookup?email= — voir UserService.lookupByEmail. */
export type UserLookup = Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'profile'>;

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
