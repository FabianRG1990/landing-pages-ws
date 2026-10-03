import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgStyle, isPlatformBrowser } from '@angular/common';
import { BolleriaStore, CONTACT, CerrojoDeHoja, frenaMientrasSeVe, waDirectLink } from '@bolleria-v2-ui-shared';
import { HISTORIAS } from './libro-historias';
import { PuntoPx, WarpGL } from './about-book-warp-gl';
import { GestoHoja } from './gesto-hoja';

/**
 * El libro de la portada, version 2026.
 *
 * Sustituye a `AboutBookComponent` en ESCRITORIO y en cualquier pantalla
 * HORIZONTAL. El telefono de pie sigue con el libro de siempre, que no se toca:
 * son dos componentes independientes y `home.component` monta uno u otro segun
 * la orientacion (ver `libroNuevo`).
 *
 * Que cambia respecto al anterior, y por que nada de su calibracion sirve aqui:
 * aquel video mira el libro en perspectiva 3/4 y lo deja flotando con aire
 * alrededor; este lo mira de FRENTE y, con el libro abierto, llena los 1920x1080
 * enteros y se sale por los cuatro bordes. La malla, los cuadrilateros y las
 * correcciones sub-pixel de aquel estan medidas contra su encuadre y no se
 * pueden trasladar.
 */

// ─── El metraje ───────────────────────────────────────────────────────────────
const FRAMES_DIR = 'assets/libro-2026-frames';
const FRAME_COUNT = 292;
/**
 * El `?v=` es la version de los DATOS, no adorno: la malla no lleva hash en el
 * nombre, y un navegador que la guardo con la cache vieja de una hora seguia
 * usando la orilla mal medida despues de corregirla. Hay que subirlo cada vez
 * que cambie el archivo.
 */
const MALLA_URL = 'assets/libro-2026-malla.json?v=2';

/**
 * Tamano LOGICO del video. Toda la calibracion -lomo, paginas, malla del giro-
 * esta en estos pixeles; la escala a pantalla sale de aqui y no del tamano del
 * archivo.
 */
const VIDEO_W = 1920;
const VIDEO_H = 1080;

/**
 * Los tramos, medidos sobre el video por diferencia de pixeles entre cuadros
 * consecutivos (media sobre la imagen reducida a 480x270):
 *
 *     1..96    apertura, con un zoom fuerte hacia la camara
 *    97..103   REPOSO, quieto de verdad (diferencia 0,002-0,03 de 255)
 *   104..152   la hoja gira de derecha a izquierda
 *   153..160   reposo otra vez
 *   161..279   se cierra y se aleja
 *   280..292   cerrado, quieto
 */
const PORTADA = 1;
/**
 * El cuadro en el que descansa cada pagina, y el primero del ciclo de la vuelta.
 *
 * No es 104 -el primero en el que la hoja se mueve- sino 102, y la diferencia
 * importa: el tramo tiene que CERRAR, porque las siete vueltas son el mismo
 * metraje repetido. Encadenar 104->152->104 dejaba 27.127 pixeles distintos
 * entre el ultimo cuadro y el primero -el canto del bloque, los filetes del
 * marco y la sombra recien caida- y eso se ve como un parpadeo en cada vuelta.
 * Medido contra f153, que es donde la vuelta termina:
 *
 *   f097: 1.030 px    f101: 1.036 px    f102: 1.129 px
 *   f103: 4.231 px    f104: 19.755 px
 *
 * El 102 es el ultimo corte que sigue siendo el mismo cuadro, y solo mete dos
 * cuadros quietos al principio de la vuelta (~33 ms). Arrancar en 104 daba un
 * arranque perfecto y un aterrizaje malo, y el aterrizaje es justo el instante
 * en el que el ojo esta parado mirando.
 */
const REPOSO = 102;
const GIRO_HI = 153;
const CERRADO = FRAME_COUNT;

/** 1..7 = historias con foto y texto; 8 = cierre (foto, horario y los dos botones). */
const LAST = 8;
/**
 * Estado con el libro CERRADO DESPUES de la ultima pagina: seguir bajando tras
 * la 8 baja la tapa y deja la contraportada antes del footer, como un ciclo
 * terminado.
 */
const CERRADO_FINAL = LAST + 1;

/**
 * Histeresis alrededor de la FRONTERA entre dos huecos de la pista, en
 * fracciones de pagina. Sin ella, quedarse parado justo en una frontera con el
 * temblor normal de un trackpad alterna "siguiente" y "anterior" sin fin. La
 * franja muerta va en la FRONTERA y no en el objetivo, asi que se pasa hacia
 * adelante al 65 % del hueco y hacia atras al 35 %: igual de firme en los dos
 * sentidos. Mismo valor y mismo motivo que en el libro anterior.
 */
const PISTA_BANDA = 0.15;

/**
 * Un cuadro por fotograma. El video es de 24 fps y se reproduce a 60, o sea
 * x2,5; es exactamente lo que hace el libro anterior (14 ms por cuadro) y es lo
 * que deja la vuelta en 0,87 s, practicamente los 0,81 s de aquel.
 *
 * A un cuadro por fotograma no hay escalon POR CONSTRUCCION -cada fotograma
 * muestra un cuadro distinto-, asi que no se densifica el metraje. El giro nuevo
 * mueve 1,37 veces mas entre cuadros vecinos que el anterior (1,82 contra 1,36
 * de media), que es poco al lado del 7x que si dio problemas en la tanda v5 del
 * hero; si al verlo en el navegador se notara, la cura es interpolar el tramo
 * del giro con flujo optico, no bajar este numero.
 */
const MS_POR_CUADRO = 1000 / 60;
/** Tope de aceleracion cuando el scroll encadena varias vueltas seguidas. */
const ACELERA_MAX = 3;
/**
 * Lo más que una transición espera a sus cuadros sin avanzar. Pasado esto sigue
 * con los que haya, como hacía antes: un libro que no se mueve nunca es peor que
 * uno que salta.
 */
const ESPERA_MAX = 6000;
/** Cuantas imagenes del cuadro hay a la vez en la pagina. Ver `pideCapa`. */
const CAPAS = 8;
/** Cuantos cuadros por delante del que se ve se van decodificando. */
const ADELANTO = 3;

/** Un cuadro del video puesto en la pagina, debajo del lienzo. */
interface Capa {
  el: HTMLImageElement;
  cuadro: number;
  /** Ya decodificada: ensenarla no cuesta nada. */
  lista: boolean;
  /** Cuando se pidio por ultima vez; al hacer sitio se va la mas vieja. */
  serie: number;
}

// ─── Geometria del libro, medida sobre el cuadro de reposo ────────────────────
/** El lomo, en pixeles del video. */
const LOMO = 962;
/** Franja vertical util de la pagina, de donde cuelga la malla del giro. */
const PAG_TOP = 60;
const PAG_BOT = 1000;

/**
 * Area de lectura de cada pagina: donde caen la foto y el texto.
 *
 * Va DENTRO del marco decorativo, con 42 px de aire para no pisar los adornos de
 * las esquinas. El marco se midio sobre el cuadro de reposo realzando las lineas
 * finas (la imagen menos su propio desenfoque): el filete derecho de la pagina
 * derecha sale en x 1807-1818 de forma muy estable, y el superior describe una
 * curva suave con su minimo en el centro, que es el combado del papel.
 *
 * La pagina izquierda es el espejo de la derecha respecto al lomo.
 */
const AREA_X0 = 1057;
const AREA_X1 = 1768;
const AREA_Y0 = 88;
const AREA_Y1 = 933;

/** La pagina izquierda es el espejo de la derecha respecto al lomo. */
const AREA_IZQ_X0 = 2 * LOMO - AREA_X1;

/**
 * Los paneles se dibujan al tamano REAL del area en el video, asi que no hay
 * deformacion al estamparlos y los cuerpos de letra de abajo son directamente
 * pixeles del video.
 */
const PANEL_W = AREA_X1 - AREA_X0;
const PANEL_H = AREA_Y1 - AREA_Y0;

/**
 * Donde cae el libro dentro del cuadro, medido sobre el alfa de los archivos.
 * Son los numeros que justifican el encuadre de `dimensiona`, y estan aqui para
 * que no haya que volver a medirlos si alguien lo toca:
 *
 *   cerrado (cuadros 1 y 292)   y  91..995   -> 904 px, el 84 % del alto
 *   abierto (cuadros 102 y 153) y   0..1066  -> sangra por arriba en el propio
 *                                               metraje: 1008 de 1919 columnas
 *                                               llegan a y=0, o sea que la
 *                                               orilla superior de la pagina no
 *                                               esta en el video y no hay
 *                                               encuadre que la recupere.
 */

/**
 * Tiras horizontales con las que se estampa un panel sobre la hoja.
 *
 * Girar la hoja alrededor del lomo -un eje vertical- no cambia la ALTURA de sus
 * puntos, asi que cada fila del panel cae en una fila del lienzo y basta con
 * escalarla en horizontal: no hace falta ni cizalla ni WebGL. Esto es el MINIMO:
 * `estampaHoja` pone una tira cada 2 px de pantalla, porque con 64 -13 px del
 * video cada una- el borde libre combado salia en escalones.
 */
const TIRAS = 64;

// ─── Tipografia de las historias ──────────────────────────────────────────────
// Las proporciones son las del libro anterior, que estan calibradas y aprobadas;
// lo unico que cambia es que alli el panel media 700 px y aqui mide el ancho
// real del area, asi que se reescalan por PANEL_W/700.
const ESCALA_TEXTO = PANEL_W / 700;
const TEXTO_FONT = Math.round(55 * ESCALA_TEXTO);
const TEXTO_MEDIDA = Math.round(575 * ESCALA_TEXTO);
const TEXTO_LINEA = 1.38;
const TEXTO_PARRAFO = 0.5;
const TEXTO_FILETE = Math.round(39 * ESCALA_TEXTO);
const TEXTO_FAMILIA = '"Playball", "EB Garamond", serif';
const TEXTO_TINTA = '#33291a';
const ORO = '#C8912A';

// ─── El sello de la contraportada ────────────────────────────────────────────
/**
 * Donde cae el sello dentro de esa cara, en coordenadas 0..1 del plano. Deja
 * fuera el filete cosido y los cuatro florones, que son de la tapa y no del
 * sello.
 */
const SELLO_CAJA = { u0: 0.17, v0: 0.13, u1: 0.83, v1: 0.8 };
/**
 * Lienzo del sello. La proporcion imita la de su hueco EN EL PLANO -no en
 * pantalla-, que es donde el estampado lo estira: si no, el logotipo saldria
 * ovalado.
 */
const SELLO_W = 900;
const SELLO_H = 940;
/** El logotipo: lado como fraccion del ancho, y centro como fraccion del alto. */
const SELLO_LOGO = { lado: 0.42, cy: 0.29 };
const SELLO_FRASE = 'El horno siempre está encendido';
const SELLO_PIE = 'ESCRIBINOS Y HACEMOS TU PEDIDO';
/** Verde de marca de WhatsApp. */
const WA_VERDE = '#25D366';
/**
 * Cuanta tinta. No es opacidad decorativa: por debajo del 1 la veta del cuero y
 * su sombreado atraviesan el verde, que es lo que distingue una tinta impresa de
 * un color plano pegado encima.
 */
