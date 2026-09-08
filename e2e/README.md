# Tests end-to-end — panel Amisache

Playwright (`@playwright/test`), navigateur Chromium.

## Lancer

```bash
npm run e2e            # ligne de commande + rapport HTML (playwright-report/)
npm run e2e:ui         # mode interactif
npm run e2e:headed     # navigateur visible
npm run e2e:report     # rouvrir le dernier rapport HTML
```

`playwright.config.ts` démarre `ng serve` sur le port **4200** (réutilise un
serveur déjà en place hors CI). Surcharge possible : `E2E_PORT`, `E2E_BASE_URL`.

## Fichiers

| Fichier | Couverture | Dépend de l'API ? |
|---|---|---|
| `smoke.spec.ts` | boot, redirections des guards (`/` → `/auth/login`, route protégée → `returnUrl`, wildcard), rendu de la page de connexion, absence d'erreur JS | non |
| `login-form.spec.ts` | validation du formulaire (champs invalides, email mal formé, mot de passe court), bascule visibilité du mot de passe, erreur sur identifiants invalides | l'erreur sur identifiants invalides touche `POST /auth/login` |
| `authenticated.spec.ts` | parcours connecté : dashboard, entités, arborescence, horaires, moyens de paiement, publications | **oui** — sauté tant que `E2E_EMAIL` / `E2E_PASSWORD` absents |

## Parcours connecté

La config versionnée pointe sur `https://api.nutito.org` avec une **clé API
placeholder** (`environment.ts`) → pas d'accès réel à l'API. Pour exécuter
`authenticated.spec.ts` :

1. servir un build avec la vraie clé API back-office injectée ;
2. fournir un compte : `E2E_EMAIL=… E2E_PASSWORD=… npm run e2e`.

Le compte de test back-end (`seed-test-user.ts`, `SEED_TEST_USER_EMAIL`) est le
candidat naturel.

## Dernier run (référence)

```
10 passed, 6 skipped  (~37 s, Chromium)
```

Les 6 `skipped` = `authenticated.spec.ts`, en attente d'identifiants.
