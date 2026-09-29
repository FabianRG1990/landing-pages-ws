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
import { PORTAFOLIO } from '@moofy-ui-shared/data/site';
import { LogoComponent } from '@moofy-ui-shared/marca/logo';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

/**
 * La firma de la marca: el único plano blanco de la página, con el logo
 * en grande, como el «ADN BUSINESS» gigante de la referencia. Pan José y
 * Panrico aparecen aquí, debajo de Moofy y con mucho menos peso.
 *
 * Con el scroll el panel se abre desde un recorte más estrecho (`scrub:
 * true`, porque Lenis ya suaviza). El logo no va ligado al scroll: cae
 * una vez, grande y torcido, y se estampa con un rebote corto mientras
 * el panel acusa el golpe. Un sello no se reproduce hacia atrás.
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
      montarEscena(destroyRef, () => {
        const panel = this.panel().nativeElement;
        const logo = this.logo().nativeElement;

        gsap.fromTo(
          panel,
          { clipPath: 'inset(9% 7% round 32px)' },
          {
            clipPath: 'inset(0% 0% round 32px)',
            ease: 'none',
            scrollTrigger: {
              trigger: this.seccion().nativeElement,
              start: 'top 90%',
              end: 'center 55%',
              scrub: true,
            },
          },
        );

        gsap
          .timeline({ scrollTrigger: { trigger: panel, start: 'top 62%', once: true } })
          .from(logo, { scale: 1.9, rotation: -9, opacity: 0, duration: 0.7, ease: 'back.out(1.6)' })
          // El golpe: el panel baja 5 px y vuelve, en el instante del sello
          .fromTo(panel, { y: 0 }, { y: 5, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.out' }, 0.32);
      });
    });
  }
}
