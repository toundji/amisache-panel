import { User } from './user.model';

// Doit rester synchronisé avec nest-auth-base src/auth/dto/auth.dto.ts

export interface LoginCredentials {
  username: string; // email
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
