import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore, waDirectLink } from '@bolleria-v2-ui-shared';

/**
 * Hero de la v2: una escena de obrador separada en capas que se desplazan a
 * distinta velocidad con el scroll.
 *
 * Sustituye a `HeroScrollComponent`, que capturaba el scroll durante 700vh para
 * reproducir 233 cuadros (90,4 MB de descarga antes de enseñar nada). Aquí el
 * mensaje está completo desde el primer fotograma y el scroll solo añade
 * profundidad: es una herramienta, no el contenido.
 *
 * Las capas salen de la propia imagen aprobada, no de una escena regenerada:
 * apiladas sin mover reproducen el original con cero píxeles de diferencia. Un
 * primer intento con capas generadas aparte quedó a un 56,7 % de la referencia
 * -otra distancia de cámara, el pan mucho más grande- y no servía.
 *
 * El ratón mueve una cámara, no las capas. El fondo y el logo se quedan
 * absolutamente clavados -son el ancla, y son la imagen-, y lo que se desplaza es
 * lo que está delante, cada plano según su profundidad. Al apartarse deja ver el
 * muro que hay detrás, que existe de verdad porque el fondo lleva reconstruido lo
 * que el primer plano tapaba. El efecto no es que la escena se mueva: es que se
 * abre.
 *
 * El fondo lleva rellenado lo que las hojas tapaban (interpolación horizontal
 * más un desenfoque, sobre muro y suelo desenfocados donde no se nota), así que
 * el primer plano puede desplazarse sin descubrir ningún hueco. Por eso el fondo
 * no necesita ampliarse para tener margen: se muestra al máximo encuadre
 * posible, que es justo lo que hace que la escena se lea como la imagen.
 */
