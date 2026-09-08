// ─────────────────────────────────────────────────────────────────────────────
// avatar.helper.ts — Helper centralisé pour les URLs d'avatar.
// nest-auth-base stocke `User.profile` comme une URL déjà prête à l'emploi
// (ApiFsUtils.pathToUrl préfixe avec API_ADDRESS côté backend) — pas besoin de
// reconstruire une URL de miniature ici, contrairement à un backend qui
// générerait ses propres thumbnails par convention de nommage.
// ─────────────────────────────────────────────────────────────────────────────

export interface HasAvatar {
  profile?: string | null;
}

export class AvatarHelper {
  static readonly defaultUrl = '/images/default-avatar.png';

  static profileUrl(user: HasAvatar): string | null {
    return user?.profile || null;
  }

  static initials(firstName?: string, lastName?: string, fallback?: string): string {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    if (f || l) return (f + l).toUpperCase();
    return fallback?.[0]?.toUpperCase() || '?';
  }
}
