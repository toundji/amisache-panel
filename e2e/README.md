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

## Projets Playwright

| Projet | Specs | Auth |
|---|---|---|
| `setup` | `auth.setup.ts` | se connecte une fois, sauve `storageState` dans `e2e/.auth/user.json` (gitignoré) |
| `chromium` | `smoke.spec.ts`, `login-form.spec.ts` | déconnecté |
| `chromium-auth` | `authenticated.spec.ts` | rejoue le `storageState` du projet `setup` (aucun login par test) |

| Fichier | Couverture |
|---|---|
| `smoke.spec.ts` | boot, redirections des guards (`/` → `/auth/login`, route protégée → `returnUrl`, wildcard), rendu page de connexion, absence d'erreur JS |
| `login-form.spec.ts` | validation formulaire (champs invalides, email mal formé, mot de passe court), bascule visibilité du mot de passe, erreur sur identifiants invalides (`POST /auth/login`) |
| `authenticated.spec.ts` | tableau de bord + navigation vers churches, arborescence, clergé, horaires, demandes, dons, moyens de paiement, groupes, publications |

## Identifiants

`authenticated.spec.ts` (et le projet `setup`) ne tournent que si :

```bash
E2E_EMAIL=... E2E_PASSWORD=... npm run e2e
```

Sans ça, `setup` + les 10 specs connectées sont `skipped` (exit 0).
La clé API back-office est celle déjà dans `environment.ts` — elle fonctionne
contre `https://api.nutito.org`.

## Dernier run (référence)

```
avec identifiants :  21 passed                     (~36 s)
sans identifiants :  10 passed, 11 skipped         (~13 s)
```
