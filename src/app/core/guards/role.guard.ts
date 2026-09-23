import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ClergyContextService } from '../../services/clergy-context.service';

/**
 * Réserve une route à admin/engineer — sections qui n'ont aucun sens à l'échelle
 * d'une seule église (Utilisateurs, structure ecclésiale, config plateforme).
 * Un compte clergy sans ces rôles est renvoyé au tableau de bord.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private readonly clergyContext = inject(ClergyContextService);
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    if (this.clergyContext.isFullAccess()) {
      return true;
    }
    return this.router.createUrlTree(['/']);
  }
}
