# EVOLUTION.md

**Journal vivant d'Amisache** — décisions d'architecture, avancement, prochaines étapes.
Sa forme s'inspire de `src/auth/auth.md` (État actuel / Historique / Points d'attention),
mais son périmètre est **le projet Amisache**, pas un module.

> **Discipline (non négociable)** : ce fichier se **lit en début de session** et se
> **complète en fin de session**. Un journal négligé ment. Toute décision structurante,
> tout avancement notable, tout changement de cap y est consigné, daté, en une entrée.

---

## État actuel

**Phase : conception terminée, pré-implémentation.** Aucun code métier écrit à ce jour ;
le socle `UNIFIED AUTH` est en place et sert de base.

Acquis :
- **Modèle de données finalisé** → `diagramme-classe-paroisses.mermaid` / `.svg` (source de vérité).
- **Découpage en modules arrêté** → voir `AMISACHE.md` §2–§3 (6 modules Amisache + modules du
  socle gardés/adaptés).
- **Réconciliation avec le template cadrée** → `AMISACHE.md` §4–§7.

Prochaines étapes ouvertes :
- Modèle de `content/` à obtenir → fermer la frontière `content/`⇄`community/` (`AMISACHE.md` §6.2).
- Génération de l'arborescence NestJS via Claude Code, dans l'ordre `AMISACHE.md` §9.

---

## Historique des décisions

> Format d'une entrée : `### AAAA-MM-JJ — Titre court` puis **Décision**, **Pourquoi**,
> et si utile **Conséquences** (fichiers touchés, invariantes à tenir).

### 2026-09-21 — Chat : temps réel via Socket.io (`ChatSocketService`)
- **Décision** : demandé explicitement (« ajouter le websocket pour que ce soit
  instantané »), en même temps que côté backend et `amisache-client` (voir
  `EVOLUTION.md` backend, même date, pour le détail du `ChatGateway`). Nouveau
  `socket.io-client` + `services/chat-socket.service.ts` — connexion JWT au
  namespace `/chat` (le panel n'a jamais de flux invité, contrairement au
  portail public).
  - **`ConversationDetailComponent`** : rejoint `conversation:{id}` à l'entrée
    sur la page, quitte à la sortie. Écoute `message:new` (délégué à un nouveau
    `ChatService.receiveMessage`, déduplique contre l'ajout optimiste de
    l'expéditeur), `message:deleted` (`receiveMessageUpdate`), `conversation:read`
    (`receiveReadReceipt` — marque localement `readAt` sur mes messages, alimente
    directement le badge ✓✓ déjà existant dans le template, aucun nouveau
    marqueur visuel nécessaire), et `typing` (indicateur 3 points animés).
    Indicateur de frappe émis sur `(input)` du textarea (2s d'inactivité avant
    extinction), coupé explicitement à l'envoi.
  - **`ConversationListComponent`** — fermeture explicite du trou identifié
    avant d'implémenter (un compte clergé pur, pas admin/engineer, n'est jamais
    dans la room `admin:chat` où le backend diffuse `conversation:updated`) :
    la liste rejoint désormais la room de **chaque conversation actuellement
    affichée** (`effect()` qui diffe la page courante contre les rooms déjà
    jointes) — un clergé n'est autorisé à rejoindre que les conversations dont
    il est déjà participant (`myConversations`), ce qui correspond exactement
    à ce qu'il voit ; un admin/engineer reçoit de toute façon tout via
    `admin:chat`, rejoindre en plus les rooms de sa page reste inoffensif.
    `conversation:updated` patch en place la ligne concernée
    (`ChatService.patchConversationSummary`, nouveau) si elle est déjà dans la
    liste ; sinon, un rechargement silencieux **debattu 800ms**
    (`scheduleSilentReload`, réutilise le `reloadTrigger`/l'`effect()` de
    rechargement déjà en place — pas de logique de liste dupliquée) couvre le
    cas d'une conversation nouvellement ouverte par un visiteur.
- **Pourquoi** : demandé explicitement ; portée de `ConversationListComponent`
  confirmée avec l'utilisateur (option "ferme aussi le trou clergé-non-admin"
  choisie explicitement plutôt que le minimum admin/engineer seul).
