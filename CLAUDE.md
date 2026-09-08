# CLAUDE.md

Contexte pour les assistants IA travaillant sur **Angular Panel** — template
d'administration Angular 19 (standalone, Bootstrap 5) consommant l'API
[nest-auth-base](../nest-auth-base). Voir `README.md` pour la vue d'ensemble du
template. Ce fichier documente les règles d'or à respecter pour toute nouvelle
page — liste ou détail — ajoutée au template.

## Règles d'or — Pages de liste

### Dans le service

- Le signal exposant la liste vaut **`undefined` par défaut** — jamais `[]`.
  `undefined` = pas encore chargé, `[]` = chargé et vide. Ce sont deux états
  différents, qui doivent rester distinguables par le composant.

  ```ts
  private itemsSignal = signal<Item[] | undefined>(undefined);
  readonly items = this.itemsSignal.asReadonly();
  ```

- La méthode de fetch met à jour ce signal via `tap()` — voir
  `UserService.listUsers`. **Ne jamais réinitialiser le signal à `undefined`
  avant un rechargement** : les données précédentes doivent rester affichées
  pendant que la requête suivante est en vol (stale-while-revalidate). Comme
  le service est `providedIn: 'root'`, le signal survit à la destruction du
  composant de liste — revisiter la page affiche donc immédiatement les
  dernières données connues pendant qu'un fetch frais tourne en arrière-plan.

### Dans le composant de page

```ts
isLoading = computed(() => this.items() === undefined);
error = signal<string | null>(null);
```

Template (ordre des états, un seul est vrai à la fois sauf indication contraire) :

1. **`isLoading()`** → squelette (`skeleton-line`, voir `_components.scss`).
2. **`!isLoading() && error()`** → message d'erreur (alert danger).
3. **`!isLoading() && !error() && items().length === 0`** → état vide
   (`empty-state`, voir `_components.scss`).
4. **`!isLoading() && !error() && items().length > 0`** → les données.

`error` se réinitialise à `null` au début de chaque fetch et se renseigne
uniquement dans le callback `error` de la souscription — jamais dans le
`next`.

### Pagination

`shared/pagination/` — `PaginationService` + `PaginationComponent`, instance
**par composant** (`providers: [PaginationService]`), jamais `providedIn:
'root'` : chaque liste a son propre état de pagination, isolé d'une future
liste (une page 3 sur Utilisateurs ne doit pas affecter une liste Commandes).

Deux modes selon que l'API pagine réellement ou non :

- **Pagination serveur** (le cas normal — `GET /users` accepte
  `page`/`limit`) : après chaque fetch, `pagination.setTotalOnly(result.total)`
  ; un `effect()` relit `pagination.currentPage()`/`itemsPerPage()` et
  redéclenche un fetch à chaque changement de page (voir `UserListComponent`).
  **Ne jamais** appeler `pagination.slice()` dans ce mode — les données reçues
  sont déjà la bonne page.
- **Pagination client** (liste chargée en une fois, ex. un futur endpoint sans
  pagination serveur) : `pagination.setTotalOnly(items.length)` puis
  `pagination.slice(items)` dans un `computed`, comme documenté dans
  `pagination.service.ts`.

`<app-pagination></app-pagination>` s'affiche dans `.data-table-wrapper`,
sous le `<table>`.

### Filtres et recherche

Structure `filter-bar` (voir `_components.scss`) :

```html
<div class="filter-bar">
  <div class="filter-row">
    <!-- recherche libre, toujours visible -->
    <div class="search-input-group">
      <div class="input-group">
        <span class="input-group-text"><i class="fas fa-search"></i></span>
        <input [ngModel]="filters().search" (ngModelChange)="updateFilter('search', $event)">
      </div>
    </div>

    <!-- bouton "Filtres" → ouvre l'offcanvas des filtres avancés -->
    <button data-bs-toggle="offcanvas" data-bs-target="#filtersOffcanvas" class="position-relative">
      <i class="fas fa-sliders-h"></i> Filtres
      @if (hasAdvancedFilters()) { <span class="filter-active-dot"></span> }
    </button>

    @if (hasAdvancedFilters() || filters().search) {
      <button (click)="resetFilters()">Reset</button>
    }
  </div>

  <!-- tags des filtres avancés actifs, retirables individuellement -->
  @if (hasAdvancedFilters()) {
    <div class="d-flex flex-wrap gap-1 mt-2">
      @if (filters().status) {
        <span class="filter-tag">{{ filters().status }}<i class="fas fa-times remove-tag" (click)="updateFilter('status', '')"></i></span>
      }
    </div>
  }
</div>
```

