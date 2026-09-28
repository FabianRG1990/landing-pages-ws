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
import { PROCESO } from '@moofy-ui-shared/data/site';
import { CapituloComponent } from '@moofy-ui-shared/tipografia/capitulo';
import { RenglonesComponent } from '@moofy-ui-shared/tipografia/renglones';
import { RevelarDirective } from '@moofy-ui-shared/motion/revelar.directive';

/**
 * Capítulo 04: cuatro pasos y una línea que los recorre al ritmo del
 * scroll. La línea crece con `scaleX` en escritorio y `scaleY` en móvil
 * (la dirección la decide el CSS con --eje); solo transform, en GPU.
 */
@Component({
  selector: 'app-proceso',
  imports: [CapituloComponent, RenglonesComponent, RevelarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proceso.html',
  styleUrl: './proceso.scss',
})
export class ProcesoComponent {
  protected readonly p = PROCESO;

  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  private readonly linea = viewChild.required<ElementRef<HTMLElement>>('linea');
  private readonly progreso = viewChild.required<ElementRef<HTMLElement>>('progreso');

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador) return;
      const barra = this.progreso().nativeElement;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        barra.style.setProperty('--avance', '1');
        this.pista().nativeElement.querySelectorAll('.paso').forEach((p) => p.classList.add('paso--alcanzado'));
        return;
      }

      gsap.registerPlugin(ScrollTrigger);
      const pista = this.pista().nativeElement;
      const pasos = Array.from(pista.querySelectorAll<HTMLElement>('.paso'));

      // Cada nodo se enciende cuando la punta de la línea lo alcanza. Se
      // compara con la posición REAL del nodo sobre la línea (izquierda en
      // escritorio, arriba en móvil), no con i/(n-1): los nodos van al
      // inicio de cada columna y no están repartidos a partes iguales.
      const pintar = (avance: number) => {
        barra.style.setProperty('--avance', avance.toFixed(4));
        const linea = this.linea().nativeElement.getBoundingClientRect();
        const vertical = linea.height > linea.width;
        const largo = vertical ? linea.height : linea.width;
        for (const paso of pasos) {
          const r = paso.getBoundingClientRect();
          const pos = vertical ? r.top - linea.top : r.left - linea.left;
          paso.classList.toggle('paso--alcanzado', avance * largo >= pos - 1);
        }
      };

      const st = ScrollTrigger.create({
        trigger: pista,
        start: 'top 78%',
        end: 'bottom 55%',
        onUpdate: (s) => pintar(s.progress),
        onRefresh: (s) => pintar(s.progress),
      });
      destroyRef.onDestroy(() => st.kill());
    });
  }
}
