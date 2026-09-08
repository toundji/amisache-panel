# Angular Panel

Template d'administration Angular 19 (standalone, Bootstrap 5) conçu pour consommer
directement l'API [nest-auth-base](../nest-auth-base) (JWT double-token, sessions
multi-équipements, gestion utilisateurs). Layout, système de design et composants sont
repris de la branche `ambassade` du back-office `ambassade-benin-ru` (la version à jour —
`master` est en retard), débarrassés du code métier spécifique et du branding Bénin pour
ne garder que la partie générique : authentification, layout admin, gestion des comptes,
pattern de sauvegarde champ par champ.

## Cloner le projet

Ce dépôt est un **template** : chaque nouveau projet part d'un clone renommé, pas d'un
fork partagé.

### 1. Cloner et renommer

```bash
git clone https://github.com/toundji/amisache-panel.git nameProject
cd nameProject
rm -rf .git
git init
```

Sous PowerShell (Windows) :

```powershell
git clone https://github.com/toundji/amisache-panel.git nameProject
cd nameProject
Remove-Item -Recurse -Force .git
git init
```

Renommer ensuite le template pour qu'il porte le nom du projet réel :

- `package.json` : champ `"name"` (`amisache-panel` → `mon-projet`)
- `src/index.html` : `<title>` (`AngularPanel` est un placeholder)
- `README.md` / `CLAUDE.md` : remplacer les mentions « Angular Panel » par le nom réel
  du projet
- Voir aussi la section [Identité visuelle](CLAUDE.md) (couleurs, favicon, logos) à
  adapter avant mise en production

### 2. Configurer l'environnement