- **Conséquences** : `ng build` propre. **Non vérifié en conditions réelles**
  cette session — même limitation que le backend/le portail (pas d'accès
  réseau à `api.nutito.org` depuis cette machine) : à vérifier contre un
  backend réellement démarré avant de considérer la fonctionnalité livrée.

### 2026-09-20 — Fix mobile : « Dernier message » coincé à 60% de largeur en carte
- **Décision** : demandé explicitement (« la liste à 50% en mobile ne fait pas un bon
  design ») — vérification visuelle (Puppeteer, viewport 390px) confirmée avec
  l'utilisateur avant de coder. Cause : le motif carte du panel (`_components.scss`
  `.data-table--cards`, documenté dans `CLAUDE.md` § Rendu mobile, **partagé par
  toutes les listes** — utilisateurs, paroisses, etc.) met chaque cellule en grille
  intitulé/valeur `minmax(5.5rem, 40%) 1fr` — correct pour une valeur courte (statut,
  date), mais coince un texte long (aperçu du dernier message) dans la colonne de
  droite (~60%) au lieu de profiter de toute la largeur de la carte.
- **Portée du fix, tranchée avec l'utilisateur** : ne pas toucher au ratio global de
  la grille (impact sur toutes les listes existantes) — nouvelle classe partagée
  **`.cell-wide`** dans `_components.scss` (juste après `.cell-title`) : la cellule
  passe en `display: block` (comme `.cell-title`, mais sans masquer l'intitulé —
  `::before` mis en `display: block` pour l'empiler au-dessus plutôt qu'à côté), value
  en pleine largeur en dessous. Appliquée à la seule colonne « Dernier message » de
  `ConversationListComponent` (`class="cell-wide text-muted"`) — réutilisable telle
  quelle par toute future colonne à texte long sur une autre liste, zéro risque sur les
  listes déjà existantes (nouvelle classe, opt-in).
- **Pourquoi** : demandé explicitement, diagnostic confirmé par l'utilisateur avant
  d'écrire le CSS (question posée : portée limitée à cette colonne vs changement
  global du ratio — a choisi la portée limitée).
- **Conséquences** : `ng build` propre. Vérifié en mobile 390px (avant : aperçu du
  dernier message confiné à la colonne de droite ; après : pleine largeur de la carte,
  intitulé « DERNIER MESSAGE » au-dessus) — Statut/Mode/Le inchangés (toujours
  intitulé/valeur côte à côte, comportement voulu pour ces champs courts).

### 2026-09-20 — Fix : la liste des conversations n'affichait rien
- **Découverte** : signalé par l'utilisateur (« dans le panel je ne vois aucun
  message ») — `ConversationListComponent` appelait `ChatService.myConversations()`
  (`GET /chat/conversations`), qui ne renvoie que les conversations où l'utilisateur
  connecté est **participant actif**. Les conversations ouvertes par la bulle publique
  du portail (visiteur anonyme) n'ont jamais d'admin/clergé comme participant tant
  qu'aucun handoff n'a eu lieu — la liste était donc systématiquement vide pour ce cas
  d'usage, sans erreur visible. Voir `amisache-backend` EVOLUTION.md, même date, pour
  le nouvel endpoint `GET /chat/conversations/admin` qui corrige ça côté serveur.
