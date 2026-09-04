import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EJES, EJES_INTRO } from '@adn-business-ui-shared/data/site';

/**
 * Los tres ejes.
 *
 * El scroll aqui no decora: construye. Mientras el usuario avanza, el
 * hexagono de la marca se dibuja trazo a trazo y cada vertice enciende
 * uno de los ejes. La estructura se levanta ante los ojos, que es
 * exactamente lo que ADN Business vende.
 *
 * Un solo ScrollTrigger con pin + scrub gobierna todo. El progreso
 * fraccionario mueve el trazo de forma continua; el indice activo es lo
 * unico que se cuantiza.
 */
@Component({
  selector: 'app-ejes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ejes.html',
  styleUrl: './ejes.scss',
})
export class EjesComponent {
  protected readonly ejes = EJES;
  protected readonly intro = EJES_INTRO;

  /** Eje encendido (0..2). */
  protected readonly activo = signal(0);
  /** Progreso 0..1 de toda la secuencia, para la barra tecnica. */
  protected readonly avance = signal(0);

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly trazo = viewChild.required<ElementRef<SVGPathElement>>('trazo');

  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => {
      if (!this.esNavegador) return;

      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const angosto = matchMedia('(max-width: 900px)').matches;

      // En movil o con movimiento reducido no se pinea: la seccion se lee
      // como un documento normal, con todo visible.
      if (reduce || angosto) {
        this.activo.set(this.ejes.length - 1);
        this.avance.set(1);
        this.pintarTrazo(1);
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const st = ScrollTrigger.create({
        trigger: this.seccion().nativeElement,
        start: 'top top',
        // una pantalla de scroll por eje
        end: () => `+=${window.innerHeight * this.ejes.length}`,
        pin: true,
        pinSpacing: true,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          this.avance.set(p);
          this.pintarTrazo(p);

          // el eje activo cambia en los tercios, con una pizca de
          // adelanto para que el texto llegue antes que el trazo
          const i = Math.min(
            this.ejes.length - 1,
            Math.floor(p * this.ejes.length + 0.12),
          );
          if (i !== this.activo()) this.activo.set(i);
        },
      });

      // Estado inicial: sin esto el trazo se ve entero hasta el primer
      // onUpdate y salta de golpe al 15% en cuanto el usuario mueve la rueda.
      this.pintarTrazo(0);

      this.destroyRef.onDestroy(() => st.kill());
    });
  }

  /**
   * Los seis nodos del isotipo, en coordenadas de su viewBox. No estan puestos
   * a ojo: salen de los maximos de la transformada de distancia sobre el logo
   * oficial, que es lo que distingue un disco de un cruce de trazos.
   */
  protected readonly nodos = [
    { cx: 47.25, cy: 25, r: 9.44 },
    { cx: 99.25, cy: 37.25, r: 9.44 },
    { cx: 162.75, cy: 101.25, r: 9.44 },
    { cx: 24.5, cy: 112.25, r: 9.35 },
    { cx: 126.25, cy: 140.25, r: 9.44 },
    { cx: 39.25, cy: 163.25, r: 9.44 }
  ];

  /** Se encienden escalonados con el avance, de arriba abajo. */
  protected nodoVivo(i: number): boolean {
    return this.avance() * this.nodos.length >= i + 0.35;
  }

  /** Descubre el trazo del hexagono de forma continua, no por pasos. */
  private pintarTrazo(p: number): void {
    const path = this.trazo().nativeElement;
    const largo = path.getTotalLength();
    path.style.strokeDasharray = String(largo);
    // arranca con un 6% ya dibujado para que nunca se vea vacio
    path.style.strokeDashoffset = String(largo * (1 - (0.06 + p * 0.94)));
  }
}
