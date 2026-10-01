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
  viewChildren,
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
  /** Progreso 0..1 de toda la secuencia. */
  protected readonly avance = signal(0);

  /** Los tramos del isotipo, cada uno animado por separado. */
  protected readonly trazos = [
    'M43.69 16.5L47.5 15.73L50.5 16.12L52.95 17.5L55.81 20.5L56.83 23.5L56.87 26.5L55.97 29.5L54.5 31.47L51.5 33.73L48.5 34.65L46.5 34.63L42.5 33.23L12.5 50.37L8.26 53.5L8.51 140.5L18.5 146.55L20.5 147.01L82.5 110.57L120.5 132.15L126.5 130.88L129.5 131.45L132.5 133.22L134.95 136.5L135.66 141.5L134.2 145.5L130.5 148.86L127.5 149.82L125.5 149.85L122.5 149.02L120.5 147.8L118.3 145.5L117.12 142.5L116.81 139.5L115.5 138.73L110.5 141.09L83.5 156.81L82.5 156.71L51.5 138.87L20.5 156.86L19.5 156.85L0.16 145.5L0.08 48.5L1.5 47.22L37.5 26.54L39.27 20.5L40.83 18.5Z',
    'M96.18 28.5L100.5 28.02L103.5 28.86L106.89 31.5L107.99 33.5L108.72 36.5L108.47 39.5L107.25 42.5L103.3 46.5L103.5 48.58L133.5 66.11L135.04 67.5L135.33 103.5L166.11 121.5L166.55 122.5L166.56 144.5L166.43 145.5L164.5 146.92L83.5 194.19L44.5 171.84L41.5 172.75L38.5 172.9L33.5 170.67L31 167.5L30.05 163.5L30.91 159.5L34.5 155.41L38.5 154.01L41.5 154.1L44.5 155.3L47.64 158.5L48.89 161.5L49 164.5L49.53 165.5L81.5 183.99L83.5 184.67L156.5 141.87L158.31 140.5L158.54 139.5L158.52 127.5L157.94 126.5L99.5 92.82L94.96 89.5L94.96 46.5L94.62 45.5L92.21 43.5L90.96 41.5L90.21 39.5L90.08 36.5L90.41 34.5L91.92 31.5L94.5 29.19Z',
    'M82.5 0.5L83.5 0.08L85.5 1.12L165.85 47.5L166.54 48.5L166.56 91.5L166.69 92.5L170.89 96.5L171.87 98.5L172.24 101.5L171.84 104.5L170.84 106.5L168.5 109L163.5 110.86L158.5 109.87L156.5 108.5L154.91 106.5L153.39 102.5L154.22 97.5L158.5 92.5L158.54 54.5L157.74 52.5L83.5 9.79L78.5 12.17L71.8 16.5L71.62 89.5L68.5 91.87L34.5 111.31L32.61 117.5L29.5 120.53L26.5 121.86L22.5 121.84L19.52 120.5L17.1 118.5L15.5 115.15L15.16 112.5L15.3 110.5L17.21 106.5L19.64 104.5L22.5 103.25L26.5 103.25L29.5 104.37L31.44 103.5L31.94 102.5L31.93 67.5L32.4 66.5L63.2 48.5L63.75 11.5Z',
    'M82.2 120.5L83.5 120.15L85.5 121.14L106.33 133.5L103.5 135.78L84.5 146.68L82.5 147.23L81.5 146.84L60.5 134.65L60.2 133.5Z',
    'M103.28 59.5L104.5 59.09L106.5 60.1L125.5 71.15L126.92 72.5L126.97 97.5L126.5 98.57L103.5 84.99Z',
    'M60.98 59.5L62.5 58.77L63.42 59.5L63.45 84.5L62.92 85.5L41.5 97.85L40.5 97.98L40.13 97.5L40.36 71.5Z',
  ];

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly tramos = viewChildren<ElementRef<SVGPathElement>>('trazo');

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

  /**
   * Descubre el isotipo de forma continua y pareja.
   *
   * Se completa al LLEGAR al ultimo eje, no al final del scroll: a partir de
   * ahi el dibujo ya esta hecho y solo quedan encendiendose los dos ultimos
   * nodos, que es lo que acompana al tercer eje mientras se lee.
   */
  private pintarTrazo(p: number): void {
    const n = this.ejes.length;
    const q = Math.min(1, p * (n / (n - 1)));
    const visto = 0.06 + q * 0.94;
    for (const ref of this.tramos()) {
      const path = ref.nativeElement;
      const largo = path.getTotalLength();
      path.style.strokeDasharray = String(largo);
      path.style.strokeDashoffset = String(largo * (1 - visto));
    }
  }
}