- **Décision** : `ChatService.listAdmin()` (nouveau, miroir de `myConversations`, même
  méthode privée `fetchConversations` factorisée pour les deux) appelle ce nouvel
  endpoint. `ConversationListComponent` bascule dessus quand
  `ClergyContextService.isFullAccess()` (déjà utilisé ailleurs dans le panel pour la
  distinction admin/clergé) — un compte admin/engineer voit donc toutes les
  conversations, un compte clergé pur reste sur les siennes (`myConversations`,
  comportement inchangé — pas de scoping par paroisse pertinent ici, ces conversations
  n'appartiennent à aucune église).
- **Pourquoi** : correction directe d'un défaut réel signalé par l'utilisateur.
- **Conséquences** : `ng build` propre. Vérifié en HTTP live côté backend (voir
  `amisache-backend` EVOLUTION.md) — la nouvelle route renvoie bien les conversations
  attendues ; pas de session panel ouverte cette entrée pour vérifier le rendu UI
  lui-même (même schéma de liste déjà éprouvé ailleurs dans le panel).

### 2026-09-20 — `models/chat.model.ts` réaligné sur l'adaptation Amisache de `ParticipantRole`/`ActorType`
- **Contexte** : en construisant la bulle de chat publique côté portail
  (`amisache-client`), `ParticipantRole` a été adapté côté backend
  (`DRIVER`/`CLIENT`/`ASSIGNED_AGENT` → `FAITHFUL`/`CLERGY`, `OWNER`/`MEMBER` gardés,
  déplacé dans `chat/chat.enum.ts`) et `ActorType` étendu (`+GUEST`, visiteur anonyme —
  voir `amisache-backend` EVOLUTION.md, même date). L'utilisateur a demandé
  explicitement si le panel avait aussi été touché — vérification faite : le panel a
  **sa propre UI de gestion du chat**, déjà construite (`components/chat/
  conversation-{list,detail,create}/`), avec sa propre copie de ces enums
  (`models/chat.model.ts`) restée sur les anciennes valeurs. Sans ce correctif, le
  panel aurait affiché des libellés de rôle obsolètes (« Agent assigné »/« Client »/
  « Chauffeur ») et un handoff déclenché depuis le panel aurait envoyé un rôle par
  défaut (`ASSIGNED_AGENT`) que le backend rejette désormais.
- **Décision** : `models/chat.model.ts` réaligné à l'identique du backend —
  `ParticipantRole` = `OWNER`/`MEMBER`/`FAITHFUL`/`CLERGY`, `PARTICIPANT_ROLE_LABELS`
  mis à jour (« Fidèle »/« Clergé »), `ActorType` +`GUEST`. Deux valeurs par défaut
  codées en dur corrigées : `conversation-detail.component.ts` (`toRole` du formulaire
  de handoff, `ASSIGNED_AGENT` → `CLERGY`) et `senderLabel()` (nouveau cas `GUEST` →
  « Visiteur <8 premiers caractères de son id> », aux côtés des cas déjà gérés `AI`/
  `SYSTEM`). Les deux sélecteurs déjà dynamiques
  (`Object.values(ParticipantRole)`/`Object.values(ActorType)`, `conversation-create/`
  et `conversation-detail/`) n'ont rien demandé de plus — ils suivent l'enum
  automatiquement.
- **Pourquoi** : demandé explicitement par l'utilisateur (« tu as modifié le panel
  aussi ? ») — corrigé dans la foulée plutôt que de laisser le panel désynchronisé du
  backend qu'il consomme.
- **Conséquences** : `ng build` propre. Pas de vérification en conditions réelles cette
  entrée (pas de session admin ouverte contre le panel) — changement mécanique de
  valeurs d'enum, même schéma que le renommage déjà vérifié côté backend/portail.

### 2026-09-19 — Accès clergé au panel : menus, listes et formulaires scopés à sa propre église
- **Décision de fond** (demandée explicitement, suite à un incident « connexion clergé
  refusée puis erreurs 403 partout ») : `amisache-panel` sert admin/engineer (accès complet)
  **et** clergé (scopé à sa/ses église(s)) dans le **même** panel — pas d'app séparée. Voir
  `EVOLUTION.md` backend, entrée du même jour, pour les permissions serveur correspondantes.
- **`ClergyContextService`** (nouveau, `services/clergy-context.service.ts`) : source de
  vérité côté panel — `isFullAccess()` (admin/engineer), `myChurches()` (affectations
  actives via `GET /clergy-members?userId=&activeOnly=true`), `activeChurchId`/
  `activeChurch` (persisté en `localStorage`, sélecteur d'église dans le topbar si plusieurs
  affectations). `RoleGuard` (nouveau, `core/guards/`) bloque les routes 100% plateforme
  (Utilisateurs, Chat, FAQ, Système, Arborescence des églises) pour qui n'a pas
  `isFullAccess()`. Sidebar filtrée via `MenuItem.adminOnly`.
