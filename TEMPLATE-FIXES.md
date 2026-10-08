# TEMPLATE-FIXES.md

**Sas des corrections à remonter au template `UNIFIED AUTH`.**

Amisache **dérive** du socle. Quand on corrige un bug du socle en travaillant ici, la correction
est appliquée localement **et** notée ici, pour être **portée dans le repo template** — afin que
les autres projets dérivés (ambassade, atcrypto…) en bénéficient. Ce fichier est un **pense-bête
temporaire** : une entrée y vit tant qu'elle n'a pas été reportée upstream.

---

## Critère d'entrée (les deux conditions ensemble)

Une correction va ici **si et seulement si** :

1. **Elle touche le socle** — `shared/`, `database/`, `core/`, `utils/`, `mail/`, `auth/`, `users/`
   (pas les modules Amisache `address/`, `church/`, `liturgy/`, `payment/`, `community/`,
   ni `content/`/`chat/`/`notifications/` adaptés).
2. **Elle est générique** — aucune logique métier Amisache. Si le fix contient quoi que ce soit de
   paroissial, il **reste local** et ne remonte pas.

> Une fois la correction **reportée dans le template**, elle se consigne dans la mémoire **du
> template** (`CLAUDE.md` / `auth.md` du repo socle) — le socle a sa propre doc. Ici, on passe
> simplement l'entrée en `✅ Remontée` (ou on l'archive).

---

## À remonter

_(aucune pour l'instant)_

<!-- Format d'une entrée — copier-coller le squelette ci-dessous :

### [ID] — Titre court du correctif
- **Statut** : 🔴 À remonter
- **Couche/fichier socle** : ex. `core/guards/jwt-auth.guard.ts`
- **Symptôme** : ce qui cassait, observable.
- **Cause** : la vraie raison.
- **Correctif** : ce qui a été changé (générique, sans métier Amisache).
- **Test** : le test qui prouve le fix (à remonter avec, si possible).
- **Date** : AAAA-MM-JJ
-->

---

## Remontées (historique)

### FIX-001 — Référence d'erreur (`errorId`) absente du message affiché  ✅ Remontée le 2026-09-26
- **Couche/fichier socle** : `core/interceptors/error.interceptor.ts`
- **Symptôme** : un 5xx affichait `msg` sans aucun moyen de le relier au log serveur
  (le backend, `nest-auth`, ajoute désormais un `errorId` aux réponses 5xx).
- **Correctif** : si `error.error.errorId` est présent, `« (réf. xxxx) »` est ajouté au
  `msg`, sans changer le comportement existant (redirection sur 401 inchangée).
- **Reportée dans le template** : `angular-panel` — fichier copié à l'identique,
  `ng build` propre.
- **Date** : 2026-09-26

### FIX-002 — Page « Erreurs serveur » (consulter/supprimer les 5xx tracés)  ✅ Remontée le 2026-09-26
- **Couche/fichier socle** : nouveaux `models/api-error.model.ts`,
  `services/api-error.service.ts`, `components/system/api-error-list/`, route
  `/api-errors`, entrée sidebar « Système ».
- **Contexte** : le backend (`nest-auth`, FEAT-002) trace les 5xx dans `api_errors`
  (`GET /api-errors/admin`, `DELETE /api-errors/:id`) — cette page les consomme :
  pagination serveur (comme `UserListComponent`), pile complète dans une Swal,
  suppression une fois l'erreur corrigée.
- **Reportée dans le template** : `angular-panel` — fichiers copiés à l'identique,
  route et entrée sidebar ajoutées, `ng build` propre.
- **Date** : 2026-09-26

<!-- Quand une entrée est portée dans le template, la déplacer ici :

### [ID] — Titre  ✅ Remontée le AAAA-MM-JJ
- Couche/fichier socle : …
- Reportée dans le template : commit / PR / note dans le CLAUDE.md du socle.
-->

---

### Exemple (illustratif — à supprimer au premier vrai correctif)

### FIX-001 — `UserSession` : index unique composite manquant
- **Statut** : ✅ Remontée le 2026-08-30
- **Couche/fichier socle** : `auth/entities/user-session.entity.ts`
- **Symptôme** : `POST /auth/refresh` renvoyait `Duplicate entry … refresh_token_hash`.
- **Cause** : `upsert(['deviceFingerprint','userId'])` sans index unique composite →
  l'upsert dégénérait en INSERT, sessions dupliquées par appareil.
- **Correctif** : `@Index(['userId','deviceFingerprint'], { unique: true })` + migration.
- **Test** : login deux fois même appareil → une seule ligne de session ; refresh OK.
- **Date** : 2026-08-30
- _(cet exemple est repris de `auth.md` uniquement pour montrer le format attendu)_
