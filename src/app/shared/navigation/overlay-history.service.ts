import { inject, Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Fait fermer les surcouches (modale, offcanvas de filtres, drawer sidebar
 * mobile) par le bouton « retour » de l'OS / du navigateur, au lieu de
 * quitter la page — comportement attendu sur mobile.
 *
 * Principe : à l'ouverture, l'overlay appelle `register()` qui empile un cran
 * d'historique factice (`history.pushState`, même URL) + sa fonction de
 * fermeture. Sur `popstate`, le cran du haut de pile est dépilé et sa
 * fermeture déclenchée — sans navigation. À la fermeture par l'UI (Échap,
 * backdrop, bouton), l'overlay appelle `release()` qui retire le cran
 * (`history.back()` neutralisé pour ne pas re-déclencher la fermeture).
 *
 * Pile LIFO : plusieurs overlays empilés se ferment un par un.
 */
@Injectable({ providedIn: 'root' })
export class OverlayHistoryService {
  private readonly router = inject(Router);

  /** Fonctions de fermeture des overlays ouverts, du plus ancien au plus récent. */
  private stack: Array<() => void> = [];

  /** Ignore le prochain `popstate` (celui provoqué par notre propre `release()`). */
  private ignoreNextPop = false;

  constructor() {
    window.addEventListener('popstate', () => {
      if (this.ignoreNextPop) {
        this.ignoreNextPop = false;
        return;
      }
      const dismiss = this.stack.pop();
      if (dismiss) dismiss();
    });

    // Navigation interne (clic sur un lien) alors qu'un overlay est ouvert :
    // on ferme visuellement tout et on vide la pile — le routeur gère
    // l'historique à partir de là.
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => {
        if (this.stack.length === 0) return;
        const pending = this.stack.splice(0);
        pending.forEach((dismiss) => dismiss());
      });
  }

  /**
   * Déclare un overlay ouvert. `dismiss` ferme l'overlay SANS toucher à
   * l'historique (il sera appelé quand l'utilisateur presse « retour »).
   */
  register(dismiss: () => void): void {
    this.stack.push(dismiss);
    history.pushState({ __overlay: this.stack.length }, '');
  }

  /**
   * L'overlay s'est fermé via l'UI — retire son cran d'historique. À
   * n'appeler que si la fermeture ne vient pas d'un `popstate`.
   */
  release(): void {
    if (this.stack.length === 0) return;
    this.stack.pop();
    this.ignoreNextPop = true;
    history.back();
  }

  /**
   * L'overlay se ferme parce qu'une navigation interne démarre (clic sur un
   * lien) — on retire le cran de la pile SANS `history.back()` : le routeur
   * réécrit l'historique juste après, un `back()` concurrent provoquerait un
   * aller-retour. Le cran factice restant pointe sur l'URL courante, il est
   * donc transparent.
   */
  discardTop(): void {
    this.stack.pop();
  }
}
