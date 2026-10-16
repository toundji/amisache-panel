import { Component, inject } from '@angular/core';

import { ClergyContextService } from '../../../services/clergy-context.service';
import { ChurchHomeComponent } from './church-home/church-home.component';
import { PlatformHomeComponent } from './platform-home/platform-home.component';

/**
 * Deux publics, deux accueils : les administrateurs de la plateforme
 * (admin/engineer — validation des églises, comptes, santé technique) et le
 * clergé (son église active — demandes et paiements à traiter).
 * Même règle d'accès que le reste du panel : `isFullAccess` prime.
 */
@Component({
  selector: 'app-home',
  imports: [ChurchHomeComponent, PlatformHomeComponent],
  template: `
    @if (clergyContext.isFullAccess()) {
      <app-platform-home></app-platform-home>
    } @else {
      <app-church-home></app-church-home>
    }
  `,
})
export class HomeComponent {
  readonly clergyContext = inject(ClergyContextService);
}