Les filtres qui n'ont pas leur place dans la barre toujours visible (statut,
rôle...) vivent dans un `<div class="offcanvas offcanvas-end" id="filtersOffcanvas">`
avec des `<input type="radio">` (un par valeur d'enum + un "Tous"), voir
`user-list.component.html`. Pas de compteurs par option (`(12)` à côté de
chaque radio) : ambassade-benin-ru peut se le permettre parce que sa liste est
chargée en entier côté client, ce qui n'est pas le cas ici — calculer un
compte par filtre nécessiterait une requête serveur dédiée par option, hors de
proportion pour un détail cosmétique.

**Persistance** : statut/rôle/tri sont sauvegardés dans localStorage à chaque
changement et restaurés à l'ouverture de la page — **jamais la recherche
libre** (un terme de recherche oublié qui se réapplique silencieusement à la
prochaine visite serait déroutant, alors qu'un filtre de statut est un choix
de contexte de travail durable) :

```ts
type Persisted = Pick<Filters, 'status' | 'role' | 'sortBy' | 'sortOrder'>;
const STORAGE_KEY = 'usersFilters';

filters = signal<Filters>({ ...defaults, ...loadPersisted() });

private persistFilters = effect(() => {
  const { status, role, sortBy, sortOrder } = this.filters();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ status, role, sortBy, sortOrder }));
});
```

Toute modification de filtre repasse par `updateFilter()`, qui remet la
pagination à la page 1 (`pagination.reset()`) — sinon on peut se retrouver sur
une page 4 devenue inexistante après un filtrage qui réduit le nombre total
de résultats.

### Tri

Colonnes triables = en-têtes cliquables avec icône `fa-sort` /
`fa-sort-up` / `fa-sort-down`, uniquement sur les colonnes que l'API sait
trier (whitelist explicite côté backend — voir `ListUsersSortBy` dans
nest-auth-base, jamais un nom de colonne passé tel quel au client) :

```html
<th class="sortable" (click)="toggleSort('email')">
  Email
  <i class="fas ms-1" [class.fa-sort]="filters().sortBy !== 'email'"
    [class.fa-sort-up]="filters().sortBy === 'email' && filters().sortOrder === 'asc'"
    [class.fa-sort-down]="filters().sortBy === 'email' && filters().sortOrder === 'desc'"></i>
</th>
```

```ts
toggleSort(field: SortBy): void {
  this.filters.update(f => ({
    ...f,
    sortBy: field,
    sortOrder: f.sortBy === field && f.sortOrder === 'asc' ? 'desc' : 'asc',
  }));
  this.pagination.reset();
}
```

Ne **jamais** trier côté client une liste dont l'API pagine réellement — ça ne
trierait que la page actuellement chargée, pas l'ensemble des résultats, ce
qui est trompeur pour l'utilisateur. Si l'API ne supporte pas encore le tri
sur une colonne voulue, l'ajouter côté backend (whitelist) plutôt que de
truquer un tri partiel côté client.

### Résolution d'un id de relation (FK) en libellé

Une liste qui n'affiche qu'un `xxxId` brut (ex. `<code>{{ item.companyId }}</code>`)
est un défaut à corriger avant de considérer la page finie — jamais un id
technique face à un utilisateur back-office, toujours le libellé humain de
l'entité liée (nom, email...).

- **Relation faible cardinalité — table de référence** (country, service,
  license plan...) : la liste entière tient en mémoire. Le service Angular de
  l'entité liée la charge une fois et le composant résout l'id localement
  sans appel réseau supplémentaire.
- **Relation forte cardinalité** (ex. `companyId` sur une liste
  d'abonnements, `userId` sur une liste de commandes) : impossible de garder
  toute la table en mémoire. Le pattern de référence est
  `CompanyService.resolveDisplayInfo()`/`displayInfo()` (projet dérivé
  nutito-panel, `services/company.service.ts`) :

  ```ts
  // Dans le service de l'entité LIÉE (pas dans le service de la liste qui l'affiche) :
  private displayInfoSignal = signal<Record<string, DisplayInfo>>({});
  private displayInfoInFlight = new Set<string>();

  displayInfo(id: string): DisplayInfo | undefined {
    return this.displayInfoSignal()[id];
  }

  // Consulte d'abord le cache déjà chargé par LA PAGE LISTE de cette entité
  // (ex. companies() rempli par CompanyListComponent) avant un lookup ciblé
  // par id (getById) — jamais un fetch de la table entière.
  resolveDisplayInfo(ids: string[]): void {
    const cached = this.itemsSignal() ?? [];
    for (const id of new Set(ids)) {
      if (this.displayInfoSignal()[id] || this.displayInfoInFlight.has(id)) continue;
      const known = cached.find((c) => c.id === id);
      if (known) { this.setDisplayInfo(id, known); continue; }
      this.displayInfoInFlight.add(id);
      this.getById(id).subscribe({
        next: (item) => { this.displayInfoInFlight.delete(id); this.setDisplayInfo(id, item); },
        error: () => this.displayInfoInFlight.delete(id),
      });
    }
  }
  ```

  Le composant liste appelle `service.resolveDisplayInfo(items.map(i => i.xxxId))`
  après chaque fetch, et le template lit `service.displayInfo(item.xxxId)` avec
  un fallback skeleton tant que non résolu :

  ```html
  @if (companyService.displayInfo(item.companyId); as info) {
    <div>{{ info.name }}</div>
  } @else {
    <div class="skeleton-line" style="width:120px;"></div>
  }
  ```

  **Le cache vit dans le service de l'entité liée** (`CompanyService`, pas
  `SubscriptionService`) — partagé par toutes les listes qui référencent
  cette entité (abonnements, demandes d'abonnement...), sans dupliquer la
  logique de lookup à chaque nouvelle liste qui en a besoin.

### Numérotation des lignes

Toute liste tabulaire (`<table>`) affiche une colonne `#` en première position,
avec le rang de la ligne — pas un simple détail cosmétique, un repère de
lecture attendu par défaut :

```html
<th style="width:48px;">#</th>
```

```html
@for (item of items()!; track item.id; let i = $index) {
  <tr>
    <td style="font-size:.85rem;color:#9aa5b4;">{{ pagination.startItem() + i }}</td>
    ...
```

- **Pagination serveur ou client via `PaginationService`** : `pagination.startItem() + i`
  — la numérotation continue entre les pages (page 2 commence à 21 avec
  `itemsPerPage = 20`), jamais un `i + 1` qui repartirait de 1 à chaque page.
  `startItem` est déjà exposé par `PaginationService` (`pagination.service.ts`).
- **Liste chargée en une fois sans pagination** (rare — voir § Pagination) :
  `i + 1` suffit.

Penser à incrémenter le `colspan` des lignes squelette/erreur/vide et à
ajouter la cellule squelette (`<td><div class="skeleton-line" style="width:20px;"></div></td>`)
en tête de chaque ligne de skeleton — un oubli ici désynchronise visuellement
le nombre de colonnes entre l'état de chargement et l'état de données.

### Rendu mobile — tableau → cartes

Sous **768px**, tout `<table>` de liste se replie en cartes empilées (une
carte par ligne, chaque champ en `intitulé: valeur`). Traitement **CSS pur,
mutualisé** dans `_components.scss` (`@media (max-width: 767.98px)` →
`table.data-table--cards`) — aucun template alternatif, aucune ligne de TS,
les états skeleton/erreur/vide/tri/pagination restent intacts.

Gabarit à respecter pour toute nouvelle liste tabulaire :

```html
<div class="data-table-wrapper">
  <div class="data-table-scroll">        <!-- défilement H, sinon table rognée -->
    <table class="table table-hover mb-0 data-table--cards">
      ...
      @for (item of items()!; track item.id; let i = $index) {
        <tr>
          <td class="cell-index">{{ pagination.startItem() + i }}</td>       <!-- masqué en carte -->
          <td class="cell-title" data-label="Nom">…</td>                     <!-- en-tête de carte -->
          <td class="d-none d-md-table-cell" data-label="Email">…</td>       <!-- caché desktop, VISIBLE en carte -->
          <td data-label="Statut">…</td>
          <td class="cell-actions"><div class="d-flex gap-1">…</div></td>
        </tr>
      }
    </table>
  </div>
  <app-pagination></app-pagination>       <!-- HORS .data-table-scroll : ne doit pas défiler -->
</div>
```

Règles :

- **`.data-table-scroll`** entoure le `<table>` seul, jamais `<app-pagination>`.
  Sans ce conteneur interne une table plus large que l'écran est coupée **sans
  scrollbar** (le `.data-table-wrapper` est en `overflow: hidden`).
- **`data-table--cards`** sur le `<table>`.
- **`data-label="…"`** sur chaque `<td>` de ligne de données — devient
  l'intitulé du champ en mode carte. À mettre **aussi** sur les colonnes
  `d-none d-md/lg-table-cell` : masquées en desktop pour la place, mais en
  carte l'info doit rester accessible (le CSS force leur affichage via
  `display: grid !important`, qui bat `.d-none`).
- **`class="cell-title"`** sur la cellule identité (nom, expéditeur, sujet…) —
  rendue en **en-tête de carte** pleine largeur (texte plus gros, filet
  dessous, pas d'intitulé). Une seule par ligne.
- **`class="cell-index"`** sur la cellule `#` — masquée en mode carte.
- **`class="cell-actions"`** sur la cellule Actions — filet de séparation +
  boutons à droite en mode carte.
- Les lignes skeleton/erreur/vide n'ont pas besoin de `data-label`.
- Le tri par en-tête cliquable disparaît en mode carte (`thead` masqué) —
  accepté, les listes sont paginées serveur.

### Colonnes configurables

`shared/column-visibility/` — `ColumnVisibilityService` +
`ColumnVisibilityComponent`, générique et sans connaissance d'une entité en
particulier, comme `PaginationService` (instance par composant, jamais
`providedIn: 'root'`). Chaque tableau déclare sa propre liste de colonnes
masquables et sa propre clé de storage :

```ts
const COLUMNS: ColumnDef[] = [
  { key: 'email', label: 'Email' },
  // false = masquée par défaut :
  { key: 'createdAt', label: 'Créé le', defaultVisible: false },
];

providers: [ColumnVisibilityService]
...
constructor() { this.columnVisibility.init('users', COLUMNS); }
```

Persisté en localStorage sous `columns:<storageKey>`. Les colonnes qui n'ont
aucune raison d'être masquées (ex. la colonne "Utilisateur" avec l'avatar, ou
"Actions") ne sont **pas déclarées** dans `ColumnDef[]` — le template les
affiche directement, sans passer par `columnVisibility.isVisible()`. Le
bouton `<app-column-visibility>` se place dans le `filter-row`, à côté du
bouton "Filtres".

Une colonne dérivée d'une sous-entité liée (ex. `service.name` pour une
future liste de commandes) est déclarée exactement comme les autres — le
service n'a pas à évoluer, seule la liste `ColumnDef[]` de CETTE table
change.

