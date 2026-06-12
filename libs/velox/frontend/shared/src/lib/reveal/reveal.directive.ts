import {
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  afterNextRender,
  inject,
} from '@angular/core';
import { RevealOnScroll } from './reveal-on-scroll.service';

/**
 * appReveal — reveal de entrada al hacer scroll. Marca el elemento con la
 * clase `.reveal` (oculto) vía HostBinding —presente también en el HTML
 * prerenderizado, sin flash— y lo registra en el servicio compartido, que se
 * encarga de revelarlo con una cascada limpia y ordenada por DOM.
 *
 *   <div appReveal></div>
 *
 * El stagger lo decide el servicio (no un delay por elemento), así el scroll
 * rápido no desordena la animación. Honra prefers-reduced-motion.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reveal = inject(RevealOnScroll);
  private readonly destroyRef = inject(DestroyRef);

  @HostBinding('class.reveal') readonly hostClass = true;

  constructor() {
    afterNextRender(() => this.reveal.observe(this.host.nativeElement));
    this.destroyRef.onDestroy(() =>
      this.reveal.unobserve(this.host.nativeElement),
    );
  }
}
