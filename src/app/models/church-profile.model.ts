// Doit rester synchronisé avec amisache-backend :
// src/church/entities/church-profile.entity.ts
// src/church/dto/church-profile.dto.ts

export interface ChurchProfile {
  id: string;
  description?: string;
  leaderMessage?: string;
  churchId: string;
}

export interface UpsertChurchProfileDto {
  description?: string;
  leaderMessage?: string;
}
