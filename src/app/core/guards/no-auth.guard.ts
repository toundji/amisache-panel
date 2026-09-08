import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/']);
    }
    return true;
  }
}
