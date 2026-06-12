import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * appParallax — desplaza verticalmente un elemento conforme su contenedor cruza
 * el viewport, atado al scroll (ScrollTrigger `scrub`, mismo reloj que Lenis).
 * Da la sensación cinematográfica de profundidad entre segmentos.
 *
 *   <div class="bleed">          <!-- overflow:hidden, el marco -->
 *     <img [appParallax]="0.18" src="…" />   <!-- imagen con overscan en SCSS -->
 *   </div>
 *
 * El valor (0–1) es la fracción de la altura del CONTENEDOR que la imagen
 * recorre en total. El SCSS debe dar a la imagen overscan suficiente
 * (height:140%; top:-20%) para que el desplazamiento nunca muestre un borde.
 * Honra prefers-reduced-motion (no hace nada).
 */
@Directive({
  selector: '[appParallax]',
  standalone: true,
})
export class ParallaxDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Fracción de la altura del contenedor recorrida en total (0–1). */
  readonly amount = input(0.18, { alias: 'appParallax' });

  private st: ScrollTrigger | null = null;

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.registerPlugin(ScrollTrigger);
      const el = this.host.nativeElement;
      const frame = el.parentElement ?? el;
      // Recorrido total = fracción × alto del contenedor; ±la mitad desde el centro.
      const travel = frame.offsetHeight * this.amount();

      this.st = ScrollTrigger.create({
        trigger: frame,
        start: 'top bottom', // empieza cuando el marco entra por abajo
        end: 'bottom top', // termina cuando sale por arriba
        scrub: true, // atado al scroll (suave vía Lenis)
        animation: gsap.fromTo(
          el,
          { yPercent: 0, y: travel / 2 },
          { y: -travel / 2, ease: 'none' },
        ),
      });

      this.destroyRef.onDestroy(() => this.st?.kill());
    });
  }
}
