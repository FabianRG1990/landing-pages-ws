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
import { COBERTURA } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { montarEscena } from '@moofy-ui-shared/motion/escena';
import { MAPA } from './mapa-cr';

/**
 * Capítulo 02: la cobertura. Moofy llega a cualquier punto del país.
 *
 * El argumento a la izquierda y, a la derecha, el mapa de Costa Rica con
 * sus siete provincias y una ruta que sale de la planta en Grecia hacia
 * cada una.
 *
 * El mapa se arma así: las provincias aparecen escalonadas, la planta
 * cae, las rutas se trazan desde ella y cada destino se enciende cuando
 * su ruta llega.
 *
 * Escritorio: la sección ocupa la pantalla y el scroll lleva la
 * secuencia; empieza con la sección subiendo y termina durante una parada
 * corta. Móvil: sin parada; el mapa se arma una vez, a su ritmo, al
 * asomar. Sin movimiento, el mapa está completo desde el principio, que
 * es lo que pinta el HTML.
 */
@Component({
  selector: 'app-cobertura',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cobertura.html',
  styleUrl: './cobertura.scss',
})
export class CoberturaComponent {
  protected readonly c = COBERTURA;
  protected readonly m = MAPA;

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly mapa = viewChild.required<ElementRef<SVGSVGElement>>('mapa');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      montarEscena(destroyRef, ({ escritorio }) => this.armar(escritorio));
    });
  }

  private armar(escritorio: boolean): () => void {
    const seccion = this.seccion().nativeElement;
    const mapa = this.mapa().nativeElement;
    const q = <T extends Element>(s: string) => gsap.utils.toArray<T>(s, mapa);
    const rutas = q<SVGPathElement>('.mapa__ruta');
    const destinos = q<SVGGElement>('.mapa__destino');

    // Escritorio: el mapa empieza a armarse con la sección aún subiendo
    // (ENTRADA) y la sección se detiene un momento (PARADA) mientras las
    // rutas terminan de llegar. La parada es corta a propósito: una
    // pantalla entera de pin con el mapa ya hecho se siente como un bache.
    const ENTRADA = 0.6;
    const PARADA = 0.45;
    if (escritorio) {
      ScrollTrigger.create({
        trigger: seccion,
        start: 'top top',
        end: () => '+=' + window.innerHeight * PARADA,
        pin: true,
        invalidateOnRefresh: true,
      });
      // Quien llega por el menú debe ver el mapa hecho, no a medias: el
      // ancla va al final de la parada (SmoothScroll lee esta marca).
      seccion.setAttribute('data-ancla-fin', '');
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: escritorio
        ? {
            trigger: seccion,
            start: () => `top ${ENTRADA * 100}%`,
            end: () => '+=' + window.innerHeight * (ENTRADA + PARADA),
            scrub: true,
            invalidateOnRefresh: true,
          }
        : { trigger: mapa, start: 'top 72%', once: true },
    });

    tl.from(q('.mapa__provincia'), { opacity: 0, y: 14, duration: 0.7, stagger: 0.07 }, 0)
      .from(q('.mapa__planta'), { opacity: 0, scale: 0.2, duration: 0.6, ease: 'back.out(2.2)', transformOrigin: '0 0' }, 0.55)
      .from(rutas, { drawSVG: '0%', duration: 0.95, ease: 'power2.inOut', stagger: 0.11 }, 0.85);

    // Cada destino se enciende cuando su ruta está llegando
    destinos.forEach((destino, i) => {
      tl.from(
        destino.querySelector('.mapa__punto'),
        { scale: 0, duration: 0.45, ease: 'back.out(3)', transformOrigin: '50% 50%' },
        0.85 + i * 0.11 + 0.72,
      ).from(destino.querySelector('.mapa__nombre'), { opacity: 0, duration: 0.4 }, '<0.05');
    });

    // Con el scroll al mando, un respiro al final: el mapa completo se
    // queda a la vista antes de que la sección se suelte.
    if (escritorio) tl.to({}, { duration: 0.5 });

    return () => seccion.removeAttribute('data-ancla-fin');
  }
}
