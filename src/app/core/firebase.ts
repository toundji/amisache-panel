import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

import { environment } from '../../environments/environment';

/**
 * Initialisation unique du SDK Firebase (connexion Google).
 * Le backend vérifie l'idToken renvoyé ici via le Firebase Admin SDK
 * (POST /auth/google). Voir amisache-backend/src/auth/services/auth.service.ts.
 */
export const firebaseApp: FirebaseApp = initializeApp(environment.firebase);
export const firebaseAuth: Auth = getAuth(firebaseApp);

/** Provider Google avec sélection de compte forcée à chaque connexion. */
export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
