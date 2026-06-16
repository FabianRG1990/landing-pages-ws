import {
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  afterNextRender,
  inject,
} from '@angular/core';
import { RevealOnScroll } from '../transitions/reveal-on-scroll.service';

/**
 * appReveal — reveal de entrada al hacer scroll. Marca el elemento con la clase
 * `.reveal` (oculto) vía HostBinding —presente también en el HTML
 * prerenderizado, sin flash— y lo registra en el servicio compartido, que lo
 * revela con una cascada ordenada por DOM. Honra prefers-reduced-motion.
 *
 *   <div appReveal></div>
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