### Rafraîchissement manuel

Le bouton "Actualiser" de chaque page appelle une méthode qui déclenche le
fetch avec un indicateur `showLoader: true`, distinct des rechargements
silencieux (changement de page/filtre/tri) :

```ts
private load(showLoader = false): void {
  if (showLoader) Swal.showLoading();
  this.error.set(null);
  this.service.list(/* ... */).subscribe({
    next: (result) => {
      /* mettre à jour l'état */
      if (showLoader) Swal.close();
    },
    error: () => {
      this.error.set('Erreur lors du chargement.');
      if (showLoader) Swal.close();
    },
  });
}

refresh(): void {
  this.load(true);
}
```

`Swal.showLoading()` s'appelle seul, sans `Swal.fire()` préalable (supporté
nativement par SweetAlert2 ≥ 11.4.7) — il affiche un overlay bloquant qui
montre explicitement à l'utilisateur qu'une requête est en cours. Un
rechargement déclenché par la pagination/un filtre/un tri ne doit **pas**
utiliser `Swal.showLoading()` — seule l'icône qui tourne sur le bouton
"Actualiser" suffit, l'overlay bloquant serait intrusif pour une interaction
qui n'est pas un clic explicite sur "Actualiser".

### Référence

`UserService`/`UserListComponent` (`services/user.service.ts`,
`components/users/user-list/`) est l'implémentation de référence — nouvelle
liste = même structure.

