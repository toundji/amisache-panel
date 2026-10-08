import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

/**
 * Sur 401, la session est invalide (token expiré/révoqué) : on nettoie
 * l'état local et on renvoie vers le login. On laisse l'erreur d'origine
 * remonter pour que le composant appelant puisse toujours l'afficher.
 * Sur un 5xx, l'`errorId` renvoyé par le backend (même valeur que dans son
 * log) est ajouté au `msg`, pour pouvoir retrouver l'erreur côté serveur.
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
      const body = error.error;
      if (body?.errorId && typeof body.msg === 'string') {
        body.msg = `${body.msg} (réf. ${body.errorId})`;
      }
      return throwError(() => error);
    }),
  );
};
