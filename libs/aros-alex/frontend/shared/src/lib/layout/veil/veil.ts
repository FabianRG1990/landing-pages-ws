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
 * Cortina de transición entre secciones. Solo renderiza el DOM y lo registra en
 * `PageTransition`, que orquesta la animación sincronizada con el router (cubre
 * → cambia la sección oculta → revela). Respeta prefers-reduced-motion.
 */
@Component({
  selector: 'app-veil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #veil class="veil" aria-hidden="true">
      <span class="veil-line"></span>
      <div #mark class="veil-mark">
        <img src="assets/aros-alex/logo-ghost.png" alt="" />
      </div>
    </div>
  `,
})
export class Veil {
  private readonly veil = viewChild.required<ElementRef<HTMLElement>>('veil');
  private readonly mark = viewChild.required<ElementRef<HTMLElement>>('mark');
  private readonly transition = inject(PageTransition);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.transition.register(
        this.veil().nativeElement,
        this.mark().nativeElement,
      );
    });
    this.destroyRef.onDestroy(() => this.transition.unregister());
  }
}
