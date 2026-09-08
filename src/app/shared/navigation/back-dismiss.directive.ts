import { Directive, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { OverlayHistoryService } from './overlay-history.service';

/**
 * À poser sur un `.offcanvas` Bootstrap (piloté par `data-bs-toggle`) pour que
 * le bouton « retour » de l'OS / du navigateur le referme au lieu de quitter
 * la page. Voir `OverlayHistoryService`.
 *
 * ```html
 * <div class="offcanvas offcanvas-end" id="filtersOffcanvas" appBackDismiss>
 * ```
 */
@Directive({ selector: '[appBackDismiss]' })
export class BackDismissDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlayHistory = inject(OverlayHistoryService);

  // Vrai quand la fermeture en cours vient du bouton « retour » (via le
  // service) et non de l'UI — on ne doit alors pas rappeler release().
  private closingFromHistory = false;

  private readonly onShown = (): void => {
    this.overlayHistory.register(() => {
      this.closingFromHistory = true;
      const bs = (window as unknown as { bootstrap?: any }).bootstrap;
      bs?.Offcanvas?.getOrCreateInstance(this.el.nativeElement)?.hide();
    });
  };

  private readonly onHidden = (): void => {
    if (this.closingFromHistory) {
      this.closingFromHistory = false;
      return;
    }
    this.overlayHistory.release();
  };

  ngOnInit(): void {
    this.el.nativeElement.addEventListener('shown.bs.offcanvas', this.onShown);
    this.el.nativeElement.addEventListener('hidden.bs.offcanvas', this.onHidden);
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('shown.bs.offcanvas', this.onShown);
    this.el.nativeElement.removeEventListener('hidden.bs.offcanvas', this.onHidden);
  }
}
