import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RUTA } from '../../data/site';

type Ref<T extends Element = HTMLElement> = ElementRef<T>;

/** Un cruce de lado: entre qué alturas de la página y hacia dónde. */
interface Cruce {
  readonly y0: number;
  readonly y1: number;
  readonly desde: number;
  readonly hasta: number;
  readonly frase: string;
}

/** A qué altura de la pantalla va el camión (fracción del alto visible). */
const ALTURA = 0.54;
/** Segundos que tarda en recorrer el 63 % de lo que le falta. */
const INERCIA = 0.16;
/** Cuánto espera a que el hero termine de entrar antes de aparecer. */
const ENTRADA_MS = 2100;
/** Un cruce más bajo que esto se estira: no da para una curva limpia. */
const CRUCE_MIN = 150;
/** En móvil el blanco entre secciones es corto y la curva no debe salirse. */
const CRUCE_MIN_MOVIL = 84;

/**
 * La ruta: una carretera punteada que baja por toda la página y un camión
 * de reparto, visto desde arriba, que la recorre a medida que se baja.
 *
 * La carretera va por el margen, junto a cada sección, y cruza de un lado
 * al otro en el blanco que hay entre dos secciones: así el camión nunca
 * pasa por encima de un texto. Al cruzar dice una frase corta; al llegar
 * abajo, al pin de destino, dice la última.
 *
 * La curva es una función x(y): siempre baja, nunca vuelve sobre sí. Eso
 * permite colocar el camión solo con la altura (el scroll más media
 * pantalla), sin recorrer el trazado. Va fijo en pantalla y es la página
 * la que pasa por debajo; la carretera es un SVG estático que se desplaza
 * con el contenido, así que por fotograma solo se mueven dos elementos.
 *
 * Decorativo (`aria-hidden`). Con movimiento reducido no se muestra.
 */
@Component({
  selector: 'app-ruta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ruta.html',
  styleUrl: './ruta.scss',
})
export class RutaComponent {
  private readonly ruta = viewChild.required<Ref>('ruta');
  private readonly mapa = viewChild.required<Ref<SVGSVGElement>>('mapa');
  private readonly filete = viewChild.required<Ref<SVGPathElement>>('filete');
  private readonly via = viewChild.required<Ref<SVGPathElement>>('via');
  private readonly hechaCaja = viewChild.required<Ref>('hechaCaja');
  private readonly mapaHecho = viewChild.required<Ref<SVGSVGElement>>('mapaHecho');
  private readonly hechaFilete = viewChild.required<Ref<SVGPathElement>>('hechaFilete');
  private readonly hecha = viewChild.required<Ref<SVGPathElement>>('hecha');
  private readonly origen = viewChild.required<Ref<SVGCircleElement>>('origen');
  private readonly destino = viewChild.required<Ref<SVGGElement>>('destino');
  private readonly camion = viewChild.required<Ref>('camion');
  private readonly rumbo = viewChild.required<Ref>('rumbo');
  private readonly rotulo = viewChild.required<Ref>('rotulo');
  private readonly texto = viewChild.required<Ref>('texto');

  // Geometría (px de documento), calculada en `medir`
  private cruces: Cruce[] = [];
  private xInicio = 0;
  private yInicio = 0;
  private yFin = 0;
  private ancho = 0;
  private alto = 0;
  private alcance = 0;
  /** Sin inercia en táctil: allí el scroll llega con retraso y temblaría. */
  private suave = true;

  // Estado del camión
  private y = 0;
  private angulo = 0;
  private haciaArriba = false;
  private scrollAntes = 0;
  private acumulado = 0;
  private fraseActual = '';
  private lista = false;