- **12 ressources rattachées à une église** (clergy-member, entrance, membership, schedule,
  request, donation, tariff, payment-method, group, publication, payment, church) : chaque
  liste branche désormais sur `isFullAccess()` — admin/engineer via `/admin` (ou liste
  publique complète), clergé via `listForChurch(activeChurchId)` — **jamais** un appel à une
  route interdite. `ChurchService.listAllForSelect()` (peuple le filtre « église » sur
  quasiment toutes les pages) fait de même en interne : pour un clergy, plus d'appel réseau
  du tout, les données viennent déjà de `ClergyContextService.myChurches()`.
- **Bug trouvé en testant avec un vrai compte clergy** (a.toundji2@gmail.com, BISHOP sur
  Notre-Dame des Apôtres) : `ChurchService.listAllForSelect()` appelait `GET /churches/admin`
  **sans condition** dans le `constructor()` de 28 composants (403 garanti pour un clergy à
  l'ouverture de chaque page) — corrigé en un seul endroit (le service), pas 28.
- **Même bug sur `GET /users`** (annuaire complet, admin/manager/engineer uniquement) : appelé
  sans condition par `clergy-member-list`/`-create`, `donation-list`/`-detail`,
  `request-list`/`-detail` pour résoudre un nom ou peupler un sélecteur. Décision explicite de
  l'utilisateur après question posée : le clergé **ne voit pas** l'annuaire complet.
  - Résolution de nom (Demandes/Dons) : plus besoin d'appeler `GET /users` — le backend
    embarque désormais `user` sur les réponses `church/:churchId` (voir entrée backend). Appel
    à `listAllForSelect()` gardé derrière `clergyContext.isFullAccess()` dans les 4 composants
    concernés.
  - **`clergy-member-create`** (choisir qui affecter) : entièrement revu pour un clergy —
    `userOptions()` vient de `MembershipService.listForChurch(activeChurchId)` (les fidèles
    qui suivent sa propre église) au lieu de `UserService.listAllForSelect()`, complété par un
    champ « chercher par email » (`UserService.lookupByEmail`, nouveau — `GET
    /users/lookup?email=`) pour affecter quelqu'un hors de ce cercle (ex. un nouveau vicaire
    muté d'une autre paroisse). Admin/engineer gardent l'annuaire complet, comportement
    inchangé.
- **Liens croisés ajoutés** (`clergy-member-list`/`-detail`) : nom de l'église cliquable vers
  `/churches/:id` (public, tous rôles) ; lien « Voir l'utilisateur » vers `/users/:id` affiché
  uniquement pour admin/engineer (`/users/:id` bloqué par `RoleGuard` pour un clergy — inutile
  de lui montrer un lien mort).
- **Conséquences** : `ng build` propre à chaque étape. **Non déployé** — dépend du backend du
  même jour (login + permissions étendues), lui-même pas encore redéployé sur `api.nutito.org`
  au moment de la rédaction. À revérifier avec le compte de test une fois les deux déployés.

### 2026-09-17 — `leaderMessage` migré de `Church` vers `ChurchProfile`
- **Décision** : suite de la création de `ChurchProfile` côté backend (voir
  `EVOLUTION.md` backend, même date) — `leaderMessage` (« Message du responsable »)
  quitte `Church` pour `ChurchProfile`, table séparée dédiée au contenu éditorial de
  présentation (déjà utilisée côté portail pour `description`, pas encore consommée par
  le panel avant ce changement). Nouveaux `models/church-profile.model.ts` et
  `services/church-profile.service.ts` (`getForChurch`/`upsertForChurch`, miroir du
  `ChurchProfileController` backend).
  - `leaderMessage` retiré de `Church`/`CreateChurchDto`/`UpdateChurchDto`
    (`models/church.model.ts`) et du formulaire de création (`church-create/`) — un
    `ChurchProfile` référence une église existante (FK `churchId`), impossible à
    renseigner avant sa création (même contrainte que `description`, jamais proposée à
    la création non plus).
  - Sur `church-detail/`, le champ sort du `FormGroup`/`FieldSaveMixin` principal (qui
    ne sait sauvegarder que via `ChurchService.update`, plus la bonne ressource
    maintenant) — remplacé par un `FormControl` autonome (`leaderMessageControl`) et son
    propre triplet save/reset/modified (`isLeaderMessageModified`/`saveLeaderMessage`/
    `resetLeaderMessage`), même schéma que le bloc « Adresse groupée » déjà présent sur
    cette page pour une ressource sauvegardée séparément du reste du formulaire.
    `ChurchProfile` chargé en parallèle de `Church` dans `load()`, erreur silencieuse —
    un profil absent ne doit pas empêcher l'affichage du reste de la fiche église.
- **Pourquoi** : demandé explicitement (« on doit aussi migrer le mot du curé dans church
  profile »).
- **Conséquences** : `ng build` propre. Migration `AddChurchProfiles` toujours non
  appliquée côté backend (choix explicite de l'utilisateur à l'entrée backend
  précédente) — tant que `npm run migration:run` n'est pas joué, le bloc « Message du
  responsable » ne peut ni charger ni sauvegarder quoi que ce soit (table absente),
  dégradation à vérifier une fois la migration jouée. Pas de vérification HTTP live
  cette session (backend local non relancé).

### 2026-09-15 — Libellé « Entité » remplacé par « Église » dans tout le panel
- **Décision** : le mot générique « Entité »/« entité » (hérité du vocabulaire neutre du
  template — une `Church` couvre en réalité toute la hiérarchie, conférence à chapelle,
  pas seulement un bâtiment d'église) n'était pas explicite pour l'utilisateur final.
  Remplacé par « Église »/« église » partout où il désignait un enregistrement `Church` —
  sidebar (« Entités » → « Églises » sous « Hiérarchie ecclésiale »), route titles
  (`app.routes.ts`), et l'ensemble des pages qui référencent une église : `church-*`
  (liste/création/détail/arborescence), `clergy-member-*`, `entrance-*`, `group-*`,
  `publication-*`, `schedule-*`, `donation-list`, `request-list`, `payment-method-*`,
  `tariff-*` (libellés de sélecteur, colonnes de tableau, filtres, messages Swal,
  messages d'erreur). Substitution mécanique (`sed`, limites de mot `\b`) plutôt que
  fichier par fichier vu le nombre de points touchés — vérifié qu'« Identité » (bloc
  « Identité » des formulaires, sans rapport) n'a pas été altéré par erreur (le mot
  contient « entité » comme sous-chaîne littérale mais sans limite de mot valide avant).
  Piège rencontré : un `\b` juste après un « é » accentué ne matche pas correctement
  selon l'encodage/la locale du shell (`LC_CTYPE=C.UTF-8` ici) — les formes plurielles
  (« entités », terminant par un « s » ASCII) fonctionnaient, mais pas le singulier
  (« entité », terminant directement par « é ») ; corrigé en retirant le `\b` de fin sur
  les motifs singuliers (le `\b` de début suffit à exclure « Identité »/« identité »).
  Non touché, volontairement : les commentaires de code internes (`church.model.ts`,
  `church.service.ts`, `column-visibility.service.ts`) qui emploient « entité » au sens
  générique de programmation, sans rapport avec l'UI.
- **Pourquoi** : demandé explicitement (« mets église au lieu de entité... les valeurs
  comme entité dans le sidebar ne sont pas explicites... tu peux toujours mettre
  église »).
- **Conséquences** : aucune migration, aucun changement de modèle (`Church`/`churchId`
  restent inchangés en code — seul le texte affiché change). Vérifié visuellement
  (Puppeteer, JWT factice) sur `/churches` : titre « Églises », bouton « Nouvelle
  église », compteur « X église(s) ». `ng build` propre.

### 2026-09-15 — Affichage de la célébration à domicile sur les demandes
- **Décision** : `models/request.model.ts` gagne `homeAddress?: string` (nouveau champ
  backend, voir `EVOLUTION.md` backend — célébration à domicile, optionnelle, pour
  n'importe quel motif de demande). Affiché en deux endroits : `request-list` (icône
  maison `fa-house` à côté du nom du demandeur, `title="Célébration à domicile"` —
  glanceable sans ouvrir chaque ligne) et `request-detail` (bandeau `alert-warning` en
  tête de la colonne détail, avec l'adresse en clair — visibilité immédiate pour le
  clergé qui doit savoir où se déplacer, pas noyé dans les autres champs).
- **Pourquoi** : suite directe de la fonctionnalité ajoutée côté client le même jour —
  sans affichage panel, l'information saisie par le fidèle resterait invisible pour le
  clergé qui doit s'y rendre.
- **Conséquences** : aucune migration (lecture seule côté panel — la demande est
  toujours déposée en self-service par le fidèle). `ng build` propre.

### 2026-09-15 — Écran de gestion des tarifs (`liturgy/tariff-*`)
- **Décision** : nouveau module CRUD panel pour l'entité `Tariff` (backend, ajoutée la
  veille — voir `EVOLUTION.md` backend, tarification avec repli hiérarchique). Trois
  composants sous `components/liturgy/` (`tariff-list`, `tariff-create`,
  `tariff-detail`), calqués quasi à l'identique sur `payment/payment-method-*` déjà en
  place (mêmes conventions `CLAUDE.md` : `FieldSaveMixin` pour l'édition du montant,
  pattern stub `selected()`/`select()` liste→détail, pagination client
  `PaginationService`/`slice()`, `filter-bar` avec recherche + église + scope + actifs,
  `data-table--cards`). Nouveaux `models/tariff.model.ts` + `services/tariff.service.ts`
  (`listAdmin` sur `GET /tariffs/admin` — même convention que `Request`/`Donation` :
  admin/engineer uniquement, pas encore la bascule clergé sur `/tariffs/church/:churchId`,
  cf. dette déjà notée côté backend le 2026-09-08 pour les autres ressources). Le
  sélecteur de motif (étape « Type ») reprend le même `optgroup` Intention/Sacrement
  que le portail client, via `TypeService.listActive(scope)`/`activeForScope(scope)`
  déjà existants. Routes `liturgy/tariffs`(`/new`, `/:id`) + entrée sidebar sous
  « Vie liturgique ».
