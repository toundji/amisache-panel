// Doit rester synchronisé avec amisache-backend :
// src/community/community.enum.ts (MediaKind, MediaProvider)
// src/community/entities/media.entity.ts
// src/community/dto/media.dto.ts

export enum MediaKind {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
}

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  [MediaKind.VIDEO]: 'Vidéo',
  [MediaKind.IMAGE]: 'Image',
  [MediaKind.AUDIO]: 'Audio',
};

export enum MediaProvider {
  YOUTUBE = 'YOUTUBE',
  UPLOAD = 'UPLOAD',
  FACEBOOK = 'FACEBOOK',
  OTHER = 'OTHER',
}

export const MEDIA_PROVIDER_LABELS: Record<MediaProvider, string> = {
  [MediaProvider.YOUTUBE]: 'YouTube',
  [MediaProvider.UPLOAD]: 'Fichier hébergé',
  [MediaProvider.FACEBOOK]: 'Facebook',
  [MediaProvider.OTHER]: 'Autre',
};

/** Média rattaché à une publication (0..*). */
export interface Media {
  id: string;
  kind: MediaKind;
  provider: MediaProvider;
  url: string;
  publicationId: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddMediaDto {
  kind: MediaKind;
  provider: MediaProvider;
  url: string;
  publicationId: string;
}
