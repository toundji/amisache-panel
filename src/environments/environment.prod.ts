import { firebaseConfig } from './firebase';

export const environment = {
  production: true,
  apiUrl: 'https://api.nutito.org',
  apiKeyHeaderName: 'x-api-key',
  // Doit correspondre à API_KEY_BACK_OFFICE côté API — voir amisache-backend/.env.prod
  apiKey: 'votre_cle_back_office',
  firebase: firebaseConfig,
};
