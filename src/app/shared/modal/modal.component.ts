import { Component, EventEmitter, HostListener, inject, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayHistoryService } from '../navigation/overlay-history.service';

/**
 * Modal générique — remplace un `Swal.fire({ html: ... })` à champs multiples
 * (voir CLAUDE.md § Popups — composant plutôt que Swal). Visibilité pilotée
 * par l'input `open`, jamais par le plugin JS Bootstrap (`data-bs-toggle`) :
 * l'état vit dans le composant appelant, comme tout le reste de ce template.
 */
@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  // Pas de styleUrl : Bootstrap fournit déjà .modal/.modal-backdrop, les
  // ajustements visuels vivent globalement dans _bootstrap-overrides.scss
  // (comme .dropdown-menu, .card...) pour rester cohérents avec le reste du
  // template plutôt que dupliqués par composant.
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) open = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Output() closed = new EventEmitter<void>();

  private readonly overlayHistory = inject(OverlayHistoryService);
  private wasOpen = false;
  // Vrai tant qu'un cran d'historique est posé pour cette modale (à retirer
  // via release() si la fermeture vient de l'UI, pas du bouton « retour »).
  private historyRegistered = false;

  ngOnChanges(): void {
    // Empêche le double scroll (page + corps de la modale) tant qu'elle est ouverte.
    document.body.classList.toggle('modal-open', this.open);

    // Le bouton « retour » de l'OS / du navigateur ferme la modale d'abord.
    if (this.open && !this.wasOpen) {
      this.historyRegistered = true;
      this.overlayHistory.register(() => {
        this.historyRegistered = false;
        this.closed.emit();
      });
    }
    this.wasOpen = this.open;
  }

  ngOnDestroy(): void {
    if (this.historyRegistered) {
      this.historyRegistered = false;
      this.overlayHistory.discardTop();
    }
    document.body.classList.remove('modal-open');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  close(): void {
    if (this.historyRegistered) {
      this.historyRegistered = false;
      this.overlayHistory.release();
    }
    this.closed.emit();
  }

  /** Ferme uniquement sur clic du backdrop lui-même, pas sur un clic dans `.modal-content`. */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
