import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

/**
 * Sur 401, la session est invalide (token expiré/révoqué) : on nettoie
 * l'état local et on renvoie vers le login. On laisse l'erreur d'origine
 * remonter pour que le composant appelant puisse toujours l'afficher.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        authService.clearSession();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
