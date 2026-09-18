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
 * Hero de la v2: la escena de obrador, que además se LLENA paso a paso mientras
 * cambian las palabras.
 *
 * Sustituye a `HeroScrollComponent`, que capturaba el scroll durante 700vh para
 * reproducir 233 cuadros (90,4 MB de descarga antes de enseñar nada). Aquí el
 * mensaje está completo desde el primer fotograma y el hero mide UNA pantalla.
 *
 * ── Por qué no es una animación por scroll, y sí un botón de «siguiente»
 *
 * Hubo una versión intermedia con un riel de 300vh donde la opacidad se
 * interpolaba con la posición del scroll. Se descartó por petición expresa:
 * «no tengo por qué estar viendo cada píxel desaparecer». Ahora el scroll no
 * dibuja nada, sólo DISPARA. Mientras el hero llene la pantalla y le quede un
 * paso, cada gesto -corto, largo o una ráfaga inercial- vale exactamente un
 * paso, la página no se mueve ni un píxel y el CSS hace la transición en 400 ms
 * fijos. Al agotarse los pasos, el hero suelta el mando y la página sigue.
 *
 * De regalo desaparece toda una familia de fallos: no hay `scrollTo` por
 * fotograma, así que el `scrollY` asíncrono de iOS -que costó dos intentos en la
 * v1- no puede morder; y no existen estados intermedios, así que quedarse a
 * mitad de un segmento es imposible en vez de improbable.
 *
 * ── Por qué el mostrador puede llenarse sin que se note el corte
 *
 * Las tres paradas NO son tres renders sueltos. Los renders originales pintaban
 * distinto hasta los panes que se repiten -la pieza de frutos rojos, la hogaza,
 * el brillo del croissant- y la luz de la 3 era más cálida, así que al cambiar
 * de parada el pan que se quedaba se transformaba. Se rehicieron como
 * fotomontaje: la 3 es la maestra y cada parada anterior es la 3 quitándole el
 * pan que todavía no existe. Lo que queda revelado detrás -muro, estante, mesa-
 * sale del render correspondiente con la luz igualada a la 3; cada pan que
 * persiste es el de la 3, el mismo píxel en todas las paradas donde aparece.
 *
 * Por eso el estado 1 es la escena entera y los estados 2 y 3 son CAPAS
 * TRANSPARENTES con sólo lo que cambia. Fuera de eso la capa tiene alfa 0
 * exacto, medido tras la compresión WebP, y compuestas dan la parada al píxel
 * -diferencia máxima 0-: ahí el fundido no se disimula, sencillamente no existe.
 * El procedimiento está en `assets/hero-capas/_fuente/LEEME.txt`.
 *
 * ── Por qué en el teléfono hay un parche de muro
 *
 * El logo viene pintado en la escena. En vertical el recorte lo deja justo
 * detrás del titular y se leen dos textos encima del otro. No existe una
 * versión del muro sin logo, así que se construyó un parche: la luz del muro
 * rellenada desde alrededor del logo y la textura del estuco tomada de un paño
 * limpio de la misma pared. Se declara sólo por debajo de 720 px, como fondo CSS
 * dentro de la media query, y en escritorio ni siquiera se descarga.
 *
 * ── Rendimiento, medido con GPU real
 *
 * Con el riel, en régimen daba 60,0 fps clavados y la PRIMERA pasada perdía unos
 * 105 ms en tres fotogramas: la curva de calentamiento del navegador, no el
 * montaje. Se comprobó quitando una a una todas las piezas del hero -los dos
 * fondos extra, la pila de textos, el paralaje, la pista, el velo- y el tirón
 * sobrevivía a todas. Se probó también descodificar los fondos y pintarlos a
 * opacidad ínfima en el hueco ocioso: 106 ms con ese calentamiento frente a 109
 * sin él, o sea nada. Queda anotado para no volver a intentarlo.
 *
 * Por pasos el coste es otro y mucho menor: no hay nada que recalcular mientras
 * nadie toque nada, y una transición son dos opacidades que resuelve el
 * compositor. El único trabajo por fotograma que queda es el que ya había.
 *
 * Se probó también mover las capas con el ratón, con un modelo de cámara real.
 * Funcionaba -el fondo clavado, el primer plano abriéndose- pero se descartó: la
 * profundidad tenía que estar en la imagen, no en el movimiento. El paralaje de
 * scroll del olivo, que sí quedaba, se retiró al pasar a la secuencia por pasos:
 * repartido en dos saltos de 400 ms se veía como una capa suelta deslizándose
 * sobre el muro. Ahora no se mueve nada que no sea el pan.
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
   *
   * El rótulo de sitio sólo lo lleva el primero: es la ficha del negocio, no una
   * etiqueta de cada frase, y repetirla tres veces la vacía de valor. Los otros
   * dos lo dejan vacío y la plantilla no pinta el párrafo.
   *
   * Ya NO hay `bajada`. El párrafo explicativo bajo el titular se retiró a
   * petición del dueño del sitio: la escena ya cuenta de qué va el negocio y el
   * texto chico competía con ella. Además iba centrado mientras el titular va en
   * bandera, y en el teléfono caía sobre las flores del bodegón, donde apenas se
   * leía. Lo que decía no se pierde: la carta y la historia del libro lo cuentan
   * entero más abajo.
   */
  readonly estados = [
    {
      lugar: 'Grecia · Alajuela',
      titulo: 'Cariño y ganas',
      enfasis: 'de hacerlo bien.',
    },
    {
      lugar: '',
      titulo: 'Hecho con amor,',
      enfasis: 'cada mañana.',
    },
    {
      lugar: '',
      titulo: 'No te quedes',
      enfasis: 'sin el tuyo.',
    },
  ];

  /**
   * ── El compás: 400 ms fijos, cronometrados por el CSS
   *
   * Un paso dura lo mismo con una muesca de rueda que con una ráfaga de
   * cuarenta. La duración vive en `--dur` y aquí sólo se escribe el estado de
   * LLEGADA. Antes la opacidad se calculaba a partir de la posición del scroll y
   * existían infinitos estados intermedios; ahora hay tres, enteros, y quedarse
   * a mitad de un segmento dejó de ser posible por construcción, no por cuidado.
   *
   * Las imágenes se funden los 400 ms enteros. Las palabras NO: se van en los
   * primeros 180 y las siguientes entran en los últimos 180, con 40 de aire en
   * medio (`--dur-txt` y `RETRASO`). Un fundido cruzado simétrico dejaría los dos
   * titulares al 50 % a mitad de camino, uno encima del otro, y eso se lee como
   * un fallo de pintado. Con las imágenes no pasa: el primer estado va SIEMPRE
   * opaco debajo, así que ahí nunca hay dos capas a media opacidad sobre nada.
   */
  private static readonly DUR = 400;
  private static readonly RETRASO = 220;

  /**
   * ── Un gesto, un paso
   *
   * Lo difícil no es detectar el scroll, es decidir dónde ACABA un gesto. Un
   * solo deslizamiento de trackpad dispara decenas de eventos con inercia; sin
   * segmentarlo valdría tres pasos, que es justo lo que no se quiere. La regla:
   *
   *   - mientras el paso está en curso se traga todo;
   *   - se vuelve a armar cuando el gesto CALLA (`SILENCIO` sin un solo evento);
   *   - y, como techo, a los `TECHO` ms aunque no calle, para que quien hace
   *     scroll sostenido no quede encerrado. Armado por techo, el umbral sube a
   *     `RUEDA_TERCA`: la cola de una inercia trae deltas de dos o tres píxeles y
   *     no llega, mientras que un scroll de verdad los trae de cincuenta.
   *
   * Y al agotarse los pasos no se suelta en el acto, sino cuando el gesto calla:
   * ver `RETENCION`. Es lo que hace que la última parada se pueda leer.
   *
   * El dedo no necesita nada de esto: `touchstart` y `touchend` delimitan el
   * gesto solos, y se da un paso por gesto.
   *
   * Los dos umbrales van en monedas distintas A PROPÓSITO. El de la rueda en
   * píxeles literales; el del dedo en FRACCIÓN del alto de la ventana, porque un
   * umbral absoluto puede ser inalcanzable en una pantalla pequeña -ya ocurrió:
   * 700 px de umbral en un iPhone de 664 px de alto- y entonces el ajuste no
   * falla, sencillamente no existe.
   */
  private static readonly SILENCIO = 120;
  private static readonly TECHO = 900;
  /**
   * Cuánto se retiene el scroll DESPUÉS del último paso, cuando ya no queda
   * ninguno hacia esa dirección.
   *
   * Sin esto, el gesto que da el último paso se lleva la página con su propia
   * cola: el paso se da con los primeros eventos y los treinta restantes ya no
   * encuentran paso que dar, así que pasan al navegador. Medido: un barrido
   * inercial normal dejaba la página 588 px más abajo y el último titular en
   * y = -362, o sea fuera de la pantalla. El mensaje que cierra la secuencia era
   * justo el que no se llegaba a leer.
   *
   * Se retiene mientras el gesto siga VIVO -sin `SILENCIO` de calma- y como
   * mucho este tiempo, para que un scroll sostenido no quede encerrado: quien
   * no para nunca sale igual, sólo que 1,8 s después.
   */
  private static readonly RETENCION = 1800;
  private static readonly RUEDA = 24;
  private static readonly RUEDA_TERCA = 120;
  private static readonly DEDO = 0.04;

  private paso = 0;
  private armado = true;
  /** Se armó por techo, con la inercia todavía viva: hace falta más gesto. */
  private exigente = false;
  private acum = 0;
  private tPaso = 0;
  private tEvento = 0;
  private relojArme = 0;
  private relojOcultar = 0;
  private dedoVivo = false;
  private dedoY0 = 0;
  private dedoDado = false;

  constructor() {
    if (!this.isBrowser) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // Sin movimiento no hay secuencia ni captura: una pantalla, la primera
    // parada y el primer titular, y el scroll es del navegador de principio a fin.
    if (reducido) return;
    // `passive: false` en los dos que hay que poder cancelar para que la página
    // no se mueva mientras el hero manda.
    window.addEventListener('wheel', this.onRueda, { passive: false });
    window.addEventListener('touchstart', this.onDedoInicio, { passive: true });
    window.addEventListener('touchmove', this.onDedoMueve, { passive: false });
    window.addEventListener('touchend', this.onDedoFin, { passive: true });
    window.addEventListener('touchcancel', this.onDedoFin, { passive: true });
    window.addEventListener('keydown', this.onTecla);
    this.pintar();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    window.removeEventListener('wheel', this.onRueda);
    window.removeEventListener('touchstart', this.onDedoInicio);
    window.removeEventListener('touchmove', this.onDedoMueve);
    window.removeEventListener('touchend', this.onDedoFin);
    window.removeEventListener('touchcancel', this.onDedoFin);
    window.removeEventListener('keydown', this.onTecla);
    clearTimeout(this.relojArme);
    clearTimeout(this.relojOcultar);
  }

  /**
   * ¿Manda el hero en esta dirección? Sólo si le queda un paso hacia ahí Y ocupa
   * la pantalla entera. En cuanto asoma lo que viene debajo, el scroll vuelve a
   * ser del navegador sin más trámite: nadie queda atrapado.
   */
  private mando(dir: number): boolean {
    const c = this.host.nativeElement.getBoundingClientRect();
    /**
     * Que su borde de arriba esté en el borde de la ventana y que la cubra casi
     * entera. El «casi» no es dejadez: el hero mide `100svh` -la ventana CON la
     * barra del navegador- y `innerHeight` crece hasta `100lvh` en cuanto esa
     * barra se esconde. Exigir cobertura completa haría que el hero perdiera el
     * mando en un teléfono con la barra recogida, que es justo donde más falta
     * hace. La diferencia entre las dos medidas ronda el 11 %.
     */
    if (c.top < -2 || c.bottom < window.innerHeight * 0.8) return false;
    const n = this.paso + dir;
    if (n >= 0 && n <= 2) return true;
    /**
     * No queda paso hacia ahí, pero todavía no se suelta: si el gesto que acaba
     * de dar el último paso sigue vivo, su cola se llevaría la página y la
     * última parada no llegaría a leerse. Se aguanta hasta que el gesto calle,
     * y como mucho `RETENCION`.
     */
    const ahora = performance.now();
    return (
      ahora - this.tPaso < HeroCapasComponent.RETENCION &&
      ahora - this.tEvento < HeroCapasComponent.SILENCIO
    );
  }

  /** Avanza o retrocede un paso y bloquea hasta que el gesto termine. */
  private dar(dir: number): boolean {
    const n = this.paso + dir;
    if (n < 0 || n > 2) return false;
    this.paso = n;
    this.pintar();
    this.armado = false;
    this.acum = 0;
    this.tPaso = performance.now();
    this.programarArme();
    return true;
  }

  private programarArme(): void {
    clearTimeout(this.relojArme);
    const tic = () => {
      const ahora = performance.now();
      const desde = ahora - this.tPaso;
      if (desde < HeroCapasComponent.DUR) {
        this.relojArme = window.setTimeout(tic, HeroCapasComponent.DUR - desde);
        return;
      }
      const callo = ahora - this.tEvento >= HeroCapasComponent.SILENCIO;
      if (!callo && desde < HeroCapasComponent.TECHO) {
        this.relojArme = window.setTimeout(tic, 30);
        return;
      }
      this.armado = true;
      this.exigente = !callo;
      this.acum = 0;
    };
    this.relojArme = window.setTimeout(tic, HeroCapasComponent.DUR);
  }

  private readonly onRueda = (e: WheelEvent): void => {
    const dir = Math.sign(e.deltaY);
    if (!dir || !this.mando(dir)) return;
    // La página no se mueve ni un píxel: el gesto es un «siguiente».
    e.preventDefault();
    this.tEvento = performance.now();
    if (!this.armado) return;
    this.acum += e.deltaY;
    const umbral = this.exigente ? HeroCapasComponent.RUEDA_TERCA : HeroCapasComponent.RUEDA;
    if (Math.abs(this.acum) < umbral) return;
    const d = Math.sign(this.acum);
    if (this.mando(d)) this.dar(d);
    else this.acum = 0;
  };

  private readonly onDedoInicio = (e: TouchEvent): void => {
    this.dedoVivo = false;
    this.dedoDado = false;
    if (e.touches.length !== 1) return;
    // Sólo los toques que nacen DENTRO del hero. El nav, el menú y el carrito
    // viven fuera, así que sus gestos -y sus taps- no pasan por aquí.
    const t = e.target;
    if (!(t instanceof Node) || !this.host.nativeElement.contains(t)) return;
    this.dedoVivo = true;
    this.dedoY0 = e.touches[0].clientY;
  };

  private readonly onDedoMueve = (e: TouchEvent): void => {
    if (!this.dedoVivo) return;
    // Un segundo dedo es un pellizco para hacer zoom: se suelta el gesto.
    if (e.touches.length !== 1) {
      this.dedoVivo = false;
      return;
    }
    const dy = this.dedoY0 - e.touches[0].clientY;
    const dir = Math.sign(dy);
    if (!dir || !this.mando(dir)) return;
    if (e.cancelable) e.preventDefault();
    this.tEvento = performance.now();
    if (this.dedoDado || !this.armado) return;
    if (Math.abs(dy) < window.innerHeight * HeroCapasComponent.DEDO) return;
    this.dedoDado = this.dar(dir);
  };

  private readonly onDedoFin = (): void => {
    this.dedoVivo = false;
    this.dedoDado = false;
    // El dedo se levantó: el gesto terminó de verdad, no hay que esperar ningún
    // silencio.
    this.tEvento = 0;
  };

  /**
   * Las teclas de scroll dan un paso. Sin esto, quien navega con el teclado se
   * quedaría encerrado en el hero: la rueda está capturada y él no tiene rueda.
   */
  private readonly onTecla = (e: KeyboardEvent): void => {
    const abajo = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
    const arriba = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
    if (!abajo && !arriba) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const dir = abajo ? 1 : -1;
    if (!this.mando(dir)) return;
    e.preventDefault();
    if (this.armado) this.dar(dir);
  };

  /**
   * Escribe el estado de llegada y deja que el CSS haga el viaje. Son valores
   * enteros: no hay ningún cálculo por fotograma, ni `requestAnimationFrame`, ni
   * lectura de geometría fuera de `mando()`.
   */
  private pintar(): void {
    const el = this.host.nativeElement;
    const s = el.style;
    const n = this.paso;
    const R = HeroCapasComponent.RETRASO + 'ms';

    s.setProperty('--o2', n >= 1 ? '1' : '0');
    s.setProperty('--o3', n >= 2 ? '1' : '0');
    // La pista ya cumplió cuando se llega al último estado.
    s.setProperty('--pista', n >= 2 ? '0' : '1');

    for (let i = 0; i < 3; i++) {
      const dentro = i === n;
      s.setProperty(`--t${i}`, dentro ? '1' : '0');
      // El que entra espera a que el anterior haya salido; el que sale no espera.
      s.setProperty(`--td${i}`, dentro ? R : '0ms');
    }

    const juego = n === 2 ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const dentro = i === juego;
      s.setProperty(`--a${i}`, dentro ? '1' : '0');
      s.setProperty(`--ta${i}`, dentro ? R : '0ms');
      // `visibility` no se funde: al aparecer se concede ya y al desaparecer se
      // retira cuando el fundido ha terminado. Un enlace a opacidad 0 sigue
      // siendo enfocable con el tabulador y sigue leyéndose en voz alta.
      if (dentro) s.setProperty(`--va${i}`, 'visible');
    }
    clearTimeout(this.relojOcultar);
    this.relojOcultar = window.setTimeout(
      () => s.setProperty(`--va${1 - juego}`, 'hidden'),
      HeroCapasComponent.DUR,
    );

    /**
     * Mientras al hero le quede un paso hacia abajo, el dedo no puede arrastrar
     * la página: `touch-action` se cierra a `pinch-zoom`. No basta con
     * `preventDefault` en `touchmove` -en cuanto el navegador entrega un
     * desplazamiento al compositor ya no hay nada que cancelar-, y `none` a secas
     * quitaría también el zoom, que es una ayuda de accesibilidad y no se toca.
     * En el último estado se abre otra vez para poder salir del hero.
     */
    el.classList.toggle('bol-manda', n < 2);
  }

  irAlMenu(): void {
    this.store.go('menu');
  }
}
