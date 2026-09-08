import { HttpHeaders, HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { bearerTokenKey } from '../utils/storage-keys';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let authReq = req.clone();

  // 1. Préfixer l'URL de base (les URLs absolues passent inchangées)
  if (!/^https?:\/\//.test(authReq.url)) {
    const path = authReq.url.replace(/^\//, '');
    authReq = authReq.clone({ url: `${environment.apiUrl}/${path}` });
  }

  // 2. Token d'accès
  const token = localStorage.getItem(bearerTokenKey) ?? sessionStorage.getItem(bearerTokenKey);

  // 3. Content-Type selon le type de corps + clé API + Authorization
  let headers = new HttpHeaders().set(environment.apiKeyHeaderName, environment.apiKey);

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (authReq.body instanceof FormData) {
    // Laisser le navigateur fixer le Content-Type (boundary multipart)
    headers = headers.set('Accept', 'application/json');
  } else {
    headers = headers.set('Content-Type', 'application/json').set('Accept', 'application/json');
  }

  return next(authReq.clone({ headers }));
};