const SELLO_TINTA = 0.92;
/**
 * El grabado. La luz de esta escena es muy pareja sobre la tapa -232 de brillo
 * por la izquierda contra 230 por la derecha, medido sobre el cuero-, asi que el
 * relieve tiene que ser MINIMO: dos copias del trazado desplazadas un pelo, una
 * mas oscura arriba-izquierda y otra mas clara abajo-derecha. Es un hundido, no
 * un realce: la pared que mira a la luz es la de abajo a la derecha.
 *
 * Los dos tonos son el mismo verde aclarado y oscurecido, no gris: bajo
 * `multiply` un verde claro casi no oscurece y por eso se lee como brillo.
 */
const SELLO_RELIEVE = { d: 2.4, sombra: '#0f7a38', luz: '#b9ecc9' };
/**
 * Las motas del entintado. `n` a ojo de la superficie del lienzo del sello;
 * `min`/`max` en pixeles de ESE lienzo, que se ve a poco mas de un cuarto de su
 * tamano, asi que una mota de 3 px es de menos de uno en pantalla.
 */
const SELLO_MOTA = { n: 2600, min: 2.2, max: 5.5, alfa: 0.13 };
/**
 * Trazado oficial del logotipo en un lienzo de 24x24. Es el MISMO que ya usa la
 * pagina de contacto: se copia de ahi y no se redibuja a mano, que con una marca
 * registrada es la diferencia entre el logotipo y un parecido.
 */
const WA_TRAZADO =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

/** Centro del bloque de texto dentro del panel. */
const TEXTO_U = 0.5;
const TEXTO_V = 0.5;

// ─── La copia impresa ─────────────────────────────────────────────────────────
/** Borde blanco de una copia de laboratorio, en fraccion del lado menor. */
const FOTO_BORDE = 0.05;
const FOTO_PAPEL = '#F7F0E2';

// ─── Los dos botones de la pagina de cierre ───────────────────────────────────
/** Centro de cada boton, en fraccion del panel de texto. */
const SOCIAL_POS = {
  ubicacion: { u: 0.5, v: 0.62 },
  mensaje: { u: 0.5, v: 0.75 },
} as const;
const SOCIAL_BTN = {
  w: Math.round(350 * ESCALA_TEXTO),
  h: Math.round(60 * ESCALA_TEXTO),
  r: Math.round(30 * ESCALA_TEXTO),
  rotulo: Math.round(19 * ESCALA_TEXTO),
  track: 2.2 * ESCALA_TEXTO,
  glifo: Math.round(24 * ESCALA_TEXTO),
};
/** El area pulsable es mas alta que el cajetin dibujado, para el dedo. */
const SOCIAL_HIT_ALTO = 1.5;

type SocialKind = 'ubicacion' | 'mensaje';
const SOCIAL_ROTULO: Readonly<Record<SocialKind, string>> = {
  ubicacion: 'UBICACIÓN',
  mensaje: 'ENVIAR MENSAJE',
};

// ─── La malla del giro ────────────────────────────────────────────────────────
interface CuadroGiro {
  /** +1 la hoja esta a la derecha del lomo, -1 a la izquierda. */
  lado: number;
  /** x del borde libre de la hoja, muestreado en `nv` alturas de PAG_TOP a PAG_BOT. */
  libre: number[];
}
interface Malla {
  lomo: number;
  nv: number;
  pagina: { top: number; bot: number };
  giro: Record<string, CuadroGiro>;
}

// ─── El montaje durante la apertura y el cierre ───────────────────────────────
/**
 * Donde cae el area de lectura de cada pagina MIENTRAS el libro se abre y se
 * cierra: las cuatro esquinas, en pixeles del video, cuadro a cuadro.
 *
 * Antes el contenido solo entraba en los ultimos cuadros de la apertura, cuando
 * el libro ya estaba asentado, asi que se veia abrirse con las hojas EN BLANCO
 * y el texto aparecer de golpe encima; al cerrarse pasaba lo mismo al reves. Se
 * notaba que estaba montado.
 *
 * Cada pagina es un PLANO, o sea que su movimiento en pantalla es una
 * homografia, y eso es lo que hay aqui medido. Como se saco, y por que no es un
 * calculo sino una medida, esta en `libro-2026-montaje.md`.
 *
 * Lo que se guarda NO es el rastreo en crudo. El libro es rigido y se abre de
 * corrido, asi que la FORMA del cuadrilatero no puede ir y volver; el rastreo
 * cuadro a cuadro si lo hacia -la cizalla de la pagina derecha cambiaba de
 * signo tres veces al abrir- y eso se veia como el texto deformandose sobre el
 * papel. Por eso la forma va suavizada fuerte y la posicion poco: son dos
 * errores distintos, la forma DEFORMA y la posicion RESBALA.
 */
const MONTAJE_URL = 'assets/libro-2026-montaje.json';

/**
 * En cuantas celdas se parte el panel al estamparlo sobre la hoja.
 *
 * Una homografia no es afin, y `drawImage` solo sabe afin, asi que se aproxima
 * a trozos. Con 10x10 el error en el centro de una celda queda por debajo del
 * pixel para el escorzo mas fuerte del metraje.
 */
const SUB_MONTAJE = 10;

type Esquinas = readonly (readonly number[])[];
type Lado = 'izq' | 'der';
/**
 * Por cuadro: donde cae el area de lectura de cada pagina (`izq`, `der`) y QUE
 * LA TAPA (`ocuIzq`, `ocuDer`).
 *
 * Los dos ocultadores NO son la misma cosa, aunque hagan el mismo papel:
 *
 *   - `ocuDer`, al ABRIR, es la media hoja de enfrente cruzada por delante.
 *   - `ocuIzq`, al CERRAR, es el SEMIPLANO que deja la contratapa al bajar: una
 *     recta por cuadro, buscada en el propio metraje. La tapa es un plano
 *     rigido, asi que su canto sobre la pagina es una recta y no hace falta
 *     nada mas. Empieza en f204 con la recta en el borde de la pagina -que no
 *     borra nada- para que la entrada sea un barrido y no un salto, igual que
 *     el `CORTE_FOTO` del libro anterior.
 *
 * Un cuadro puede NO traer `izq`, y eso no es un hueco: es que ahi la pagina
 * izquierda todavia esta de canto o de espaldas. Al abrir, `izq` arranca en
 * f035, que es donde su cuadrilatero pasa por su area minima y el angulo de la
 * esquina cruza por cero. Antes de f035 ese angulo es negativo -la cara que
 * mira a la camara es el dorso-, y pintar ahi la foto era pintarla del reves.
 * Sin `izq` no se dibuja nada (ver `transicionAbierta`).
 */
interface Montaje {
  readonly [cuadro: string]: {
    readonly izq?: Esquinas;
    readonly der?: Esquinas;
    readonly ocuIzq?: Esquinas;
    readonly ocuDer?: Esquinas;
    /**
     * Cara de la CONTRAPORTADA, para el sello de WhatsApp. Existe del cuadro 203
     * -cuando la tapa empieza a asomar en el cierre- al 292, y no antes: hasta
     * ahi lo que se ve del libro son las hojas de canto.
     *
     * Se midio de otra manera que el resto, porque aqui no hay nada que
     * calibrar a mano: en el 292 el libro ya esta quieto -del 285 al 292 la
     * diferencia entre cuadros es de 0,4 niveles-, asi que ahi se saca la cara
     * una vez y se RASTREA hacia atras emparejando la textura del cuero cuadro a
     * cuadro. De 150 a 430 pares por cuadro con mas del 80 % de acuerdo, y sin
     * deriva visible: comprobado dibujando la rejilla del plano sobre el cuero
     * en ocho cuadros del cierre.
     *
     * Los tres primeros vertices del 292 salen de segmentar la cara por relleno
     * de color; el cuarto, el de abajo a la derecha, no habia manera -ahi la
     * tapa se junta con el lomo y con el bloque de hojas y tanto el relleno como
     * las rectas de Hough se iban 70 px mas abajo, ya sobre la sombra-, asi que
     * se cerro por geometria: punto de fuga de los dos lados mas la condicion de
     * que la tapa es un rectangulo.
     */
    readonly tapa?: Esquinas;
  };
}

/**
 * La transformada que lleva el panel (u y v de 0 a 1) al cuadrilatero `d`.
 *
 * Es la homografia del cuadrado unidad al cuadrilatero, resuelta a mano (el
 * metodo clasico de Heckbert). Con una afin no basta: una afin conserva el
 * paralelismo, asi que sobre una pagina escorzada el contenido se va abriendo
 * hacia el lado que se aleja en vez de estrecharse.
 */
function cuadHomografia(d: readonly PuntoPx[]): (u: number, v: number) => PuntoPx {
  const [p0, p1, p2, p3] = d;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  let g = 0;
  let h = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const den = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(den) > 1e-9) {
      g = (sx * dy2 - sy * dx2) / den;
      h = (dx1 * sy - dy1 * sx) / den;
    }
  }
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const e = p1.y - p0.y + g * p1.y;
  const f = p3.y - p0.y + h * p3.y;
  return (u, v) => {
    const w = g * u + h * v + 1 || 1e-9;
    return { x: (a * u + b * v + p0.x) / w, y: (e * u + f * v + p0.y) / w };
  };
}

/** Lo que hay que dibujar encima del cuadro de video en un instante dado. */
interface Escena {
  /** Foto estatica de la pagina izquierda, o null. */
  fotoIzq: number | null;
  /** Texto estatico de la pagina derecha, o null. */
  textoDer: number | null;
  /** La hoja en vuelo, si la hay. */
  hoja: { cuadro: number; cara: 'texto' | 'foto'; pagina: number } | null;
  /**
   * Donde cae el area de lectura mientras el libro se mueve, o null si esta en
   * reposo y vale la geometria de siempre.
   */
  cuadIzq: Esquinas | null;
  cuadDer: Esquinas | null;
  /** La media hoja que cruza por delante y tapa a la otra, si la hay. */
  ocuIzq: Esquinas | null;
  ocuDer: Esquinas | null;
}

@Component({
  selector: 'bol-about-book-2026',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle],
  templateUrl: './about-book-2026.component.html',
  styleUrl: './about-book-2026.component.scss',
})
export class AboutBook2026Component {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly zone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly cuadrosRef = viewChild.required<ElementRef<HTMLDivElement>>('cuadros');
  private readonly trackRef = viewChild<ElementRef<HTMLElement>>('track');
  private readonly recorridoRef = viewChild<ElementRef<HTMLElement>>('recorrido');
  private readonly remateRef = viewChild<ElementRef<HTMLElement>>('remate');
  private readonly cierreRef = viewChild<ElementRef<HTMLElement>>('cierre');

  readonly contact = CONTACT;
  readonly mensajeUrl = waDirectLink();
  readonly last = LAST;
  readonly cerradoFinal = CERRADO_FINAL;

  readonly listo = signal(false);
  /** Pagina visible: 0 portada, 1..8 paginas, 9 contraportada. */
  readonly estado = signal(0);
  private readonly ocupado = signal(false);

  readonly etiqueta = computed(() => {
    const e = this.estado();
    if (e === 0) return 'Libro cerrado, portada';
    if (e === CERRADO_FINAL) return 'Libro cerrado, contraportada';
    return `Página ${e} de ${LAST}`;
  });

  /** Los dos enlaces solo existen con la pagina de cierre abierta y quieta. */
  readonly muestraSocial = computed(() => this.listo() && !this.ocupado() && this.estado() === LAST);
  /** Y el del sello, solo con el libro cerrado por detras y quieto. */
  readonly muestraSello = computed(() => this.listo() && !this.ocupado() && this.estado() >= CERRADO_FINAL);
  private readonly socialMarcado = signal<SocialKind | null>(null);