## Règles d'or — Pages de détail

Quand une ligne de liste est cliquée (lien "Voir" ou lien du nom), **avant la
navigation**, l'élément cliqué est stocké dans le service :

```ts
// UserService
private selectedSignal = signal<User | null>(null);
readonly selected = this.selectedSignal.asReadonly();
select(item: User): void { this.selectedSignal.set(item); }
```

```html
<!-- Dans la liste -->
<a [routerLink]="['/users', item.id]" (click)="userService.select(item)">...</a>
```

Le composant de détail (ou de formulaire d'édition) l'utilise comme donnée
préaffichée pendant que le detail complet se télécharge :

```ts
private readonly userId = this.route.snapshot.paramMap.get('id')!;
// Le stub n'est utilisable que s'il correspond bien à l'id demandé — sinon
// navigation directe (lien externe, retour arrière) sur un autre item que
// celui précédemment sélectionné afficherait les mauvaises données.
private readonly stub = this.userService.selected()?.id === this.userId ? this.userService.selected() : null;

item = signal<Item | null>(this.stub);
loading = signal(!this.stub); // squelette seulement si aucun stub disponible
```

Le fetch complet (`getById`) écrase ensuite `item` avec la donnée à jour,
identique au flux normal — le stub n'est qu'un affichage optimiste temporaire,
jamais une donnée de substitution permanente. Même principe pour un
formulaire d'édition : préremplir avec le stub, laisser le fetch complet
corriger si besoin une fois arrivé.

Le layout d'une page de détail : gauche (4/12) carte profil condensée
(avatar, statut, rôles, `quick-info`) + droite (8/12) une carte par groupe de
champs éditable — pas d'onglets tant qu'une seule entité les justifie, à
introduire (`nav-tabs`, voir `_bootstrap-overrides.scss`) si une future entité
a trop de champs pour tenir dans une colonne de cartes empilées.

### Référence

`UserDetailComponent` (`components/users/user-detail/`) est l'implémentation
de référence.

## Règles d'or — Formulaires (FieldSaveMixin)

### Règle

Tout formulaire en **mode édition** avec des champs scalaires (texte, select,
nombre) doit étendre `FieldSaveMixin` (`shared/mixins/field-save.mixin.ts`) —
sauvegarde champ par champ, jamais un unique bouton "Enregistrer" global qui
soumet tout le formulaire. Exception : un formulaire de **création** (aucune
donnée existante à comparer) se soumet globalement, en une fois — voir
`UserCreateComponent`.

```ts
export abstract class FieldSaveMixin {
  protected abstract getFormGroup(): FormGroup;
  protected abstract saveField(field: string, value: any): Observable<any>;

  isFieldModified(field): boolean   // compare vs originalFormValues
  isFieldSaving(field): boolean     // spinner en cours
  isFieldJustSaved(field): boolean  // ✓ vert 2 secondes

  saveSingleField(field): void      // envoie uniquement ce champ
  resetField(field): void           // remet la valeur originale (scalaires uniquement)
  protected initOriginalValues(): void  // fige la référence de comparaison
}
```

```ts
export class MyDetailComponent extends FieldSaveMixin {
  protected getFormGroup() { return this.myForm; }
  protected saveField(field, value): Observable<any> {
    return this.myService.update(this.id!, { [field]: value });
  }
  // Après avoir peuplé le formulaire (fetch complet OU stub) : this.initOriginalValues();
}
```

**Piège avec le pattern stub** (cf. § Pages de détail) : si le formulaire est
préempli avec un stub dans son field initializer, appeler
`initOriginalValues()` dans le **constructeur**, pas seulement dans le
callback de succès du fetch complet — sinon `originalFormValues` reste vide
le temps du fetch, et `isFieldModified()` compare la valeur du stub à
`undefined` → affiche à tort les boutons save/undo avant même que
l'utilisateur ait touché quoi que ce soit (voir `UserDetailComponent`,
`ProfileComponent`).

### HTML — champ scalaire (input)

```html
<div class="input-group">
  <input formControlName="name"
    [class.border-warning]="isFieldModified('name') && !isFieldJustSaved('name') && !isFieldSaving('name')"
    [class.border-success]="isFieldJustSaved('name')">
  @if (isFieldModified('name') && !isFieldSaving('name')) {
    <button type="button" class="btn btn-outline-warning btn-sm" (click)="saveSingleField('name')"><i class="fas fa-save"></i></button>
    <button type="button" class="btn btn-outline-secondary btn-sm" (click)="resetField('name')"><i class="fas fa-undo"></i></button>
  }
  @if (isFieldSaving('name')) {
    <span class="input-group-text bg-info text-white"><span class="spinner-border spinner-border-sm"></span></span>
  }
  @if (isFieldJustSaved('name')) {
    <span class="input-group-text bg-success text-white"><i class="fas fa-check"></i></span>
  }
</div>
```