@Component({
  selector: 'bol-hero-capas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-capas.component.html',
  styleUrl: './hero-capas.component.scss',
})
export class HeroCapasComponent implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly store = inject(BolleriaStore);
  readonly waDirect = waDirectLink();

  /**
   * Distancia focal de la cámara virtual, en píxeles. Cuanto menor, más brusca la
   * perspectiva; 1200 da un movimiento amplio sin que la escena se deforme.
   */
  private static readonly FOCAL = 1200;

  /** Cuánto se asoma la cámara a cada lado, en píxeles, con el ratón en el borde. */
  private static readonly ASOMO_X = 180;
  private static readonly ASOMO_Y = 120;

  /**
   * Las capas del primer plano con su profundidad `z` en píxeles: cuánto se
   * adelantan respecto al plano del fondo, que está en z = 0.
   *
   * Esto NO es un desplazamiento elegido a ojo. Es una cámara de verdad: al
   * asomarse `d` píxeles, un plano situado a profundidad `z` se desplaza
   *
   *     Δ = −d · z / (FOCAL − z)
   *
   * y se ve escalado por FOCAL / (FOCAL − z). De ahí salen los dos números de
   * cada capa, no de probar valores hasta que quedara bonito.
   *
   * La consecuencia importante: **el fondo está en z = 0 y por tanto no se mueve
   * ni un píxel**. Es el ancla. Lo que se mueve es lo que tenemos delante, y al
   * apartarse deja ver el muro que hay detrás -que existe de verdad, porque el
   * fondo lleva reconstruido lo que las hojas tapaban-. Ahí está el efecto: no en
   * que la imagen se desplace, sino en que se abra.
   *
   * Y la escala de perspectiva resuelve de paso el problema del borde: las hojas
   * están pegadas al borde izquierdo de la imagen (2030 px opacos en los primeros
   * 20) y al superior (495), así que desplazarlas destaparía el corte recto del
   * marco. Al verse un 12 % mayores por estar más cerca, su borde cae 117 px
   * fuera del cuadro por la izquierda y 66 px por arriba: hay 5 veces más margen
   * del que el movimiento consume. No es un parche, es lo que hace una cámara.
   */
  readonly capas = [
    { src: 'assets/hero-capas/ref-02-rama-sup.webp', vel: 0.028, ...HeroCapasComponent.plano(55) },
    { src: 'assets/hero-capas/ref-03-hojas-izq.webp', vel: -0.045, ...HeroCapasComponent.plano(130) },
  ];

  /** Traduce una profundidad a lo que el CSS necesita: desplazamiento y escala. */
  private static plano(z: number): { dx: string; dy: string; esc: string } {
    const f = HeroCapasComponent.FOCAL;
    const k = z / (f - z);
    return {
      dx: `${(-HeroCapasComponent.ASOMO_X * k).toFixed(2)}px`,
      dy: `${(-HeroCapasComponent.ASOMO_Y * k).toFixed(2)}px`,
      esc: (f / (f - z)).toFixed(4),
    };
  }

  /**
   * Constante de tiempo del amortiguado, en milisegundos. La escena persigue al
   * puntero, nunca lo sigue: tras parar el ratón sigue asentándose ~1,1 s. Ahí
   * está la diferencia entre un paralaje caro y uno pegajoso.
   */
  private static readonly TAU = 360;

  /** Por debajo de esto ya no queda nada que ver: se cuadra el valor y se para. */
  private static readonly EPS = 0.0008;

  private rafId = 0;
  private corriendo = false;
  private tPrev = 0;
  private ultimoP = -1;
  private hayScroll = true;
  private enPantalla = true;
  private observador?: IntersectionObserver;

  /** Destino del ratón, normalizado y con la curva de respuesta ya aplicada. */
  private mxObj = 0;
  private myObj = 0;
  /** Valor en pantalla, que persigue al destino con amortiguado exponencial. */
  private mxAct = 0;
  private myAct = 0;

  private readonly onScroll = () => {
    this.hayScroll = true;
    this.arrancar();
  };

  private readonly onMover = (ev: PointerEvent) => {
    // Un dedo no produce este efecto: no hay posición en reposo que seguir, y el
    // "leave" táctil llega tarde o no llega nunca.
    if (ev.pointerType !== 'mouse') return;
    this.mxObj = HeroCapasComponent.curva(this.aRango(ev.clientX, window.innerWidth));
    this.myObj = HeroCapasComponent.curva(this.aRango(ev.clientY, window.innerHeight));
    this.arrancar();
  };

  private readonly onSalir = () => {
    this.mxObj = 0;
    this.myObj = 0;
    this.arrancar();
  };

  private readonly onVisibilidad = () => {
    if (document.hidden) this.parar();
    else this.arrancar();
  };

  constructor() {
    if (!this.isBrowser) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reducido) return;

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });

    // El paralaje de ratón sólo existe donde hay un ratón de verdad. En táctil ni
    // se registran los escuchadores: coste cero.
    const conRaton = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
    if (conRaton) {
      const el = this.host.nativeElement;
      /**
       * En `window` y no en el propio hero: cualquier cosa superpuesta se comería
       * los eventos. Lo comprobé conduciendo el navegador -el preloader tapa el
       * hero y no llegaba un solo `pointermove`-, y la barra de navegación
       * flotante haría lo mismo de forma permanente en el borde superior.
       *
       * Como la posición se normaliza contra el viewport, escuchar arriba del
       * todo es además lo correcto: el efecto responde a dónde está el puntero en
       * la pantalla, no a sobre qué elemento cae.
       */
      window.addEventListener('pointermove', this.onMover, { passive: true });
      // Al abandonar la ventana, la escena vuelve al centro sola.
      document.addEventListener('pointerleave', this.onSalir, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibilidad);
      /**
       * Fuera de pantalla no hay nada que animar. Sin esto, el bucle seguiría
       * vivo mientras el visitante lee el resto de la página: gasto de batería
       * por un efecto que nadie está mirando.
       */
      this.observador = new IntersectionObserver(
        ([e]) => {
          this.enPantalla = e.isIntersecting;
          if (this.enPantalla) {
            this.arrancar();
            return;
          }
          // Al volver, que lo haga centrado y no con la última posición del ratón.
          this.mxObj = this.myObj = this.mxAct = this.myAct = 0;
          this.escribir();
          this.parar();
        },
        { threshold: 0 },
      );
      this.observador.observe(el);
    }

    this.arrancar();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    window.removeEventListener('pointermove', this.onMover);
    document.removeEventListener('pointerleave', this.onSalir);
    document.removeEventListener('visibilitychange', this.onVisibilidad);
    this.observador?.disconnect();
    this.parar();
  }

  /** Posición dentro del viewport llevada a −1 … 1. */
  private aRango(v: number, total: number): number {
    return Math.max(-1, Math.min(1, (v / (total || 1)) * 2 - 1));
  }

  /**
   * Curva de respuesta. Cerca del centro la escena está casi quieta y sólo hacia
   * los bordes toma amplitud, así que cruzar la pantalla no produce un temblor
   * permanente. No es cuadrática pura -eso deja el centro muerto-, sino una
   * mezcla que conserva algo de vida en todo el recorrido.
   */
  private static curva(v: number): number {
    return v * (0.4 + 0.6 * Math.abs(v));
  }

  private arrancar(): void {
    if (this.corriendo || !this.enPantalla || document.hidden) return;
    this.corriendo = true;
    this.tPrev = 0;
    this.rafId = requestAnimationFrame(this.bucle);
  }

  private parar(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.corriendo = false;
  }

  /**
   * Un solo bucle para el scroll y para el ratón, que se apaga cuando no queda
   * movimiento pendiente. Dos bucles independientes harían el doble de trabajo en
   * el mismo fotograma para escribir en el mismo elemento.
   */
  private readonly bucle = (t: number) => {
    const dt = this.tPrev ? Math.min(64, t - this.tPrev) : 16.7;
    this.tPrev = t;

    /**
     * Amortiguado exponencial calculado con el tiempo real transcurrido y no con
     * un factor fijo por fotograma: con un factor fijo, una pantalla de 120 Hz
     * recorrería lo mismo en la mitad de tiempo que una de 60.
     */
    const k = 1 - Math.exp(-dt / HeroCapasComponent.TAU);
    this.mxAct += (this.mxObj - this.mxAct) * k;
    this.myAct += (this.myObj - this.myAct) * k;

    const quieto =
      Math.abs(this.mxObj - this.mxAct) < HeroCapasComponent.EPS &&
      Math.abs(this.myObj - this.myAct) < HeroCapasComponent.EPS;
    if (quieto) {
      this.mxAct = this.mxObj;
      this.myAct = this.myObj;
    }

    this.escribir();

    if (quieto && !this.hayScroll) {
      this.corriendo = false;
      this.rafId = 0;
      return;
    }
    this.hayScroll = false;
    this.rafId = requestAnimationFrame(this.bucle);
  };

  /**
   * Escribe tres propiedades en el host y deja que las capas se recalculen solas
   * en CSS. El progreso es fraccionario a propósito: cuantizarlo produciría
   * escalones visibles en las capas lentas.
   */
  private escribir(): void {
    const estilo = this.host.nativeElement.style;
    const alto = window.innerHeight || 1;
    const p = Math.min(1, Math.max(0, window.scrollY / alto));
    if (Math.abs(p - this.ultimoP) >= 0.0005) {
      this.ultimoP = p;
      estilo.setProperty('--p', p.toFixed(4));
    }
    estilo.setProperty('--mx', this.mxAct.toFixed(4));
    estilo.setProperty('--my', this.myAct.toFixed(4));
  }

  irAlMenu(): void {
    this.store.go('menu');
  }
}