  // ─── Recursos ──────────────────────────────────────────────────────────────
  private cuadros: HTMLImageElement[] = [];
  /** Cuadros que no se pudieron descargar: no se esperan. */
  private readonly fallidos = new Set<number>();
  private malla: Malla | null = null;
  private montaje: Montaje = {};
  /**
   * El mismo deformador por GPU que usa el libro anterior: es una utilidad
   * generica -recibe la geometria como cierre- y no toca aquel componente.
   */
  private readonly warpGL = new WarpGL();
  private fotos: (HTMLCanvasElement | null)[] = [];
  private textos: HTMLCanvasElement[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  /** Escala y desplazamiento del video dentro del lienzo (encuadre "cover"). */
  private esc = 1;
  private offX = 0;
  private offY = 0;
  private raf = 0;
  private cuadroActual = PORTADA;
  /**
   * Las capas del cuadro: las imagenes del video que estan puestas en la pagina,
   * debajo del lienzo, ya decodificadas o decodificandose. Ver `pinta`.
   */
  private readonly capas = new Map<number, Capa>();
  private capaVista: Capa | null = null;
  private serieCapa = 0;
  /** El ultimo cuadro pedido, para saber hacia donde se adelanta. */
  private cuadroPrevio = PORTADA;
  private sentido = 0;
  /** Lienzo del sello, dibujado una sola vez. */
  private sello: HTMLCanvasElement | null = null;

  /**
   * Al girar el telefono este componente se DESMONTA -el otro libro ocupa su
   * sitio-, asi que hay que soltarlo todo: si no, sus escuchas de scroll siguen
   * vivas pidiendo cuadros de un lienzo que ya no existe.
   */
  private readonly sueltame: (() => void)[] = [];
  /** Desmontado: la cola de descarga lo mira para no seguir bajando cuadros. */
  private desmontado = false;

  constructor() {
    if (!this.isBrowser) return;
    inject(DestroyRef).onDestroy(() => {
      this.desmontado = true;
      cancelAnimationFrame(this.raf);
      cancelAnimationFrame(this.rafPista);
      for (const f of this.sueltame) f();
      for (const c of this.capas.values()) c.el.remove();
      this.capas.clear();
      this.capaVista = null;
      this.cuadros = [];
    });
    queueMicrotask(() => this.arrancarCuandoSeAcerque());
    this.publicaCierre();
  }

  private readonly store = inject(BolleriaStore);

  /**
   * Avisa de si el libro esta cerrado del todo tras la ultima pagina, que es lo
   * que espera la despedida para entrar (ver `libroCerrado` en el store).
   * `estado` solo cambia cuando la animacion de la tapa ha terminado, y
   * `ocupado` cubre la cadena entera. Sin cargar, `null`: nadie controla y la
   * despedida no se queda escondida para siempre.
   */
  private publicaCierre(): void {
    effect(() => {
      this.store.setLibroCerrado(this.listo() ? this.estado() >= CERRADO_FINAL && !this.ocupado() : null);
    });
    this.sueltame.push(() => this.store.setLibroCerrado(null));
  }

  // ─── Arranque ──────────────────────────────────────────────────────────────
  /**
   * Los 292 cuadros no se piden hasta que la seccion se acerca: son el bloque de
   * descarga mas grande de la portada y arriba del todo esta el hero, que los
   * necesita a ellos primero.
   */
  private arrancarCuandoSeAcerque(): void {
    const host = this.trackRef()?.nativeElement;
    if (!host || typeof IntersectionObserver === 'undefined') {
      void this.arranca();
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          io.disconnect();
          void this.arranca();
        }
      },
      { rootMargin: '150% 0px' },
    );
    io.observe(host);
  }

  private async arranca(): Promise<void> {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    await Promise.all([this.cargaMalla(), this.cargaMontaje(), this.cargaFuentes()]);
    await this.cargaCuadro(PORTADA);
    this.dimensiona();
    this.construyePaneles();
    void this.cargaResto();

    this.listo.set(true);
    this.pinta();
    this.enganchaPista();
    this.leePista(true);

    this.zone.runOutsideAngular(() => {
      window.addEventListener('resize', this.alRedimensionar, { passive: true });
      this.sueltame.push(() => window.removeEventListener('resize', this.alRedimensionar));
      const vv = window.visualViewport;
      if (vv) {
        vv.addEventListener('resize', this.alRedimensionar, { passive: true });
        this.sueltame.push(() => vv.removeEventListener('resize', this.alRedimensionar));
      }
      this.sueltame.push(() => {
        if (this.reencuadre) cancelAnimationFrame(this.reencuadre);
      });
    });
  }

  /**
   * Re-encuadrar cuando cambia lo que se ve, agrupado en un fotograma.
   *
   * `resize` de la ventana no basta en el telefono: cuando la barra del
   * navegador se retrae al bajar, la ventana de disposicion no cambia y quien
   * avisa de que ahora hay mas alto VISIBLE es `visualViewport`. Como el pin
   * mide `100dvh`, ese aviso es justo el momento en que la escena tiene que
   * volver a medirse; sin escucharlo, el lienzo se quedaria con el alto de
   * antes y volveria la banda.
   *
   * La barra no aparece de golpe: se desliza, y el aviso llega muchas veces
   * seguidas. Agruparlos en un `requestAnimationFrame` deja un solo `dimensiona`
   * -que reasigna `canvas.width`, o sea que tira el bitmap- y un solo repintado
   * por fotograma.
   */
  private reencuadre = 0;
  private readonly alRedimensionar = (): void => {
    if (this.reencuadre) return;
    this.reencuadre = requestAnimationFrame(() => {
      this.reencuadre = 0;
      this.dimensiona();
      this.pinta();
    });
  };

  private async cargaMalla(): Promise<void> {
    try {
      const r = await fetch(MALLA_URL);
      this.malla = (await r.json()) as Malla;
    } catch {
      this.malla = null;
    }
  }

  /**
   * Si esto no llega, el libro sigue funcionando: sin cuadrilateros el
   * contenido se estampa con la geometria de reposo, que es lo que hacia antes.
   */
  private async cargaMontaje(): Promise<void> {
    try {
      const r = await fetch(MONTAJE_URL);
      this.montaje = (await r.json()) as Montaje;
    } catch {
      this.montaje = {};
    }
  }

  /**
   * El texto se dibuja en un lienzo, y un lienzo no espera a que la tipografia
   * llegue: si se pinta antes, el reparto en renglones se calcula con la letra
   * de reserva y queda mal repartido para siempre.
   */
  private async cargaFuentes(): Promise<void> {
    const fuentes = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fuentes) return;
    try {
      await Promise.all([
        fuentes.load(`400 ${TEXTO_FONT}px "Playball"`),
        fuentes.load(`500 ${SOCIAL_BTN.rotulo}px "Jost"`),
      ]);
      await fuentes.ready;
    } catch {
      /* con la de reserva el libro sigue leyendose */
    }
  }

  private cargaCuadro(i: number): Promise<void> {
    if (this.cuadros[i]) return Promise.resolve();
    return new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      // <img> y no ImageBitmap a proposito: 292 cuadros de 1920x1080 en
      // ImageBitmap son memoria que el navegador ya no puede soltar, y en un
      // movil eso acaba en recarga de la pestana. Como <img> los descarta el.
      img.onload = () => {
        this.cuadros[i] = img;
        res();
      };
      img.onerror = () => {
        this.fallidos.add(i);
        res();
      };
      img.src = `${FRAMES_DIR}/f${String(i).padStart(3, '0')}.webp`;
    });
  }

  /**
   * Primero la APERTURA, que es lo primero que se ve: el libro se abre y se
   * acerca nada más empezar a bajar. Y dentro de ella, primero uno de cada dos
   * cuadros: con la mitad ya se puede reproducir entera, y llega en la mitad de
   * tiempo. Luego los que faltan, la vuelta de página y el cierre.
   *
   * Antes iba primero la vuelta. En 4G, al girar el teléfono y empezar a bajar,
   * de los cien cuadros de la apertura había llegado uno: se veía la tapa con el
   * texto de la página uno encima y luego el libro abierto de golpe, sin
   * acercarse. Reportado como «el libro no se hace grande».
   */
  private async cargaResto(): Promise<void> {
    const apertura = this.rango(PORTADA, REPOSO);
    const orden = [
      ...apertura.filter((i) => (i - PORTADA) % 2 === 0),
      ...apertura.filter((i) => (i - PORTADA) % 2 === 1),
      ...this.rango(REPOSO + 1, GIRO_HI),
      ...this.rango(GIRO_HI + 1, FRAME_COUNT),
    ];
    const HILOS = 6;
    let i = 0;
    const obrero = async (): Promise<void> => {
      while (!this.desmontado && i < orden.length) {
        await this.cargaCuadro(orden[i++]);
      }
    };
    await Promise.all(Array.from({ length: HILOS }, obrero));
  }

  private rango(a: number, b: number): number[] {
    const out: number[] = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  }

  // ─── Lienzo ────────────────────────────────────────────────────────────────
  /**
   * El libro va A SANGRE mientras cabe: el video cubre la ventana entera y se
   * sale por donde sobre, como un `object-fit: cover`. Con el libro abierto el
   * cuadro esta lleno de libro hasta los bordes, asi que recortar no pierde
   * nada.
   *
   * Con el libro CERRADO si lo pierde, y en un telefono acostado lo perdia de
   * verdad. El video es 16:9 y un telefono tumbado ronda 2,2:1, asi que `cover`
   * ajusta por ancho y se come el 18 % del alto: medido en el sitio publicado,
   * el libro cerrado salia cortado por abajo en las cuatro medidas probadas
   * -873x393, 844x390, 932x430 y 740x360- y ademas rozaba el borde de arriba a
   * 6 px. "Parece que no cabe", y es que literalmente no cabia.
   *
   * Por eso la escala es la MENOR de dos: la de `cover` y aquella a la que la
   * caja de reposo entra entera. Donde `cover` ya cabe -escritorio, tableta,
   * cualquier pantalla 16:9 o mas alta- la segunda es mayor y la regla no toca
   * nada: comprobado, 0 % de diferencia en 1440x900, 1280x800 y 1024x768.
   *
   * Lo que cuesta en el telefono acostado: la escala baja un 8-10 % y el video
   * deja de llegar a los lados, asi que aparecen unas bandas de papel. No dejan
   * ningun corte a la vista, y esto SI hubo que comprobarlo antes de decidirlo,
   * porque con el libro abierto el video sangra por los laterales -en el cuadro
   * 140 la columna izquierda esta opaca al 100 %-. Mirados los bordes al 300 %
   * en los cuadros 100, 120, 140 y 180, el corte cae exactamente sobre el canto
   * de hojas del libro, que ahi es vertical, y se lee como el borde del propio
   * libro. Arriba y abajo no aparece banda nunca: a esta escala el video sigue
   * midiendo 1,12 pantallas de alto.
   */
  private dimensiona(): void {
    const canvas = this.canvasRef().nativeElement;
    const caja = canvas.parentElement;
    if (!caja || !this.ctx) return;
    // El ANCHO sale de la caja; el ALTO, de lo que el telefono esta mostrando.
    //
    // No son lo mismo, y esa es toda la cuestion: la caja -el pin- mide el
    // viewport pequeno a proposito, para que la geometria de la pagina no cambie
    // cuando la barra del navegador se desliza (ver el SCSS del pin). El dibujo,
    // en cambio, tiene que llegar hasta abajo de lo que se ve. Como el lienzo va
    // en absoluto, crecer no mueve nada de sitio.
    const w = caja.clientWidth;
    const h = Math.round(window.visualViewport?.height ?? window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.cuadrosRef().nativeElement.style.height = `${h}px`;
    const W = w * this.dpr;
    const H = h * this.dpr;
    // El libro va A SANGRE salvo en las pantallas mas anchas que el metraje,
    // donde eso no cabe.
    //
    // `cover` ajusta por el lado que le sobra. En una ventana de 16:9 o mas alta
    // -la tableta, un 1920x1080- ajusta por el ALTO y el libro llena el cuadro,
    // que es como esta disenado. En una mas ancha ajusta por el ANCHO y se come
    // alto: en un telefono tumbado, que ronda 2,2:1, el 18 %, y el libro abierto
    // salia sin orillas -ni marco, ni canto de hojas-. En los dos casos el
    // cerrado quedaba pegado al borde de arriba: en un monitor de 1911x906, a
    // 4 px, y visto al bajar parecia la misma imagen que el pie del hero.
    //
    // Ahi se ajusta por alto: entra el cuadro entero, el libro cerrado queda con
    // 33 px de aire arriba y 31 abajo en un 873x393 -76 y 71 en el 1911x906- y
    // el abierto ensena el pliego completo. Cuesta que el libro se vea un
    // 14-20 % mas pequeno y que aparezca papel a los lados, y es el precio de
    // que respire. Bajarlo sin achicarlo no vale: el pie del libro se sale por
    // abajo, y el abierto -que sangra por arriba en el propio metraje- ensenaria
    // el corte recto del cuadro.
    //
    // Quien decide no es un tamano, es la FORMA de la caja comparada con la del
    // metraje. `w * VIDEO_H > h * VIDEO_W` es `w/h > 16/9` sin dividir: la caja
    // es mas ancha que el video, o sea que `cover` tendria que ajustar por el
    // ancho y comerse alto. Ahi -y solo ahi- se ajusta por alto.
    //
    // Antes esto era `h <= 600`, un numero fijo que no dice nada de ninguna
    // pantalla: un aparato mas grande con la misma proporcion se quedaba fuera
    // por un pixel. La forma, en cambio, se cumple sola en cualquier medida. La
    // tableta acostada -1024x768, 1,33:1- es mas ESTRECHA que el metraje, asi
    // que no entra por aqui.
    const cabeSoloPorAlto = w * VIDEO_H > h * VIDEO_W;
    this.esc = cabeSoloPorAlto ? H / VIDEO_H : Math.max(W / VIDEO_W, H / VIDEO_H);
    this.offX = (W - VIDEO_W * this.esc) / 2;
    // Con el libro a sangre el recorte vertical se centra en la CAJA DE REPOSO
    // -centro 543- y no en el cuadro, que es lo que mantiene el libro cerrado
    // dentro. Ajustando por alto no hay recorte que repartir y la cuenta da 0
    // sola, asi que la misma linea vale para los dos casos.
    this.offY = Math.min(0, Math.max(H - VIDEO_H * this.esc, H / 2 - 543 * this.esc));
    this.ctx.imageSmoothingQuality = 'high';
    for (const capa of this.capas.values()) this.colocaCapa(capa.el);
  }

  /** La capa ocupa justo el rectangulo en el que el lienzo dibujaba el cuadro. */
  private colocaCapa(el: HTMLImageElement): void {
    const s = el.style;
    s.position = 'absolute';
    s.maxWidth = 'none';
    s.left = `${this.offX / this.dpr}px`;
    s.top = `${this.offY / this.dpr}px`;
    s.width = `${(VIDEO_W * this.esc) / this.dpr}px`;
    s.height = `${(VIDEO_H * this.esc) / this.dpr}px`;
  }

  /** Pasa un punto de coordenadas del video a pixeles del lienzo. */
  private px(x: number): number {
    return this.offX + x * this.esc;
  }
  private py(y: number): number {
    return this.offY + y * this.esc;
  }

  // ─── Paneles ───────────────────────────────────────────────────────────────
  private construyePaneles(): void {
    this.textos = HISTORIAS.map((h, i) => this.pintaTexto(h.lines, i + 1 === LAST));
    this.fotos = HISTORIAS.map(() => null);
    HISTORIAS.forEach((h, i) => {
      if (!h.photo) return;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.fotos[i] = this.pintaFoto(img);
        this.pinta();
      };
      img.src = h.photo;
    });
  }

  /** Rehace solo el panel de cierre, que es el unico que responde al puntero. */
  private rehacePanelCierre(): void {
    const h = HISTORIAS[LAST - 1];
    this.textos[LAST - 1] = this.pintaTexto(h.lines, true, this.socialMarcado());
    this.pinta();
  }

  private pintaTexto(lineas: readonly string[], esCierre: boolean, marcado: SocialKind | null = null): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = PANEL_W;
    c.height = PANEL_H;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    ctx.textAlign = 'center';
    ctx.fillStyle = TEXTO_TINTA;
    const cx = PANEL_W * TEXTO_U;

    if (esCierre) {
      // La pagina de cierre usa el MISMO motor de reparto que las historias: con
      // `maxWidth` de fillText la linea no se reparte, se aprieta, y las letras
      // salen mas estrechas que en el resto del libro.
      const cuerpo = Math.round(TEXTO_FONT * 0.95);
      ctx.font = `400 ${cuerpo}px ${TEXTO_FAMILIA}`;
      const filas = lineas.flatMap((l) => this.reparte(ctx, l, TEXTO_MEDIDA));
      const paso = cuerpo * TEXTO_LINEA;
      // El bloque se centra en la franja que queda POR ENCIMA de los botones,
      // cuya posicion es fija porque los <a> de verdad se colocan con ella.
      const lo = PANEL_H * 0.2;
      const hi = PANEL_H * (SOCIAL_POS.ubicacion.v - 0.09);
      let y = lo + (hi - lo - filas.length * paso) / 2 + cuerpo * 0.8;
      for (const f of filas) {
        ctx.fillText(f, cx, y);
        y += paso;
      }
      this.pintaBoton(ctx, SOCIAL_POS.ubicacion, 'ubicacion', marcado === 'ubicacion');
      this.pintaBoton(ctx, SOCIAL_POS.mensaje, 'mensaje', marcado === 'mensaje');
      return c;
    }

    ctx.font = `400 ${TEXTO_FONT}px ${TEXTO_FAMILIA}`;
    // Se reparte antes de dibujar: asi se sabe el alto real del bloque -espiga
    // incluida- y se centra de verdad.
    const parrafos = lineas.map((l) => this.reparte(ctx, l, TEXTO_MEDIDA));
    const altoFila = TEXTO_FONT * TEXTO_LINEA;
    const aire = TEXTO_FONT * TEXTO_PARRAFO;
    const filas = parrafos.reduce((s, p) => s + p.length, 0);
    const alto = filas * altoFila + (parrafos.length - 1) * aire + TEXTO_FILETE;
    // 0,8 del cuerpo aproxima el alto visible de la letra por encima de su linea
    // base: centra lo que SE VE y no la caja de lineas, que empieza en la base.
    let y = PANEL_H * TEXTO_V - alto / 2 + TEXTO_FONT * 0.8;
    for (let i = 0; i < parrafos.length; i++) {
      for (const f of parrafos[i]) {
        ctx.fillText(f, cx, y);
        y += altoFila;
      }
      if (i < parrafos.length - 1) y += aire;
    }
    this.pintaFilete(ctx, cx, y - altoFila + TEXTO_FONT * 0.42 + TEXTO_FILETE / 2);
    return c;
  }

  /**
   * Reparte una linea en renglones PAREJOS, no llenados al maximo.
   *
   * Con textos de unas 20 palabras el reparto voraz deja una palabra suelta en
   * el ultimo renglon ("sin atajos.", "cuidado.", "pena."). Se busca el ancho
   * mas estrecho que sigue dando el MISMO numero de renglones -lo que hace
   * `text-wrap: balance` en CSS-, asi que el alto del bloque no cambia y el
   * centrado sigue valiendo.
   */
  private reparte(ctx: CanvasRenderingContext2D, linea: string, medida: number): string[] {
    const voraz = (ancho: number): string[] => {
      const filas: string[] = [];
      let actual = '';
      for (const palabra of linea.split(' ')) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (actual && ctx.measureText(prueba).width > ancho) {
          filas.push(actual);
          actual = palabra;
        } else {
          actual = prueba;
        }
      }
      if (actual) filas.push(actual);
      return filas;
    };
    const base = voraz(medida);
    let mejor = base;
    for (let ancho = medida - 8; ancho > medida * 0.55; ancho -= 8) {
      const prueba = voraz(ancho);
      if (prueba.length !== base.length) break;
      mejor = prueba;
    }
    return mejor;
  }

  /** La espiga de debajo del texto: dos filetes y un rombo. */
  private pintaFilete(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    const largo = TEXTO_MEDIDA * 0.26;
    const hueco = TEXTO_FILETE * 0.42;
    ctx.save();
    ctx.strokeStyle = ORO;
    ctx.lineWidth = Math.max(1, 1.4 * ESCALA_TEXTO);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx - largo, y);
    ctx.lineTo(cx - hueco, y);
    ctx.moveTo(cx + hueco, y);
    ctx.lineTo(cx + largo, y);
    ctx.stroke();
    const r = hueco * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx, y - r);
    ctx.lineTo(cx + r, y);
    ctx.lineTo(cx, y + r);
    ctx.lineTo(cx - r, y);
    ctx.closePath();
    ctx.fillStyle = ORO;
    ctx.fill();
    ctx.restore();
  }

  private pintaBoton(ctx: CanvasRenderingContext2D, pos: { u: number; v: number }, kind: SocialKind, marcado: boolean): void {
    const cx = PANEL_W * pos.u;
    const cy = PANEL_H * pos.v;
    const { w, h, r } = SOCIAL_BTN;
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.save();
    ctx.beginPath();
    // Pildora a mano: `roundRect` no esta en todos los navegadores que el sitio
    // soporta y aqui no compensa un polyfill.
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    if (marcado) {
      ctx.fillStyle = 'rgba(200,145,42,0.16)';
      ctx.fill();
    }
    ctx.strokeStyle = ORO;
    ctx.lineWidth = Math.max(1, (marcado ? 2.2 : 1.5) * ESCALA_TEXTO);
    ctx.stroke();

    const rotulo = SOCIAL_ROTULO[kind];
    ctx.font = `500 ${SOCIAL_BTN.rotulo}px "Jost", system-ui, sans-serif`;
    ctx.fillStyle = TEXTO_TINTA;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const anchoRotulo = this.anchoConTrack(ctx, rotulo, SOCIAL_BTN.track);
    const hueco = SOCIAL_BTN.glifo * 0.55;
    const total = SOCIAL_BTN.glifo + hueco + anchoRotulo;
    const x0 = cx - total / 2;
    this.pintaGlifo(ctx, kind, x0, cy, SOCIAL_BTN.glifo);
    this.textoConTrack(ctx, rotulo, x0 + SOCIAL_BTN.glifo + hueco, cy, SOCIAL_BTN.track);
    ctx.restore();
  }

  private anchoConTrack(ctx: CanvasRenderingContext2D, t: string, track: number): number {
    return ctx.measureText(t).width + track * Math.max(0, t.length - 1);
  }

  private textoConTrack(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, track: number): void {
    let cursor = x;
    for (const ch of t) {
      ctx.fillText(ch, cursor, y);
      cursor += ctx.measureText(ch).width + track;
    }
  }

  private pintaGlifo(ctx: CanvasRenderingContext2D, kind: SocialKind, x: number, cy: number, s: number): void {
    ctx.save();
    ctx.strokeStyle = ORO;
    ctx.fillStyle = ORO;
    ctx.lineWidth = Math.max(1, 1.6 * ESCALA_TEXTO);
    ctx.lineJoin = 'round';
    if (kind === 'ubicacion') {
      // Gota de mapa.
      const r = s * 0.3;
      const cxg = x + s / 2;
      const top = cy - s * 0.42;
      ctx.beginPath();
      ctx.arc(cxg, top + r, r, Math.PI, 0);
      ctx.lineTo(cxg, cy + s * 0.45);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cxg, top + r, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Bocadillo.
      const w = s;
      const h = s * 0.78;
      const x0 = x;
      const y0 = cy - h / 2 - s * 0.06;
      const r = h * 0.28;
      ctx.beginPath();
      ctx.moveTo(x0 + r, y0);
      ctx.lineTo(x0 + w - r, y0);
      ctx.arcTo(x0 + w, y0, x0 + w, y0 + r, r);
      ctx.lineTo(x0 + w, y0 + h - r);
      ctx.arcTo(x0 + w, y0 + h, x0 + w - r, y0 + h, r);
      ctx.lineTo(x0 + w * 0.42, y0 + h);
      ctx.lineTo(x0 + w * 0.26, y0 + h + s * 0.22);
      ctx.lineTo(x0 + w * 0.3, y0 + h);
      ctx.lineTo(x0 + r, y0 + h);
      ctx.arcTo(x0, y0 + h, x0, y0 + h - r, r);
      ctx.lineTo(x0, y0 + r);
      ctx.arcTo(x0, y0, x0 + r, y0, r);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * La foto, como una copia de laboratorio apoyada en la pagina: papel con
   * borde, el negro levantado y algo menos de saturacion. Una foto con negros
   * puros sobre papel crema es imposible y el ojo lo nota.
   */
  private pintaFoto(img: HTMLImageElement): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = PANEL_W;
    c.height = PANEL_H;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    const borde = Math.round(Math.min(PANEL_W, PANEL_H) * FOTO_BORDE);
    ctx.fillStyle = FOTO_PAPEL;
    ctx.fillRect(0, 0, PANEL_W, PANEL_H);
    const iw = PANEL_W - borde * 2;
    const ih = PANEL_H - borde * 2;
    // Recorte "cover": se conserva el centro.
    const rel = iw / ih;
    let sw = img.naturalWidth;
    let sh = Math.round(sw / rel);
    if (sh > img.naturalHeight) {
      sh = img.naturalHeight;
      sw = Math.round(sh * rel);
    }
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, borde, borde, iw, ih);
    ctx.save();
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = 'rgb(28,24,20)';
    ctx.fillRect(borde, borde, iw, ih);
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#808080';
    ctx.fillRect(borde, borde, iw, ih);
    ctx.restore();
    return c;
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  /** De que estado a cual va la animacion en curso, o null si el libro esta quieto. */
  private transicion: { desde: number; hasta: number } | null = null;

  /**
   * Que hay que dibujar encima del cuadro de video.
   *
   * La cuenta clave es la de la vuelta: debajo van la foto de la pagina que se
   * VA (izquierda) y el texto de la que LLEGA (derecha, que la hoja va
   * destapando), y encima la hoja en vuelo, que lleva el texto de la que se va
   * por delante y la foto de la que llega por el dorso. Cuando termina, el dorso
   * queda justo sobre el area izquierda: por eso el reposo siguiente -foto de la
   * que llega a la izquierda, su texto a la derecha- es exactamente lo que ya se
   * esta viendo, y no hay salto.
   */
  private escena(): Escena {
    const c = this.cuadroActual;
    const t = this.transicion;
    const e = this.estado();
    const quieto = { hoja: null, cuadIzq: null, cuadDer: null, ocuIzq: null, ocuDer: null };
    if (!t) {
      if (e <= 0 || e >= CERRADO_FINAL) return { ...quieto, fotoIzq: null, textoDer: null };
      return { ...quieto, fotoIzq: e, textoDer: e };
    }
    const lo = Math.min(t.desde, t.hasta);
    const hi = Math.max(t.desde, t.hasta);

    // Apertura de la tapa sobre la pagina 1, y su cierre sobre la ultima. La
    // hoja no gira sobre el lomo: el libro entero se abre y ademas se acerca a
    // la camara, asi que aqui no vale la malla del giro sino el montaje, que
    // lleva medido donde cae el area de lectura en cada cuadro.
    //
    // El contenido NO entra ni sale con un fundido. Un fundido no puede parecer
    // parte del libro -el papel no se desvanece- y era justo lo que se notaba.
    // Entra y sale porque la media hoja de enfrente lo TAPA: se dibuja siempre y
    // se recorta con ella, asi que el libro lo destapa al abrirse y lo cubre al
    // cerrarse. Donde no hay cuadrilatero, esa pagina no se ve y no se dibuja.
    if (lo === 0 || hi === CERRADO_FINAL) {
      const pagina = lo === 0 ? 1 : LAST;
      return {
        fotoIzq: pagina,
        textoDer: pagina,
        hoja: null,
        cuadIzq: this.esquinas('izq', c),
        cuadDer: this.esquinas('der', c),
        ocuIzq: this.esquinas('ocuIzq', c),
        ocuDer: this.esquinas('ocuDer', c),
      };
    }
    const g = this.malla?.giro[String(Math.round(c))];
    if (!g) return { ...quieto, fotoIzq: lo, textoDer: hi };
    return {
      ...quieto,
      fotoIzq: lo,
      textoDer: hi,
      hoja: { cuadro: Math.round(c), cara: g.lado > 0 ? 'texto' : 'foto', pagina: g.lado > 0 ? lo : hi },
    };
  }

  /**
   * Un cuadrilatero del montaje en el cuadro `c`, o null si ahi no lo hay.
   *
   * Se INTERPOLA entre los dos cuadros vecinos en vez de redondear: el cuadro de
   * video se cuantiza porque es un bitmap, pero la posicion del contenido no
   * tiene por que, y en la apertura las esquinas recorren hasta 60 px entre
   * cuadro y cuadro.
   */
  private esquinas(clave: Lado | 'ocuIzq' | 'ocuDer' | 'tapa', c: number): Esquinas | null {
    const a = this.montaje[String(Math.floor(c))]?.[clave];
    const b = this.montaje[String(Math.ceil(c))]?.[clave];
    if (!a || !b) return a ?? b ?? null;
    const f = c - Math.floor(c);
    if (f === 0) return a;
    return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * f, p[1] + (b[i][1] - p[1]) * f]);
  }

  private suave(t: number): number {
    return Math.max(0, Math.min(1, t));
  }

  /**
   * Si el libro se esta abriendo o cerrando.
   *
   * Sin cuadrilatero ahi NO se dibuja nada: la geometria de reposo pondria el
   * contenido plano en medio del cuadro mientras el libro esta de canto o
   * cerrado. En el resto de la pista si vale, que es donde el libro esta abierto.
   */
  private transicionAbierta(): boolean {
    const t = this.transicion;
    return !!t && (Math.min(t.desde, t.hasta) === 0 || Math.max(t.desde, t.hasta) === CERRADO_FINAL);
  }

  private pinta(): void {
    const ctx = this.ctx;
    if (!ctx || !this.listo()) return;
    const canvas = this.canvasRef().nativeElement;

    // EL CUADRO NO SE DIBUJA EN EL LIENZO: va en una <img> debajo.
    //
    // Dibujado aqui, el lienzo decodificaba el WebP de 1920x1080 en el hilo
    // principal al confirmar cada fotograma. Medido con la CPU de un telefono
    // medio (x4): 64 ms de cada 75, once o doce tirones por vuelta de pagina, y
    // la vuelta de 0,87 s duraba 3,7. `decode()` no lo evita -llena otra cache-
    // y recortar tampoco: la camara se mueve y cambia el 92 % del cuadro.
    //
    // Una <img> puesta en la pagina la decodifica el navegador fuera del hilo
    // principal. Asi que el cuadro se adelanta -se pone y se decodifica antes de
    // que toque- y cuando toca solo hay que ensenarlo. Si uno no llega a tiempo
    // se queda el anterior CON SU CONTENIDO: se pierde un fotograma, no se
    // descuadra nada. Mismo prototipo, misma CPU: 0,87 s y ningun tiron.
    //
    // Dos casos siguen en el lienzo, igual que antes: el sello de la
    // contraportada, que es tinta MULTIPLICADA sobre el cuero y necesita el
    // cuadro debajo en el mismo lienzo, y el primer pintado, antes de que haya
    // ninguna capa lista.
    const pedido = this.cuadroActual;
    const quiere = this.indiceMasCercano(Math.round(pedido));
    // El sentido de la marcha se conserva mientras dure la transicion: entre
    // dos fotogramas puede repintarse el mismo cuadro -cuando su capa termina de
    // decodificarse- y ahi la diferencia es cero sin que el libro se haya parado.
    if (!this.transicion) this.sentido = 0;
    else if (quiere !== this.cuadroPrevio) this.sentido = Math.sign(quiere - this.cuadroPrevio);
    this.cuadroPrevio = quiere;
    let capa: Capa | null = null;
    if (quiere > 0 && !this.esquinasSello()) {
      capa = this.capaLista(quiere, this.sentido);
      // Se ensena ANTES de adelantar: adelantar hace sitio retirando capas, y la
      // que esta a la vista es la unica que no se toca.
      if (capa) this.ensena(capa);
      this.adelanta(quiere, this.sentido);
      // Nada listo todavia y hay una a la vista: se queda como esta, entera.
      if (!capa && this.capaVista) return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ensena(capa);
    if (capa) {
      // El contenido va con el cuadro que de verdad se ve.
      if (capa.cuadro !== quiere) this.cuadroActual = capa.cuadro;
    } else {
      const img = this.cuadros[quiere];
      if (img) ctx.drawImage(img, this.offX, this.offY, VIDEO_W * this.esc, VIDEO_H * this.esc);
    }
    this.pintaContenido(ctx);
    this.cuadroActual = pedido;
  }

  /** Lo que va ENCIMA del cuadro: las paginas, la hoja en vuelo y el sello. */
  private pintaContenido(ctx: CanvasRenderingContext2D): void {
    const s = this.escena();
    ctx.save();
    const g = (s.hoja ? this.malla?.giro[String(s.hoja.cuadro)] : null) ?? null;

    if (s.fotoIzq !== null) {
      const panel = this.fotos[s.fotoIzq - 1];
      // La hoja solo tapa la pagina izquierda cuando ya ha cruzado el lomo.
      if (panel && s.cuadIzq) this.estampaCuad(ctx, panel, s.cuadIzq, s.ocuIzq);
      else if (panel && !s.cuadIzq && !this.transicionAbierta()) {
        this.estampaEstatico(ctx, panel, 'izq', g !== null && g.lado < 0 ? g : null);
      }
    }
    if (s.textoDer !== null) {
      const panel = this.textos[s.textoDer - 1];
      if (panel && s.cuadDer) this.estampaCuad(ctx, panel, s.cuadDer, s.ocuDer);
      else if (panel && !s.cuadDer && !this.transicionAbierta()) {
        this.estampaEstatico(ctx, panel, 'der', g !== null && g.lado > 0 ? g : null);
      }
    }
    if (s.hoja && g) {
      const panel = s.hoja.cara === 'texto' ? this.textos[s.hoja.pagina - 1] : this.fotos[s.hoja.pagina - 1];
      if (panel) this.estampaHoja(ctx, panel, g);
    }
    ctx.restore();

    // El sello de la contraportada. Va IMPRESO en el cuero, asi que se dibuja
    // siempre que haya tapa a la vista -desde que asoma en el cierre, por el
    // cuadro 203, hasta el final- y acompana a la tapa mientras baja. No entra
    // con un fundido: un logotipo impreso no aparece ni desaparece, igual que no
    // lo hacen los florones de las esquinas.
    const tapa = this.esquinasSello();
    if (tapa) {
      ctx.save();
      // MULTIPLICAR, que es como se comporta la tinta: deja pasar la veta del
      // cuero y su sombreado en vez de taparlos con un color plano. Es la
      // diferencia entre una tinta impresa y una calcomania pegada encima.
      // `globalAlpha` y el modo de mezcla valen para los dos caminos de
      // estampado: WarpGL termina con un `drawImage` sobre este mismo contexto,
      // y la malla sin GPU tambien.
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = SELLO_TINTA;
      this.estampaCuad(ctx, this.panelSello(), tapa, null);
      ctx.restore();
    }
  }

  /**
   * El hueco del sello en el cuadro actual, o null si la tapa no esta a la
   * vista. Sale del plano `tapa` del montaje, que esta medido cuadro a cuadro
   * durante todo el cierre.
   */
  private esquinasSello(): Esquinas | null {
    const cara = this.esquinas('tapa', this.cuadroActual);
    if (!cara) return null;
    const mapa = cuadHomografia(cara.map((q) => ({ x: q[0], y: q[1] })));
    const { u0, v0, u1, v1 } = SELLO_CAJA;
    return [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ].map(([u, v]) => {
      const q = mapa(u, v);
      return [q.x, q.y];
    });
  }

  /**
   * El sello: el logotipo de WhatsApp y, debajo, la frase. Se dibuja plano y de
   * frente, y es el estampado el que le pone la perspectiva de la tapa, igual
   * que con las paginas.
   */
  private panelSello(): HTMLCanvasElement {
    if (this.sello) return this.sello;
    const c = document.createElement('canvas');
    c.width = SELLO_W;
    c.height = SELLO_H;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;

    const lado = SELLO_W * SELLO_LOGO.lado;
    const trazo = new Path2D(WA_TRAZADO);
    const marca = (dx: number, dy: number, color: string): void => {
      ctx.save();
      ctx.translate((SELLO_W - lado) / 2 + dx, SELLO_H * SELLO_LOGO.cy - lado / 2 + dy);
      ctx.scale(lado / 24, lado / 24);
      ctx.fillStyle = color;
      ctx.fill(trazo);
      ctx.restore();
    };
    const { d, sombra, luz } = SELLO_RELIEVE;
    marca(d, d, luz);          // la pared que mira a la luz
    marca(-d, -d, sombra);     // la que le da la espalda
    marca(0, 0, WA_VERDE);     // y la tinta encima de las dos

    const cx = SELLO_W / 2;
    const cuerpo = Math.round(SELLO_W * 0.093);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = TEXTO_TINTA;
    ctx.font = `400 ${cuerpo}px ${TEXTO_FAMILIA}`;
    const filas = this.reparte(ctx, SELLO_FRASE, SELLO_W * 0.84);
    let y = SELLO_H * 0.63;
    for (const f of filas) {
      ctx.fillText(f, cx, y);
      y += cuerpo * TEXTO_LINEA;
    }

    this.pintaFilete(ctx, cx, y + cuerpo * 0.25);

    // Cuerpo y tracking cortos a proposito: con el renglon mas ancho, sus
    // extremos se metian en los florones de las esquinas de abajo.
    const pie = Math.round(SELLO_W * 0.03);
    const track = pie * 0.18;
    ctx.font = `500 ${pie}px "Jost", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = ORO;
    const ancho = this.anchoConTrack(ctx, SELLO_PIE, track);
    this.textoConTrack(ctx, SELLO_PIE, cx - ancho / 2, y + cuerpo * 1.35, track);

    this.motea(ctx);
    this.sello = c;
    return c;
  }

  /**
   * El entintado irregular. Una tinta que se posa en un cuero no cubre parejo:
   * el poro se la bebe a trozos. Sin esto el sello se lee como un vector
   * perfecto pegado sobre la tapa, que es justo lo que se queria evitar.
   *
   * Se hace mordiendo el alfa -`destination-out`- con manchitas, no pintando
   * puntos encima: asi lo que asoma por los huecos es el cuero de verdad, con su
   * color y su sombreado, y no un beige inventado. El azar es fijo a proposito,
   * para que el sello sea el mismo en cada carga.
   */
  private motea(ctx: CanvasRenderingContext2D): void {
    let semilla = 20260922;
    const azar = (): number => {
      semilla = (semilla * 1103515245 + 12345) & 0x7fffffff;
      return semilla / 0x7fffffff;
    };
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < SELLO_MOTA.n; i++) {
      const r = SELLO_MOTA.min + azar() * (SELLO_MOTA.max - SELLO_MOTA.min);
      ctx.globalAlpha = SELLO_MOTA.alfa * (0.35 + azar() * 0.65);
      ctx.beginPath();
      ctx.arc(azar() * SELLO_W, azar() * SELLO_H, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Si un cuadro aun no ha llegado, se usa el mas cercano que si esta. 0: ninguno. */
  private indiceMasCercano(i: number): number {
    for (let d = 0; d < FRAME_COUNT; d++) {
      if (this.cuadros[i - d]) return i - d;
      if (this.cuadros[i + d]) return i + d;
    }
    return 0;
  }

  // ─── Las capas del cuadro ──────────────────────────────────────────────────
  /**
   * Pone el cuadro `i` en la pagina, oculto, y lo manda decodificar. Es la misma
   * <img> que ya lo descargo, no una copia: no vuelve a pedirse a la red.
   *
   * Solo hay `CAPAS` a la vez. Cada cuadro decodificado son 8 MB, y los 292
   * serian memoria que un telefono no tiene -por eso van como <img> y no como
   * ImageBitmap-; al hacer sitio se va la que mas tiempo lleva sin pedirse.
   */
  private pideCapa(i: number): void {
    const ya = this.capas.get(i);
    if (ya) {
      ya.serie = ++this.serieCapa;
      return;
    }
    const el = this.cuadros[i];
    if (!el) return;
    if (this.capas.size >= CAPAS) {
      let vieja: Capa | null = null;
      for (const c of this.capas.values()) if (c !== this.capaVista && (!vieja || c.serie < vieja.serie)) vieja = c;
      if (!vieja) return;
      vieja.el.remove();
      this.capas.delete(vieja.cuadro);
    }
    const capa: Capa = { el, cuadro: i, lista: false, serie: ++this.serieCapa };
    this.capas.set(i, capa);
    this.colocaCapa(el);
    el.style.visibility = 'hidden';
    this.cuadrosRef().nativeElement.appendChild(el);
    const lista = (): void => {
      if (this.capas.get(i) !== capa) return;
      capa.lista = true;
      // Era la que se esperaba: con el libro quieto nadie mas va a repintar.
      if (this.cuadroPrevio === i && this.capaVista !== capa) this.pinta();
    };
    // Si `decode` falla -no existe, o el navegador la descarto- la capa vale
    // igual: se decodificara al ensenarla, como una imagen cualquiera.
    this.zone.runOutsideAngular(() => {
      if (typeof el.decode === 'function') el.decode().then(lista, lista);
      else lista();
    });
  }

  /**
   * La capa lista para `quiere`, o -si no ha llegado a tiempo- la lista mas
   * cercana a ella entre lo que se ve y lo que se pide, para no ir hacia atras.
   */
  private capaLista(quiere: number, sentido: number): Capa | null {
    const justa = this.capas.get(quiere);
    if (justa?.lista) return justa;
    const vista = this.capaVista;
    if (!vista || !sentido) return null;
    let mejor: Capa | null = null;
    for (const c of this.capas.values()) {
      if (!c.lista || (c.cuadro - vista.cuadro) * sentido <= 0 || (quiere - c.cuadro) * sentido <= 0) continue;
      if (!mejor || (c.cuadro - mejor.cuadro) * sentido > 0) mejor = c;
    }
    return mejor;
  }

  /**
   * Adelanta los cuadros que vienen. En marcha, los siguientes en el sentido de
   * la marcha. En reposo, los primeros de cada transicion que puede empezar
   * desde aqui, que no son vecinos: pasar hoja hacia atras arranca en GIRO_HI.
   */
  private adelanta(quiere: number, sentido: number): void {
    this.pideCapa(quiere);
    if (sentido) {
      for (let k = 1; k <= ADELANTO; k++) {
        const i = quiere + k * sentido;
        if (i >= PORTADA && i <= FRAME_COUNT) this.pideCapa(i);
      }
      return;
    }
    const e = this.estado();
    if (this.transicion || e >= CERRADO_FINAL) return;
    if (e <= 0) {
      this.pideCapa(PORTADA + 1);
      this.pideCapa(PORTADA + 2);
      return;
    }
    // Hacia delante: la hoja siguiente o, en la ultima, bajar la tapa.
    if (e < LAST) {
      this.pideCapa(REPOSO + 1);
      this.pideCapa(REPOSO + 2);
    } else {
      this.pideCapa(GIRO_HI);
      this.pideCapa(GIRO_HI + 1);
    }
    // Hacia atras: la hoja anterior o, en la primera, cerrar la tapa.
    if (e > 1) {
      this.pideCapa(GIRO_HI);
      this.pideCapa(GIRO_HI - 1);
    } else {
      this.pideCapa(REPOSO - 1);
      this.pideCapa(REPOSO - 2);
    }
  }

  /** Deja a la vista esa capa y solo esa; `null` las esconde todas. */
  private ensena(capa: Capa | null): void {
    if (this.capaVista === capa) return;
    if (this.capaVista) this.capaVista.el.style.visibility = 'hidden';
    if (capa) capa.el.style.visibility = 'visible';
    this.capaVista = capa;
  }

  /** x del borde libre a una altura dada del video. */
  private libreEn(g: CuadroGiro, y: number): number {
    const nv = this.malla?.nv ?? g.libre.length;
    const t = ((y - PAG_TOP) / (PAG_BOT - PAG_TOP)) * (nv - 1);
    const i = Math.max(0, Math.min(nv - 2, Math.floor(t)));
    const f = Math.max(0, Math.min(1, t - i));
    return g.libre[i] * (1 - f) + g.libre[i + 1] * f;
  }

  /**
   * Panel sobre la hoja mientras el libro se abre o se cierra.
   *
   * `esquinas` son las cuatro esquinas del area de lectura en pixeles del video,
   * medidas cuadro a cuadro. Como la pagina es un plano, lo que hay entre las
   * cuatro esquinas es una HOMOGRAFIA: no basta con estirar, hay que aplicar la
   * perspectiva, o el contenido se desliza sobre el papel en cuanto la pagina
   * esta escorzada -que es justo toda la apertura-.
   *
   * `tapa` es lo que cruza por delante: la media hoja al abrir, el semiplano de
   * la contratapa al cerrar. El contenido se recorta con ella, y de ahi sale
   * que el libro lo destape al abrirse y lo cubra al cerrarse en vez de que
   * aparezca y desaparezca.
   *
   * `drawImage` solo sabe transformadas afines, asi que la homografia se
   * aproxima a trozos con una malla. En GPU se dibuja de una pasada con dos
   * triangulos por celda, que ademas es continuo por construccion; sin GPU se
   * cae al camino de siempre, celda a celda.
   */
  private estampaCuad(
    ctx: CanvasRenderingContext2D,
    panel: HTMLCanvasElement,
    esquinas: Esquinas,
    tapa: Esquinas | null,
  ): void {
    const dst = esquinas.map((p) => ({ x: this.px(p[0]), y: this.py(p[1]) }));
    const mapa = cuadHomografia(dst);
    ctx.save();
    if (tapa) {
      // Recorte al COMPLEMENTARIO de la tapa: el lienzo entero menos su
      // cuadrilatero, con la regla par-impar. `clip` solo sabe quedarse con lo de
      // DENTRO de un trazado, asi que para quedarse con lo de fuera hay que
      // meter tambien el lienzo entero y dejar que la regla haga el agujero.
      const cv = ctx.canvas;
      ctx.beginPath();
      ctx.rect(0, 0, cv.width, cv.height);
      ctx.moveTo(this.px(tapa[0][0]), this.py(tapa[0][1]));
      for (const p of tapa.slice(1)) ctx.lineTo(this.px(p[0]), this.py(p[1]));
      ctx.closePath();
      ctx.clip('evenodd');
    }
    if (!this.warpGL.vivo || !this.warpGL.render(ctx, panel, SUB_MONTAJE, mapa, () => true, false)) {
      this.estampaMalla(ctx, panel, mapa);
    }
    ctx.restore();
  }

  /**
   * Camino sin GPU: la malla celda a celda, con una afin por celda.
   *
   * Entre celda y celda queda una costura: el recorte tiene sus bordes
   * suavizados, asi que dos celdas vecinas ponen medio pixel cada una y el
   * fondo asoma por debajo. Sobre la foto se ve como un enrejado claro.
   *
   * La cura son DOS cosas a la vez, y con una sola no basta: ensanchar el
   * recorte hacia fuera Y dibujar tambien ese margen de mas. Ensanchar solo el
   * recorte deja la costura igual -ahi no se pinta nada, porque `drawImage`
   * solo pinta el trozo de origen que se le pide-, que es exactamente lo que
   * pasaba con medio pixel de recorte y el trozo justo.
   */
  private estampaMalla(
    ctx: CanvasRenderingContext2D,
    panel: HTMLCanvasElement,
    mapa: (u: number, v: number) => PuntoPx,
  ): void {
    const n = SUB_MONTAJE;
    /** Margen del solape, en pixeles del PANEL. */
    const m = 2;
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        const u0 = gx / n;
        const v0 = gy / n;
        const u1 = (gx + 1) / n;
        const v1 = (gy + 1) / n;
        const a = mapa(u0, v0);
        const b = mapa(u1, v0);
        const c = mapa(u0, v1);
        const d = mapa(u1, v1);
        const sw = (u1 - u0) * panel.width;
        const sh = (v1 - v0) * panel.height;
        if (sw <= 0 || sh <= 0) continue;
        const cx = (a.x + b.x + c.x + d.x) / 4;
        const cy = (a.y + b.y + c.y + d.y) / 4;
        ctx.save();
        ctx.beginPath();
        let primero = true;
        for (const p of [a, b, d, c]) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const l = Math.hypot(dx, dy) || 1;
          const x = p.x + (dx / l) * 0.7;
          const y = p.y + (dy / l) * 0.7;
          if (primero) {
            ctx.moveTo(x, y);
            primero = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.clip();
        // Afin a partir de tres esquinas: el cuarto vertice queda donde lo deje
        // el paralelogramo, y por eso hacen falta muchas celdas.
        ctx.transform((b.x - a.x) / sw, (b.y - a.y) / sw, (c.x - a.x) / sh, (c.y - a.y) / sh, a.x, a.y);
        ctx.drawImage(
          panel,
          u0 * panel.width - m,
          v0 * panel.height - m,
          sw + m * 2,
          sh + m * 2,
          -m,
          -m,
          sw + m * 2,
          sh + m * 2,
        );
        ctx.restore();
      }
    }
  }

  /**
   * Panel quieto sobre una pagina. Si la hoja en vuelo esta sobre esa pagina, se
   * recorta a la parte que la hoja NO cubre; el papel de la hoja ya lo dibuja el
   * video, y sin este recorte el contenido de debajo se veria a traves de ella.
   */
  private estampaEstatico(ctx: CanvasRenderingContext2D, panel: HTMLCanvasElement, lado: 'izq' | 'der', tapa: CuadroGiro | null): void {
    ctx.save();
    if (tapa) {
      ctx.beginPath();
      const n = 40;
      const pts: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const y = PAG_TOP + ((PAG_BOT - PAG_TOP) * i) / n;
        pts.push([this.px(this.libreEn(tapa, y)), this.py(y)]);
      }
      const borde = lado === 'der' ? this.px(VIDEO_W) : this.px(0);
      ctx.moveTo(pts[0][0], this.py(-VIDEO_H));
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(pts[n][0], this.py(VIDEO_H * 2));
      ctx.lineTo(borde, this.py(VIDEO_H * 2));
      ctx.lineTo(borde, this.py(-VIDEO_H));
      ctx.closePath();
      ctx.clip();
    }
    const x0 = lado === 'der' ? AREA_X0 : AREA_IZQ_X0;
    ctx.drawImage(panel, this.px(x0), this.py(AREA_Y0), PANEL_W * this.esc, PANEL_H * this.esc);
    ctx.restore();
  }

  /**
   * Panel sobre la hoja en vuelo.
   *
   * Cada fila del panel cae en una fila del lienzo -girar sobre el lomo, que es
   * un eje vertical, no cambia la altura de los puntos- asi que basta con
   * escalar cada tira en horizontal entre el lomo y el borde libre.
   *
   * NO hay espejo para el dorso, y comprobarlo con numeros evito meter uno de
   * mas. La cuenta `x = lomo + u * (libre - lomo)` ya cambia de sentido sola
   * cuando el borde libre cruza al otro lado, porque `libre - lomo` se vuelve
   * negativo, y el resultado cae exactamente en los dos reposos:
   *
   *   cara frontal, f102 -> la columna 0 del panel cae en x 1057 = area derecha
   *   dorso,        f153 -> la columna 0 del panel cae en x  156 = area izquierda
   *
   * Un `scale(-1,1)` encima habria dejado la foto espejada al aterrizar.
   */
  private estampaHoja(ctx: CanvasRenderingContext2D, panel: HTMLCanvasElement, g: CuadroGiro): void {
    const rep = this.malla?.giro[String(REPOSO)];
    if (!rep) return;
    // Una tira cada 2 px CSS de alto, y nunca menos de TIRAS. Con 64 tiras cada
    // una media 13 px del video, y el borde libre -que a media vuelta se comba
    // mucho- salia en escalones de ese alto, y la foto con el: se veia
    // cuadriculada. La cuenta de cada tira no cambia: solo hay mas.
    //
    // 2 px y no 1, medido con GPU real en 1911x906: con una por pixel (~710
    // `drawImage` por cuadro) se perdian 1-2 cuadros cada seis vueltas y con
    // las 64 de antes ninguno; con 2 px (~355) vuelve a ninguno y el escalon ya
    // no se ve ni al 300 %.
    const n = Math.max(TIRAS, Math.ceil((PANEL_H * this.esc) / this.dpr / 2));
    for (let i = 0; i < n; i++) {
      const v0 = i / n;
      const v1 = (i + 1) / n;
      const y = AREA_Y0 + ((v0 + v1) / 2) * PANEL_H;
      // uA y uB se sacan del borde libre EN ESA FILA, no en el centro: el borde
      // de la pagina se comba, asi que con un solo valor el contenido no caia
      // justo en el area en las filas de arriba y abajo, y eso es un salto
      // visible al empezar y al terminar la vuelta.
      const lRep = this.libreEn(rep, y) - LOMO;
      const uA = (AREA_X0 - LOMO) / lRep;
      const uB = (AREA_X1 - LOMO) / lRep;
      const l = this.libreEn(g, y) - LOMO;
      const xa = LOMO + uA * l;
      const xb = LOMO + uB * l;
      const sy = v0 * PANEL_H;
      const sh = Math.max(1, (v1 - v0) * PANEL_H);
      // Filas en pixeles ENTEROS del lienzo: asi cada tira empieza justo donde
      // acaba la anterior y no queda costura. El solape de +1 px que la tapaba
      // antes no vale con tiras tan finas: pintaria media tira dos veces y el
      // texto, que es semitransparente en sus bordes, saldria mas grueso.
      const dy = Math.round(this.py(AREA_Y0 + v0 * PANEL_H));
      const dh = Math.round(this.py(AREA_Y0 + v1 * PANEL_H)) - dy;
      if (dh <= 0) continue;
      const dx = Math.min(this.px(xa), this.px(xb));
      const dw = Math.abs(this.px(xb) - this.px(xa));
      if (dw < 0.5) continue;
      ctx.drawImage(panel, 0, sy, PANEL_W, sh, dx, dy, dw, dh);
    }
  }

  // ─── La pista de scroll ────────────────────────────────────────────────────
  // El componente lee en que punto de la pista esta la ventana y deriva de ahi
  // la pagina. La posicion del scroll es la unica fuente de verdad, y por eso el
  // teclado y los controles ocultos no llaman a las transiciones: mueven la
  // ventana.
  //
  // La unica vez que se toca el scroll es mientras pasa UNA hoja: se bloquea y
  // al terminar la ventana vuelve al reposo de esa hoja. Un gesto, una hoja (ver
  // `CerrojoDeHoja`); antes los gestos se acumulaban y el libro pasaba todas las
  // paginas a toda prisa con la ventana ya en otra parte.
  private objetivo = 0;
  private conduciendo = false;
  private rafPista = 0;
  private cerrojo: CerrojoDeHoja | null = null;

  /**
   * El freno de la inercia, encendido solo mientras la pista se ve. Los topes
   * los declara el SCSS; esto es el interruptor. Ver `freno-de-pista.ts`.
   */
  private enganchaElFreno(): void {
    const pista = this.trackRef()?.nativeElement;
    if (pista) this.sueltame.push(frenaMientrasSeVe(pista));
  }

  private enganchaPista(): void {
    this.enganchaElFreno();
    const cerrojo = new CerrojoDeHoja((terminada) => this.trasLaHoja(terminada));
    this.cerrojo = cerrojo;
    this.sueltame.push(() => cerrojo.destruye());
    this.zone.runOutsideAngular(() => {
      const alMover = (): void => {
        if (this.rafPista) return;
        this.rafPista = requestAnimationFrame(() => {
          this.rafPista = 0;
          this.leePista();
        });
      };
      window.addEventListener('scroll', alMover, { passive: true });
      window.addEventListener('resize', alMover, { passive: true });
      this.sueltame.push(() => {
        window.removeEventListener('scroll', alMover);
        window.removeEventListener('resize', alMover);
      });
    });
  }

  /**
   * Progreso dentro de la pista, de 0 a CERRADO_FINAL, o null si aun no se puede
   * medir. Los tramos los MIDEN sus propios elementos en vez de recalcularlos
   * con las constantes del SCSS, asi que el ritmo vive en un solo sitio.
   */
  private progresoPista(): number | null {
    const pista = this.trackRef()?.nativeElement;
    const recorrido = this.recorridoRef()?.nativeElement;
    const remate = this.remateRef()?.nativeElement;
    const cierre = this.cierreRef()?.nativeElement;
    if (!pista || !recorrido || !remate || !cierre) return null;
    const util = recorrido.offsetHeight;
    if (util <= 0 || cierre.offsetHeight <= 0) return null;
    const ya = -pista.getBoundingClientRect().top;
    if (ya <= util) return Math.max(0, (ya / util) * LAST);
    const tras = ya - util - remate.offsetHeight;
    if (tras <= 0) return LAST;
    return LAST + Math.min(1, tras / cierre.offsetHeight);
  }

  /**
   * `forzar` salta la histeresis, y lo usa solo el arranque: si la carga termina
   * con la ventana ya metida en la pista y justo sobre una frontera, la franja
   * muerta dejaria el libro en la portada hasta que alguien volviera a moverlo.
   */
  private leePista(forzar = false): void {
    // Con el cerrojo echado, lo que el gesto siga recorriendo no pide nada.
    if (this.cerrojo?.puesto) return;
    const bruto = this.progresoPista();
    if (bruto === null) return;
    const previo = this.objetivo;
    const hueco = Math.round(bruto);
    if (forzar || Math.abs(bruto - hueco) < 0.5 - PISTA_BANDA) {
      this.objetivo = Math.min(CERRADO_FINAL, Math.max(0, hueco));
    }
    if (this.objetivo === previo) return;
    // Las transiciones escriben signals, asi que tienen que correr DENTRO de la
    // zona o la etiqueta de accesibilidad y los enlaces de la pagina de cierre
    // se quedan en el valor anterior.
    this.zone.run(() => void this.conduce());
  }

  /**
   * Lleva el libro hasta `objetivo` de un paso en uno, releyendo el destino en
   * cada vuelta: si mientras tanto quien mira cambia de idea y sube, la cadena se
   * da la vuelta sola en vez de terminar un recorrido que ya nadie pide. Con
   * cola larga la vuelta se acelera hasta ACELERA_MAX.
   *
   * Eso ya solo pasa en los saltos de varias hojas que no son un gesto -un
   * ancla, Inicio/Fin, el relevo al girar-. Un gesto pide UNA hoja y echa el
   * cerrojo, asi que el destino no cambia hasta que la hoja termina.
   */
  private async conduce(): Promise<void> {
    if (this.conduciendo) return;
    this.conduciendo = true;
    this.ocupado.set(true);
    const gesto = this.listo() && !this.reducido() && Math.abs(this.objetivo - this.estado()) === 1 && !!this.cerrojo?.hayGesto;
    if (gesto) this.cerrojo?.echa();
    try {
      while (this.listo() && this.estado() !== this.objetivo) {
        const desde = this.estado();
        const hacia = desde + Math.sign(this.objetivo - desde);
        const cola = Math.abs(this.objetivo - desde);
        await this.anima(desde, hacia, Math.min(ACELERA_MAX, Math.max(1, cola)));
        this.estado.set(hacia);
      }
    } finally {
      this.conduciendo = false;
      this.ocupado.set(false);
      this.transicion = null;
      this.cuadroActual = this.cuadroDe(this.estado());
      this.pinta();
      if (gesto) this.cerrojo?.hojaHecha();
    }
  }

  /**
   * Al soltarse el cerrojo: la ventana vuelve al reposo de la hoja en la que
   * quedo el libro, y lo que el gesto alcanzara a recorrer se descarta. La
   * escena esta fija, asi que el salto no se ve. Si lo solto el tope con la hoja
   * aun en marcha -en 4G puede esperar a sus cuadros-, no hay reposo: se relee
   * la pista y el libro sigue al scroll.
   */
  private trasLaHoja(terminada: boolean): void {
    if (terminada) {
      const y = this.yDe(this.estado());
      if (y !== null) window.scrollTo({ top: y, behavior: 'instant' });
    }
    // Ya sin cerrojo: el aviso de scroll de la recolocacion puede no llegar si
    // la ventana ya estaba en su sitio.
    requestAnimationFrame(() => this.leePista());
  }

  private cuadroDe(estado: number): number {
    if (estado <= 0) return PORTADA;
    if (estado >= CERRADO_FINAL) return CERRADO;
    return REPOSO;
  }

  /** Cuadros que recorre una transicion entre dos estados contiguos. */
  private tramo(desde: number, hasta: number): [number, number] {
    const lo = Math.min(desde, hasta);
    const hi = Math.max(desde, hasta);
    if (lo === 0) return [PORTADA, REPOSO];
    if (hi === CERRADO_FINAL) return [GIRO_HI, CERRADO];
    return [REPOSO, GIRO_HI];
  }

  private anima(desde: number, hasta: number, acelera: number): Promise<void> {
    const [a, b] = this.tramo(desde, hasta);
    const haciaDelante = hasta > desde;
    const cuadros = b - a;
    const dur = (cuadros * MS_POR_CUADRO) / acelera;
    this.transicion = { desde, hasta };
    if (this.reducido()) {
      this.cuadroActual = haciaDelante ? b : a;
      this.pinta();
      return Promise.resolve();
    }
    // Como un vídeo que carga: el reloj solo avanza hasta el último cuadro que
    // ya ha llegado, y si el siguiente falta, espera ahí y sigue cuando llega.
    // Nunca se pinta un cuadro que no está -se pintaba el más cercano, que podía
    // ser la tapa con el texto de dentro encima o el libro ya abierto-.
    return new Promise((res) => {
      let hecho = 0;
      let previo = performance.now();
      let quieto = previo;
      const paso = (ahora: number): void => {
        const quiere = Math.min(cuadros, hecho + ((ahora - previo) / dur) * cuadros);
        previo = ahora;
        const tope = ahora - quieto > ESPERA_MAX ? cuadros : this.disponibles(a, b, haciaDelante);
        const nuevo = Math.min(quiere, tope);
        if (nuevo > hecho) quieto = ahora;
        hecho = Math.max(hecho, nuevo);
        this.cuadroActual = this.cuadroPintable(haciaDelante ? a + hecho : b - hecho, haciaDelante);
        this.pinta();
        if (hecho < cuadros) {
          this.raf = requestAnimationFrame(paso);
        } else {
          res();
        }
      };
      this.raf = requestAnimationFrame(paso);
    });
  }

  private tiene(i: number): boolean {
    return !!this.cuadros[i] || this.fallidos.has(i);
  }

  /**
   * Cuántos cuadros de la transición se pueden reproducir ya, desde su
   * principio: los que han llegado, admitiendo que falte uno de cada dos -la
   * apertura llega primero a cuadros alternos-.
   */
  private disponibles(a: number, b: number, haciaDelante: boolean): number {
    const n = b - a;
    for (let k = 1; k <= n; k++) {
      const i = haciaDelante ? a + k : b - k;
      const antes = haciaDelante ? i - 1 : i + 1;
      if (!this.tiene(i) && !(this.tiene(antes) && k < n)) return k - 1;
    }
    return n;
  }

  /**
   * El cuadro que de verdad se pinta, y no uno cercano: si el de la posición no
   * ha llegado, el anterior en el sentido de la marcha. Así lo que se estampa
   * encima -textos y fotos, medidos cuadro a cuadro- va con su cuadro.
   */
  private cuadroPintable(pos: number, haciaDelante: boolean): number {
    const i = Math.round(pos);
    if (this.cuadros[i]) return i;
    const antes = haciaDelante ? i - 1 : i + 1;
    return this.cuadros[antes] ? antes : i;
  }

  private reducido(): boolean {
    return this.isBrowser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  // ─── Manejo sin raton ──────────────────────────────────────────────────────
  /**
   * El teclado y los botones ocultos NO llaman a las transiciones: mueven el
   * SCROLL hasta el hueco pedido, para que la posicion de la ventana siga siendo
   * la unica fuente de verdad. Si llamaran a la animacion, el libro se moveria
   * sin moverse la pagina y el siguiente evento de scroll lo desharia.
   */
  vaA(indice: number): void {
    // Una hoja por gesto tambien con el teclado y con el dedo de lado.
    if (this.cerrojo?.puesto) return;
    const y = this.yDe(indice);
    if (y === null) return;
    // Mas de una hoja de golpe -Inicio, Fin- va de un salto: suave, el libro
    // pasaria las de en medio una a una y el cerrojo lo pararia en la primera.
    const lejos = Math.abs(indice - this.estado()) > 1;
    window.scrollTo({ top: y, behavior: this.reducido() || lejos ? 'instant' : 'smooth' });
  }

  /** El scroll en el que reposa esa pagina, o null si la pista no se puede medir. */
  private yDe(indice: number): number | null {
    const pista = this.trackRef()?.nativeElement;
    const recorrido = this.recorridoRef()?.nativeElement;
    const remate = this.remateRef()?.nativeElement;
    const cierre = this.cierreRef()?.nativeElement;
    if (!pista || !recorrido || !remate || !cierre) return null;
    const i = Math.min(CERRADO_FINAL, Math.max(0, indice));
    const arriba = window.scrollY + pista.getBoundingClientRect().top;
    const dentro =
      i <= LAST
        ? (i / LAST) * recorrido.offsetHeight
        : recorrido.offsetHeight + remate.offsetHeight + (i - LAST) * cierre.offsetHeight;
    return arriba + dentro;
  }

  // ─── El dedo ───────────────────────────────────────────────────────────────
  /**
   * Pasar hoja arrastrando. No anima nada por su cuenta: mueve el scroll a la
   * pagina pedida, igual que las flechas del teclado y que los botones que no
   * se ven, para que la posicion de la ventana siga siendo la unica fuente de
   * verdad del recorrido. Los umbrales y su porque viven en `GestoHoja`.
   */
  private readonly gesto = new GestoHoja();

  alEmpezarToque(ev: TouchEvent): void {
    this.gesto.empieza(ev);
  }

  alCancelarToque(): void {
    this.gesto.cancela();
  }

  alSoltarToque(ev: TouchEvent): void {
    const paso = this.gesto.termina(ev);
    if (paso) this.vaA(this.estado() + paso);
  }

  alTeclado(ev: KeyboardEvent): void {
    const e = this.estado();
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' || ev.key === 'PageDown') {
      ev.preventDefault();
      this.vaA(e + 1);
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' || ev.key === 'PageUp') {
      ev.preventDefault();
      this.vaA(e - 1);
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      this.vaA(0);
    } else if (ev.key === 'End') {
      ev.preventDefault();
      this.vaA(CERRADO_FINAL);
    }
  }

  // ─── Los dos enlaces de la pagina de cierre ────────────────────────────────
  /**
   * El puntero encima no lo marca esta capa: repinta la HOJA con el cajetin
   * marcado. Un resplandor de CSS aqui se ve por lo que es -un rectangulo
   * luminoso, plano, flotando sobre un boton que esta sobre papel con su luz.
   */
  marcaSocial(kind: SocialKind | null): void {
    if (this.socialMarcado() === kind) return;
    this.socialMarcado.set(kind);
    this.rehacePanelCierre();
  }

  /**
   * Coloca el <a> real encima del cajetin dibujado. La posicion se MIDE sobre la
   * pagina, con la misma escala que el lienzo, para que siga al boton a
   * cualquier tamano de ventana.
   */
  /**
   * El <a> del sello. La caja se saca del MISMO cuadrilatero que se estampa, asi
   * que sigue a la tapa a cualquier tamano de ventana sin repetir ninguna medida.
   */
  selloEstilo(): Record<string, string> {
    const q = this.esquinasSello();
    if (!q) return { display: 'none' };
    const xs = q.map((p) => this.px(p[0]) / this.dpr);
    const ys = q.map((p) => this.py(p[1]) / this.dpr);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return {
      left: `${x0}px`,
      top: `${y0}px`,
      width: `${Math.max(...xs) - x0}px`,
      height: `${Math.max(...ys) - y0}px`,
    };
  }

  socialEstilo(kind: SocialKind): Record<string, string> {
    const pos = SOCIAL_POS[kind];
    const cssEsc = this.esc / this.dpr;
    const x = this.offX / this.dpr + (AREA_X0 + PANEL_W * pos.u) * cssEsc;
    const y = this.offY / this.dpr + (AREA_Y0 + PANEL_H * pos.v) * cssEsc;
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${SOCIAL_BTN.w * cssEsc}px`,
      height: `${SOCIAL_BTN.h * SOCIAL_HIT_ALTO * cssEsc}px`,
    };
  }
}