### HTML — textarea (boutons en position absolue)

```html
<div class="textarea-field-wrap">
  <textarea formControlName="summary"
    [class.border-warning]="isFieldModified('summary') && !isFieldJustSaved('summary') && !isFieldSaving('summary')"
    [class.border-success]="isFieldJustSaved('summary')"></textarea>
  @if (isFieldModified('summary') && !isFieldSaving('summary')) {
    <div class="textarea-field-actions">
      <button type="button" class="btn btn-outline-warning btn-sm" (click)="saveSingleField('summary')"><i class="fas fa-save"></i></button>
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="resetField('summary')"><i class="fas fa-undo"></i></button>
    </div>
  }
  @if (isFieldJustSaved('summary')) {
    <div class="textarea-field-actions"><span class="badge bg-success text-white"><i class="fas fa-check me-1"></i>Sauvegardé</span></div>
  }
</div>
```

`.textarea-field-wrap`/`.textarea-field-actions` vivent dans
`_components.scss` (padding-bottom sur le textarea pour laisser la place aux
boutons, boutons en `position: absolute` en bas à droite).

### Champ dans le card-header (ex. un select "Statut")

```html
<div class="card-header d-flex align-items-center justify-content-between">
  <span>Statut</span>
  @if (isFieldModified('status') && !isFieldSaving('status')) {
    <div class="btn-group btn-group-sm">
      <button type="button" class="btn btn-outline-warning" (click)="saveSingleField('status')"><i class="fas fa-save"></i></button>
      <button type="button" class="btn btn-outline-secondary" (click)="resetField('status')"><i class="fas fa-undo"></i></button>
    </div>
  }
  @if (isFieldSaving('status')) {
    <span class="badge bg-info text-white"><span class="spinner-border spinner-border-sm me-1"></span>Sauvegarde...</span>
  }
  @if (isFieldJustSaved('status')) {
    <span class="badge bg-success text-white"><i class="fas fa-check me-1"></i>Sauvegardé</span>
  }
</div>
```

Voir `UserDetailComponent` (bloc "Statut") pour l'implémentation réelle.

### Pattern — champs groupés (tableau, pas un champ scalaire)

`FieldSaveMixin` ne gère que les champs **scalaires** — `isFieldModified()`
compare une valeur unique. Pour un tableau (rôles, tags, cascade
pays→région→zone), reproduire le même langage visuel (bordure orange →
spinner → coche verte) avec des signaux dédiés, sans passer par le mixin :

```ts
selectedRoles = signal<UserRole[]>([]);
private _rolesSaving = signal(false);
private _rolesJustSaved = signal(false);
private originalRoles: UserRole[] = [];

isRolesModified(): boolean {
  const before = [...this.originalRoles].sort();
  const after = [...this.selectedRoles()].sort();
  return before.length !== after.length || before.some((r, i) => r !== after[i]);
}

saveRoles(): void {
  this._rolesSaving.set(true);
  this.service.updateRoles(this.id, this.selectedRoles()).subscribe({
    next: (updated) => {
      this.originalRoles = [...this.selectedRoles()];
      this._rolesSaving.set(false);
      this._rolesJustSaved.set(true);
      setTimeout(() => this._rolesJustSaved.set(false), 2000);
    },
    error: () => this._rolesSaving.set(false),
  });
}

resetRoles(): void {
  this.selectedRoles.set([...this.originalRoles]);
}
```

Le `card-header` associé suit exactement le même gabarit que le bloc
"Statut" ci-dessus (`isRolesModified()`/`isRolesSaving()`/`isRolesJustSaved()`
à la place des méthodes du mixin). Voir `UserDetailComponent` (bloc "Rôles")
pour l'implémentation réelle. Même principe pour une cascade interdépendante
(pays → région → zone) : un seul jeu save/undo/saving/justSaved pour
l'ensemble du groupe, dans le `card-header` du bloc, et n'envoyer au serveur
que le champ le plus spécifique s'il porte implicitement les autres (ex.
envoyer seulement `zoneId`, pas les trois).

### RÈGLE ABSOLUE : zéro déclencheur automatique

`saveSingleField()` (et son équivalent pour les champs groupés) ne s'appelle
**jamais** depuis `(blur)`, `(change)`, `(input)` ou un `valueChanges` —
uniquement via un bouton cliqué explicitement par l'utilisateur. Un select
simple, non groupé, peut garder un `(change)` pour déclencher une cascade UI
(ex. changer de pays met à jour la liste des régions proposées), mais
**jamais** pour sauvegarder côté serveur. Toute violation est une régression
UX à corriger immédiatement — l'utilisateur doit toujours savoir précisément
quand une modification part vers le serveur.

## Popups de formulaire — composant + `ModalComponent`, pas Swal

**RÈGLE** : tout popup qui contient un **formulaire** (un ou plusieurs champs
saisissables — création/édition rapide depuis une liste, ex. une ligne de
journal, un paramètre applicatif) est un **composant Angular** affiché dans
`shared/modal/modal.component.ts` (`<app-modal>`), **jamais**
`Swal.fire({ html: ... })`. Un composant + `FormGroup` réactif est plus
flexible et extensible qu'un bloc HTML construit en template string lu via
`document.getElementById` : validation Angular typée, réutilisation du
formulaire (édition ET création), pas de couplage à SweetAlert2 si l'UI
évolue. **Swal reste réservé** aux confirmations destructives, aux toasts de
succès/erreur et à `Swal.showLoading()` (§ Règles UX importantes, points 1 et
3) — jamais à un champ de saisie.

