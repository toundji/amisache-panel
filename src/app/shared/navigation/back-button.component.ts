import { Component, inject, Input } from '@angular/core';
import { NavigationHistoryService } from './navigation-history.service';

/**
 * Flèche « retour » des pages détail et création. Revient dans l'historique
 * réel du navigateur (là d'où l'utilisateur vient) via
 * `NavigationHistoryService` ; `fallback` n'est utilisé que si la page a été
 * ouverte en direct, sans historique interne.
 *
 * ```html
 * <app-back-button fallback="/users"></app-back-button>
 * <app-back-button [fallback]="'/companies/' + companyId"></app-back-button>
 * ```
 */
@Component({
  selector: 'app-back-button',
  template: `
    <button type="button" class="btn btn-icon btn-outline-secondary"
      (click)="nav.back(fallback)" aria-label="Retour">
      <i class="fas fa-arrow-left"></i>
    </button>
  `,
  styles: [':host { display: inline-flex; }'],
})
export class BackButtonComponent {
  readonly nav = inject(NavigationHistoryService);

  /** Route de repli quand aucun historique interne n'est disponible. */
  @Input({ required: true }) fallback = '';
}
