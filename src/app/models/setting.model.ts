// Doit rester synchronisé avec nest-auth-base :
// src/shared/common.enum.ts (SettingType)
// src/content/entities/setting.entity.ts
// src/content/dto/setting.dto.ts

export enum SettingType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  json = 'json',
}

export const SETTING_TYPE_LABELS: Record<SettingType, string> = {
  [SettingType.string]: 'Texte',
  [SettingType.number]: 'Nombre',
  [SettingType.boolean]: 'Booléen',
  [SettingType.json]: 'JSON',
};

export interface Setting {
  id: string;
  key: string;
  value?: string | null;
  type: SettingType;
  category?: string;
  label?: string;
  description?: string;
  isPublic: boolean;
  isEditable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSettingDto {
  key: string;
  value?: string;
  type?: SettingType;
  category?: string;
  label?: string;
  description?: string;
  isPublic?: boolean;
  isEditable?: boolean;
}

export interface UpdateSettingDto {
  value?: string;
  type?: SettingType;
  category?: string;
  label?: string;
  description?: string;
  isPublic?: boolean;
  isEditable?: boolean;
}

export interface ListSettingAdminQuery {
  category?: string;
  search?: string;
}

// GET /settings/admin n'est pas paginé côté serveur (nombre de clés borné,
// contrairement aux utilisateurs/FAQ) — la pagination se fait côté client.
export interface PaginatedSettings {
  data: Setting[];
  total: number;
}
