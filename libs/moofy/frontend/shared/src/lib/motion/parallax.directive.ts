import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Parallax de la imagen dentro de su marco: el marco (host) recorta y la
 * imagen se desplaza en vertical mientras el marco cruza la pantalla.
 *
 * La imagen se escala lo justo para que el desplazamiento nunca deje ver
 * el borde: con ±`recorrido` % de su alto, la escala mínima es
 * 1 + 2·recorrido/100.
 *
 * `scrub: true` porque Lenis ya suaviza el scroll; un número apilaría
 * un segundo suavizado. Solo transform: compone en GPU.
 */
@Directive({
  selector: '[appParallax]',
})
export class ParallaxDirective {
  /** Desplazamiento máximo, en % del alto de la imagen, hacia cada lado. */
  readonly recorrido = input(6);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const marco = this.host.nativeElement;
      const img = marco.querySelector('img');
      if (!img) return;

      gsap.registerPlugin(ScrollTrigger);
      const r = this.recorrido();
      const tween = gsap.fromTo(
        img,
        { yPercent: -r, scale: 1 + (2 * r) / 100 },
        {
          yPercent: r,
          ease: 'none',
          scrollTrigger: { trigger: marco, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
      destroyRef.onDestroy(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });
  }
}