```ts
// component.ts
@Component({ imports: [ModalComponent, ReactiveFormsModule, ...] })
export class EntryListComponent {
  modalOpen = signal(false);
  editingEntry = signal<Entry | null>(null); // null = création

  readonly entryForm: FormGroup = this.fb.group({
    date: ['', Validators.required],
    description: ['', Validators.required],
    direction: ['income', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
  });

  openCreate(): void {
    this.editingEntry.set(null);
    this.entryForm.reset({ date: today(), direction: 'income' });
    this.modalOpen.set(true);
  }

  openEdit(entry: Entry): void {
    this.editingEntry.set(entry);
    this.entryForm.patchValue(entry);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  submit(): void {
    if (this.entryForm.invalid) { this.entryForm.markAllAsTouched(); return; }
    const obs = this.editingEntry()
      ? this.entryService.update(this.editingEntry()!.id, this.entryForm.value)
      : this.entryService.create(this.entryForm.value);
    obs.subscribe({ next: () => { this.closeModal(); this.load(); }, error: (err) => Swal.fire('Erreur', err?.error?.msg, 'error') });
  }
}
```

```html
<!-- component.html -->
<app-modal [open]="modalOpen()" [title]="editingEntry() ? 'Modifier l\'écriture' : 'Ajouter une écriture'" (closed)="closeModal()">
  <form [formGroup]="entryForm" (ngSubmit)="submit()">
    <div class="mb-3">
      <label class="form-label">Date</label>
      <input type="date" class="form-control" formControlName="date">
    </div>
    <!-- ... autres champs, mêmes classes Bootstrap qu'un formulaire de page (form-label/form-control/form-select) ... -->
    <div class="d-flex justify-content-end gap-2 mt-4">
      <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Annuler</button>
      <button type="submit" class="btn btn-primary">{{ editingEntry() ? 'Enregistrer' : 'Ajouter' }}</button>
    </div>
  </form>
</app-modal>
```

- `<app-modal [open] [title] (closed)>` — visibilité pilotée par un signal du
  composant appelant, jamais par le plugin JS Bootstrap (`data-bs-toggle`) :
  cohérent avec le reste du template, où tout état vit côté Angular. Ferme
  sur clic backdrop, `Échap`, ou le bouton `(closed)` — appeler explicitement
  la méthode qui remet `modalOpen` à `false`.
- Le formulaire à l'intérieur suit les mêmes classes Bootstrap
  (`form-label`/`form-control`/`form-select`/`input-group`) qu'un formulaire
  de page classique — pas de classes `swal2-*`. Deux colonnes : `class="row"`
  + `class="col-6"` sur les `<div class="mb-3">`, comme un formulaire normal.
- Un seul `FormGroup` sert à la fois création et édition (`editingEntry()`
  détermine l'appel API et le libellé) — pas deux formulaires dupliqués.
- `size` de `<app-modal>` (`sm`/`md`/`lg`/`xl`, défaut `md`) suit les tailles
  Bootstrap standard — `lg`/`xl` pour un formulaire à beaucoup de champs.

### Référence

`shared/modal/modal.component.ts` (+ `.html`) est le composant de référence —
générique, sans connaissance d'une entité en particulier, même esprit que
`PaginationComponent`/`ColumnVisibilityComponent`.

## Identité visuelle — obligatoire pour tout projet dérivé

Ce template part avec une palette et des icônes **neutres, volontairement
placeholder**. Tout projet qui en dérive DOIT les remplacer par sa propre
charte avant d'être considéré comme fini — rien de ce qui suit ne doit rester
en l'état une fois le branding du projet connu.

### Couleurs — trois emplacements à synchroniser

La couleur "neutre" ne vit pas à un seul endroit : oublier l'un des trois
laisse un rebrand visuellement incohérent — un projet peut sembler entièrement
rebrandé (boutons, sidebar) alors qu'un des trois fichiers garde encore
l'ancienne couleur, invisible tant qu'on ne va pas chercher spécifiquement où
elle ressurgit.

1. **`src/styles.scss`** — le bloc `@use "bootstrap/scss/bootstrap" with (...)`.
   C'est la **vraie** source pour tout ce que Bootstrap compile (`.btn-primary`,
   `.text-primary`, `.bg-primary`...) — `$primary`/`$dark`/etc.
2. **`src/assets/scss/_variables.scss`** — déclaratif seulement (n'alimente pas
   Bootstrap directement), mais gardé en cohérence pour rester une référence
   fiable si un jour il est branché.
3. **`src/assets/scss/_base.scss`** (bloc `:root`) — les custom properties CSS
   (`--color-primary`, `--gradient-primary`...) que consomment les composants
   custom (sidebar, topbar, badges, `.text-primary-app`). C'est ce que la
   plupart des composants du template lisent réellement au runtime.

Remplacer `$primary`/`$dark` (et les dégradés qui en dérivent) dans les trois
fichiers avec les mêmes valeurs hex. Chercher aussi les `rgba(37,99,235,...)`
codés en dur (ombres, focus, badges) dans `_bootstrap-overrides.scss`,
`_components.scss`, et les `.scss` de composants (`login.component.scss`,
`sidebar.component.scss`) — ce sont des copies littérales de `$primary` en
`rgba()`, pas des `var()`, donc invisibles à un simple remplacement de
variable.

