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
 * Hero de la v2: la escena de obrador en capas, que además se VACÍA con el
 * scroll mientras cambian las palabras.
 *
 * Sustituye a `HeroScrollComponent`, que capturaba el scroll durante 700vh para
 * reproducir 233 cuadros (90,4 MB de descarga antes de enseñar nada). Aquí el
 * mensaje está completo desde el primer fotograma, y el escenario se queda
 * clavado dos pantallas -el envoltorio mide tres, menos la que ocupa él- para
 * dar las tres paradas con tres imágenes.
 *
 * ── Por qué el mostrador puede vaciarse sin que se note el corte
 *
 * Los tres estados son tres renders de la MISMA escena con menos pan cada vez.
 * Medido: el desplazamiento que mejor los hace coincidir es dx 0, dy 0 en los
 * tres pares, y el muro difiere 1,5 sobre 255. Sobre esa base, las imágenes se
 * hornearon forzando que fuera del mostrador los estados 2 y 3 sean el MISMO
 * píxel que el 1 -diferencia máxima 0 por canal, verificada-. Ahí el fundido es
 * una operación nula por construcción: no se puede ver. Lo único que cambia en
 * pantalla es el pan.
 *
 * ── Por qué el logo va aparte
 *
 * Entre el primer render y el tercero el logotipo se corre 18 px y crece. En un
 * fundido eso se vería deslizarse, y es la marca. Así que el logo, la rama y el
 * olivo se pintan como capas comunes, idénticas en los tres estados, y de los
 * fondos se retiran. (Al hacerlo salió que la capa del logo no era un logo
 * recortado sino un parche del muro que arrastraba un trozo de hogaza; con el
 * pan debajo era inocuo, pero en el estado 3 se quedaba flotando. Va recortada.)
 *
 * ── De qué sirven las capas, aparte del vaciado
 *
 * La profundidad no se simula moviendo cosas, se construye tratando cada plano
 * por separado y horneando el resultado. Sobre la imagen plana esto es imposible
 * -un desenfoque del fondo hace sangrar el pan sobre el muro y deja halo-; con
 * el fondo aislado, el borde del pan queda nítido contra un fondo suave, que es
 * lo que hace un objetivo real. Medido, la separación entre el pan y el muro
 * pasa de 2,76x a 4,92x en color y de 3,86x a 4,85x en detalle.
 *
 * ── Rendimiento, medido con GPU real
 *
 * En régimen, 60,0 fps clavados recorriendo el pin entero, cero fotogramas por
 * encima de 20 ms. La PRIMERA pasada pierde unos 105 ms repartidos en tres
 * fotogramas, alrededor de p≈0,20: es la curva de calentamiento del navegador,
 * no el montaje. Se comprobó quitando una a una todas las piezas del hero -los
 * dos fondos extra, la pila de textos, el paralaje, la pista, el velo- y el
 * tirón sobrevive a todas. Se probó también descodificar los fondos y pintarlos
 * a opacidad ínfima en el hueco ocioso: 106 ms perdidos con ese calentamiento
 * frente a 109 ms sin él, o sea nada. Queda anotado para no volver a intentarlo.
 *
 * Se probó también mover las capas con el ratón, con un modelo de cámara real.
 * Funcionaba -el fondo clavado, el primer plano abriéndose- pero se descartó: la
 * profundidad tenía que estar en la imagen, no en el movimiento. Queda sólo el
 * paralaje de scroll del olivo, que ya existía.
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
   * Los tres relevos de texto. El primero es el titular de la página y va en el
   * `h1`; los otros dos son copia adicional, no subsecciones, así que van en
   * párrafos. No se ocultan a los lectores de pantalla: son texto de verdad y
   * esconderlo sería peor que leerlo seguido.
   */
  readonly estados = [
    {
      lugar: 'Grecia · Alajuela',
      titulo: 'Cariño y ganas',
      enfasis: 'de hacerlo bien.',
      bajada:
        'Pan de masa madre fermentado con tiempo y horneado cada mañana. ' +
        'Treinta y siete recetas hechas a mano, una por una.',
    },
    {
      lugar: 'Desde las cinco de la mañana',
      titulo: 'El horno manda',
      enfasis: 'y el tiempo también.',
      bajada:
        'La masa madre lleva su fermentación de dieciocho horas. No se puede ' +
        'correr, y por eso sabe a lo que sabe.',
    },
    {
      lugar: 'Todos los días',
      titulo: 'Se hornea a diario',
      enfasis: 'y a diario se acaba.',
      bajada:
        'Lo que sale del horno es lo que hay. Cuando se termina, se termina: ' +
        'mañana volvemos a empezar.',
    },
  ];

  /**
   * El olivo del primer plano, lo único que se mueve. `vel` es la fracción de la
   * altura del hero que recorre la capa a lo largo de TODO el recorrido; en
   * negativo sube.
   *
   * Las dos llevan horneado un desenfoque mayor que el del fondo: están más
   * cerca que el plano de foco, y ese desenfoque de primer plano es la firma de
   * la fotografía de producto cara. El fondo lleva reconstruido lo que tapaban,
   * así que pueden desplazarse sin descubrir ningún hueco.
   */
  readonly capas = [
    { src: 'assets/hero-capas/hero-rama.webp', vel: 0.028 },
    { src: 'assets/hero-capas/hero-hojas.webp', vel: -0.045 },
  ];

  /**
   * Coreografía del recorrido, en fracción del scroll clavado.
   *
   * `FONDO[i]` es el tramo en el que entra el estado i+2 encima del anterior.
   * `TEXTO[i]` es la ventana del texto i: [entra desde, entra hasta, sale desde,
   * sale hasta]. Los relevos NO se solapan a propósito -el anterior está fuera
   * antes de que aparezca el siguiente- para que nunca se lean dos titulares uno
   * encima del otro; está verificado parada por parada.
   *
   * El texto cambia DESPUÉS de que el pan empiece a irse y ANTES de que termine:
   * así el relevo de palabras tapa el tramo en que los dos panes coexisten a
   * media opacidad, que es el único momento en que el fundido se nota.
   */
  private readonly FONDO: readonly [number, number][] = [
    [0.16, 0.44],
    [0.58, 0.86],
  ];
  private readonly TEXTO: readonly [number, number, number, number][] = [
    [-1, -1, 0.2, 0.3],
    [0.32, 0.42, 0.62, 0.72],
    [0.74, 0.84, 2, 2],
  ];

  private rafId = 0;
  private pendiente = false;
  private ultimoP = -1;
  private altoFijo = 0;
  private readonly onScroll = () => this.pedirCuadro();
  private readonly onResize = () => {
    this.altoFijo = 0;
    this.pedirCuadro();
  };

  constructor() {
    if (!this.isBrowser) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // Sin movimiento el hero no se clava (lo desactiva el CSS) y se queda en el
    // primer estado: escena llena y primer titular. Nada que calcular.
    if (reducido) return;
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    this.pedirCuadro();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  /** Coalesce de eventos: como mucho un recálculo por fotograma. */
  private pedirCuadro(): void {
    if (this.pendiente) return;
    this.pendiente = true;
    this.rafId = requestAnimationFrame(() => {
      this.pendiente = false;
      this.aplicar();
    });
  }

  /** Rampa suave entre a y b; fuera del tramo, 0 o 1. */
  private static suave(x: number, a: number, b: number): number {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Escribe unas pocas propiedades en el host y deja que las capas se recalculen
   * solas en CSS. El progreso es fraccionario a propósito: cuantizarlo produciría
   * escalones visibles en las capas lentas y en los fundidos.
   */
  private aplicar(): void {
    const el = this.host.nativeElement;
    const caja = el.getBoundingClientRect();
    /**
     * El recorrido se mide contra el ALTO REAL del elemento clavado, no contra
     * `innerHeight`: en móvil la barra del navegador hace que las dos cosas no
     * coincidan y el progreso llegaría a 1 antes de que el hero se despegue.
     */
    if (!this.altoFijo) {
      const fijo = el.querySelector<HTMLElement>('.bol-heroc__fijo');
      this.altoFijo = fijo?.offsetHeight ?? window.innerHeight ?? 1;
    }
    const recorrido = caja.height - this.altoFijo;
    const p = recorrido > 0 ? Math.min(1, Math.max(0, -caja.top / recorrido)) : 0;
    if (Math.abs(p - this.ultimoP) < 0.0005) return;
    this.ultimoP = p;

    const s = el.style;
    s.setProperty('--p', p.toFixed(4));
    this.FONDO.forEach(([a, b], i) =>
      s.setProperty(`--o${i + 2}`, HeroCapasComponent.suave(p, a, b).toFixed(4)),
    );
    this.TEXTO.forEach(([e0, e1, x0, x1], i) => {
      const o = HeroCapasComponent.suave(p, e0, e1) * (1 - HeroCapasComponent.suave(p, x0, x1));
      s.setProperty(`--t${i}`, o.toFixed(4));
    });
  }

  irAlMenu(): void {
    this.store.go('menu');
  }
}