- **Backend complété au passage** : `GET /tariffs/:id` n'existait pas encore (l'ancien
  périmètre ne couvrait que `resolve`/`admin`/`church/:churchId`/write) — ajouté pour
  que l'écran de détail du panel puisse recharger un tarif par id après navigation
  directe/refresh, comme toutes les autres pages de détail du panel.
- **Pourquoi** : demandé explicitement (« tu as mis à jour le panel ? » → « oui oui » à
  la proposition de construire cet écran) — sans lui, la seule façon de publier un tarif
  était l'API directe ou le seeder, aucun moyen pour le clergé/l'admin de le faire
  depuis le back-office.
- **Conséquences** : aucune migration. Vérifié en conditions mockées (Puppeteer +
  interception réseau, JWT factice avec `exp` futur pour passer le guard d'auth du
  panel — `isTokenValid` décode un vrai JWT, un jeton non conforme ne suffit pas) :
  liste (filtres, montant formaté), création (église + motif + montant, redirection
  vers le détail créé), et édition champ par champ du montant via `FieldSaveMixin`
  (bouton save → badge « Sauvegardé » → valeur persistée) — les trois écrans
  fonctionnent de bout en bout. `ng build` propre.

### 2026-09-03 — Stratégie de tests arrêtée + amorce Claude Code
- **Décision (tests)** : stratégie consignée en **section §10 d'`AMISACHE.md`**, pas de
  `TESTING.md` séparé — elle est soudée aux invariants du même fichier et n'a aucun cycle de vie
  propre (on extraira un `TESTING.md` seulement si la section déborde). Cibles : isolation
  multi-tenant, `Payment.confirmedBy → ClergyMember`, `homeChurchId ∈ Membership`, cohérence
  hiérarchie `Church`, `perimeter`. Niveaux : unitaire services / intégration DB pour le spatial /
  E2E Playwright sur les parcours critiques.