Pas de `.env` ici — la configuration passe par `src/environments/environment.ts` (dev)
et `environment.prod.ts` (prod), déjà versionnés avec des valeurs placeholder à adapter
(voir [Configuration](#configuration) ci-dessous) :

```ts
export const environment = {
  apiUrl: "http://localhost:3000", // base URL de l'API nest-auth-base
  apiKeyHeaderName: "x-api-key",
  apiKey: "votre_cle_back_office", // doit correspondre à API_KEY_BACK_OFFICE côté API
};
```

### 3. Installer les dépendances

```bash
npm install
npm start   # ng serve
```

## Ce que contient le template

- **Auth** (`components/auth/login`, `services/auth.service.ts`, `core/guards/*`) — écran
  de login split-panel, stockage du token (localStorage si "se souvenir de moi", sinon
  sessionStorage), garde de route, déconnexion (courante ou tous équipements).
- **Layout admin** (`shared/layout/*`) — topbar dégradée + sidebar rétractable (desktop) /
  glissante (mobile), profil réel (initiales, nom, rôle) via `AuthService`, shell
  `dashboard-layout` avec `<router-outlet>`.
- **Système de design** (`assets/scss/_variables|_base|_bootstrap-overrides|_utilities|_components.scss`)
  — Bootstrap compilé depuis les sources via `@use ... with (...)` (pas de CSS dupliqué),
  palette neutre à remplacer par l'identité du projet. Composants réutilisables : page-header,
  stat-card, status-badge, role-badge, filter-bar, data-table-wrapper, skeleton, empty-state,
  detail-grid/quick-info pour les pages de détail.
- **Pagination** (`shared/pagination/`) — `PaginationService` + `PaginationComponent`
  génériques, utilisables en pagination client (`slice()`) ou serveur (`setTotalOnly()` +
  fetch sur changement de page). La liste Utilisateurs utilise le mode serveur, car
  `GET /users` est réellement paginé côté nest-auth-base.
- **Avatar** (`shared/avatar/`) — `UserAvatarComponent` (photo ou initiales, tailles
  xs/sm/md/lg) basé sur `User.profile` (URL déjà prête, cf. `ApiFsUtils.pathToUrl` côté API).
- **Colonnes configurables** (`shared/column-visibility/`) — `ColumnVisibilityService` +
  `ColumnVisibilityComponent` (bouton "Colonnes" en dropdown à cases à cocher), génériques
  et sans connaissance d'une entité en particulier : chaque tableau déclare sa propre liste
  de colonnes masquables (`ColumnDef[]`) et sa propre clé de storage via
  `columnVisibility.init(storageKey, columns)`, persisté en localStorage
  (`columns:<storageKey>`). Une future liste avec des colonnes issues d'une sous-entité
  liée n'a qu'à les ajouter à sa propre liste — le service n'a pas à évoluer.
- **FieldSaveMixin** (`shared/mixins/field-save.mixin.ts`) — sauvegarde champ par champ sur
  clic explicite (jamais sur blur/change), avec retour visuel (bordure orange → spinner →
  coche verte 2s). Utilisé sur le statut utilisateur (`user-detail`) et le profil
  (prénom/nom). Les rôles (tableau, pas un champ scalaire) suivent le même langage visuel
  via un pattern "champs groupés" manuel dans `user-detail.component.ts`.
- **Utilisateurs** (`components/users/*`, `services/user.service.ts`) — liste paginée
  serveur avec filtres (statut, rôle, recherche), détail avec changement de statut/rôles
  (FieldSaveMixin) et réinitialisation de mot de passe admin, suppression. Reflète
  exactement les routes de `UserController`. Création (`/users/new`) : `UserController`
  n'expose pas de création admin, donc `UserService.createUser` réutilise
  `POST /auth/register` (self-service) en ignorant volontairement les tokens renvoyés —
  le compte créé est en rôle `user` / statut `unverified`, à ajuster ensuite depuis le
  détail.
- **Navigation** — chaque page a un bouton **Actualiser** (recharge sans re-déclencher le
  skeleton, juste l'icône qui tourne) ; les pages de détail/création ont un bouton
  **Retour** vers la liste ; la liste Utilisateurs a la pagination standard
  (`app-pagination`, avec son bouton **Suivant**).
- **Sessions** (`components/sessions`, `services/session.service.ts`) — liste des
  équipements connectés de l'utilisateur courant, révocation individuelle, déconnexion
  globale. Reflète `GET/DELETE /auth/sessions`.
- **Profil** (`components/profile`) — prénom/nom en sauvegarde champ par champ
  (FieldSaveMixin), changement de mot de passe, upload de photo de profil.
- **Erreurs de formulaire** (`shared/field-errors`, `core/utils/form.util.ts`) — combine
  erreurs de validation Angular et le format d'erreur serveur de nest-auth-base
  (`{ msg, validations: { champ: [message] } }`).

## Configuration

`src/environments/environment.ts` (dev) et `environment.prod.ts` (prod) :

```ts
export const environment = {
  apiUrl: "http://localhost:3000", // base URL de l'API nest-auth-base
  apiKeyHeaderName: "x-api-key", // doit correspondre à API_KEY_HEADER_NAME côté API
  apiKey: "votre_cle_back_office", // doit correspondre à API_KEY_BACK_OFFICE côté API
};
```

Sans clé API valide de type `back_office`, `AuthService.assertClientAccess` refusera la
connexion même avec des identifiants corrects (seuls les rôles admin/manager/engineer
peuvent se connecter depuis un client `back_office`).

## Commandes

```bash
npm install
npm start            # ng serve
npm run build         # build dev
npm run build -- --configuration production
npm test              # karma + Chrome headless (karma.conf.js fournit un launcher --no-sandbox pour CI)
```

## Étendre le template

- Ajouter un module métier : créer `components/<domaine>/`, son service HTTP dans
  `services/`, son entrée dans `app.routes.ts` (sous le layout `DashboardLayoutComponent`)
  et dans `menuItems` de `shared/layout/sidebar/sidebar.component.ts`.
- Étendre le modèle `User` (`models/user.model.ts`) si le projet backend étend l'entité
  `User` de nest-auth-base avec des champs additionnels.
- Remplacer la palette neutre de `src/assets/scss/variables.scss` par l'identité visuelle
  du projet.