**Piège fréquent après un rebrand** : Bootstrap calcule automatiquement la
couleur du texte des boutons (`.btn-primary`, `.btn-secondary`, etc.) par
contraste contre la couleur de fond choisie. Selon la teinte du nouveau
`$primary`, ce calcul peut retomber sur du texte **noir** au lieu de blanc
(ex. un teal comme `#009999`) — illisible sur le dégradé. `.btn-primary` dans
`_bootstrap-overrides.scss` force déjà le texte en blanc via les CSS custom
properties Bootstrap (`--bs-btn-color` etc.), mais **vérifier après tout
changement de `$secondary`/`$success`/`$warning`/`$info`** que le même souci
ne s'est pas introduit sur ces boutons — Bootstrap calcule le contraste
indépendamment pour chaque couleur, corriger de la même façon si besoin.

### Favicon

`public/favicon.ico` est un stub 16×16 générique. Le remplacer par une
véritable icône de l'app, multi-résolution (16/24/32/48/64/128/256), à partir
du logo du projet. **Aucun outil de conversion SVG→ICO n'est garanti présent
dans l'environnement** — si `sharp`/`to-ico` (npm) ou un équivalent
(cairosvg+Pillow en Python) ne sont pas déjà installés, les installer
localement (scratch/temp, pas une dépendance du projet) le temps de générer le
fichier, puis écrire `public/favicon.ico`. Ajouter aussi `public/favicon.svg`
(le SVG source) et référencer les deux dans `src/index.html` :

```html
<link rel="icon" type="image/x-icon" href="favicon.ico">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
```

Deux `rel="icon"` simples, **jamais** `rel="alternate icon"` pour le fallback
— cet attribut ne fait pas ce qu'on croit (c'est un mécanisme lié aux flux
RSS, pas un fallback favicon standard) et le SVG n'apparaît alors jamais.

### Logo et icône dans l'UI — plusieurs variantes, pas un seul fichier

Ajouter dans `public/` (servi à la racine, pas de préfixe `assets/`). Le
template affiche ces assets sur des fonds différents (dégradé de couleur,
neutre, blanc navigateur) — un seul SVG "logo" ne suffit pas, il faut prévoir
la variante adaptée à chaque fond ou le rendu sera illisible / moche :

- **`logo.svg`** — logo complet (texte + symbole), en version **claire /
  sans fond** (fond transparent, tracé blanc ou clair) : il s'affiche sur
  `.login-branding` et `.navbar-brand` (desktop), tous deux en
  `background: var(--gradient-primary)` (voir `login.component.scss`,
  `topbar.component.scss`) — un logo sombre y deviendrait illisible.
  Utilisé dans le panneau de branding du login
  (`components/auth/login/login.component.html`, classe
  `.branding-logo-img`, remplace le placeholder `<i class="fas
  fa-shield-halved">`).
- **`icon-app.svg`** — icône seule (carrée), **avec son propre fond couleur
  primaire** intégré au SVG (pas transparente) : utilisée dans le topbar en
  version compacte mobile, sur un fond potentiellement clair selon le thème —
  elle doit rester lisible et identifiable sans dépendre du fond de la page.
- **`favicon.svg`/`favicon.ico`** — voir § Favicon ci-dessus : **sans fond**
  (transparent), c'est l'onglet du navigateur qui fournit le fond (clair ou
  sombre selon le thème système), jamais un fond fixe codé dans le SVG.

Si un projet dérivé a en plus besoin du logo sur un fond clair/blanc (ex:
export PDF, signature email, document imprimé) prévoir une variante
supplémentaire à cet usage (ex: `logo-dark.svg`, tracé dans la couleur
`$primary`/`$dark` du projet) — pas nécessaire pour le panel lui-même, qui
n'affiche le logo que sur fond dégradé.

Dans `topbar.component.html`, le bloc `.navbar-brand` affiche le logo complet
sur desktop et l'icône seule sur mobile (le texte "Admin Panel" disparaît, il
était lui aussi un placeholder) :

```html
<div class="navbar-brand">
  <img src="logo.svg" alt="{{ nom du projet }}" class="navbar-brand-logo d-none d-md-block">
  <img src="icon-app.svg" alt="{{ nom du projet }}" class="navbar-brand-icon d-md-none">
</div>
```

`.navbar-brand-logo { height: 32px; width: auto; }` et `.navbar-brand-icon {
width: 28px; height: 28px; border-radius: 8px; }` dans
`topbar.component.scss`.

Mettre aussi à jour `src/index.html` (`<title>`) avec le nom réel du projet —
`AngularPanel` est un placeholder, pas un nom à garder.

## Règles d'or — Sidebar

`shared/layout/sidebar/sidebar.component.ts` déclare `menuItems: MenuItem[]`
(`models/menu-item.model.ts`) — `title`/`icon`/`route` pour un lien direct, ou
`children: MenuItem[]` pour un groupe dépliable (le HTML gère déjà les deux cas
via `*ngIf="item.children"`, rien à toucher côté template pour ajouter un
groupe).

### Grouper par domaine dès le deuxième item

Dès qu'un domaine métier a — ou est susceptible d'avoir bientôt — plus d'une
page (liste + référentiel associé, sous-ressources...), le déclarer en groupe
`children` **dès sa création**, même avec un seul enfant au départ :

```ts
{
  title: 'Système', icon: 'fas fa-cog',
  children: [
    { title: 'Emails échoués', icon: 'fas fa-envelope-open-text', route: '/mail/failed' },
  ],
},
```