- **Décision (amorce)** : le `CLAUDE.md` **du fork** charge le contexte projet via `@import`
  (`@AMISACHE.md`, `@EVOLUTION.md`) au lieu d'un renvoi en prose → la chaîne de session n'est plus
  orpheline. Bloc **local au fork**, ne remonte jamais au template (donc pas dans
  `TEMPLATE-FIXES.md`). `auth.md` reste conditionnel → volontairement **non** importé.
- **Nettoyage** : deux reliquats `favoriteChurchId` → `homeChurchId` corrigés dans `AMISACHE.md`
  (§5 encadré, §9 étape 3), alignés sur le renommage du 2026-08-30.

### 2026-08-30 — Rattachement paroissial du fidèle : `homeChurch` + `Membership`
- **Décision** : un fidèle **suit plusieurs paroisses** (jointure `Membership` dans `church/`,
  `since: date`, sans rôle) et en a **une de référence** (`homeChurchId`, scalaire sur `User`).
  `favoriteChurch` renommé `homeChurch`.
- **Pourquoi** : deux cardinalités → deux mécanismes (cf. `CLAUDE.md` faible/forte cardinalité).
  `Membership` est le symétrique de `ClergyMember` (fidèle vs clergé).
- **Conséquences** : invariante `homeChurchId ∈ Membership(user)` validée côté service `church/`.
  « Paroisse la plus proche » = onboarding spatial (`ST_Distance`), pas le modèle. Diagramme +
  `AMISACHE.md` §3/§5/§7 mis à jour.

