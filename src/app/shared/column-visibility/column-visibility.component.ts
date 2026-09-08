import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnVisibilityService } from './column-visibility.service';

/**
 * Bouton "Colonnes" — dropdown à cases à cocher pilotant `ColumnVisibilityService`.
 * Le parent doit avoir appelé `columnVisibility.init(storageKey, columns)`
 * avant l'affichage (ex. dans son constructeur).
 */
@Component({
  selector: 'app-column-visibility',
  imports: [CommonModule],
  template: `
    <div class="dropdown d-inline-block">
      <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside">
        <i class="fas fa-table-columns me-1"></i>Colonnes
      </button>
      <ul class="dropdown-menu dropdown-menu-end p-2" style="min-width: 200px;">
        @for (col of columnVisibility.columns(); track col.key) {
          <li>
            <div class="form-check">
              <input type="checkbox" class="form-check-input" [id]="'col-' + col.key"
                [checked]="columnVisibility.isVisible(col.key)" (change)="columnVisibility.toggle(col.key)">
              <label class="form-check-label" [for]="'col-' + col.key">{{ col.label }}</label>
            </div>
          </li>
        }
        <li><hr class="dropdown-divider"></li>
        <li>
          <button type="button" class="btn btn-sm btn-link text-muted text-decoration-none p-0" (click)="columnVisibility.resetToDefaults()">
            <i class="fas fa-undo me-1"></i>Réinitialiser
          </button>
        </li>
      </ul>
    </div>
  `,
})
export class ColumnVisibilityComponent {
  constructor(public columnVisibility: ColumnVisibilityService) {}
}
