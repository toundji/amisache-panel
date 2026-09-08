// Doit rester synchronisé avec SessionService.getUserSessions (nest-auth-base
// src/auth/services/session.service.ts) — une session = un équipement connecté.

export enum DeviceType {
  mobile = 'mobile',
  desktop = 'desktop',
  tablet = 'tablet',
  unknown = 'unknown',
}

export interface UserSessionInfo {
  id: string;
  deviceName: string;
  deviceType?: DeviceType;
  os?: string;
  browser?: string;
  ip?: string;
  lastActiveAt: string;
  createdAt: string;
}