### 2026-08-30 — Emprise et accès de l'église : `perimeter` + `Entrance`
- **Décision** : `Church.perimeter: Polygon` (attribut, pas une table). `Entrance` = **classe à
  part** dans `church/` (`type: EntranceType`, `name`, `location: Point`) ; enum `EntranceType`
  (`VEHICLE`/`PEDESTRIAN`/`MIXED`/`SERVICE`).
- **Pourquoi** : un attribut géométrique unique reste dans l'entité ; une collection d'objets
  structurés (portes multiples, chacune géolocalisée, requêtables) sort en table.
- **Conséquences** : validation « 4 à 20 sommets » = règle métier (DTO), ring MySQL fermé.

### 2026-08-30 — Réconciliation avec le socle `UNIFIED AUTH`
- **Décisions** : `users/` **étendu** (pas réécrit) — ajout `phone`, `homeChurchId` ; `idCountry`
  existant mappé sur `address/Country`. `UserRole` = `user`/`admin`/`engineer` (rôles ecclésiaux
  hors de là → `ClergyMember.role`). `UserStatus` = celui du socle. Toutes les entités étendent
  `Audit`. Enums métier en MAJUSCULES **dans leur module** (`shared/` reste neutre). Erreurs `3xxx`.
- **Modules du socle** : `content/`, `chat/`, `notifications/` **gardés** (pas des démos jetables
  pour Amisache). `chat/` adapté (enums d'acteurs) **sans casser son polymorphisme**.
- **Conséquences** : `AMISACHE.md` créé pour porter tout ce delta.

### 2026-08-30 — Découpage en modules par force de liens
- **Décision** : 6 modules Amisache — `address/`, `type/`, `church/`, `liturgy/`, `payment/`,
  `community/`. `Donation` placé dans `liturgy/` (geste du fidèle). `Address` = value object
  embarqué, module renommé `Location` → `address/`.
- **Pourquoi** : composition forte → même module ; référence lâche → frontière. Dépendances
  toutes descendantes, aucun cycle.

---

## Points d'attention (dette / vigilance)

- **Frontière `content/`⇄`community/`** non fermée tant que le modèle de `content/` n'est pas connu.
- **Registres sacramentels & certificats** : features sensibles en attente d'arbitrage ecclésial.
- **Invariante `homeChurchId ∈ Membership`** : à garantir côté service `church/`, jamais `users/`.