  private raf = 0;
  private antes = 0;

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    const zona = inject(NgZone);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!esNavegador || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      zona.runOutsideAngular(() => destroyRef.onDestroy(this.montar()));
    });
  }

  private montar(): () => void {
    const despertar = () => this.despertar();
    const remedir = () => {
      this.medir();
      this.despertar();
    };

    this.suave = matchMedia('(hover: hover) and (pointer: fine)').matches;
    window.addEventListener('scroll', despertar, { passive: true });
    window.addEventListener('resize', remedir);
    // Los pins cambian dónde empieza cada sección: se vuelve a trazar cada
    // vez que ScrollTrigger recalcula (fuentes, imágenes, cambio de ancho).
    ScrollTrigger.addEventListener('refresh', remedir);

    // Aparece cuando el hero ya entró; si se llega con la página bajada
    // (un ancla, una recarga) no hay nada que esperar.
    const entrada = setTimeout(
      () => {
        this.lista = true;
        this.medir();
        this.y = this.objetivo();
        this.scrollAntes = window.scrollY;
        this.ruta().nativeElement.classList.add('ruta--lista');
        this.despertar();
      },
      window.scrollY > 40 ? 0 : ENTRADA_MS,
    );

    return () => {
      clearTimeout(entrada);
      cancelAnimationFrame(this.raf);
      window.removeEventListener('scroll', despertar);
      window.removeEventListener('resize', remedir);
      ScrollTrigger.removeEventListener('refresh', remedir);
    };
  }

  /** Traza la carretera: márgenes, cruces, origen y destino. */
  private medir(): void {
    const margen = document.querySelector<HTMLElement>('main .shell');
    const pie = document.querySelector<HTMLElement>(RUTA.destino.antesDe);
    if (!margen || !pie) return;

    this.ancho = document.documentElement.clientWidth;
    this.alto = window.innerHeight;

    // El centro de cada margen: entre el borde de la pantalla (o del
    // ancho máximo) y donde empieza el contenido.
    const caja = margen.getBoundingClientRect();
    const estilo = getComputedStyle(margen);
    const izquierda = caja.left + parseFloat(estilo.paddingLeft) / 2;
    const derecha = caja.right - parseFloat(estilo.paddingRight) / 2;

    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    this.xInicio = izquierda;
    this.yInicio = navH + 26;
    this.yFin = this.arribaDe(pie) - 64;

    // Un cruce por frontera; cada uno sale del lado al que llegó el anterior
    let lado = izquierda;
    this.cruces = [];
    for (const c of RUTA.cruces) {
      const antes = document.querySelector<HTMLElement>(c.antes);
      const despues = document.querySelector<HTMLElement>(c.despues);
      if (!antes || !despues) continue;
      const frontera = this.arribaDe(despues);
      let y0 = frontera - parseFloat(getComputedStyle(antes).paddingBottom);
      let y1 = frontera + parseFloat(getComputedStyle(despues).paddingTop);
      const minimo = this.ancho < 900 ? CRUCE_MIN_MOVIL : CRUCE_MIN;
      if (y1 - y0 < minimo) {
        const centro = (y0 + y1) / 2;
        y0 = centro - minimo / 2;
        y1 = centro + minimo / 2;
      }
      const otro = lado === izquierda ? derecha : izquierda;
      this.cruces.push({ y0, y1, desde: lado, hasta: otro, frase: c.frase });
      lado = otro;
    }

    // El trazado: recto en los márgenes, muestreado en las curvas
    const p = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    let d = `M${p(this.xInicio, this.yInicio)}`;
    for (const c of this.cruces) {
      d += `L${p(c.desde, c.y0)}`;
      for (let y = c.y0 + 6; y < c.y1; y += 6) d += `L${p(this.xEn(y), y)}`;
      d += `L${p(c.hasta, c.y1)}`;
    }
    d += `L${p(lado, this.yFin)}`;

    const mapa = this.mapa().nativeElement;
    mapa.setAttribute('height', String(Math.ceil(this.yFin + 8)));
    this.mapaHecho().nativeElement.setAttribute('height', String(Math.ceil(this.yFin + 8)));
    for (const trazo of [this.filete(), this.via(), this.hechaFilete(), this.hecha()]) {
      trazo.nativeElement.setAttribute('d', d);
    }
    // Hasta dónde llega el blanco de abajo: ahí es donde cabe la última frase
    const ultima = document.querySelector<HTMLElement>(RUTA.destino.ultimaSeccion);
    this.alcance = 64 + (ultima ? parseFloat(getComputedStyle(ultima).paddingBottom) : 0);
    this.origen().nativeElement.setAttribute('cx', this.xInicio.toFixed(1));
    this.origen().nativeElement.setAttribute('cy', this.yInicio.toFixed(1));
    this.destino().nativeElement.setAttribute('transform', `translate(${lado.toFixed(1)} ${(this.yFin + 4).toFixed(1)})`);
  }

  /**
   * Dónde empieza un elemento en el documento. Lo que vive en un tramo
   * fijado por ScrollTrigger se mide por su espaciador: mientras está
   * fijado, su propia caja no dice dónde está en la página.
   */
  private arribaDe(el: HTMLElement): number {
    const ref = el.closest<HTMLElement>('.pin-spacer') ?? el;
    return ref.getBoundingClientRect().top + window.scrollY;
  }

  /** La carretera: en qué x está a una altura dada. */
  private xEn(y: number): number {
    let x = this.xInicio;
    for (const c of this.cruces) {
      if (y <= c.y0) break;
      if (y >= c.y1) {
        x = c.hasta;
        continue;
      }
      const t = (y - c.y0) / (c.y1 - c.y0);
      // smootherstep: entra y sale de la curva sin quiebro
      const s = t * t * t * (t * (t * 6 - 15) + 10);
      return c.desde + (c.hasta - c.desde) * s;
    }
    return x;
  }

  /** La altura de la página a la que le toca estar al camión. */
  private objetivo(): number {
    const y = window.scrollY + this.alto * ALTURA;
    return Math.min(this.yFin - 14, Math.max(this.yInicio + 34, y));
  }

  private despertar(): void {
    if (this.raf || !this.lista) return;
    this.antes = performance.now();
    this.raf = requestAnimationFrame((t) => this.cuadro(t));
  }

  private cuadro(ahora: number): void {
    // Tras una pestaña en segundo plano el salto de tiempo no es un cuadro
    const dt = Math.min(0.05, Math.max(0.001, (ahora - this.antes) / 1000));
    this.antes = ahora;
    const scroll = window.scrollY;

    const objetivo = this.objetivo();
    const falta = objetivo - this.y;
    const quieto = Math.abs(falta) < 0.08;
    this.y = !this.suave || quieto ? objetivo : this.y + falta * (1 - Math.exp(-dt / INERCIA));

    // Se da la vuelta cuando el scroll cambia de sentido de verdad, no
    // con el vaivén de un par de píxeles al frenar.
    const paso = scroll - this.scrollAntes;
    this.scrollAntes = scroll;
    this.acumulado = Math.sign(paso) === Math.sign(this.acumulado) ? this.acumulado + paso : paso;
    if (Math.abs(this.acumulado) > 14) this.haciaArriba = this.acumulado < 0;

    // Rumbo: la tangente de la curva, hacia donde va
    const x = this.xEn(this.y);
    const pendiente = (this.xEn(this.y + 1.5) - this.xEn(this.y - 1.5)) / 3;
    const sentido = this.haciaArriba ? -1 : 1;
    const meta = (Math.atan2(-pendiente * sentido, sentido) * 180) / Math.PI;
    // Por el camino corto: de 170° a -170° son 20°, no 340°
    const giro = ((((meta - this.angulo) % 360) + 540) % 360) - 180;
    const girado = Math.abs(giro) < 0.05;
    this.angulo = girado ? this.angulo + giro : this.angulo + giro * (1 - Math.exp(-dt / 0.12));

    const yPantalla = this.y - scroll;
    this.camion().nativeElement.style.transform = `translate3d(${x.toFixed(2)}px,${yPantalla.toFixed(2)}px,0)`;
    this.rumbo().nativeElement.style.transform = `rotate(${this.angulo.toFixed(2)}deg)`;
    this.hechaCaja().nativeElement.style.height = `${this.y.toFixed(1)}px`;

    this.hablar(x, yPantalla);

    this.raf = quieto && girado ? 0 : requestAnimationFrame((t) => this.cuadro(t));
  }

  /**
   * El rótulo se ve mientras el camión cruza y lo acompaña por encima. Su
   * ancla se desliza con la posición: junto al borde izquierdo queda a la
   * derecha del camión y junto al derecho, a la izquierda, sin saltar de
   * lado ni salirse de la pantalla. En el destino va al costado, a la
   * altura del camión: por encima caería sobre la última sección.
   */
  private hablar(x: number, yPantalla: number): void {
    const cruce = this.cruces.find((c) => this.y >= c.y0 && this.y <= c.y1);
    const enDestino = !cruce && this.y >= this.yFin - this.alcance;
    const frase = cruce?.frase ?? (enDestino ? RUTA.destino.frase : '');
    const rotulo = this.rotulo().nativeElement;

    if (frase !== this.fraseActual) {
      this.fraseActual = frase;
      if (frase) this.texto().nativeElement.textContent = frase;
      rotulo.classList.toggle('es-visible', frase !== '');
    }
    if (!frase && !rotulo.textContent) return;

    const w = rotulo.offsetWidth;
    const h = rotulo.offsetHeight;
    const margen = 12;
    const movil = this.ancho < 900;
    let izquierda: number;
    let arriba: number;
    if (enDestino || (!cruce && rotulo.textContent === RUTA.destino.frase)) {
      const hueco = movil ? 16 : 26;
      izquierda = x > this.ancho / 2 ? x - w - hueco : x + hueco;
      arriba = yPantalla - h / 2;
    } else {
      const t = Math.min(1, Math.max(0, x / this.ancho));
      izquierda = x - t * w;
      arriba = yPantalla - h - (movil ? 16 : 26);
    }
    izquierda = Math.min(Math.max(margen, izquierda), this.ancho - w - margen);
    rotulo.style.transform = `translate3d(${izquierda.toFixed(1)}px,${arriba.toFixed(1)}px,0)`;
  }
}
