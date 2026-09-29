import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PORTAFOLIO } from '@moofy-ui-shared/data/site';
import { LogoComponent } from '@moofy-ui-shared/marca/logo';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/**
 * La firma de la marca: el único plano blanco de la página, con el logo
 * en grande, como el «ADN BUSINESS» gigante de la referencia. Pan José y
 * Panrico aparecen aquí, debajo de Moofy y con mucho menos peso.
 *
 * Con el scroll el panel se abre desde un recorte más estrecho y el logo
 * se asienta de 0.84 a 1: un plano que se acerca. `scrub: true` porque
 * Lenis ya suaviza; clip-path y transform, sin reflujo.
 */
@Component({
  selector: 'app-firma',
  imports: [LogoComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './firma.html',
  styleUrl: './firma.scss',
})
export class FirmaComponent {
  protected readonly p = PORTAFOLIO;

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly logo = viewChild.required<ElementRef<HTMLElement>>('logo');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.registerPlugin(ScrollTrigger);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: this.seccion().nativeElement,
          start: 'top 90%',
          end: 'center 55%',
          scrub: true,
        },
        defaults: { ease: 'none' },
      });
      tl.fromTo(
        this.panel().nativeElement,
        { clipPath: 'inset(9% 7% round 32px)' },
        { clipPath: 'inset(0% 0% round 32px)' },
        0,
      );
      tl.fromTo(this.logo().nativeElement, { scale: 0.84 }, { scale: 1 }, 0);

      destroyRef.onDestroy(() => {
        tl.scrollTrigger?.kill();
        tl.kill();
      });
    });
  }
}
