import { HttpParams } from '@angular/common/http';

/**
 * Objet de requête → HttpParams, en ignorant les valeurs vides
 * (`undefined`, `null`, `''`) : un filtre non renseigné ne doit pas partir
 * comme `?status=` vers l'API.
 */
export function toHttpParams(query: object): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  });
  return params;
}
