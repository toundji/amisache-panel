import { computed, inject, Injectable, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Retour arrière « intelligent », partagé par la flèche des pages détail/
 * création (`BackButtonComponent`) et le bouton retour mobile de la topbar.
 *
 * - S'il existe un historique interne à l'app (l'utilisateur est arrivé ici
 *   en naviguant), `back()` fait un vrai `history.back()` → il revient là
 *   d'où il vient, pas sur une route de liste codée en dur.
 * - Sinon (page ouverte en direct : lien externe, rechargement, nouvel
 *   onglet), `back()` navigue vers la route de repli fournie par l'appelant.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Nombre de navigations abouties depuis le démarrage de l'app.
  private readonly count = signal(0);
  private readonly url = signal('/');

  /** Vrai dès qu'un `history.back()` resterait dans l'app. */
  readonly canGoBack = computed(() => this.count() > 1);

  /** Vrai quand on est sur l'accueil — la flèche retour topbar y est cachée. */
  readonly isHome = computed(() => this.url().split('?')[0].split('#')[0] === '/');

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.count.update((c) => c + 1);
        this.url.set(e.urlAfterRedirects);
      });
  }

  /** Retour arrière si possible, sinon navigation vers `fallback`. */
  back(fallback: string): void {
    if (this.canGoBack()) {
      this.location.back();
    } else {
      this.router.navigateByUrl(fallback);
    }
  }
}
