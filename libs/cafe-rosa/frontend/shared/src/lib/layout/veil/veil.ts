import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { PageTransition } from '../../transitions/page-transition.service';

/**
 * Cortina cinematográfica de dos hojas. Solo renderiza el DOM y lo registra en
 * `PageTransition`, que orquesta la animación sincronizada con el router
 * (cierra → cambia la sección oculta → abre). Respeta prefers-reduced-motion.
 */
@Component({
  selector: 'app-veil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="veil" aria-hidden="true">
      <div #top class="veil-panel veil-top"></div>
      <div #bottom class="veil-panel veil-bottom"></div>
      <div #mark class="veil-mark">
        <span class="veil-brand">Rosa<span> Café</span></span>
        <span class="veil-rule"></span>
        <span class="veil-tag">Artisan Coffee House</span>
      </div>
    </div>
  `,
})
export class Veil {
  private readonly top = viewChild.required<ElementRef<HTMLElement>>('top');
  private readonly bottom =
    viewChild.required<ElementRef<HTMLElement>>('bottom');
  private readonly mark = viewChild.required<ElementRef<HTMLElement>>('mark');
  private readonly transition = inject(PageTransition);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.transition.register(
        this.top().nativeElement,
        this.bottom().nativeElement,
        this.mark().nativeElement,
      );
    });
    this.destroyRef.onDestroy(() => this.transition.unregister());
  }
}
