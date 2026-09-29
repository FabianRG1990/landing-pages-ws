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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROCESO } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';
import { IconoComponent } from '@moofy-ui-shared/marca/icono';
import { montarEscena } from '@moofy-ui-shared/motion/escena';

/**
 * Capítulo 04: la franja azul de la página. Cuatro pasos, una línea que
 * los recorre al ritmo del scroll y un camión que la sigue; cada paso se
 * enciende cuando el camión llega a él.
 *
 * Todo cuelga de una sola variable, `--avance` (0 a 1) en la pista: la
 * línea crece con scaleX/scaleY y el camión se traslada en unidades del
 * contenedor (cqw/cqh), así que no se mide nada en cada fotograma salvo
 * los nodos. Escritorio: la sección se fija mientras el camión viaja.
 * Móvil: sin pin, la línea baja por la izquierda.
 */
@Component({
  selector: 'app-proceso',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proceso.html',
  styleUrl: './proceso.scss',
})
export class ProcesoComponent {
  protected readonly p = PROCESO;

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;

      // Sin movimiento: el recorrido ya hecho, que es el estado que se lee.
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.avanzar(1);
        return;
      }

      montarEscena(destroyRef, ({ escritorio }) => {
        const seccion = this.seccion().nativeElement;
        const pista = this.pista().nativeElement;
        if (escritorio) seccion.classList.add('proceso--fijo');
        ScrollTrigger.create({
          ...(escritorio
            ? {
                trigger: seccion,
                start: 'top top',
                end: () => '+=' + window.innerHeight * 1.5,
                pin: true,
              }
            : { trigger: pista, start: 'top 78%', end: 'bottom 55%' }),
          invalidateOnRefresh: true,
          onUpdate: (s) => this.avanzar(s.progress),
          onRefresh: (s) => this.avanzar(s.progress),
        });
        return () => seccion.classList.remove('proceso--fijo');
      });
    });
  }

  /**
   * Pone el recorrido en `avance` (0 a 1): la línea, el camión y los
   * nodos alcanzados. Público para que quien orqueste la sección desde
   * fuera (un pin que la contiene) pueda llevar el camión.
   *
   * Cada nodo se enciende cuando el camión lo alcanza. Se compara con la
   * posición REAL del nodo sobre la línea (izquierda en escritorio, arriba
   * en móvil), no con i/(n-1): los nodos van al inicio de cada columna y
   * no están repartidos a partes iguales.
   */
  avanzar(avance: number): void {
    const pista = this.pista().nativeElement;
    pista.style.setProperty('--avance', avance.toFixed(4));
    const linea = pista.querySelector('.proceso__linea')?.getBoundingClientRect();
    if (!linea) return;
    const vertical = linea.height > linea.width;
    const largo = vertical ? linea.height : linea.width;
    for (const paso of Array.from(pista.querySelectorAll<HTMLElement>('.paso'))) {
      const r = paso.getBoundingClientRect();
      const pos = vertical ? r.top - linea.top : r.left - linea.left;
      paso.classList.toggle('paso--alcanzado', avance * largo >= pos - 1);
    }
  }
}
