import {
  Directive,
  ElementRef,
  HostBinding,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * appReveal — reveal de entrada (equivale al "data-reveal" del sitio
 * original). Aplica la clase `.reveal` (oculto) vía HostBinding —presente
 * también en el HTML prerenderizado, así no hay flash— y agrega `.is-visible`
 * cuando el elemento entra en viewport.
 *
 * El atributo opcional `data-delay` (ej. "0.12s") escala el stagger.
 *   <div appReveal></div>
 *   <h1 appReveal data-delay="0.12s"></h1>
 *
 * Honra prefers-reduced-motion (la regla CSS neutraliza el estado oculto).
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  @HostBinding('class.reveal') readonly hostClass = true;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const el = this.host.nativeElement;

      const delay = el.getAttribute('data-delay');
      if (delay) el.style.transitionDelay = delay;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.classList.add('is-visible');
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              el.classList.add('is-visible');
              observer.disconnect();
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      observer.observe(el);
    });
  }
}
