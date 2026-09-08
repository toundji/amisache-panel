// Doit rester synchronisé avec le format d'erreur uniforme de nest-auth-base
// (voir CLAUDE.md § Erreurs) : { statusCode, msg, customCode, url, timestamp, validations? }

export interface ServerError {
  statusCode?: number;
  msg: string;
  customCode?: number;
  url?: string;
  timestamp?: string;
  validations?: Record<string, string[] | Record<string, any>>;
}