Pourquoi dès le premier enfant plutôt qu'au moment d'ajouter le deuxième :
convertir un lien plat en groupe après coup change le composant qui le
consomme (route active, icône) et casse l'historique visuel pour les
utilisateurs habitués — autant partir groupé si le domaine va grossir.
Restent des liens plats : `Tableau de bord`, et les entités qui ne
grossiront pas en sous-pages — typiquement `Utilisateurs`, et l'entité
métier centrale d'un projet si elle reste une page unique (ex. une liste de
demandes/commandes sans référentiel associé). Elles méritent l'accès direct
sans clic supplémentaire.

### Profil/Sessions : jamais dans la sidebar

`Mon profil` et `Mes sessions` vivent **uniquement** dans le dropdown du
topbar (`shared/layout/topbar/topbar.component.html`, déjà câblé). Ne pas les
dupliquer dans `menuItems` — ce sont des pages de compte personnel, pas des
sections métier de navigation principale.

### Référence

`sidebar.component.ts` de ce template est la structure minimale de référence
(`Tableau de bord` + `Utilisateurs` en liens plats, `Système` en groupe) —
tout nouveau projet dérivé ajoute ses domaines métier en suivant ce même
principe de groupement.

## Composants partagés

```
src/app/shared/
  pagination/pagination.service.ts        ← setTotalOnly() + slice() avec untracked() (évite NG0600)
  pagination/pagination.component         ← <app-pagination>, barre Précédent/pages/Suivant
  column-visibility/column-visibility.service.ts   ← visibilité de colonnes, persistée par storageKey
  column-visibility/column-visibility.component    ← <app-column-visibility>, dropdown à cases à cocher
  avatar/avatar.helper.ts                 ← AvatarHelper.profileUrl/initials
  avatar/user-avatar.component            ← <app-user-avatar [user] size="xs|sm|md|lg">
  mixins/field-save.mixin.ts              ← FieldSaveMixin abstract
  field-errors/field-errors.component.ts  ← <app-field-errors [formGroup] [controlName] [serverErrors]>
  navigation/navigation-history.service.ts ← retour arrière history-aware (canGoBack, isHome, back(fallback))
  navigation/back-button.component.ts      ← <app-back-button fallback="/xxx"> — flèche des pages détail/création
  navigation/overlay-history.service.ts    ← bouton « retour » OS/navigateur ferme modale/offcanvas/drawer
  navigation/back-dismiss.directive.ts     ← appBackDismiss — à poser sur un .offcanvas Bootstrap
  layout/                                 ← dashboard-layout, sidebar, topbar (shell admin)
```

### Retour arrière — `navigation/`

- **Flèche « retour » des pages détail et création** : jamais un
  `<a routerLink="/liste">` codé en dur — toujours
  `<app-back-button fallback="/liste"></app-back-button>`. Fait un vrai
  `history.back()` (retour là d'où vient l'utilisateur) et ne retombe sur
  `fallback` que si la page a été ouverte en direct (lien externe, refresh).
- **Bouton retour global mobile** : la topbar affiche une flèche `d-md-none`
  quand `navHistory.canGoBack() && !navHistory.isHome()` — la sidebar étant
  masquée sur mobile ; cachée sur l'accueil.
- **Bouton « retour » de l'OS / du navigateur ferme les surcouches d'abord**
  (modale, offcanvas de filtres, drawer sidebar) au lieu de quitter la page.
  Géré par `OverlayHistoryService` (pile LIFO de crans `history.pushState`) :
  - `ModalComponent` et le drawer mobile (`DashboardLayoutComponent`)
    l'utilisent déjà — tout nouvel overlay maison suit le même schéma
    `register(dismiss)` à l'ouverture / `release()` à la fermeture UI.
  - Un `.offcanvas` Bootstrap (piloté par `data-bs-toggle`) reçoit juste
    l'attribut `appBackDismiss` (+ `BackDismissDirective` dans les `imports`).

## Règles UX importantes

1. **Swal** pour toutes les actions destructives (suppression, déconnexion
   globale) — jamais `confirm()` natif. `confirmButtonColor: '#dc2626'` pour
   les confirmations de suppression.
2. **Skeleton** au premier chargement uniquement
   (`isLoading = computed(() => signal() === undefined)`) — jamais réaffiché
   sur un rechargement silencieux (page/filtre/tri) tant que des données sont
   déjà connues.
3. **`Swal.showLoading()`** uniquement pour un rafraîchissement déclenché par
   un clic explicite sur "Actualiser" — jamais sur un rechargement silencieux.
4. **`empty-state`** (icône + titre + texte court) quand une liste est vide
   après chargement — jamais un tableau qui affiche juste rien.
5. **`FieldSaveMixin`** partout où un formulaire édite une entité existante —
   zéro déclencheur automatique (voir règle absolue ci-dessus).
6. **Colonnes configurables** (`ColumnVisibilityService`) dès qu'une liste a
   plus de 3-4 colonnes optionnelles — pas nécessaire pour une liste à 2
   colonnes fixes.

## Chemins relatifs des imports partagés

La profondeur de nesting sous `components/` détermine le nombre de `../` vers
`shared/` :

- `components/<entité>.component.ts` (profondeur 1, ex. `profile/`,
  `sessions/`) → `../../shared/...`
- `components/<domaine>/<entité>/<entité>.component.ts` (profondeur 2, ex.
  `users/user-list/`, `auth/login/`) → `../../../shared/...`

Vérifier la profondeur réelle avant de copier-coller un import d'un autre
composant — une erreur ici casse silencieusement la résolution de module
seulement au build.
