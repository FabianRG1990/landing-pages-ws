import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BolleriaStore, diagRegistra } from '@bolleria-ui-shared';

type FlavorKey = 'dulce' | 'mantequilla' | 'pistacho' | 'crema' | 'nutella';

interface FlavorGeom {
  src: string;
  W: number;
  CX: number;
  CY: number;
  name: string;
}

interface HeroCaption {
  inA: number;
  inB: number;
  outA: number;
  outB: number;
  eyebrow: string;
  flavor: 'drip' | 'rise' | 'plain';
  position: 'top' | 'bottom';
  words?: string[];
  text?: string;
}

/**
 * Hitos del recorrido en px, medidos desde el borde superior del wrap (la misma
 * unidad que `scrolled` en `updateHero`). Se recalcula en cada tick porque todo
 * depende de `innerHeight`. Lo consumen dos clientes: la coreografía y el
 * controlador de paradas — que así no puede desincronizarse de ella.
 */
interface HeroGeometry {
  vh: number;
  SEQ: number;
  VID_START: number;
  CAROUSEL_PX: number;
  PRE_GAP_PX: number;
  MASA_PX: number;
  VID_ORIGINAL: number;
  freezeStart: number;
  holdStart: number;
  holdEnd: number;
  exitJumpPx: number;
  videoEnd: number;
  masaEnd: number;
}

/**
 * HERO scroll-driven de "inicio": secuencia de 233 cuadros (croissant que se
 * abre, gotea dulce de leche, forma masa madre y hornea pan) repartida en 3
 * tandas de assets (v2/v4/v5, distinto aspecto cada una), con una pausa a
 * mitad de camino donde un carrusel de 5 sabores hace crossfade sobre el
 * cuadro congelado. Port directo (mismas constantes de calibración) del
 * `Component` original (`support.js`/`Bolleria.dc.html`), siguiendo el mismo
 * patrón de refs+RAF ya verificado en producción en
 * `libs/automotivo/frontend/inicio/hero-scroll.component.ts`.
 */
const N = 233;
const SPLIT_B = 97;
const SPLIT_C = 179;
const DIR_A = 'assets/hero-frames-v2';
const DIR_B = 'assets/hero-frames-v4';
const DIR_C = 'assets/hero-frames-v5';

/**
 * Tandas reducidas para telefono (`-m`).
 *
 * Los cuadros originales estan pensados para escritorio y en un telefono NO se
 * aprovechan: instrumentando `drawImage` durante el recorrido completo, el
 * factor de dibujo maximo medido es 0,515 en iPhone 15, 0,420 en iPhone SE y
 * 0,589 en Pixel 7 — es decir que mas de la mitad de cada pixel descargado se
 * tira. Descargarlos enteros costaba 106 MB por visita en datos moviles.
 *
 * Las tandas `-m` son los MISMOS cuadros al 65 %. Ese 65 % no es arbitrario:
 * queda por encima del peor factor medido (0,589), asi que en el telefono la
 * imagen se sigue REDUCIENDO al pintarse (0,589/0,65 = 0,91) y nunca se
 * amplia, que es la unica forma de que no haya perdida visible.
 *
 * El umbral son 440 px de ancho de viewport: cubre todos los telefonos en
 * vertical (SE 320, Galaxy S8 360, iPhone 15 393, Pixel 7 412, Pro Max 430) y
 * deja fuera tablets y el modo horizontal, donde el area de dibujo crece y si
 * harian falta los cuadros grandes.
 */
const DIR_A_M = 'assets/hero-frames-v2-m';
const DIR_B_M = 'assets/hero-frames-v4-m';
const DIR_C_M = 'assets/hero-frames-v5-m';
const SMALL_FRAMES_MAX_VW = 440;
const SMALL_FRAMES_SCALE = 0.65;
/** Tope de cuadros en vuelo para la precarga oportunista. Ver `ensureHeroFrame`. */
const PREFETCH_MAX = 6;
/**
 * Holgura extra para el cuadro que toca pintar. No es un permiso para saltarse
 * el tope: bajando deprisa el cuadro a pintar cambia en cada fotograma, asi que
 * sin tope propio ese camino solo tambien acumulaba —medido, 55 peticiones a la
 * vez—. Quedarse sin hueco no rompe nada: `nearestGoodHeroFrameIdx` pinta el
 * vecino de su misma tanda y el cuadro se vuelve a pedir al fotograma siguiente.
 */
const URGENT_EXTRA = 3;

const CROI_W = 1099;
const CROI_CX = 724;
const CROI_CY = 725;
const PHOTO_FRAC_W = 0.8;

const CROI_W_ARR = [
  1098, 1098, 1098.4, 1098.4, 1098.8, 1099.6, 1100, 1099.6, 1100, 1100, 1100.4, 1100.4, 1102, 1102,
  1103.2, 1104, 1105.2, 1105.6, 1106.8, 1107.6, 1108.4, 1109.2, 1109.6, 1110, 1110.4, 1110.8, 1111.6,
  1112, 1112.8, 1113.2, 1113.6, 1114, 1114.8, 1115.2, 1116, 1116.4, 1117.2, 1119.2, 1121.6, 1125.2,
  1130.4, 1135.6, 1140.8, 1146, 1150.8, 1155.6, 1160.4, 1164.8, 1169.6, 1174, 1177.6, 1181.2, 1184.4,
  1187.6, 1190.4, 1193.2, 1195.6, 1198.4, 1200.8, 1204, 1208, 1213.2, 1218.8, 1225.2, 1231.6, 1238,
  1244, 1250.4, 1256.4, 1262.4, 1268, 1273.6, 1278.4, 1283.2, 1286.8, 1290, 1292.4, 1294.4, 1296,
  1297.6, 1299.2, 1300.8, 1302.4, 1303.6, 1304.8, 1305.6, 1306, 1306.4, 1306.4, 1306.8, 1307.2, 1308.4,
  1309.2, 1310, 1310, 1310.5, 1310,
];
const CROI_CX_ARR = [
  725, 725, 725.2, 725.2, 725.4, 725.8, 726, 725.8, 725.6, 725.2, 725, 724.6, 724.6, 724.2, 724.4,
  724.4, 724.2, 724, 724.2, 723.8, 723.4, 723.4, 723.2, 722.6, 722.4, 722.2, 721.8, 721.2, 721.2, 721,
  720.8, 720.6, 720.6, 720.4, 720.4, 720.2, 720.2, 720.4, 720.8, 721, 721.6, 722.2, 722.8, 723, 723.4,
  723.8, 724.2, 724.4, 724.8, 725, 725.2, 725.4, 725.4, 725.4, 725.6, 725.4, 725, 724.8, 724.4, 723.6,
  723.2, 723, 723, 723, 723.4, 723.8, 724, 724, 724.2, 724.4, 724.4, 724.8, 725.2, 725.6, 725.8, 725.8,
  725.8, 725.6, 725.6, 725.6, 726, 726, 726.4, 726.6, 726.8, 726.8, 727, 727.2, 727.2, 727.4, 727.6,
  727.8, 727.8, 728.2, 728.2, 728.25, 728.33,
];
const CROI_CY_ARR = [
  725, 725.25, 725.2, 725.2, 725.4, 725.6, 725.6, 725.8, 726, 725.8, 725.8, 725.6, 725.4, 725, 724.8,
  724.6, 724.4, 724, 724, 723.8, 723.4, 723.2, 723.4, 723.2, 723.2, 723.2, 723, 722.4, 722, 721.4, 720.6,
  720, 719.4, 719, 718.8, 718.6, 718.4, 718.4, 718.4, 718.4, 718.8, 719.2, 719.8, 720.4, 721, 721.6,
  722.4, 723.2, 724.2, 725.4, 726.4, 727.4, 728.6, 729.4, 730.2, 731.2, 732.4, 733, 734.2, 735.4, 736.8,
  738.2, 739.8, 741, 742, 742.8, 743.4, 744.4, 745, 746, 747, 747.8, 748.4, 749.4, 750, 750.4, 750.8,
  751.2, 751.4, 751.8, 752.2, 752.8, 753.2, 753.8, 754, 754.4, 754.6, 755, 755.2, 755.6, 755.8, 756,
  756, 756, 756, 756, 756,
];

// Borde superior del croissant en cada cuadro de v5, del 108 al 126, en px del
// archivo fuente (1% de área acumulada desde arriba, subpíxel). Es el tramo en
// el que el croissant sube DENTRO del metraje: 653px en 19 cuadros. Ver
// `croiDriftY`, que lo usa para repartir esa subida en vez de darla a saltos.
const DRIFT_FRAME_A = 108;
const V5_DRIFT_Y = [
  668.8, 667.1, 662.1, 653.4, 640.7, 623.1, 595.6, 559.1, 519.0, 478.5,
  438.4, 398.5, 352.0, 301.5, 245.5, 191.1, 133.4, 72.5, 16.1,
];
const CROI2_W = 1008,
  CROI2_CX = 554,
  CROI2_CY = 970,
  CROI2_SQUISH_Y = 0.9645;
const CROI3_W = 1184.5,
  CROI3_CX = 979.9,
  CROI3_CY = 441.4;

// Curva scroll->frame no lineal, ponderada por movimiento real medido entre cuadros (fija, 218 valores).
const CUM = [
  0, 0.00202, 0.00412, 0.0063, 0.00855, 0.01086, 0.0132, 0.0157, 0.01835, 0.02114, 0.02404, 0.02708,
  0.03012, 0.03321, 0.0364, 0.0396, 0.04285, 0.04614, 0.0494, 0.05266, 0.05591, 0.05919, 0.06239,
  0.06561, 0.06881, 0.07194, 0.07508, 0.07824, 0.0814, 0.0845, 0.08752, 0.09051, 0.09353, 0.09673,
  0.10007, 0.10357, 0.10739, 0.11141, 0.11555, 0.11991, 0.1245, 0.12932, 0.13433, 0.1394, 0.14453,
  0.1496, 0.15459, 0.15948, 0.16429, 0.16904, 0.17365, 0.17812, 0.1825, 0.18686, 0.19112, 0.19539,
  0.1997, 0.2041, 0.20851, 0.21298, 0.21751, 0.22215, 0.22685, 0.23164, 0.2366, 0.24159, 0.24659,
  0.2515, 0.25637, 0.26108, 0.26567, 0.27013, 0.27447, 0.27868, 0.28271, 0.28648, 0.29014, 0.29363,
  0.29693, 0.30006, 0.30312, 0.30607, 0.30884, 0.31153, 0.31408, 0.31656, 0.31891, 0.32115, 0.32331,
  0.3254, 0.32744, 0.32939, 0.33126, 0.33312, 0.33497, 0.33678, 0.33854, 0.34025, 0.34195, 0.34369,
  0.34554, 0.34746, 0.34943, 0.3515, 0.35355, 0.35571, 0.35804, 0.36041, 0.36289, 0.36436, 0.36633,
  0.36908, 0.37261, 0.37681, 0.38167, 0.38727, 0.39386, 0.40173, 0.41069, 0.42019, 0.42995, 0.43982,
  0.44977, 0.45977, 0.47041, 0.48175, 0.49375, 0.50633, 0.51874, 0.53141, 0.54437, 0.55745, 0.57041,
  0.58293, 0.59552, 0.60831, 0.62146, 0.63516, 0.64942, 0.66526, 0.68315, 0.70003, 0.71125, 0.71993,
  0.72742, 0.7344, 0.74114, 0.7476, 0.75357, 0.75918, 0.76478, 0.7705, 0.77619, 0.78144, 0.78663, 0.7918,
  0.79699, 0.80217, 0.80714, 0.81196, 0.81651, 0.82122, 0.82643, 0.83107, 0.83578, 0.8392, 0.84158,
  0.84411, 0.84752, 0.85158, 0.8546, 0.85648, 0.85794, 0.85951, 0.86115, 0.8628, 0.86454, 0.86639,
  0.86815, 0.86981, 0.87146, 0.87278, 0.87431, 0.87612, 0.87758, 0.87875, 0.88052, 0.88203, 0.88367,
  0.88511, 0.88694, 0.88866, 0.89047, 0.8922, 0.89435, 0.89722, 0.90049, 0.90449, 0.91005, 0.91539,
  0.92034, 0.92526, 0.93071, 0.93488, 0.93758, 0.93917, 0.94114, 0.94291, 0.94462, 0.94709, 0.95067,
  0.95349, 0.95653, 0.95895, 0.96253, 0.9652, 0.96772, 0.97007, 0.97308, 0.97556, 0.97792, 0.97978,
  0.98247, 0.98444, 0.98661, 0.9883, 0.99069, 0.99244, 0.99416, 0.99553, 0.99718, 0.99857, 1,
];

const FREEZE_FRAME = 80;
const FREEZE_FRAME_EXIT = 108;
const FREEZE_FRAME_FOR_SCALE_RAMP = 70;
const RISE_LIFT_PX = 72;

// Reparto del recorrido, en vh. Los cuatro se reparten la altura del wrap
// (`.bol-hero-wrap`, 700vh) y de ellos sale por resta el tramo de scrubbing
// del video (`VID_ORIGINAL`), que es el que queda "libre". Tocar uno cualquiera
// desplaza las paradas: por eso `CHECKPOINTS` se DERIVA de esta geometría en
// vez de llevar posiciones escritas a mano.
const INTRO_VH = 100; // intro del DOM: logo -> croissant dibujado -> foto real
const CAROUSEL_VH = 125; // carrusel de 5 sabores (cuadro congelado)
const PRE_CAROUSEL_GAP_VH = 8; // respiro entre el congelado y el primer lettering
// Fracciones de la intro del DOM. Vivían dentro de `updateHero`; suben acá
// porque `heroGeometry()` las necesita para situar VID_START y las paradas.
const RISE_A = 0.86;
const RISE_B = 0.97;
const RISE_GAP = 0.12;
// Antes achicaba la escena hasta un 32% y la subía 90px durante todo el
// derrame, pensado para dejar aire bajo el croissant completo del comienzo.
// Pero ese achicamiento estaba atado a la aparición del caption (dripCaptionOp),
// así que el croissant se veía encoger "empujado" por el texto justo al salir
// del carrusel — un cambio de tamaño injustificado en la transición más visible
// de toda la secuencia. Se quita del todo: el tamaño ahora es continuo entre el
// carrusel y el derrame. Solo se conserva un levantamiento vertical mínimo (no
// es un cambio de escala) para dejarle aire al texto debajo.
const CAPTION_STAGE_SHRINK = 0;
const CAPTION_STAGE_LIFT_PX = 30;

// Cierre del hero: con el pan de masa madre ya horneado y quieto en la tabla
// (último cuadro, N-1), el scroll se detiene un tramo extra y un párrafo sobre
// sus beneficios aparece DETRÁS del pan (z-index por debajo del canvas), en
// letra grande, palabra por palabra — igual que lepainquotidien.com/be/en:
// columna angosta que fuerza el wrap en líneas cortas de forma natural (no
// líneas pre-cortadas a mano), y un cursor continuo recorre las palabras
// enfocándolas (nítidas + opacas) y desenfocándolas de nuevo según se alejan.
// Único tramo que NO tiene paradas: el controlador se apaga en la última
// (el caption "Recién salido del horno") justamente para que este texto se lea
// con scroll libre y al ritmo de cada quien.
const MASA_TEXT_VH = 125;
const MASA_ZOOM_MAX = 0.12;
const MASA_TEXT =
  'La masa madre es un fermento natural de harina y agua que transforma el pan en un ' +
  'alimento de mayor valor nutricional. Sus beneficios principales incluyen una digestión ' +
  'más ligera, menor impacto en el azúcar en sangre, mejor absorción de minerales y una ' +
  'conservación natural superior.';
const MASA_WORDS = MASA_TEXT.split(' ');

const FLAVOR_GEOM: Record<FlavorKey, FlavorGeom> = {
  dulce: { src: '', W: 0, CX: 0, CY: 0, name: 'Dulce de leche' }, // usa el cuadro congelado (croiFor), no una foto
  mantequilla: { src: 'assets/flavor-mantequilla.webp', W: 933, CX: 518, CY: 522.6, name: 'Mantequilla' },
  pistacho: { src: 'assets/flavor-pistacho.webp', W: 933, CX: 518, CY: 514.6, name: 'Pistacho' },
  crema: { src: 'assets/flavor-crema.webp', W: 1141, CX: 634, CY: 637.9, name: 'Crema pastelera' },
  nutella: { src: 'assets/flavor-nutella.webp', W: 935, CX: 519, CY: 523.2, name: 'Nutella' },
};
const FLAVOR_SEQ: FlavorKey[] = ['dulce', 'mantequilla', 'pistacho', 'crema', 'nutella', 'dulce'];
const LETTERING_GEOM: Record<FlavorKey, { src: string; W: number; CX: number; CY: number }> = {
  dulce: { src: 'assets/lettering-dulce.webp', W: 1107, CX: 627, CY: 379 },
  mantequilla: { src: 'assets/lettering-mantequilla.webp', W: 1149, CX: 642, CY: 345 },
  pistacho: { src: 'assets/lettering-pistacho.webp', W: 1085, CX: 640, CY: 295 },
  crema: { src: 'assets/lettering-crema.webp', W: 1025, CX: 640, CY: 358 },
  nutella: { src: 'assets/lettering-nutella.webp', W: 1115, CX: 633, CY: 335 },
};

// ─────────────────────────── PARADAS (checkpoints) ───────────────────────────
// El recorrido dejó de atravesarse con rueda libre: en escritorio, cada gesto
// es un VIAJE animado de un momento narrativo al siguiente. Doce paradas, once
// gestos, frente a los ~168 clics de rueda que costaba el hero antes.
//
// Las posiciones NO se escriben en vh: cada parada declara el momento del que
// depende (una fracción de la intro, un cuadro del video, un punto del carrusel)
// y `computeStops()` la traduce a px con la misma geometría que usa la
// coreografía. Si mañana se retoca CAROUSEL_VH o INTRO_VH, las paradas se
// recolocan solas y siguen cayendo sobre el mismo fotograma.
//
// El croissant que se abre se parte en DOS paradas (`frame: 68` y el congelado
// en 80) porque de una sola pieza serían 80 cuadros en un recorrido, muy por
// encima de la velocidad natural del metraje — un borrón.
type CheckpointAt =
  | { kind: 'intro'; p: number } // fracción de la intro del DOM (0..1 sobre SEQ)
  | { kind: 'frame'; frame: number } // cuadro del video
  | { kind: 'carousel'; t: number }; // posición dentro del carrusel (0..1)

const CHECKPOINTS: { at: CheckpointAt; label: string }[] = [
  { at: { kind: 'intro', p: 0 }, label: 'Logo Bollería' },
  { at: { kind: 'intro', p: 0.52 }, label: 'Croissant dibujado' },
  // 0.86 = RISE_A: el barrido a la foto acaba de completarse y el caption está
  // a opacidad plena. Más allá empieza a irse, así que es el único punto donde
  // "croissant real + texto" conviven en reposo.
  { at: { kind: 'intro', p: RISE_A }, label: 'Todo empieza antes del primer bocado' },
  // 68 y no 40: el título "Elige tu sabor" se dibuja con
  // `capOpacity(f, 34, 50, 70, 79)`, así que solo entre los cuadros 50 y 70
  // está NEGRO, centrado y a tamaño pleno — fuera de esa meseta va con
  // globalAlpha < 1, 18px por debajo de su sitio y al 90-99% de su tamaño.
  // En 40 el texto se veía gris y a medio colocar. Dentro de la meseta se elige
  // el extremo abierto (el croissant llega a separarse del todo, con el hilo de
  // dulce estirado), dejando 2 cuadros de margen antes de que empiece a irse.
  { at: { kind: 'frame', frame: 68 }, label: 'Elige tu sabor · croissant abierto' },
  // 0.04 y no 0: el lettering del primer sabor hace su fade de entrada en el
  // 3% inicial del carrusel (INTRO_T en renderFlavorCarousel). Parar en 0 lo
  // dejaría a medio aparecer.
  { at: { kind: 'carousel', t: 0.04 }, label: 'Dulce de leche' },
  { at: { kind: 'carousel', t: 0.2 }, label: 'Mantequilla' },
  { at: { kind: 'carousel', t: 0.4 }, label: 'Pistacho' },
  { at: { kind: 'carousel', t: 0.6 }, label: 'Crema pastelera' },
  { at: { kind: 'carousel', t: 0.8 }, label: 'Nutella' },
  { at: { kind: 'frame', frame: 120 }, label: 'Aquí el relleno nunca se queda corto' },
  { at: { kind: 'frame', frame: 172 }, label: 'La masa madre descansa, fermenta y crece' },
  // Última parada. A partir de acá el controlador se apaga y el scroll vuelve a
  // ser libre y continuo para leer el texto de la masa madre.
  { at: { kind: 'frame', frame: 210 }, label: 'Recién salido del horno' },
];

// Modelo de movimiento: objetivo en PARADAS + seguimiento amortiguado.
//
// La rueda no mueve píxeles: mueve un ÍNDICE de parada. Un gesto vale una
// parada, y da igual que el tramo mida 20vh o 100vh. Antes el presupuesto iba
// en píxeles (delta × 1,6) y el mismo gesto de 5 muescas valía 4 paradas entre
// los sabores —separados 20-25vh— y solo 1 en la intro —82vh—: el carrusel se
// atravesaba entero de un empujón mientras los tramos largos costaban lo mismo
// que uno corto. Contando en paradas, el coste en gestos es el mismo en todo el
// recorrido.
//
// La posición persigue a `stops[ckIdx]` con una interpolación exponencial (el
// modelo de Lenis) amortiguada sobre la VELOCIDAD. De ahí sale gratis lo que
// hacía falta: la velocidad es proporcional a la distancia restante, así que un
// gesto suelto recorre su tramo despacio y se aprecia, mientras que varios
// gestos seguidos empujan el índice lejos, alejan el objetivo y la secuencia
// corre deprisa SIN detenerse en cada parada. Es la lectura de
// `scroll-snap-type: proximity` y del `targetContentOffset` de iOS —la
// intensidad del gesto decide dónde se acaba parando— en vez de
// `scroll-snap-stop: always`, que obligaría a frenar en todas.
//
// Cada gesto nuevo suma una parada al objetivo TAMBIÉN con un recorrido en
// curso: es lo que permite encadenar y seguir de largo en vez de esperar a que
// el viaje termine. El silencio que separa un gesto del siguiente es 200ms, y
// no 90: una rueda girada con el dedo suelta sus muescas cada 30-80ms, y con
// un umbral corto cada muesca contaba como gesto propio: medido, cinco
// muescas de un mismo impulso daban cinco paradas y volvían a atropellar los
// sabores. Dos scrolls que el usuario percibe como distintos siempre distan
// bastante más de 200ms.
const CK_GESTURE_MS = 200;
// Bonificación por intensidad dentro de un gesto. Los primeros CK_BURST_FREE
// píxeles son francos —un impulso normal de la rueda vale UNA parada, que es lo
// que se pedía para los sabores— y a partir de ahí cada CK_BURST_STEP suma otra.
// El tramo franco es lo que permite servir a la vez los dos extremos: 6 muescas
// (720px) siguen valiendo una parada y 40 muescas seguidas (4800px) atraviesan
// el hero entero, que es lo que necesita quien no quiere ver la animación.
// Sin el tramo franco la relación sería lineal y ningún valor cumple ambos.
const CK_BURST_FREE = 700;
const CK_BURST_STEP = 420;
// La amortiguación se aplica a la VELOCIDAD, no a la posición. Un lerp sobre la
// posición (el modelo directo de Lenis) sale disparado en el primer fotograma:
// medido, daba un pico de 2,97x su propia media, tan brusco como el ease que se
// descartó por tosco. Amortiguando la velocidad se obtiene un arranque y una
// frenada suaves —un muelle críticamente amortiguado— sin perder lo esencial,
// que la velocidad siga siendo proporcional a la distancia que queda.
//
// Velocidad que se pide, en fracción de la distancia restante por segundo.
const CK_APPROACH = 1.6;
// Con qué rapidez la velocidad real alcanza a la pedida (por fotograma a 60fps).
// Es lo que da el arranque progresivo.
//
// CUIDADO al tocar este par: juntos forman un sistema de segundo orden
//   x'' + ws*x' + ws*K*x = 0,  con ws = -ln(1 - CK_VEL_SMOOTH)*60 y K = CK_APPROACH
// que solo queda críticamente amortiguado (sin rebote) si ws >= 4K. Bajar el
// suavizado buscando un arranque más elegante mete el sistema en subamortiguado:
// probado con 0.055/1.95, el recorrido se pasaba a 87vh y volvía a 82,8vh — un
// rebote perfectamente visible al final de cada parada. Con 0.1/1.6: ws = 6,3 y
// 4K = 6,4, justo en el límite y sin rebote medible.
const CK_VEL_SMOOTH = 0.1;
// Margen (en vh) por encima de la última parada dentro del cual un gesto hacia
// ARRIBA devuelve el mando al controlador. Ver `ckShouldIntercept`.
const CK_REENTRY_VH = 18;
// Suelo de velocidad (px/s) para cortar la cola asintótica del lerp, y franja
// final en la que se aplica. El lerp converge de forma exponencial: el último
// 5% del recorrido cuesta tanto como el primer 50%, y ese rastro hacía que un
// gesto suelto siguiera reptando ~2,5s después de haber llegado a la vista.
// Limitar el suelo a la cola —fuera de ella la velocidad natural ya lo supera—
// deja intacto el arranque progresivo también en los tramos cortos.
const CK_MIN_SPEED = 110;
// Tramo del derrame del dulce de leche: metraje escaso y movimiento rápido,
// el único de toda la secuencia donde el suelo normal no basta. Ver
// `ckFloorSpeed`, que explica los números medidos.
const DERRAME_A = 108;
const DERRAME_B = 146;
const CK_MIN_SPEED_DERRAME = 280;
// Duración de un viaje entre paradas con el dedo, en segundos. Es lo que hace
// que la animación corra a su propio ritmo en vez de al del gesto: mida el
// tramo 150 px o 700, el viaje dura lo mismo, así que un barrido flojo y uno
// enérgico se ven idénticos. Ver `ckFloorSpeed`.
const CK_VIAJE_S = 1;
const CK_TAIL_PX = 100;
const CK_EPS = 2;

// ─────────────────────────── El gesto en tactil ───────────────────────────
// El controlador de paradas no cambia ni una constante para el telefono: las
// mismas doce paradas, el mismo muelle, el mismo suelo de velocidad. Lo unico
// que cambia es POR DONDE entra el gesto, porque un telefono no tiene rueda.
//
// La equivalencia es directa: un deslizamiento es un gesto, igual que un golpe
// de rueda, y los pixeles que recorre el dedo alimentan el mismo acumulador que
// alimentaba `deltaY`. Asi `CK_BURST_FREE` y `CK_BURST_STEP` conservan su
// significado y no hay un segundo juego de numeros que mantener.

/** Desplazamiento minimo para dar un barrido por empezado. Por debajo, el
 *  contacto todavia puede ser un toque y no se le roba al navegador. */
const T_UMBRAL_PX = 8;

/**
 * Segundos de inercia que se le atribuyen a un envion al levantar el dedo.
 *
 * Sin este termino un envion rapido y un arrastre lento de la MISMA longitud
 * valdrian lo mismo, y entonces deslizar deprisa no correria mas — que es justo
 * lo que se pide. La rueda no lo necesita porque ahi la intensidad ya viene en
 * la cantidad de eventos; el dedo, en cambio, esta limitado por el alto de la
 * pantalla y no puede recorrer mas de ~650 px por gesto.
 *
 * Lo que se suma es la distancia que el scroll nativo HABRIA recorrido con esa
 * velocidad de salida. Con la deceleracion habitual de iOS y Android eso son
 * unos 250 ms de viaje, asi que un envion de 2000 px/s aporta 500 px: sumados a
 * los ~300 que recorre el dedo pasan del tramo franco y valen una parada extra.
 */
const T_INERCIA_S = 0.25;

/** Ventana sobre la que se mide la velocidad de salida (ms). */
const T_VEL_MS = 100;

/**
 * Gracia tras levantar el dedo, durante la cual la salvaguarda de «scroll
 * ajeno» no mira (ver `ckAdvance`). Cubre el reajuste asíncrono de posición que
 * Safari de iOS hace al terminar el gesto, que es lo que abortaba el viaje a la
 * parada justo al soltar.
 *
 * 400 ms y no menos porque el hero se dibuja a 16 fps en WebKit —medido con el
 * panel de diagnóstico contra producción, frente a los 60 de Chromium—, así que
 * un margen de 100 ms serían apenas dos fotogramas y podría quedarse corto. Y no
 * más porque pasado ese punto la salvaguarda tiene que volver a proteger: es lo
 * que impide que el controlador arrastre de vuelta a quien ya se salió del hero.
 */
const T_GRACIA_MS = 400;

const HERO_CAPTIONS: HeroCaption[] = [
  {
    inA: 106,
    inB: 120,
    outA: 142,
    outB: 154,
    eyebrow: '',
    flavor: 'drip',
    position: 'bottom',
    words: 'Aquí el relleno nunca se queda corto.'.split(' '),
  },
  {
    // 158/164 y no 160/172: la parada de esta leyenda cae en el cuadro 172, y
    // con 172 de `inB` la opacidad llegaba a 1 JUSTO ahí — cero margen. Medido,
    // la rampa entera son 67 px de scroll, así que aterrizar 15 px corto dejaba
    // el texto en op 0,78, y op se pinta además como `blur((1-op)*3)`: el texto
    // se veía literalmente desenfocado. Ahora la meseta empieza 36 px antes de
    // la parada y acaba 47 px después.
    //
    // `inA` NO baja hasta 154 (el `outB` del relleno, que daría 51 px de margen)
    // porque hasta el cuadro 158 sigue cayendo el hilo de dulce de leche, y esta
    // leyenda va ARRIBA, justo donde cae. 15 px de margen valen menos que no
    // escribir sobre el goteo.
    inA: 158,
    inB: 164,
    outA: 190,
    // 199 y no 200 para que el relevo con el horneado sea exacto, igual que el
    // del relleno con esta (154). Gana la PRIMERA leyenda con opacidad > 0,001,
    // así que un solape de un solo cuadro dejaba al horneado enmascarado hasta
    // que la fermentación se apagaba y entonces aparecía de golpe a op 0,33:
    // un parpadeo en 8 px de scroll. Compartiendo cuadro las dos valen 0 ahí.
    outB: 199,
    eyebrow: 'Fermentación',
    flavor: 'rise',
    position: 'top',
    text: 'La masa madre descansa, fermenta y crece a su propio ritmo.',
  },
  {
    // El caso extremo del mismo defecto: con 203/210 la rampa medía 26 px y la
    // meseta 19, contra una parada en el cuadro 210 apoyada en la rodilla.
    // Quedarse 10 px corto daba op 0,42 -> blur 1,7 px. `inA` no puede bajar de
    // 199: el pan se hornea entre los cuadros 197 y 200 (comprobado mirando el
    // metraje), y antes de eso "Recién salido del horno" caería sobre masa
    // cruda. Con 199/202 la meseta empieza 32 px antes de la parada, y `outA`
    // sube a 222 para dar 51 px por arriba — el metraje llega al cuadro 232.
    inA: 199,
    inB: 202,
    outA: 222,
    outB: 230,
    eyebrow: 'Horneado',
    flavor: 'plain',
    position: 'top',
    text: 'Recién salido del horno, listo cada mañana.',
  },
];

@Component({
  selector: 'bol-hero-scroll',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-scroll.component.html',
  styleUrl: './hero-scroll.component.scss',
})
export class HeroScrollComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(BolleriaStore);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly wrapRef = viewChild.required<ElementRef<HTMLElement>>('heroWrap');
  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('heroStage');
  private readonly photoBoxRef = viewChild.required<ElementRef<HTMLElement>>('photoBox');
  private readonly photoRef = viewChild.required<ElementRef<HTMLImageElement>>('heroPhoto');
  private readonly illusRef = viewChild.required<ElementRef<HTMLImageElement>>('heroIllus');
  private readonly logoRef = viewChild.required<ElementRef<HTMLImageElement>>('heroLogo');
  private readonly introCapRef = viewChild.required<ElementRef<HTMLElement>>('introCap');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('heroCanvas');
  private readonly hintRef = viewChild.required<ElementRef<HTMLElement>>('scrollHint');
  private readonly captionRef = viewChild.required<ElementRef<HTMLElement>>('heroCaption');
  private readonly captionEyebrowRef = viewChild.required<ElementRef<HTMLElement>>('captionEyebrow');
  private readonly captionTextRef = viewChild.required<ElementRef<HTMLElement>>('captionText');
  private readonly masaWrapRef = viewChild.required<ElementRef<HTMLElement>>('masaWrap');

  readonly masaWords = MASA_WORDS;

  // ---- motor de frames ----
  private frames: HTMLImageElement[] = [];
  private broken = new Set<number>();
  private inflight = new Set<number>();
  private ready = false;
  private booted = false;
  private restRef = -999;
  private stillCount = 0;
  private settled = false;
  private lastF = 0;
  private targetF = 0;
  // Cuadro efectivamente mostrado. Normalmente sigue a `targetF` 1:1, pero
  // cuando termina el carrusel de sabores, `targetF` da un salto brusco de
  // cuadro (80 -> 108) en un solo tick de scroll — es un salto real en la
  // matemática de scroll->cuadro, no una animación. Si detectamos un salto
  // así de grande lo suavizamos acá, en el render, sin tocar esa matemática.
  private displayF = 0;
  private smoothingJump = false;
  /** Si el tick anterior lo pintó el carrusel. Ver el salto en el bucle de rAF. */
  private wasCarousel = false;
  private active = false;
  private dpr = 1;
  private ctx: CanvasRenderingContext2D | null = null;
  private carouselActive = false;
  private carouselT = 0;

  private letteringImgs: Partial<Record<FlavorKey, HTMLImageElement>> = {};
  private flavorImgs: Partial<Record<FlavorKey, HTMLImageElement>> = {};
  private lastCapIdx = -1;
  private capWordEls: HTMLElement[] | null = null;
  private heroInDone = false;
  private plDone = false;
  private raf = 0;
  private masaZoom = 1;
  private masaActive = false;

  // ---- controlador de paradas ----
  // `stops` va en px relativos al borde superior del wrap; `wrapTop` es su
  // origen en coordenadas de página. Ambos se refrescan en cada `updateHero`,
  // que ya corre por rAF, así que sobreviven a resize y a reflow sin listeners
  // propios.
  private stops: number[] = [];
  private wrapTop = 0;
  // Objetivo del recorrido: el ÍNDICE de una parada, no unos píxeles. Al leerse
  // como `stops[ckIdx]` en cada fotograma, un resize —que mueve todas las
  // paradas, porque el reparto está en vh— lo arrastra consigo sin código de
  // reescalado, y el objetivo no puede quedarse apuntando a medio tramo.
  private ckIdx = 0;
  // Mientras `ckRunning`, el componente es dueño del scroll; al llegar, lo suelta.
  private ckRunning = false;
  /** Velocidad actual en px/s. Es ESTADO: sobrevive a que el objetivo cambie a
   * mitad de recorrido, y por eso un gesto nuevo acelera sin dar un tirón. */
  private ckVel = 0;
  private lastWheelAt = 0;
  private ckFrameAt = 0;
  /** Último scroll escrito por el controlador; -1 cuando no tiene el mando. */
  private ckLastWrittenY = -1;
  /**
   * Lo que el controlador PIDIÓ en el último fotograma, que no siempre es lo
   * que la relectura devolvió. En Safari de iOS la posición se confirma de
   * forma asíncrona: `window.scrollY` justo después de `scrollTo` puede seguir
   * dando la de antes, y el fotograma siguiente encuentra ya la nueva. Con una
   * sola referencia eso se lee como «me movieron desde fuera» y el controlador
   * suelta el mando en CADA fotograma — cada deslizamiento avanzaría unos
   * pocos píxeles y haría falta una cantidad absurda de gestos para cruzar el
   * hero, que es justo lo reportado en un iPhone con iOS 26.5. Guardando las
   * dos referencias, la salvaguarda solo salta si la posición no coincide con
   * NINGUNA de las dos, que es lo que de verdad significa un scroll ajeno.
   */
  private ckIntentoY = -1;
  /** Sentido del gesto en curso. Al invertirlo, el índice se rebasa desde la
   * posición real en vez de seguir contando sobre un objetivo que iba al revés. */
  private ckGestureDir: 1 | -1 = 1;
  /** |delta| acumulado en el gesto en curso, para la bonificación por intensidad. */
  private ckGestureAccum = 0;
  /** Paradas ya concedidas por esa bonificación, para no contarlas dos veces. */
  private ckGestureBonus = 0;

  constructor() {
    // Al terminar el preloader: revela el logo del hero y calcula la posición inicial.
    effect(() => {
      if (this.store.loaded() && this.isBrowser && !this.plDone) {
        this.plDone = true;
        requestAnimationFrame(() => {
          this.playHeroIn();
          this.updateHero();
        });
      }
    });
    // Al volver a "inicio" (cortina), el scroll ya se reseteó a 0 — solo hace falta
    // re-mostrar el logo si hacía falta y recalcular con la posición actual.
    effect(() => {
      this.store.settleTick();
      if (this.isBrowser && this.store.screen() === 'inicio' && this.plDone) {
        this.heroInDone = false;
        // `go()` ya devolvió el scroll a 0: un recorrido en curso apuntaría a un
        // destino de la posición anterior y arrastraría al usuario de vuelta.
        this.ckRunning = false;
        this.ckVel = 0;
        this.ckIdx = 0;
        this.playHeroIn();
        this.updateHero();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.bootHeroFrames();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      // Fuera de pantalla no hay coreografía que actualizar, y esto NO es un
      // ahorro cosmético: medido con el perfilador mientras se pasan páginas
      // del libro —con el hero ya muy por encima—, `updateHero` +
      // `getBoundingClientRect` + `getCarouselBand` costaban 924 ms contra los
      // 966 ms de TODO el dibujado del libro. O sea que el hero invisible se
      // llevaba la mitad del presupuesto de fotograma del libro, y encima
      // `getBoundingClientRect` fuerza un recálculo de layout cada vez.
      //
      // La condición no es solo "no se ve": con un viaje a una parada vivo o
      // con el dedo puesto hay que seguir, porque el propio movimiento es lo
      // que puede devolver el hero a la pantalla.
      const trabajando = this.heroCerca || this.ckRunning || this.tCapturado;
      // Una ÚLTIMA pasada completa al apagarse. Sin ella el hero se congela con
      // lo que hubiera en ese instante: `touch-action` a medio ceder —que es
      // exactamente lo que rompió el scroll en iOS—, el lienzo visible y
      // `this.active` mintiendo. Con ella, el estado en el que se queda es el
      // que le tocaba.
      if (!trabajando && this.heroQuieto) return;
      this.heroQuieto = !trabajando;
      // Antes de updateHero: el viaje mueve el scroll y la coreografía lo lee ya
      // movido en este mismo frame, sin quedarse un tick por detrás.
      this.ckAdvance();
      this.updateHero();
      if (!this.ready || !this.active || !this.ctx) return;
      if (this.carouselActive) {
        this.renderFlavorCarousel();
        this.wasCarousel = true;
        return;
      }
      if (this.wasCarousel) {
        // Saliendo del carrusel NO hay salto que suavizar, aunque la resta lo
        // parezca. El carrusel ya venía pintando el croissant del cuadro de
        // salida (108 hacia delante, 80 hacia atrás), que es justo `targetF`
        // en este tick. Pero `displayF` no se toca mientras el carrusel manda —el
        // bucle sale antes—, así que se quedaba valiendo 80 y el suavizado
        // reproducía 80->108 otra vez: medido, la secuencia pintaba 108 y
        // saltaba a 83 (= 80 + 28*JUMP_RATE) para volver a correr. Un retroceso
        // de 25 cuadros, repitiendo una animación ya vista.
        this.wasCarousel = false;
        this.displayF = this.targetF;
        this.smoothingJump = false;
      }
      if (this.masaActive) {
        // El frame queda fijo en N-1 pero el zoom del pan sigue avanzando con el
        // scroll: hay que redibujar cada tick, sin el atajo de "quieto" de abajo.
        this.drawHeroFrame(this.targetF);
        return;
      }
      const JUMP_FRAMES = 12,
        JUMP_RATE = 0.12,
        JUMP_SETTLE = 0.4;
      const delta = this.targetF - this.displayF;
      if (!this.smoothingJump && Math.abs(delta) > JUMP_FRAMES) this.smoothingJump = true;
      if (this.smoothingJump) {
        this.displayF += (this.targetF - this.displayF) * JUMP_RATE;
        if (Math.abs(this.targetF - this.displayF) < JUMP_SETTLE) {
          this.displayF = this.targetF;
          this.smoothingJump = false;
        }
      } else {
        this.displayF = this.targetF;
      }
      const max = N - 1;
      const f = Math.max(0, Math.min(max, this.displayF));
      const REST_WINDOW = 0.05,
        STILL_TICKS = 6;
      if (Math.abs(f - this.restRef) > REST_WINDOW) {
        this.restRef = f;
        this.stillCount = 0;
        this.settled = false;
        this.renderHeroFloat(f);
      } else if (this.settled) {
        // ya nítido y quieto
      } else {
        this.stillCount++;
        if (this.stillCount >= STILL_TICKS) {
          this.settled = true;
          this.drawHeroFrame(f);
        } else {
          this.renderHeroFloat(f);
        }
      }
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this.onResize, { passive: true });
    this.vigilarPresencia();
    // `passive: false` porque hay que poder cancelar el scroll nativo. Se
    // registran siempre (no solo si hoy hay puntero fino): `ckEnabled()` decide
    // en cada evento, así que un cambio de `prefers-reduced-motion` o el paso a
    // modo tableta se atienden en vivo sin re-registrar nada.
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    // `passive: false` en touchmove por lo mismo que en wheel: hay que poder
    // cancelar el desplazamiento nativo. Los otros dos no cancelan nada.
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.onTouchEnd, { passive: true });

    // DIAG (temporal, ver diag.ts). Lo que hay que poder leer en el teléfono
    // es POR QUÉ el controlador no mueve la página: si no está habilitado, si
    // el toque no le llega, o si le llega y el navegador ya no le deja
    // cancelar el desplazamiento.
    // Compacto a propósito: en un iPhone en horizontal el panel entero no cabe
    // y se cortaba justo por los renglones que hacían falta. Los booleanos que
    // ya se dieron por buenos (ready, ckEnabled, tactil, paradas, touchAction)
    // van todos en una línea; lo que cambia gesto a gesto va arriba y solo.
    diagRegistra('hero', () => ({
      VEREDICTO: this.diagVeredicto(),
      'VIAJES-LLEGADAS-ABORTOS': `${this.diagViajes} - ${this.diagLlegadas} - ${this.diagAbortos}   (salvados ${this.diagSalvados})`,
      'ULTIMO GESTO': this.diagUltimoGesto,
      'CADENCIA peor': `${Number.isFinite(this.diagPeorCadencia) ? Math.round(this.diagPeorCadencia) : '-'} cuadros/s (el metraje son 24)`,
      'LEYENDA en reposo': `${this.diagCapReposo}   (op 1.000 = nitida)`,
      umbrales: `franco ${Math.round(this.ckBurstFree())} / paso ${Math.round(this.ckBurstStep())}`,
      toques: `${this.diagToques} (fuera ${this.diagFuera}) · empujones ${this.diagEmpujones} · no-cancel ${this.diagNoCancelable}`,
      estado: `ready ${this.ready} · ck ${this.ckEnabled()} · tactil ${this.tactil()} · paradas ${this.stops.length} · ta ${this.wrapRef()?.nativeElement.style.touchAction || '-'}`,
    }));
  }

  /**
   * ¿Está el hero en pantalla, o cerca? Con `IntersectionObserver` y no
   * midiendo el rectángulo en cada fotograma, porque medirlo es justamente uno
   * de los costes que se quieren quitar: `getBoundingClientRect` fuerza layout.
   *
   * Medio viewport de margen para que despierte ANTES de asomar: si despertara
   * al entrar, el primer fotograma visible sería el único con la coreografía
   * sin actualizar, y se vería el salto.
   */
  private vigilarPresencia(): void {
    const el = this.wrapRef()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    this.ioHero = new IntersectionObserver((e) => (this.heroCerca = e.some((x) => x.isIntersecting)), {
      rootMargin: '50% 0px',
    });
    this.ioHero.observe(el);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    this.ioHero?.disconnect();
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('touchcancel', this.onTouchEnd);
  }

  private readonly onResize = (): void => {
    this.sizeHeroCanvas();
    this.updateHero();
  };

  /**
   * Se decide UNA sola vez y nunca se revisa: los cuadros ya cargados son de
   * una tanda concreta, y `frameShrink` tiene que seguir describiendo esa
   * misma tanda. Si esto se recalculara al rotar el telefono, los cuadros en
   * memoria y el factor de dibujo dejarian de corresponderse y el croissant
   * cambiaria de tamano de golpe.
   */
  private readonly smallFrames = typeof window !== 'undefined' && window.innerWidth <= SMALL_FRAMES_MAX_VW;

  /** Relacion entre el archivo servido y el cuadro nominal de su tanda. */
  private get frameShrink(): number {
    return this.smallFrames ? SMALL_FRAMES_SCALE : 1;
  }

  // ---- carga de frames ----
  private framePath(i: number): string {
    const a = this.smallFrames ? DIR_A_M : DIR_A;
    const b = this.smallFrames ? DIR_B_M : DIR_B;
    const c = this.smallFrames ? DIR_C_M : DIR_C;
    if (i >= SPLIT_C) return `${b}/frame_${String(i - SPLIT_C + 67).padStart(4, '0')}.webp`;
    if (i >= SPLIT_B) return `${c}/frame_${String(i - SPLIT_B).padStart(4, '0')}.webp?v=colorfix3`;
    return `${a}/frame_${String(i).padStart(4, '0')}.webp`;
  }

  /**
   * Compensación de la deriva del croissant DENTRO del metraje.
   *
   * En la tanda v2 el croissant se ancla cuadro a cuadro (`CROI_CY_ARR`), así
   * que aunque se mueva dentro del archivo, en pantalla queda quieto y el
   * movimiento lo pone el código. En v5 el anclaje es una sola constante para
   * sus 82 cuadros, y ahí está el problema: entre los cuadros 108 y 126 el
   * croissant SUBE 653px dentro del propio archivo —26,6px por cuadro, contra
   * 1,3px en v2, medido—, y esa subida llegaba a pantalla cuantizada al cuadro:
   * ~15px CSS de golpe cada 45ms. Un salto de traslación de ese tamaño es lo
   * que se veía brincar; la deformación (el goteo estirándose) apenas se nota
   * al lado.
   *
   * Aquí no se elimina el movimiento —es la animación— sino que se reparte: se
   * devuelve cuánto hay que correr el anclaje para que el borde de los cuernos
   * caiga donde le tocaría en el progreso FRACCIONARIO, en vez de donde lo deja
   * el cuadro que toca dibujar. El resultado es el mismo recorrido, pero
   * continuo a 60fps en vez de a saltos de 22Hz.
   *
   * Medido alineando cuadros vecinos: la diferencia entre 119 y 120 baja de
   * 59,1/255 a 13,7/255 siguiendo el borde superior (con el centroide se queda
   * en 23,1, por eso se ancla arriba: los cuernos suben como un cuerpo rígido y
   * el goteo se estira detrás).
   *
   * En un cuadro entero devuelve exactamente 0, así que ninguna parada en
   * reposo cambia ni un píxel.
   */
  private croiDriftY(b: number, i: number): number {
    const kMax = V5_DRIFT_Y.length - 1;
    const ki = i - DRIFT_FRAME_A;
    const k = b - DRIFT_FRAME_A;
    if (ki < 0 || ki > kMax || k < 0 || k > kMax) return 0;
    const lo = Math.min(kMax - 1, Math.floor(k));
    const t = this.clamp01(k - lo);
    const continuo = V5_DRIFT_Y[lo] + (V5_DRIFT_Y[lo + 1] - V5_DRIFT_Y[lo]) * t;
    return V5_DRIFT_Y[ki] - continuo;
  }

  private croiFor(b: number): [number, number, number] {
    if (b >= SPLIT_C) return [CROI3_W, CROI3_CX, CROI3_CY];
    if (b >= SPLIT_B) return [CROI2_W, CROI2_CX, CROI2_CY];
    const i = Math.max(0, Math.min(CROI_W_ARR.length - 1, Math.round(b)));
    return [CROI_W_ARR[i], CROI_CX_ARR[i], CROI_CY_ARR[i]];
  }

  private loadHeroFrame(i: number): Promise<void> {
    if (this.frames[i] || this.broken.has(i)) return Promise.resolve();
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0) this.frames[i] = img;
        else this.markHeroFrameBroken(i);
        res();
      };
      img.onerror = () => {
        this.markHeroFrameBroken(i);
        res();
      };
      img.decoding = 'async';
      img.src = this.framePath(i);
    });
  }

  private markHeroFrameBroken(i: number): void {
    this.broken.add(i);
  }

  /**
   * Carga una lista de cuadros con la concurrencia ACOTADA, y ese limite es
   * justo lo que hace que la portada arranque.
   *
   * Pidiendolos todos a la vez con un `Promise.all` el ancho de banda se
   * reparte entre las peticiones abiertas y ninguna termina pronto: medido en
   * 4G, el primer cuadro se pedia a los 4,5 s y no llegaba hasta los 17,2 s
   * porque compartia la linea con otros cuarenta y tres. De cuatro en cuatro
   * llegan de forma escalonada, y los primeros —los unicos que hacen falta
   * para empezar— estan disponibles en un par de segundos.
   */
  private async cargarCuadros(indices: number[], concurrencia: number): Promise<void> {
    let p = 0;
    const worker = async (): Promise<void> => {
      while (p < indices.length) await this.loadHeroFrame(indices[p++]);
    };
    await Promise.all(Array.from({ length: Math.min(concurrencia, indices.length) }, worker));
  }

  private async bootHeroFrames(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    if (this.smallFrames) {
      // --- Telefono ---
      // Antes se esperaba a setenta cuadros pedidos de golpe: en 4G el hero no
      // se activaba hasta pasados unos 45 s y quien entraba desde el movil
      // recorria toda la portada sin ver la animacion. Ahora arranca con ocho,
      // pedidos de cuatro en cuatro.
      // Las fotos y los rotulos del carrusel salen ANTES que los cuadros, no
      // despues: el carrusel no dibuja la secuencia, sino estas nueve imagenes
      // aparte, y cae muy pronto en el recorrido. Pidiendolas por detras de los
      // cuadros llegaban sobre los 5,7 s, y quien bajaba a ritmo normal se
      // plantaba en el tramo de los sabores antes de eso: el carrusel limpiaba
      // el lienzo y no pintaba nada —instrumentado en el canal, cuatro
      // pantallas seguidas con solo `clearRect` y ni un `drawImage`—. Son
      // ligeras y no compiten: van sin `await` para no retrasar el arranque.
      this.loadFlavorImages();

      // Los dos ultimos NO son decorativos: el carrusel de sabores no dibuja la
      // secuencia, sino ESTOS dos cuadros congelados (`flavorKeyframe` para
      // 'dulce' y `flavorKeyframeExit`). Sin ellos el carrusel limpia el lienzo
      // y no pinta nada: cuatro pantallas seguidas en blanco justo en el tramo
      // de los sabores, medido bajando en 4G. El 108 ademas no cae en la malla
      // —que va de ocho en ocho— asi que llegaba de los ultimos.
      await this.cargarCuadros([0, 1, 2, 3, 4, 5, 6, 7, FREEZE_FRAME, FREEZE_FRAME_EXIT], 4);
      this.ready = true;
      this.sizeHeroCanvas();
      this.renderHeroFloat(0);

      // Cobertura del recorrido completo antes que el relleno fino: sembrar
      // uno de cada ocho garantiza que cualquier punto del scroll tenga un
      // vecino cercano DE SU MISMA TANDA, que es lo que
      // `nearestGoodHeroFrameIdx` necesita para sustituir sin que se note.
      // Sin esto, bajar deprisa llegaba a tramos sin un solo cuadro y la
      // escena se quedaba congelada mientras el texto seguia avanzando.
      const malla: number[] = [];
      for (let i = 8; i < N; i += 8) malla.push(i);
      await this.cargarCuadros(malla, 4);

      const resto: number[] = [];
      for (let i = 8; i < N; i++) if (i % 8 !== 0) resto.push(i);
      void this.cargarCuadros(resto, 6);
      return;
    }

    // --- Escritorio: sin cambios ---
    const first = Math.min(70, N);
    await Promise.all(Array.from({ length: first }, (_, i) => this.loadHeroFrame(i)));
    this.ready = true;
    this.sizeHeroCanvas();
    this.renderHeroFloat(0);
    let next = first;
    const worker = async () => {
      while (next < N) await this.loadHeroFrame(next++);
    };
    for (let k = 0; k < 18; k++) worker();
    this.loadFlavorImages();
  }

  private loadFlavorImages(): void {
    const ready = (img: HTMLImageElement, key: FlavorKey, store: Partial<Record<FlavorKey, HTMLImageElement>>) => {
      (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => {
        store[key] = img;
      });
    };
    (Object.keys(FLAVOR_GEOM) as FlavorKey[]).forEach((key) => {
      if (key === 'dulce') return;
      const img = new Image();
      img.decoding = 'async';
      img.src = FLAVOR_GEOM[key].src;
      ready(img, key, this.flavorImgs);
    });
    (Object.keys(LETTERING_GEOM) as FlavorKey[]).forEach((key) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = LETTERING_GEOM[key].src;
      ready(img, key, this.letteringImgs);
    });
  }

  // ---- dibujo ----
  private drawGenericCroissant(
    img: HTMLImageElement | undefined,
    croiW: number,
    croiCx: number,
    croiCy: number,
    alpha: number,
    yOffset: number,
    scaleMul: number,
    blurPx: number,
    squishY = 1,
    shrink = 1,
  ): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c || !img || !img.complete || !img.naturalWidth) return;
    const cw = c.width,
      ch = c.height,
      dpr = this.dpr;
    const boxCss = this.heroBoxCss();
    const targetCroiW = PHOTO_FRAC_W * boxCss * dpr * (scaleMul || 1);
    const s = targetCroiW / croiW;
    // Mismo tamano NOMINAL que en `drawHeroImg`, y por el mismo motivo: aqui
    // llegan DOS clases de imagen. Las fotos de sabores son de tamano completo
    // (`shrink` = 1), pero los dos cuadros congelados salen de `this.frames`, y
    // en telefono esos son la tanda `-m` al 65 %. Usando `naturalWidth` en
    // crudo, la calibracion —expresada en pixeles del cuadro original— dibujaba
    // esos dos al 65 % y, como el rectangulo se ancla en su esquina, el
    // croissant caia 53 px CSS arriba y a la izquierda de su sitio: medido, 627
    // px de ancho en la secuencia contra 408 en el carrusel, el mismo cuadro 80
    // y el mismo instante. Era el brinco del croissant pequeno al entrar en los
    // sabores y al salir de ellos. En escritorio `shrink` vale 1 en los dos
    // casos y la expresion es la de siempre.
    const dw = (img.naturalWidth / (shrink || 1)) * s,
      dh = (img.naturalHeight / (shrink || 1)) * s * squishY;
    const dx = cw / 2 - croiCx * s,
      dy = ch / 2 - croiCy * s * squishY + (yOffset || 0);
    try {
      if (alpha < 1) ctx.globalAlpha = alpha;
      if (blurPx) ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
      if (alpha < 1) ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
    }
  }

  private drawLettering(
    img: HTMLImageElement | undefined,
    W: number,
    CX: number,
    CY: number,
    alpha: number,
    riseOffset: number,
    targetCy: number,
    scaleMul: number,
  ): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c || !img || alpha <= 0.003 || !img.complete || !img.naturalWidth) return;
    const dpr = this.dpr || 1;
    const boxCss = this.heroBoxCss();
    const targetW = 0.66 * boxCss * dpr * (scaleMul || 1);
    const s = targetW / W;
    const dw = img.naturalWidth * s,
      dh = img.naturalHeight * s;
    const cx = c.width / 2,
      cy = targetCy != null ? targetCy : c.height * 0.2;
    const dx = cx - CX * s,
      dy = cy - CY * s + riseOffset;
    try {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
    }
  }

  private squishFor(b: number): number {
    return b >= SPLIT_B && b < SPLIT_C ? CROI2_SQUISH_Y : 1;
  }

  /**
   * `shrink` distingue las dos procedencias que se mezclan en el carrusel: las
   * fotos de sabores son archivos de tamano completo, mientras que 'dulce' y la
   * salida son cuadros de la secuencia y en telefono vienen reducidos. Quien
   * dibuja no puede adivinarlo, asi que viaja con la geometria.
   */
  private flavorKeyframe(key: FlavorKey): { img?: HTMLImageElement; W: number; CX: number; CY: number; squishY: number; shrink: number } {
    if (key === 'dulce') {
      const [w, cx, cy] = this.croiFor(FREEZE_FRAME);
      return {
        img: this.frames[FREEZE_FRAME],
        W: w,
        CX: cx,
        CY: cy,
        squishY: this.squishFor(FREEZE_FRAME),
        shrink: this.frameShrink,
      };
    }
    const g = FLAVOR_GEOM[key];
    return { img: this.flavorImgs[key], W: g.W, CX: g.CX, CY: g.CY, squishY: 1, shrink: 1 };
  }

  private flavorKeyframeExit(): { img?: HTMLImageElement; W: number; CX: number; CY: number; squishY: number; shrink: number } {
    const [w, cx, cy] = this.croiFor(FREEZE_FRAME_EXIT);
    return {
      img: this.frames[FREEZE_FRAME_EXIT],
      W: w,
      CX: cx,
      CY: cy,
      squishY: this.squishFor(FREEZE_FRAME_EXIT),
      shrink: this.frameShrink,
    };
  }

  private renderFlavorCarousel(): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c) return;
    const seq = FLAVOR_SEQ,
      n = seq.length - 1;
    const segT = this.clamp01(this.carouselT) * n;
    const idx = Math.min(n - 1, Math.floor(segT));
    const rawFrac = this.clamp01(segT - idx);
    const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const isExit = idx === n - 1;
    const A = this.flavorKeyframe(seq[idx]);
    const B = isExit ? this.flavorKeyframeExit() : this.flavorKeyframe(seq[idx + 1]);
    ctx.clearRect(0, 0, c.width, c.height);
    const band = this.getCarouselBand();
    if (!band) return;
    const letteringCy = band.letteringCy,
      scaleMul = band.scaleMul;
    const yOff = band.croissantCy - c.height / 2 + this.extraLift(FREEZE_FRAME) - this.introSettle(FREEZE_FRAME);
    const gA = LETTERING_GEOM[seq[idx]],
      gB = LETTERING_GEOM[seq[idx + 1]];

    // Cruce de la IMAGEN, complementario: `alphaImgA + alphaImgB` vale 1 en
    // todo el tramo, asi que no existe un instante sin nada dibujado.
    //
    // Antes las dos curvas iban escalonadas y no se tocaban: A se apagaba del
    // todo en rawFrac 0,48 mientras B —cuya opacidad iba AL CUADRADO— apenas
    // alcanzaba el 6 %, y ademas las dos se dibujan con 5-7 px de desenfoque,
    // que reparte esa poca tinta hasta dejarla por debajo del umbral visible.
    // Resultado: el lienzo se quedaba COMPLETAMENTE vacio a mitad de cada
    // cambio de sabor. Medido contando pixeles opacos del canvas, recorriendo
    // cada transicion de 3 en 3 px: cero opacos en las cinco, tanto en iPhone
    // 15 como en escritorio de 1440x900. Los rotulos tampoco lo tapaban —su
    // relevo ocurre antes (0,28-0,40) y despues (0,60-0,72), de modo que en esa
    // franja tambien estan los dos en cero.
    //
    // Se conserva el vocabulario del carrusel —el mismo encogimiento de 0,15,
    // los mismos desenfoques de 5 y 7 px— y los extremos 0,40 y 0,60, que son
    // los que ya delimitaban el cruce entre las dos curvas viejas. Solo cambian
    // las curvas de la imagen: la coreografia de los rotulos no se toca.
    const xT = ease(this.clamp01((rawFrac - 0.4) / 0.2));
    let alphaImgA = 1 - xT;
    const alphaImgB = xT;
    const scaleImgA = 1 - 0.15 * xT,
      scaleImgB = 0.9 + 0.1 * xT;
    const blurImgA = 5 * xT,
      blurImgB = 7 * (1 - xT);
    let riseTxtA = 0,
      riseTxtB = 0;
    const riseImgB = -10 * (this.dpr || 1) * (1 - xT);

    const OUT_START = 0.28,
      OUT_END = 0.4,
      IN_START = 0.6,
      IN_END = 0.72;
    const txtOutT = this.clamp01((rawFrac - OUT_START) / (OUT_END - OUT_START));
    const txtInT = this.clamp01((rawFrac - IN_START) / (IN_END - IN_START));
    let alphaTxtA = 1 - ease(txtOutT),
      alphaTxtB = ease(txtInT);
    const scaleTxtA = 1 - 0.14 * ease(txtOutT),
      scaleTxtB = 0.88 + 0.12 * ease(txtInT);
    riseTxtA = -16 * (this.dpr || 1) * ease(txtOutT);
    riseTxtB = 14 * (this.dpr || 1) * (1 - ease(txtInT));
    let riseImgA = 0;

    const INTRO_T = 0.03;
    if (idx === 0 && this.carouselT < INTRO_T) {
      const it = this.clamp01(this.carouselT / INTRO_T);
      const ie = ease(it);
      alphaImgA = 1;
      riseImgA = 0;
      alphaTxtA = ie;
      alphaTxtB = 0;
    }

    const yOffB = isExit
      ? band.croissantCy - c.height / 2 + this.extraLift(FREEZE_FRAME_EXIT) - this.introSettle(FREEZE_FRAME_EXIT)
      : yOff;
    if (A.img)
      this.drawGenericCroissant(A.img, A.W, A.CX, A.CY, alphaImgA, yOff + riseImgA * 0.5, scaleMul * scaleImgA, blurImgA, A.squishY, A.shrink);
    if (B.img)
      this.drawGenericCroissant(B.img, B.W, B.CX, B.CY, alphaImgB, yOffB + riseImgB, scaleMul * scaleImgB, blurImgB, B.squishY, B.shrink);
    this.drawLettering(this.letteringImgs[seq[idx]], gA.W, gA.CX, gA.CY, alphaTxtA, riseTxtA, letteringCy, scaleMul * scaleTxtA);
    if (!isExit) this.drawLettering(this.letteringImgs[seq[idx + 1]], gB.W, gB.CX, gB.CY, alphaTxtB, riseTxtB, letteringCy, scaleMul * scaleTxtB);
    this.captionRef().nativeElement.style.opacity = '0';
  }

  /**
   * Lado del cuadro del hero en px CSS. UNA sola fuente para todo el hero.
   *
   * Antes este numero estaba escrito CINCO veces -cuatro aqui y una en el
   * SCSS- como `min(0.9 * innerWidth, 720)`, y encajaban por repeticion, no
   * por construccion. Eso ademas escondia el fallo: la formula solo miraba el
   * ANCHO, asi que en una ventana baja pedia mas alto del que hay.
   *
   *   referencia 1440x900   720x720  =  80 % del alto de pantalla
   *   acostado    852x393   720x720  = 183 %   -> el croissant se salia entero
   *
   * El tope por altura lo arregla, y el factor es distinto acostado porque
   * ahi la barra pesa mas: mide 73px, o sea el 19 % de la pantalla contra el
   * 13 % de un escritorio. Con 0,62 quedan ~19 puntos libres por debajo del
   * cuadro para el rotulo y la flecha; con el 0,80 de la referencia no cabrian.
   *
   * `0,90` en el resto NO cambia nada por encima de 800px de alto -ahi manda
   * el tope de 720- y entra de forma continua por debajo, sin escalon.
   */
  private heroBoxCss(): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // `w > h` es la misma condicion que `orientation: landscape` en el SCSS.
    const f = h <= 500 && w > h ? 0.55 : 0.9;
    return Math.min(0.9 * w, 720, h * f);
  }

  /**
   * ¿El texto de la masa madre se ancla arriba, como un titulo?
   *
   * Solo donde el alto escasea y la imagen se le echaria encima: la MISMA
   * condicion que el escalon acostado del SCSS -`max-height: 500px` con
   * `orientation: landscape`-, escrita aqui como aritmetica para que las dos
   * no puedan separarse.
   */
  private masaAnclaAlta(): boolean {
    return window.innerHeight <= 500 && window.innerWidth > window.innerHeight;
  }

  private sizeHeroCanvas(): void {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return;
    const box = c.parentElement;
    if (!box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box.clientWidth || box.offsetWidth,
      h = box.clientHeight || box.offsetHeight;
    if (!w || !h) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d', { alpha: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    this.ctx = ctx;
    this.dpr = dpr;
    this.photoBoxRef()?.nativeElement?.style.setProperty('--bol-hero-box', `${this.heroBoxCss()}px`);
    this.renderHeroFloat(this.lastF);
  }

  private drawHeroImg(
    img: HTMLImageElement,
    alpha: number,
    yOffset: number,
    croiW: number,
    croiCx: number,
    croiCy: number,
    squishY: number,
    scaleMulOverride: number,
  ): void {
    const ctx = this.ctx;
    const c = this.canvasRef().nativeElement;
    if (!ctx || !c || !img.complete || !img.naturalWidth) return;
    const cw = c.width,
      ch = c.height,
      dpr = this.dpr;
    const CW = croiW || CROI_W,
      CX = croiCx != null ? croiCx : CROI_CX,
      CY = croiCy != null ? croiCy : CROI_CY;
    const SQY = squishY || 1;
    const scaleMul = scaleMulOverride != null ? scaleMulOverride : this.getCarouselBand()?.scaleMul ?? 1;
    const boxCss = this.heroBoxCss();
    const targetCroiW = PHOTO_FRAC_W * boxCss * dpr * scaleMul;
    // Escalado solo por ancho, igual que en el resto de la secuencia (incluida
    // la apertura del croissant antes del carrusel, que usa esta misma fórmula
    // sin ningún límite de alto). Hubo un intento de agregar un límite basado en
    // el alto natural de la imagen para un cuadro que parecía "cortado", pero
    // esos cuadros del set retrato (CROI2) tienen mucho margen transparente
    // arriba/abajo en el archivo — ese límite miraba el alto de la imagen
    // completa (con margen y todo), no el del croissant visible, así que achicaba
    // el croissant sin necesidad y rompía la consistencia de tamaño con el resto
    // de la animación. Se quita: el ancho es la única referencia real acá.
    const s = targetCroiW / CW;
    // Se dibuja segun el tamano NOMINAL de la tanda, no segun el del archivo.
    // Toda la calibracion del hero (CROI_W/CX/CY, sus arrays por cuadro, la
    // deriva...) esta expresada en pixeles del cuadro original; si aqui se
    // usara `naturalWidth` a secas, servir la tanda `-m` dibujaria el croissant
    // al 65 % y descolocado, porque esas constantes seguirian midiendo en la
    // escala vieja. Dividir por `frameShrink` reconstruye el ancho nominal, de
    // modo que el rectangulo de destino sale identico con cualquiera de las dos
    // tandas y no hay que tocar una sola constante de calibracion. En
    // escritorio `frameShrink` vale 1 y la expresion es la de siempre.
    const nomW = img.naturalWidth / this.frameShrink,
      nomH = img.naturalHeight / this.frameShrink;
    const dw = nomW * s,
      dh = nomH * s * SQY;
    const dx = cw / 2 - CX * s;
    const dy = ch / 2 - CY * s * SQY + (yOffset || 0);
    try {
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1;
    }
  }

  /**
   * `urgente` distingue el cuadro que hace falta AHORA (lo pide `drawHeroFrame`
   * cuando va a pintar y no lo tiene) de la precarga oportunista que `updateHero`
   * dispara por delante del scroll.
   *
   * En telefono esa precarga va ACOTADA, y no es un detalle: `updateHero` pide
   * 67 cuadros en cada fotograma, asi que sin tope se abrian hasta 135
   * peticiones a la vez —medido bajando en 4G—. Eso deshace justo lo que
   * consigue el arranque escalonado de `cargarCuadros`: repartida entre 135
   * descargas, la linea no termina ninguna pronto, y el cuadro que toca pintar
   * no llega antes que uno que hace falta sesenta cuadros mas tarde. Con el
   * tope solo viajan los mas cercanos —el bucle los recorre de dentro hacia
   * fuera, asi que son los primeros en pedirse— y el resto entra en cuanto se
   * libera un hueco, en el fotograma siguiente. En escritorio no se aplica: esa
   * carga no se toca.
   */
  private ensureHeroFrame(i: number, urgente = false): void {
    if (i < 0 || i >= N || this.frames[i] || this.broken.has(i) || this.inflight.has(i)) return;
    if (this.smallFrames && this.inflight.size >= PREFETCH_MAX + (urgente ? URGENT_EXTRA : 0)) return;
    this.inflight.add(i);
    this.loadHeroFrame(i).then(() => this.inflight.delete(i));
  }

  /** A que tanda de assets pertenece un cuadro (0=v2, 1=v5, 2=v4). */
  private tandaDe(i: number): 0 | 1 | 2 {
    return i >= SPLIT_C ? 2 : i >= SPLIT_B ? 1 : 0;
  }

  /**
   * Devuelve el INDICE del cuadro cargado mas cercano, no la imagen: quien
   * dibuja necesita saber cual es para pedir SU calibracion (ver
   * `drawHeroFrame`). Prefiere un cuadro de la misma tanda porque las tres
   * tienen encuadres distintos —v2 es cuadrada 1440x1440, v5 retrato
   * 1080x1920 y v4 apaisada 1920x1080— y sustituir entre tandas cambia el
   * tamano del croissant de golpe aunque la geometria sea la correcta.
   */
  private nearestGoodHeroFrameIdx(want: number): number {
    const t = this.tandaDe(want);
    for (let o = 1; o < N; o++) {
      const a = want - o,
        b = want + o;
      if (a >= 0 && this.frames[a] && this.tandaDe(a) === t) return a;
      if (b < N && this.frames[b] && this.tandaDe(b) === t) return b;
    }
    for (let o = 1; o < N; o++) {
      const a = want - o,
        b = want + o;
      if (a >= 0 && this.frames[a]) return a;
      if (b < N && this.frames[b]) return b;
    }
    return -1;
  }

  private getCarouselBand(): { letteringCy: number; croissantCy: number; scaleMul: number } | null {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return null;
    const boxCss = this.heroBoxCss();
    const U = boxCss * (this.dpr || 1);
    let bandH = U * 1.15;
    const scaleMul = bandH > c.height * 0.92 ? (c.height * 0.92) / bandH : 1;
    bandH = Math.min(bandH, c.height * 0.92);
    const bandTop = c.height / 2 - bandH / 2;
    return { letteringCy: bandTop + 0.24 * bandH, croissantCy: bandTop + 0.68 * bandH, scaleMul };
  }

  private drawEligeTuSaborTitle(f: number): void {
    const op = this.capOpacity(f, 34, 50, 70, 79);
    if (op <= 0.003) return;
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    if (!ctx || !c) return;
    const band = this.getCarouselBand();
    if (!band) return;
    const dpr = this.dpr || 1;
    const cx = c.width / 2,
      cy = band.letteringCy + (1 - op) * 18 * dpr;
    ctx.save();
    ctx.globalAlpha = op;
    ctx.translate(cx, cy);
    const scale = (0.9 + 0.1 * op) * (band.scaleMul || 1);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontPx = Math.round(52 * dpr);
    ctx.font = `italic 600 ${fontPx}px 'Cormorant Garamond', serif`;
    ctx.fillStyle = '#2E2A1C';
    ctx.fillText('Elige tu sabor', 0, 0);
    ctx.restore();
  }

  // Solo el caption de abajo (derrame) encoge y sube la escena para abrir
  // aire real debajo. Los de arriba (fermentación/horneado) ya tienen aire
  // de sobra arriba de forma natural — el texto se ubica ahí sin tocar la
  // imagen; no tiene sentido encoger el pan sin motivo.
  private dripCaptionOp(b: number): number {
    for (const cap of HERO_CAPTIONS) {
      if (cap.position !== 'bottom') continue;
      const o = this.capOpacity(b, cap.inA, cap.inB, cap.outA, cap.outB);
      if (o > 0.001) return o;
    }
    return 0;
  }

  /**
   * Aquí se separa lo DISCRETO de lo CONTINUO, y es lo que decide si el tramo
   * del derrame se ve fluido o a tirones.
   *
   * `i` (redondeado) elige el bitmap y la geometría que describe ESE bitmap
   * (dónde está el croissant dentro del archivo). Es lo único que puede saltar,
   * porque no existen cuadros intermedios.
   *
   * `b` (fraccionario) alimenta todo lo que es una TRANSFORMACIÓN: la subida de
   * la escena, la rampa de escala y las opacidades. Antes también se calculaban
   * con el cuadro redondeado, y eso convertía una animación continua en 14
   * escalones: medido, el croissant se quedaba clavado hasta 83ms y luego subía
   * 2,14px de golpe, un tirón a 12Hz. Un salto de POSICIÓN se ve mucho más que
   * un cambio de imagen, porque el ojo persigue el borde del objeto y no su
   * textura — por eso este tramo brincaba y los demás no, aunque su metraje
   * cambie a un ritmo parecido: es el único donde la escena se desplaza
   * mientras avanzan los cuadros (`CAPTION_STAGE_LIFT_PX`, que solo activa el
   * caption del derrame).
   *
   * Con esto la escena se mueve a 60fps aunque el metraje solo cambie 22 veces
   * por segundo. En reposo no cambia nada: `b` cae sobre un entero y el
   * resultado es idéntico al de antes.
   */
  private drawHeroFrame(base: number): void {
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    const max = N - 1;
    const b = Math.max(0, Math.min(max, base));
    const i = Math.round(b);
    // `gi` es el cuadro que de verdad se va a pintar, que no siempre es `i`:
    // mientras la secuencia se descarga, `i` puede no haber llegado todavia y
    // hay que recurrir al vecino disponible. TODA la calibracion de abajo va
    // con `gi` y no con `i`, y esa es la correccion: antes se pintaba la
    // imagen del vecino con las coordenadas del cuadro que faltaba. Como cada
    // tanda tiene su propio encuadre, eso mandaba el croissant a una esquina y
    // lo cambiaba de tamano —el sintoma de "la animacion se pierde y el
    // croissant salta de sitio" al entrar por primera vez con la red lenta.
    let gi = i;
    let baseImg: HTMLImageElement | null = this.frames[i] ?? null;
    if (!baseImg) {
      // Urgente: es el cuadro que se iba a pintar en este mismo fotograma, asi
      // que no se encola detras de la precarga.
      this.ensureHeroFrame(i, true);
      const j = this.nearestGoodHeroFrameIdx(i);
      if (j >= 0) {
        baseImg = this.frames[j] ?? null;
        gi = j;
      }
    }
    if (!baseImg || !ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const band = this.getCarouselBand();
    const dpr = this.dpr || 1;
    // Mientras el caption de abajo (derrame) está activo, la escena se
    // encoge y sube un poco para abrir aire real debajo, en vez de que el
    // texto se encime con la animación.
    const dripOp = this.dripCaptionOp(b);
    const yOffset =
      (band ? band.croissantCy - c.height / 2 : 0) + this.extraLift(b) - this.introSettle(b) - CAPTION_STAGE_LIFT_PX * dpr * dripOp;
    // La geometría del recorte va con el cuadro ENTERO: describe dónde está el
    // croissant dentro de ese archivo concreto, así que interpolarla lo
    // desalinearía de su propia imagen.
    const [cW, cCX, cCY] = this.croiFor(gi);
    const squishY = this.squishFor(gi);
    const ramp0 = this.clamp01(b / FREEZE_FRAME_FOR_SCALE_RAMP);
    const scaleMulRamp = (band ? 1 + (band.scaleMul - 1) * ramp0 : 1) * this.masaZoom * (1 - CAPTION_STAGE_SHRINK * dripOp);
    // El anclaje se corre para que la subida del croissant dentro del metraje
    // salga continua en vez de cuantizada al cuadro. Ver `croiDriftY`.
    this.drawHeroImg(baseImg, 1, yOffset, cW, cCX, cCY + this.croiDriftY(b, gi), squishY, scaleMulRamp);
    this.drawEligeTuSaborTitle(b);
  }

  private extraLift(b: number): number {
    const t = this.clamp01((b - 33) / 76);
    const e = t * t * (3 - 2 * t);
    return -(e * 16);
  }

  private introSettle(b: number): number {
    const t = this.clamp01(b / 45);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    return RISE_LIFT_PX * (1 - e);
  }

  private renderHeroFloat(f: number): void {
    const max = N - 1;
    const cl = Math.max(0, Math.min(max, f));
    this.lastF = cl;
    this.drawHeroFrame(cl);
  }

  private cumToFrame(pv: number): number {
    const n = CUM.length;
    if (pv <= 0) return 0;
    if (pv >= 1) return n - 1;
    let lo = 0,
      hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (CUM[mid] <= pv) lo = mid;
      else hi = mid;
    }
    const c0 = CUM[lo],
      c1 = CUM[hi];
    return lo + (pv - c0) / (c1 - c0 || 1);
  }

  private clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private playHeroIn(): void {
    const el = this.logoRef()?.nativeElement;
    if (!el || this.heroInDone) return;
    this.heroInDone = true;
    if (this.reduced()) {
      el.style.opacity = '1';
      return;
    }
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'heroLogoIn 1.35s cubic-bezier(.2,.75,.2,1) both';
  }

  private reduced(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private capOpacity(f: number, inA: number, inB: number, outA: number, outB: number): number {
    if (f <= inA || f >= outB) return 0;
    if (f < inB) return this.clamp01((f - inA) / (inB - inA));
    if (f <= outA) return 1;
    return 1 - this.clamp01((f - outA) / (outB - outA));
  }

  // ---- geometría del recorrido ----
  /**
   * Traduce el reparto en vh (INTRO_VH, CAROUSEL_VH, ...) a los hitos en px del
   * recorrido. Es función pura de `innerHeight` y de la altura del wrap: la
   * misma cuenta que hacía `updateHero` en línea, extraída para que el
   * controlador de paradas la comparta en vez de replicarla.
   */
  private heroGeometry(): HeroGeometry | null {
    const wrap = this.wrapRef()?.nativeElement;
    if (!wrap) return null;
    const vh = window.innerHeight;
    const SEQ = (INTRO_VH / 100) * vh;
    const VID_START = (RISE_B + RISE_GAP) * SEQ;
    const total = Math.max(1, wrap.offsetHeight - vh);
    const CAROUSEL_PX = (CAROUSEL_VH / 100) * vh;
    const PRE_GAP_PX = (PRE_CAROUSEL_GAP_VH / 100) * vh;
    const MASA_PX = (MASA_TEXT_VH / 100) * vh;
    const VID_ORIGINAL = Math.max(1, total - VID_START - CAROUSEL_PX - PRE_GAP_PX - MASA_PX);
    const pv0 = CUM[FREEZE_FRAME];
    const freezeStart = VID_START + pv0 * VID_ORIGINAL;
    const holdStart = freezeStart + PRE_GAP_PX;
    const holdEnd = holdStart + CAROUSEL_PX;
    const exitJumpPx = (CUM[FREEZE_FRAME_EXIT] - pv0) * VID_ORIGINAL;
    // El video real termina después del hold, no en VID_START+VID_ORIGINAL: ese
    // tramo congela `pv` y luego el video retoma desde FREEZE_FRAME_EXIT.
    const videoEnd = holdEnd + (1 - CUM[FREEZE_FRAME_EXIT]) * VID_ORIGINAL;
    return {
      vh,
      SEQ,
      VID_START,
      CAROUSEL_PX,
      PRE_GAP_PX,
      MASA_PX,
      VID_ORIGINAL,
      freezeStart,
      holdStart,
      holdEnd,
      exitJumpPx,
      videoEnd,
      masaEnd: videoEnd + MASA_PX,
    };
  }

  /** Inversa de la curva scroll->cuadro: en qué px del wrap se muestra `f`. */
  private frameToScroll(f: number, G: HeroGeometry): number {
    const i = Math.max(0, Math.min(CUM.length - 1, Math.round(f)));
    const base = G.VID_START + CUM[i] * G.VID_ORIGINAL;
    // Pasado el congelado hay que sumar lo que el carrusel desplaza y descontar
    // el salto de cuadro con el que el video retoma a la salida.
    return i <= FREEZE_FRAME ? base : base + G.PRE_GAP_PX + G.CAROUSEL_PX - G.exitJumpPx;
  }

  /** Las paradas de `CHECKPOINTS` resueltas a px del wrap, en orden creciente. */
  private computeStops(G: HeroGeometry): number[] {
    return CHECKPOINTS.map(({ at }) => {
      if (at.kind === 'intro') return at.p * G.SEQ;
      if (at.kind === 'carousel') return G.holdStart + at.t * G.CAROUSEL_PX;
      return this.frameToScroll(at.frame, G);
    });
  }

  // ---- controlador de paradas ----
  /**
   * En escritorio y en táctil. Durante mucho tiempo esto exigió puntero fino
   * porque capturar el gesto del dedo obliga a apagar el desplazamiento nativo
   * en la zona del hero, y ese es el fallo más caro que se puede cometer en un
   * teléfono. Se hace igualmente, y lo que lo vuelve asumible es que el apagado
   * está acotado a la franja donde el controlador manda de verdad
   * (`touchAction` se recalcula en cada fotograma) y que el resto del recorrido
   * —el texto de la masa madre y todo lo que viene debajo— sigue con el
   * desplazamiento del navegador.
   *
   * Con `reduce` no hay animación que apreciar y se deja el scroll nativo.
   */
  private checkpointsSupported(): boolean {
    return !this.reduced();
  }

  private ckEnabled(): boolean {
    // `ready` importa: sin los cuadros cargados, viajar a una parada del video
    // dejaría el canvas en blanco. Hasta entonces manda el scroll nativo.
    // `scrollLocked` es del preloader/cortina, que ya hace su propio
    // preventDefault sobre wheel — no hay que pelearle el evento.
    return this.ready && this.stops.length > 0 && !this.store.scrollLocked() && this.checkpointsSupported();
  }

  /**
   * Objetivo en px de página. Sale SIEMPRE de una parada, así que un recorrido
   * no puede acabar a medio tramo y un cambio de `innerHeight` —que recoloca
   * todas las paradas, porque el reparto está en vh— lo arrastra consigo.
   */
  private ckTargetY(): number {
    const i = Math.max(0, Math.min(this.ckIdx, this.stops.length - 1));
    return this.wrapTop + this.stops[i];
  }

  /**
   * Decide si este gesto lo gobierna el controlador o el scroll nativo. Depende
   * de la DIRECCIÓN: en la última parada, hacia abajo se suelta (ahí empieza el
   * texto de lectura libre) pero hacia arriba se vuelve a capturar, para que la
   * secuencia se recorra en reversa con las mismas paradas.
   */
  private ckShouldIntercept(dir: number): boolean {
    const y = window.scrollY - this.wrapTop;
    const last = this.stops[this.stops.length - 1];
    // OJO: para bajar NO basta con "hay un recorrido en curso, luego intercepto".
    // Con esa regla, bajando a fondo cada evento entraba por estar el viaje vivo,
    // el objetivo estaba topado en la última parada y el hero no soltaba nunca:
    // había que dejar de girar la rueda y esperar a que el viaje acabara para
    // poder salir, y bajando rápido se sentía pegado en "Recién salido del
    // horno". Se suelta en cuanto la POSICIÓN llega a la última, haya viaje o no;
    // el propio `ckAdvance` detecta entonces el scroll ajeno y cede el mando.
    if (dir > 0) return y < last - CK_EPS;
    if (this.ckRunning) return true;
    // Volviendo hacia arriba desde el texto de lectura hace falta un margen de
    // recaptura: con solo CK_EPS, el scroll nativo podía dejar al usuario en una
    // franja muerta justo por encima de la última parada (medido: 453vh contra
    // una última parada en 449,6) sin que el controlador llegara a engancharse.
    // El margen se queda corto a propósito para no secuestrar a quien solo está
    // releyendo un renglón del texto.
    return y > CK_EPS && y <= last + CK_REENTRY_VH * 0.01 * window.innerHeight;
  }

  /**
   * Parada de la que arranca un gesto: la última que queda por detrás si se
   * baja, la primera que queda por delante si se sube. Estando entre dos (tras
   * un resize o un arrastre de la barra) el gesto avanza a la siguiente de
   * verdad, en vez de saltarse la que tenía a dos píxeles.
   */
  private ckBaseIdx(dir: 1 | -1): number {
    const rel = window.scrollY - this.wrapTop;
    if (dir > 0) {
      let i = 0;
      for (let k = 0; k < this.stops.length; k++) if (this.stops[k] <= rel + CK_EPS) i = k;
      return i;
    }
    for (let k = 0; k < this.stops.length; k++) if (this.stops[k] >= rel - CK_EPS) return k;
    return this.stops.length - 1;
  }

  /**
   * Suelo de velocidad de la frenada. Sube solo dentro del derrame del dulce de
   * leche, y por una razón medida: ahí la tanda v5 se mueve **41,8/255** entre
   * cuadros vecinos —siete veces más que v2 (5,8) y v4 (5,9)— y además reparte
   * solo 12 cuadros en 15,5vh, es decir 11,6px de scroll por cuadro. Con el
   * suelo normal la animación cae a 110/11,6 = 9,5 cuadros/s justo al frenar y
   * el goteo se ve a trompicones. En el resto de la secuencia esa misma
   * velocidad da una animación continua, porque su metraje apenas se mueve de
   * un cuadro al siguiente. 280px/s devuelven los 24 cuadros/s del metraje.
   *
   * No afecta a ningún otro aterrizaje, y se puede comprobar: el suelo solo
   * actúa en los últimos CK_TAIL_PX de un recorrido, y la única parada que cae
   * dentro de estos cuadros es la del relleno. La de la masa madre aterriza en
   * el cuadro 172 y la del horneado en el 210, fuera del rango; las del
   * carrusel y la intro, también fuera.
   *
   * El arreglo de fondo sería densificar v5 (skill 02 de animación por scroll),
   * pero se decidió no tocar los assets.
   */
  private ckFloorSpeed(): number {
    const f = this.targetF;
    if (this.ckPantallaCorta()) {
      // Velocidad para que el viaje dure lo mismo mida lo que mida. Es la
      // tercera forma que pruebo de fijar esta velocidad y la primera estable,
      // porque no mide nada fotograma a fotograma:
      //
      //   · desde `frameToScroll`: pasado el congelado suma el hueco y el
      //     largo del carrusel, el suelo se disparaba y los viajes entre
      //     sabores se completaban en 0,02 s;
      //   · desde CUM: falla en el tramo que sale del carrusel, donde parte de
      //     los píxeles no son metraje;
      //   · midiendo px/cuadro en vivo: se vuelve inestable justo donde el
      //     vídeo retoma tras el congelado, porque ahí el cuadro salta 28 de
      //     golpe con poco scroll. Reportado desde el teléfono con esa versión
      //     puesta: «después del sabor de Nutella la animación pega saltos y
      //     saltos, muy notorios y muy feos», y el panel marcaba una cadencia
      //     de 5 cuadros/s. La razón medida daba tanto valores diminutos
      //     —cadencia por los suelos— como enormes —los saltos—.
      //
      // La distancia total del viaje, en cambio, se conoce sin medir nada y no
      // depende del punto del recorrido. Si a mitad de viaje se encola otra
      // parada, `ckDistMax` crece y la velocidad sube con ella: encadenando
      // gestos se sigue saliendo de largo.
      if (this.ckDistMax > 0) return Math.max(CK_MIN_SPEED, this.ckDistMax / CK_VIAJE_S);
    }
    return f >= DERRAME_A && f <= DERRAME_B ? CK_MIN_SPEED_DERRAME : CK_MIN_SPEED;
  }

  /**
   * Con el dedo, el suelo deja de ser un remate de la frenada y pasa a
   * gobernar el viaje ENTERO. Es un cambio de criterio, y lo pidió el uso real:
   *
   *   «que aunque el scroll sea rápido o lento, la animación corra sola de un
   *   checkpoint al siguiente, a su velocidad; sin importar si es una persona
   *   mayor que desliza muy despacio o un adolescente que desliza fuerte».
   *
   * El modelo de muelle hace la velocidad proporcional a la distancia que
   * queda, así que un viaje de una sola parada —que es lo que da un barrido
   * normal— se recorre despacio. Medido en el tramo de la fermentación: 52
   * cuadros repartidos en 693 px son 13,3 px por cuadro, y con el suelo fijo de
   * 110 px/s la animación cae a 8 cuadros/s. El metraje es de 24, así que se
   * ve a saltos y el texto tarda segundo y medio en terminar de aparecer —de
   * ahí el «las letras de fermentación salen borrosas, no han terminado de
   * desplegar»—. No eran dos fallos: era este.
   *
   * Por eso el suelo se calcula ahora desde la densidad del metraje en el
   * cuadro que se está mostrando, y no como una constante. Sale gratis una
   * comprobación: aplicada al derrame del dulce de leche, la fórmula da
   * 11,6 × 24 = 278 px/s, que es el 280 que allí se había calibrado a mano.
   * Un mismo criterio explica el caso particular que ya estaba resuelto.
   *
   * Encadenando gestos el objetivo se aleja, la velocidad natural del muelle
   * supera al suelo y manda ella: quien barre varias veces seguidas sigue
   * saliendo de largo, que es lo que se pedía para quien no quiere ver la
   * intro.
   *
   * Acotado a la familia WebKit del dedo a propósito: en escritorio y en
   * Android el recorrido no se toca.
   */
  private ckFloorEnTodoElViaje(): boolean {
    return this.ckPantallaCorta();
  }

  /**
   * Un fotograma de seguimiento. Corre dentro del rAF que ya tenía el
   * componente, ANTES de `updateHero`, para que la coreografía lea la posición
   * nueva en el mismo frame y no vaya un tick por detrás.
   */
  private ckAdvance(): void {
    if (!this.ckRunning) return;
    if (!this.ckEnabled()) {
      this.ckRunning = false;
      return;
    }
    const now = performance.now();
    // El tope estaba en 0,05 s, o sea 20 fps. Un teléfono lento no llega: medido
    // en WebKit, un fotograma durante la cortina cuesta 179 ms. Por encima del
    // tope el paso deja de ser proporcional al tiempo real y el recorrido
    // avanza al 29 % de la velocidad prevista, con lo que un gesto parece no
    // hacer nada. Se sube a 0,25 s; lo que evita el salto tras volver de otra
    // pestaña ya no es el tope, sino el recorte contra el objetivo de más
    // abajo, que impide pasarse de la parada por mucho que valga `dt`.
    const dt = this.ckFrameAt ? Math.min(0.25, (now - this.ckFrameAt) / 1000) : 1 / 60;
    this.ckFrameAt = now;

    const pos = window.scrollY;
    // Si el scroll se movió desde FUERA (arrastre del thumb de la scrollbar, un
    // ancla, un reset de `go()`, o el scroll nativo al soltar en la última
    // parada), el controlador cede el mando en vez de arrastrar al usuario de
    // vuelta a su objetivo. Se compara con lo último que escribió él mismo:
    // cualquier otra cosa no es suya.
    //
    // Tres correcciones sobre la versión original, las tres por iOS:
    //   · con el dedo puesto y el gesto ya aceptado como nuestro no hay nadie
    //     más moviendo la página, así que aquí no hay nada que vigilar;
    //   · fuera de eso se aceptan las DOS referencias —lo releído y lo pedido—
    //     porque la relectura llega tarde en Safari (ver `ckIntentoY`);
    //   · y hay una ventana de gracia al LEVANTAR el dedo, que es lo que de
    //     verdad rompía el hero en un iPhone. El instante en que se suelta es
    //     justo aquel en que `tCapturado` deja de proteger y el viaje a la
    //     parada tiene que empezar; ahí Safari reajusta la posición por su
    //     cuenta —la confirma de forma asíncrona— y el primer fotograma
    //     después del gesto la encuentra distinta de todo lo que el
    //     controlador escribió o pidió. La salvaguarda lo lee como «me han
    //     movido desde fuera» y aborta el viaje ANTES de que dé un solo paso.
    //
    //     Reportado con esas palabras desde el teléfono: con el dedo puesto la
    //     animación fluye perfecta, y al levantarlo frena en seco donde esté
    //     —a mitad de un fotograma, sin llegar a ninguna parada—. En Android
    //     no ocurre porque Chromium confirma el scroll de forma síncrona y las
    //     referencias siguen cuadrando.
    //
    //     La ventana solo se abre tras un gesto NUESTRO y solo con el dedo, de
    //     modo que lo que la salvaguarda vigila de verdad —el arrastre del
    //     thumb de la barra, un ancla, un reset de `go()`— sigue protegido en
    //     escritorio exactamente igual que antes.
    const enGracia = now - this.tSueltoAt < T_GRACIA_MS;
    const habriaAbortado =
      !this.tCapturado &&
      this.ckLastWrittenY >= 0 &&
      Math.abs(pos - this.ckLastWrittenY) > 4 &&
      (this.ckIntentoY < 0 || Math.abs(pos - this.ckIntentoY) > 4);
    // DIAG. No es un contador de adorno: es la prueba de si el diagnóstico era
    // el correcto. Si en el teléfono esto sube, la salvaguarda SÍ estaba
    // matando el viaje al levantar el dedo y la ventana de gracia lo está
    // impidiendo. Si se queda en cero, la causa es otra y hay que buscarla en
    // otro sitio en vez de insistir aquí.
    if (habriaAbortado && enGracia) this.diagSalvados++;
    // Y en la familia WebKit del dedo la salvaguarda se apaga ENTERA, porque
    // ahí no es utilizable. Medido en el iPhone con el panel: de 63 empujones,
    // la ventana de gracia tuvo que salvar 59 abortos, y aun así 6 de los 7
    // viajes murieron pasados los 400 ms —«el croissant apenas está abriendo,
    // no ha llegado a las letras y quedó parado»—. Si hay que rescatar 59 de
    // 63, la relectura de `scrollY` no cuadra en NINGÚN momento del viaje, no
    // solo al levantar el dedo, así que alargar la ventana únicamente mueve el
    // problema más adelante en el recorrido.
    //
    // Lo que la salvaguarda vigila de verdad —el arrastre del tirador de la
    // barra, un ancla, un reset de `go()`— o no existe con el dedo o ya está
    // cubierto por `ckShouldIntercept` (que suelta el mando por POSICIÓN en
    // cuanto se pasa la última parada) y por `eraNuestro` en `onTouchEnd`. En
    // escritorio y en Android no cambia nada: ahí sigue entera.
    const ajeno = habriaAbortado && !enGracia && !this.ckPantallaCorta();
    if (ajeno) {
      this.diagAbortos++; // DIAG
      this.ckRunning = false;
      this.ckLastWrittenY = -1;
      this.ckIntentoY = -1;
      this.ckVel = 0;
      return;
    }
    const targetY = this.ckTargetY();
    const dist = targetY - pos;
    if (Math.abs(dist) > this.ckDistMax) this.ckDistMax = Math.abs(dist);
    // Independiente del framerate: a 30fps cada fotograma avanza lo que a 60fps
    // avanzarían dos.
    const smooth = 1 - Math.pow(1 - CK_VEL_SMOOTH, dt * 60);
    this.ckVel += (dist * CK_APPROACH - this.ckVel) * smooth;
    let step = this.ckVel * dt;

    // Suelo de velocidad. En escritorio y Android, solo en la cola: es ahí
    // donde el lerp repta y se nota. Con el dedo, en todo el viaje, para que la
    // animación corra siempre a la cadencia de su metraje (ver `ckFloorSpeed`).
    if (this.ckFloorEnTodoElViaje() || Math.abs(dist) < CK_TAIL_PX) {
      const minStep = this.ckFloorSpeed() * dt;
      if (Math.abs(step) < minStep) step = Math.sign(dist) * Math.min(minStep, Math.abs(dist));
    }
    // Nunca más allá del objetivo. Con el tope de `dt` alto un fotograma muy
    // largo podría dar un paso mayor que la distancia que queda y pasarse de la
    // parada; recortarlo aquí hace que un fotograma lento avance TODO lo que le
    // toca y ni un píxel más, en vez de rebotar.
    if (Math.abs(step) > Math.abs(dist)) step = dist;
    let next = pos + step;

    // Sin esto la asíntota nunca llega y el hero queda a medio píxel de la
    // parada, con el cuadro equivocado congelado.
    if (Math.abs(dist) < 1) {
      next = targetY;
      this.ckVel = 0;
      this.ckRunning = false;
      this.diagLlegadas++; // DIAG
      // DIAG: cadencia media del viaje que acaba de terminar, y la peor de
      // todas las vistas. Solo cuenta si hubo metraje avanzando: los viajes
      // entre sabores son carrusel, no vídeo, y no tienen cadencia que medir.
      if (this.ckCuadrosViaje > 3 && this.ckTiempoViaje > 0.1) {
        const cps = this.ckCuadrosViaje / this.ckTiempoViaje;
        if (cps < this.diagPeorCadencia) this.diagPeorCadencia = cps;
      }
      this.ckCuadrosViaje = 0;
      this.ckTiempoViaje = 0;
    }
    window.scrollTo({ top: next, behavior: 'instant' as ScrollBehavior });
    // Se relee en vez de guardar `next`: el navegador redondea y satura contra
    // los límites del documento, y comparar con un valor que nunca llegó a
    // existir daría un falso "lo movieron desde fuera" en el frame siguiente.
    this.ckLastWrittenY = this.ckRunning ? window.scrollY : -1;
    this.ckIntentoY = this.ckRunning ? next : -1;

    // Densidad del metraje, medida: cuántos px de scroll cuesta un cuadro AQUÍ.
    // `targetF` lo escribe `updateHero`, que corre después de este método en el
    // mismo fotograma, así que lo que se compara son dos fotogramas seguidos.
    //
    // Cuando el cuadro no avanza —el congelado del carrusel— la razón se pone a
    // cero en vez de conservar la última: si se conservara, el suelo del vídeo
    // se aplicaría a los viajes entre sabores, que no son metraje, y los
    // dispararía. A cero, esos viajes vuelven al suelo fijo de siempre.
    // DIAG. La cadencia REAL de la animación, que es lo que se percibe como
    // brinco: cuántos cuadros de vídeo por segundo se están recorriendo. El
    // metraje son 24; por debajo de ~18 se ven los cuadros sueltos. Se guarda
    // la PEOR del recorrido, no la media, porque un tramo bueno con un bache se
    // lee bien en la media y se ve mal en pantalla. Solo se mira donde el
    // cuadro avanza de verdad y sin el salto con el que el vídeo retoma tras el
    // congelado, que no es una cadencia sino una discontinuidad.
    // Se acumula y se promedia POR VIAJE, no se toma el mínimo instantáneo. El
    // mínimo no servía: todo viaje termina frenando, así que siempre capturaba
    // el último fotograma y marcaba 4-5 cuadros/s hasta en Chromium, donde la
    // animación se ve perfectamente. Era un número inútil.
    const dF = Math.abs(this.targetF - this.ckFPrev);
    if (this.ckFPrev >= 0 && dF < 5 && dt > 0) {
      this.ckCuadrosViaje += dF;
      this.ckTiempoViaje += dt;
    }
    this.ckFPrev = this.targetF;
  }

  private readonly onWheel = (e: WheelEvent): void => {
    if (!this.ckEnabled()) return;
    // deltaMode: 0 = px, 1 = líneas, 2 = páginas. Firefox usa líneas.
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (!dy) return;
    const dir: 1 | -1 = dy > 0 ? 1 : -1;
    if (!this.ckShouldIntercept(dir)) return;
    e.preventDefault();

    const now = performance.now();
    // Un gesto acaba donde empieza el silencio; invertir el sentido también
    // cuenta como gesto nuevo, porque lo que el usuario pide ya es otra cosa.
    const nuevoGesto = !this.ckRunning || now - this.lastWheelAt >= CK_GESTURE_MS || dir !== this.ckGestureDir;
    this.lastWheelAt = now;
    this.ckEmpujar(dy, nuevoGesto);
  };

  /**
   * Núcleo del gesto. Lo llaman la rueda y el dedo con el MISMO significado de
   * `dy` —píxeles de recorrido con signo— y por eso el teléfono no necesita un
   * segundo juego de constantes: `CK_BURST_FREE` y `CK_BURST_STEP` gobiernan
   * los dos. Lo único que cada entrada decide por su cuenta es cuándo empieza
   * un gesto nuevo: la rueda lo deduce del silencio entre eventos, el dedo lo
   * sabe con certeza porque el gesto empieza al posarse.
   */
  private ckEmpujar(dy: number, nuevoGesto: boolean): void {
    this.diagEmpujones++; // DIAG
    const dir: 1 | -1 = dy > 0 ? 1 : -1;
    if (nuevoGesto) {
      // Si el gesto continúa en el mismo sentido de un viaje vivo, se cuenta
      // sobre el objetivo ya encolado: así dos o tres gestos seguidos apilan
      // paradas, el objetivo se aleja y —al ser la velocidad proporcional a la
      // distancia— la secuencia corre de largo sin frenar en cada una. Si el
      // sentido cambia, se parte de la posición REAL, no de un objetivo que
      // apuntaba al lado contrario.
      const base = this.ckRunning && dir === this.ckGestureDir ? this.ckIdx : this.ckBaseIdx(dir);
      // Todo gesto vale UNA parada, mida lo que mida. Es lo que iguala el coste
      // de un tramo de 20vh (entre sabores) y uno de 100vh (la fermentación).
      this.ckIdx = base + dir;
      this.ckGestureDir = dir;
      this.ckGestureAccum = 0;
      this.ckGestureBonus = 0;
      this.ckArrancar();
    }
    // Intensidad DENTRO del gesto. La rueda girada a fondo llega como una ráfaga
    // sin silencios, o incluso como un solo evento de miles de píxeles: sin este
    // escalón sería un único gesto y avanzaría una sola parada.
    this.ckGestureAccum += Math.abs(dy);
    const sobra = this.ckGestureAccum - this.ckBurstFree();
    // Sin techo, igual que con la rueda: encadenando gestos se sigue de largo
    // y quien ya vio la intro no tiene que pasar por las doce paradas. Llegó a
    // haber uno de tres, puesto cuando los umbrales eran demasiado generosos y
    // un gesto normal se comía media secuencia; corregido el franco, el techo
    // sobraba y lo único que hacía era impedir salir del hero de un barrido.
    const bonus = sobra <= 0 ? 0 : 1 + Math.floor(sobra / this.ckBurstStep());
    this.diagUltimoGesto = `${Math.round(this.ckGestureAccum)}px -> ${1 + bonus} parada(s)`; // DIAG
    if (bonus > this.ckGestureBonus) {
      this.ckIdx += (bonus - this.ckGestureBonus) * dir;
      this.ckGestureBonus = bonus;
      // El seguimiento puede haberse apagado al llegar al objetivo anterior
      // mientras el dedo seguía puesto; si la intensidad encola otra parada hay
      // que volver a encenderlo o el objetivo nuevo se quedaría sin quien lo
      // persiga. En la rueda no hacía falta porque ahí ese caso abría un gesto.
      this.ckArrancar();
    }
    // El índice no se sale de la lista: pasada la última parada manda el scroll
    // nativo (`ckShouldIntercept`), así que ahí no hay nada que encolar.
    this.ckIdx = Math.max(0, Math.min(this.stops.length - 1, this.ckIdx));
  }

  /** Enciende el seguimiento si estaba apagado, sin tocarlo si ya iba. */
  private ckArrancar(): void {
    if (this.ckRunning) return;
    this.ckFrameAt = 0;
    this.ckLastWrittenY = -1;
    this.ckVel = 0;
    this.ckDistMax = 0;
    this.ckRunning = true;
    this.diagViajes++; // DIAG
  }

  // ---- el mismo controlador, pero con el dedo ----
  /** Contacto vivo que todavía puede convertirse en un barrido nuestro. */
  private tActivo = false;
  /** Ya se decidió que este contacto es un barrido vertical. */
  private tComprometido = false;
  /**
   * El controlador llegó a aceptar este barrido. NO es lo mismo que
   * `tComprometido`: un barrido puede ser vertical y aun así caer fuera del
   * tramo que gobierna el hero, y entonces lo atiende el navegador.
   */
  private tCapturado = false;
  private tX0 = 0;
  private tY0 = 0;
  private tYPrev = 0;
  /** Posiciones recientes, para medir con qué velocidad se levanta el dedo. */
  private tMuestras: { y: number; t: number }[] = [];
  /** Cuándo se levantó el dedo de un barrido nuestro (ver `T_GRACIA_MS`). */
  private tSueltoAt = 0;
  /**
   * Distancia más larga que ha tenido que recorrer el viaje en curso. Crece si
   * a mitad de camino se encola otra parada, y con ella la velocidad. Se pone a
   * cero al arrancar cada viaje.
   */
  private ckDistMax = 0;
  /** Cuadro del fotograma anterior, solo para el contador de cadencia. */
  private ckFPrev = -1;
  private ckCuadrosViaje = 0;
  private ckTiempoViaje = 0;

  /**
   * Solo donde el puntero principal es el dedo. En un portátil con pantalla
   * táctil el puntero fino sigue mandando y no se le toca nada.
   */
  private tactil(): boolean {
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  }

  /**
   * El dedo en la familia WebKit de Apple: iPhone y iPad, en Safari y también
   * en Chrome y Firefox de iOS, que por obligación usan el mismo motor. Safari
   * de macOS queda fuera porque su puntero es fino y `tactil()` ya lo excluye,
   * así que el escritorio no ve nada de esto. Mismo criterio que la cortina.
   */
  private ckPantallaCorta(): boolean {
    return this.tactil() && /apple/i.test(navigator.vendor || '');
  }

  /**
   * Umbrales del descuento por intensidad. Con la RUEDA son los px medidos:
   * 700 son seis muescas de 120, el impulso que debe seguir valiendo una sola
   * parada. En un iPhone no pueden serlo, y no por WebKit sino por aritmética:
   *
   *   iPhone 13   pantalla 664 px   barrido máximo 584 px   <  700
   *   Pixel 7     pantalla 839 px   barrido máximo 759 px   >  700
   *
   * Un barrido no puede recorrer más que la pantalla, así que en el iPhone el
   * descuento era INALCANZABLE: cada gesto valía una parada y las paradas son
   * doce. Reproducido contra producción con el viewport del iPhone 13 y
   * barridos táctiles de 250 px — ocho barridos, ocho paradas, avanzando los
   * 166 px exactos que separan a los sabores del carrusel. En un Pixel 7 la
   * pantalla da de sí lo suficiente para superarlo, y de ahí que el mismo
   * recorrido se sintiera bien en Android y eterno en el iPhone.
   *
   * En fracción de la altura de la ventana el coste deja de depender del
   * tamaño del teléfono.
   *
   * Los valores salen del iPhone de verdad, no de una simulación: el panel
   * publica lo que acumuló el último gesto, y ahí se leyó `405px -> 2 paradas`
   * en una pantalla de 695 px de alto. Ese 405 es lo que acumula un barrido
   * NORMAL, el que da alguien que solo quiere pasar a la escena siguiente.
   *
   * Y la regla de producto es que ese barrido normal valga UNA parada: las
   * paradas existen para que la animación se detenga donde toca y se pueda
   * leer sin ir adivinando dónde parar el dedo. Con el franco por debajo de
   * 405 valían dos o tres, y un solo gesto se comía la ilustración, el
   * croissant real y su texto de una vez; para ver el sabor de mantequilla
   * había que aterrizar ya en el de Nutella. Es el mismo criterio que hace que
   * el hero se sienta bien en Android, donde el franco de 700 px absolutos
   * queda justo por encima de lo que acumula un barrido corriente.
   *
   * De ahí `0,95 × alto`: en esta pantalla son 660 px —prácticamente los 700
   * de la rueda, que es lo que Android ya está usando— pero expresado en
   * fracción sigue siendo alcanzable en un teléfono pequeño, que era el
   * defecto original. Para encolar una parada más hay que barrer claramente
   * más fuerte, y encadenando gestos se sigue de largo sin tope: quien ya vio
   * la intro no tiene que pasar por las doce.
   */
  private ckBurstFree(): number {
    return this.ckPantallaCorta() ? window.innerHeight * 0.95 : CK_BURST_FREE;
  }

  private ckBurstStep(): number {
    return this.ckPantallaCorta() ? window.innerHeight * 0.45 : CK_BURST_STEP;
  }


  private readonly onTouchStart = (e: TouchEvent): void => {
    this.tActivo = false;
    this.tComprometido = false;
    this.tCapturado = false;
    if (!this.tactil() || !this.ckEnabled() || e.touches.length !== 1) return;
    // Solo los toques que nacen DENTRO del recorrido del hero. El navbar, el
    // menú y el carrito viven fuera de ese elemento, así que sus toques —y sus
    // taps— no pasan por aquí.
    const wrap = this.wrapRef()?.nativeElement;
    this.diagToques++; // DIAG
    if (e.target instanceof Element) {
      this.diagUltimoObjetivo = e.target.tagName.toLowerCase() + '.' + String(e.target.className).slice(0, 24);
    }
    if (!wrap || !(e.target instanceof Node) || !wrap.contains(e.target)) {
      this.diagFuera++; // DIAG
      return;
    }
    const t = e.touches[0];
    this.tActivo = true;
    this.tX0 = t.clientX;
    this.tY0 = t.clientY;
    this.tYPrev = t.clientY;
    this.tMuestras = [{ y: t.clientY, t: performance.now() }];
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    if (!this.tActivo) return;
    if (e.touches.length !== 1) {
      // Un segundo dedo es un pellizco para hacer zoom: se suelta el gesto.
      this.tActivo = false;
      return;
    }
    const t = e.touches[0];
    const ahora = performance.now();
    this.tMuestras.push({ y: t.clientY, t: ahora });
    while (this.tMuestras.length > 2 && ahora - this.tMuestras[0].t > T_VEL_MS) this.tMuestras.shift();

    if (!this.tComprometido) {
      const dx = Math.abs(t.clientX - this.tX0);
      const dyTot = Math.abs(t.clientY - this.tY0);
      // Por debajo del umbral todavía puede ser un toque: no se le quita al
      // navegador. Y si va más de lado que de arriba abajo, tampoco es nuestro.
      if (Math.max(dx, dyTot) < T_UMBRAL_PX) return;
      if (dx >= dyTot) {
        this.tActivo = false;
        return;
      }
      this.tComprometido = true;
    }

    // Mismo signo que `deltaY`: dedo hacia arriba = bajar por la página.
    const dy = this.tYPrev - t.clientY;
    this.tYPrev = t.clientY;
    if (!dy) return;
    const dir: 1 | -1 = dy > 0 ? 1 : -1;
    if (!this.ckEnabled() || !this.ckShouldIntercept(dir)) {
      // Se acabó nuestro tramo: se devuelve el gesto al navegador.
      this.tActivo = false;
      return;
    }
    // `cancelable` vale false cuando el navegador YA dio el gesto por
    // desplazamiento y lo pasó al compositor: ahí `preventDefault` no cancela
    // nada y además avisa por consola. Quien de verdad nos reserva el eje es
    // `touch-action` (ver el bloque que lo escribe en cada fotograma); esto es
    // la segunda línea de defensa, y contar los fallos es lo que delata si la
    // primera no está funcionando en un teléfono que no tengo delante.
    if (e.cancelable) e.preventDefault();
    else this.diagNoCancelable++;
    // El gesto nace al posarse el dedo y muere al levantarlo. Nada más lo
    // corta: ni una pausa a mitad del arrastre, ni —y esto es lo que hubo que
    // corregir— que el viaje termine antes que el dedo. La rueda deduce el
    // final del gesto del silencio entre eventos y por eso incluye
    // `!this.ckRunning`; copiar aquí esa condición hacía que un solo
    // deslizamiento contara como dos en los tramos cortos, donde el viaje se
    // completa en menos de lo que dura el barrido. Medido: bajando entre los
    // sabores, tres deslizamientos seguidos saltaron dos paradas cada uno.
    //
    // Invertir el sentido sin levantar sí abre un gesto nuevo, igual que en la
    // rueda: lo que se está pidiendo ya es otra cosa.
    const nuevoGesto = this.tGestoNuevo || dir !== this.ckGestureDir;
    this.tGestoNuevo = false;
    this.tCapturado = true;
    this.lastWheelAt = ahora;
    this.ckEmpujar(dy, nuevoGesto);
  };

  /** Marca que el próximo empujón abre un gesto (se pone al posar el dedo). */
  private tGestoNuevo = true;

  // ---- DIAG (temporal, ver diag.ts) ----
  private diagNoCancelable = 0;
  private diagToques = 0;
  private diagFuera = 0;
  private diagEmpujones = 0;
  private diagAbortos = 0;
  private diagUltimoObjetivo = '';
  /** Viajes a una parada que llegaron a arrancar. */
  private diagViajes = 0;
  /** ...y los que llegaron de verdad. */
  private diagLlegadas = 0;
  /** Abortos que la ventana de gracia impidió (ver `T_GRACIA_MS`). */
  private diagSalvados = 0;
  /**
   * Lo que acumuló el último gesto y cuántas paradas le valió. Es el dato que
   * hace falta para calibrar sin tener el teléfono delante: el envión depende
   * de la deceleración que informe cada navegador, y ese número no se puede
   * deducir desde fuera. Leyendo esto tras un barrido suave y tras uno fuerte
   * se sabe exactamente dónde caen los umbrales en un iPhone de verdad.
   */
  private diagUltimoGesto = '(ninguno)';
  /** Peor cadencia de la animación vista hasta ahora, en cuadros/s. */
  private diagPeorCadencia = Number.POSITIVE_INFINITY;
  private diagCapReposo = '(ninguna)'; // DIAG
  /** Sin `IntersectionObserver` se queda en true: el comportamiento de siempre. */
  private heroCerca = true;
  private heroQuieto = false;
  private ioHero?: IntersectionObserver;

  /**
   * Una frase, no una tabla. El iPhone del caso es de trabajo y no permite
   * guardar ni compartir capturas, así que el diagnóstico tiene que poder
   * LEERSE EN VOZ ALTA. Esta línea distingue las tres situaciones posibles y
   * dice cuál es sin que haya que interpretar seis contadores.
   */
  private diagVeredicto(): string {
    if (!this.ready) return 'el hero aun no tiene cuadros (ready=false)';
    if (!this.ckEnabled()) return 'el controlador esta APAGADO -> scroll nativo sobre 700vh';
    if (this.diagToques === 0) return 'todavia no ha tocado la pantalla';
    if (this.diagEmpujones === 0) return 'los dedos NO llegan al controlador (mire "toques fuera del wrap")';
    if (this.diagViajes === 0) return 'el dedo llega pero NINGUN viaje a una parada arranca';
    if (this.diagSalvados > 0) return `ERA ESO: la salvaguarda mataba el viaje al soltar (${this.diagSalvados} salvados)`;
    if (this.diagLlegadas === 0) return `NO ERA ESO: ${this.diagViajes} viajes arrancaron, 0 llegaron, 0 salvados`;
    return `el controlador manda y avanza bien (${this.diagLlegadas} de ${this.diagViajes} viajes llegaron)`;
  }

  private readonly onTouchEnd = (): void => {
    // `tCapturado` y no `tComprometido`, y esta distinción costó un fallo:
    // pasada la última parada el barrido sigue siendo vertical —y por tanto
    // "comprometido"— pero lo atiende el navegador. Aplicándole igualmente el
    // envión, la intensidad encolaba una parada, el objetivo se topaba en la
    // última y el controlador tiraba de la página HACIA ATRÁS. Medido: bajando
    // por el texto de la masa madre, la posición oscilaba 2963 ↔ 3148 sin
    // avanzar nunca.
    //
    // La segunda condición cubre el caso simétrico: un barrido que sí fue
    // nuestro pero que ya llegó a la última parada mientras el dedo seguía
    // puesto. Ahí el envión tampoco debe encolar nada.
    const eraNuestro = this.tCapturado && this.ckShouldIntercept(this.ckGestureDir);
    // Abre la ventana de gracia, y solo si el barrido llegó a ser nuestro: un
    // toque cualquiera de la página no debe desarmar la salvaguarda.
    if (eraNuestro) this.tSueltoAt = performance.now();
    this.tActivo = false;
    this.tComprometido = false;
    this.tCapturado = false;
    this.tGestoNuevo = true;
    if (!eraNuestro || this.tMuestras.length < 2) return;
    const a = this.tMuestras[0];
    const b = this.tMuestras[this.tMuestras.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0) return;
    const v = (a.y - b.y) / dt; // px/s, positivo = bajando
    // Si el dedo se frenó o cambió de sentido al final no hubo envión.
    if (Math.sign(v) !== this.ckGestureDir) return;
    this.ckEmpujar(Math.abs(v) * T_INERCIA_S * this.ckGestureDir, false);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.ckEnabled() || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const last = this.stops[this.stops.length - 1];
    const y = window.scrollY - this.wrapTop;
    // Válvula de escape para quien ya vio la intro: una tecla y sale del hero.
    if (e.key === 'End' && y < last - CK_EPS) {
      e.preventDefault();
      this.ckGoTo(this.stops.length - 1, 1);
      return;
    }
    if (e.key === 'Home' && y > CK_EPS && y <= last + CK_EPS) {
      e.preventDefault();
      this.ckGoTo(0, -1);
      return;
    }
    const dir = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Spacebar' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : 0;
    if (!dir || !this.ckShouldIntercept(dir)) return;
    e.preventDefault();
    // Con el teclado el gesto es discreto: cada pulsación pide una parada más, y
    // mantener la tecla las encadena — el equivalente a seguir girando la rueda.
    const d = dir as 1 | -1;
    const base = this.ckRunning && d === this.ckGestureDir ? this.ckIdx : this.ckBaseIdx(d);
    const next = base + d;
    if (next >= 0 && next < this.stops.length) this.ckGoTo(next, d);
  };

  /** Fija el objetivo en una parada concreta. */
  private ckGoTo(idx: number, dir: 1 | -1): void {
    if (!this.ckRunning) {
      this.ckFrameAt = 0;
      this.ckLastWrittenY = -1;
      this.ckVel = 0;
      this.ckRunning = true;
    }
    this.ckGestureDir = dir;
    this.ckGestureAccum = 0;
    this.ckGestureBonus = 0;
    this.ckIdx = Math.max(0, Math.min(this.stops.length - 1, idx));
  }

  // ---- scroll -> coreografía (port de updateHero) ----
  private updateHero(): void {
    const R = {
      wrap: this.wrapRef()?.nativeElement,
      stage: this.stageRef()?.nativeElement,
      logo: this.logoRef()?.nativeElement,
      illus: this.illusRef()?.nativeElement,
      photo: this.photoRef()?.nativeElement,
      photoBox: this.photoBoxRef()?.nativeElement,
      canvas: this.canvasRef()?.nativeElement,
      hint: this.hintRef()?.nativeElement,
      introCap: this.introCapRef()?.nativeElement,
      caption: this.captionRef()?.nativeElement,
      captionEyebrow: this.captionEyebrowRef()?.nativeElement,
      captionText: this.captionTextRef()?.nativeElement,
      masaWrap: this.masaWrapRef()?.nativeElement,
    };
    if (!R.wrap || !R.stage) return;
    const rect = R.wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrolled = -rect.top;
    const G = this.heroGeometry();
    if (!G) return;
    // Refresco de las paradas aquí y no en un listener de resize: esto ya corre
    // por rAF, así que quedan al día también tras un reflow que no dispara
    // resize (fuentes que cargan, barra de URL del navegador que se retrae).
    this.wrapTop = window.scrollY + rect.top;
    this.stops = this.computeStops(G);
    // Cesión del eje vertical al controlador, y SOLO mientras manda de verdad.
    //
    // No basta con `preventDefault` en touchmove: en cuanto el navegador da un
    // gesto por reconocido como desplazamiento, lo pasa al compositor y deja de
    // atender la cancelacion. `touch-action` es lo que se consulta ANTES de
    // eso, y es lo único que garantiza que el dedo sea nuestro.
    //
    // Se recalcula en cada fotograma, y ahí está la seguridad: en cuanto se
    // pasa la última parada —el texto de la masa madre y todo lo que sigue— el
    // valor vuelve a vacío y el teléfono recupera su desplazamiento de siempre.
    // NO se cede `pan-x`. La intención original era conservar el zoom de
    // pellizco —quitárselo a alguien es quitarle la forma de leer la letra
    // pequeña— y para eso se escribió `pan-x pinch-zoom`, pero `pan-x` no hacía
    // ninguna falta: `pinch-zoom` a secas ya conserva el zoom, y `pan-x` es
    // ADEMÁS una autorización explícita a desplazarse en horizontal.
    //
    // En Safari de iOS eso se nota y en Chrome de Android no. Reportado en un
    // iPhone con iOS 26.5: «usted hace scroll para abajo y la aplicación se
    // mueve diagonal, se mueve para todo lado». Es literal — le estábamos
    // diciendo al navegador que ese gesto podía llevarse el eje X, en una
    // página que no tiene nada que desplazar de lado.
    if (R.wrap) {
      const ultima = this.stops[this.stops.length - 1];
      const rel = window.scrollY - this.wrapTop;
      // El límite es EXACTAMENTE el mismo que usa `ckShouldIntercept` para
      // bajar, y tiene que serlo. El primer intento cedía el eje también dentro
      // del margen de recaptura (`CK_REENTRY_VH`), pensando en los gestos hacia
      // arriba — y el resultado, con toques reales, fue que la página se
      // quedaba MUERTA en la última parada: el controlador ya había soltado el
      // mando, pero `touch-action` seguía impidiendo que el navegador
      // desplazara. Medido: tres deslizamientos seguidos sin moverse de 2963.
      //
      // Ese margen no se puede aplicar aquí porque `touch-action` no distingue
      // el sentido: se decide al posarse el dedo, antes de saber hacia dónde
      // va. Volviendo desde el texto de la masa madre, el primer deslizamiento
      // hacia arriba lo hace el navegador y a partir del siguiente vuelven las
      // paradas, que es un precio muy pequeño al lado de dejar a alguien sin
      // poder bajar.
      const mandaElDedo = this.tactil() && this.ckEnabled() && rel >= -CK_EPS && rel < ultima - CK_EPS;
      const ta = mandaElDedo ? 'pinch-zoom' : '';
      if (R.wrap.style.touchAction !== ta) R.wrap.style.touchAction = ta;
    }
    const SEQ = G.SEQ;
    const p = this.clamp01(scrolled / (SEQ || 1));
    const seg = (a: number, b: number) => this.clamp01((p - a) / (b - a));
    const L = this.lerp.bind(this);
    const riseT = seg(RISE_A, RISE_B);
    const riseE = riseT * riseT * riseT * (riseT * (riseT * 6 - 15) + 10);
    const riseLiftPx = RISE_LIFT_PX * riseE;

    if (R.logo && p > 0.001) {
      R.logo.style.animation = 'none';
      R.logo.style.opacity = String(1 - seg(0.18, 0.4));
    }
    const wr = this.clamp01((p - 0.54) / (0.86 - 0.54));
    const edge = -14 + wr * 128;
    const a = (edge - 9).toFixed(1),
      b = (edge + 9).toFixed(1);
    if (R.illus) {
      const e = seg(0.18, 0.52);
      const sc = L(0.46, 1, e);
      const tx = L(14.0, 0, e);
      const ty = L(-15.5, 0, e);
      const rot = L(29.7, 0, e);
      R.illus.style.opacity = String(seg(0.2, 0.34));
      R.illus.style.transform = `translate(${tx}%,${ty}%) scale(${sc}) rotate(${rot}deg)`;
      if (p > 0.5) {
        const g = `linear-gradient(122deg, rgba(0,0,0,0) ${a}%, #000 ${b}%)`;
        R.illus.style.webkitMaskImage = g;
        R.illus.style.maskImage = g;
      } else {
        R.illus.style.webkitMaskImage = 'none';
        R.illus.style.maskImage = 'none';
      }
    }
    if (R.photo) {
      R.photo.style.opacity = p > 0.5 ? '1' : '0';
      const grad = `linear-gradient(122deg, #000 ${a}%, rgba(0,0,0,0) ${b}%)`;
      R.photo.style.webkitMaskImage = grad;
      R.photo.style.maskImage = grad;
      R.photo.style.transform = 'scale(1)';
    }
    if (R.hint) R.hint.style.opacity = String(1 - seg(0.02, 0.12));
    if (R.introCap) {
      const ico = this.capOpacity(p, 0.5, 0.505, RISE_A, RISE_B);
      R.introCap.style.opacity = String(ico);
      const gradTxt = `linear-gradient(122deg, #000 ${a}%, rgba(0,0,0,0) ${b}%)`;
      R.introCap.style.webkitMaskImage = gradTxt;
      R.introCap.style.maskImage = gradTxt;
    }

    if (this.reduced()) {
      this.active = false;
      if (R.canvas) R.canvas.style.opacity = '0';
      if (R.caption) R.caption.style.opacity = '0';
      R.stage.style.opacity = String(1 - seg(0.97, 1));
      return;
    }
    if (!this.ready) {
      this.active = false;
      if (R.canvas) R.canvas.style.opacity = '0';
      if (R.caption) R.caption.style.opacity = '0';
      return;
    }

    const { VID_START, CAROUSEL_PX, PRE_GAP_PX, VID_ORIGINAL, freezeStart, holdStart, holdEnd, exitJumpPx } = G;
    const inPreGap = scrolled >= freezeStart && scrolled < holdStart;
    const inHold = scrolled >= holdStart && scrolled < holdEnd;
    const adjScrolled = scrolled >= holdEnd ? scrolled - PRE_GAP_PX - CAROUSEL_PX + exitJumpPx : Math.min(scrolled, freezeStart);
    const pv = this.clamp01((adjScrolled - VID_START) / VID_ORIGINAL);

    if (inHold) {
      this.targetF = FREEZE_FRAME;
      this.carouselActive = true;
      this.carouselT = this.clamp01((scrolled - holdStart) / CAROUSEL_PX);
    } else if (inPreGap) {
      this.targetF = FREEZE_FRAME;
      this.carouselActive = false;
    } else {
      this.carouselActive = false;
      this.targetF = this.cumToFrame(pv);
    }
    this.active = true;
    if (this.ready) {
      const bf = Math.floor(this.targetF);
      for (let k = -6; k <= 60; k++) this.ensureHeroFrame(bf + k);
    }

    const canvasOn = scrolled >= VID_START;
    const photoOff = canvasOn;
    if (R.canvas) R.canvas.style.opacity = canvasOn ? '1' : '0';
    if (R.photo) {
      if (photoOff) {
        R.photo.style.transition = 'none';
        R.photo.style.opacity = '0';
        R.photo.style.display = 'none';
      } else {
        R.photo.style.display = '';
        R.photo.style.transition = 'none';
      }
    }
    if (R.illus) R.illus.style.display = photoOff ? 'none' : '';
    if (R.logo) R.logo.style.display = photoOff ? 'none' : '';

    const f = this.targetF;
    let activeCap: HeroCaption | null = null,
      activeOp = 0;
    for (const cap of HERO_CAPTIONS) {
      const o = this.capOpacity(f, cap.inA, cap.inB, cap.outA, cap.outB);
      if (o > 0.001) {
        activeCap = cap;
        activeOp = o;
        break;
      }
    }
    // DIAG: con qué opacidad se quedó la leyenda una vez el viaje terminó. Si
    // el texto se sigue viendo borroso, este número separa las dos causas
    // posibles sin otra ronda a ciegas: <1 = la parada aterriza desviada (y
    // cuánto), =1 = el desenfoque no viene de aquí sino del rasterizado.
    if (!this.ckRunning && activeCap) {
      this.diagCapReposo = `${activeCap.eyebrow || 'relleno'} op ${activeOp.toFixed(3)} · cuadro ${f.toFixed(1)}`;
    }
    if (R.photoBox) {
      const band = this.getCarouselBand();
      if (band) {
        const ramp = this.clamp01((p - 0.2) / (0.55 - 0.2));
        const dpr = this.dpr || 1;
        R.photoBox.style.transform =
          ramp > 0.001 || riseLiftPx > 0.001
            ? `translateY(${ramp * (band.croissantCy / dpr - vh / 2) - riseLiftPx}px)`
            : '';
      }
    }
    if (R.caption) {
      R.caption.style.opacity = String(canvasOn ? activeOp : 0);
      const dirSign = activeCap?.position === 'top' ? -1 : 1;
      R.caption.style.transform = `translateY(${dirSign * (1 - activeOp) * 10}px)`;
      R.caption.classList.toggle('bol-hero-caption--top', activeCap?.position === 'top');
      const capIdx = activeCap ? HERO_CAPTIONS.indexOf(activeCap) : -1;
      if (activeCap && this.lastCapIdx !== capIdx) {
        this.lastCapIdx = capIdx;
        if (R.captionEyebrow) R.captionEyebrow.textContent = activeCap.eyebrow;
        if (R.captionText) {
          if (activeCap.words) {
            R.captionText.innerHTML = activeCap.words
              .map((w) => `<span class="cw" style="display:inline-block;will-change:transform,opacity">${w}</span>`)
              .join(' ');
            this.capWordEls = Array.from(R.captionText.querySelectorAll<HTMLElement>('.cw'));
          } else {
            R.captionText.textContent = activeCap.text ?? '';
            this.capWordEls = null;
          }
          R.captionText.style.transform = '';
          R.captionText.style.filter = '';
        }
      }
      if (activeCap) {
        if (activeCap.flavor === 'drip' && this.capWordEls) {
          const n = this.capWordEls.length;
          this.capWordEls.forEach((el, i) => {
            const wp = this.clamp01(activeOp * n - i);
            el.style.opacity = String(wp);
            el.style.transform = `translateY(${-(1 - wp) * 14}px)`;
          });
        } else if (activeCap.flavor === 'rise' || activeCap.flavor === 'plain') {
          if (R.captionText) {
            // A opacidad plena se BORRAN las dos propiedades en vez de dejarlas
            // en su valor neutro. Safari promueve a capa propia cualquier
            // elemento con `filter`, la rasteriza una vez y luego la compone
            // escalada: `blur(0px)` + `scale(1)` no es lo mismo que no tener
            // ninguna de las dos, y el texto en reposo puede quedar blando.
            if (activeOp >= 0.999) {
              R.captionText.style.transform = '';
              R.captionText.style.filter = '';
            } else {
              R.captionText.style.transform = `scale(${0.95 + 0.05 * activeOp})`;
              R.captionText.style.filter = `blur(${(1 - activeOp) * 3}px)`;
            }
          }
        }
      }
    }
    // ── Cierre: pan horneado quieto en la tabla + texto de masa madre detrás ──
    // Único tramo sin paradas: el controlador se apaga en la última (el caption
    // "Recién salido del horno") para que esto se lea con scroll libre.
    const { videoEnd, masaEnd, MASA_PX } = G;
    const masaT = this.clamp01((scrolled - videoEnd) / MASA_PX);
    this.masaActive = scrolled >= videoEnd - 40;
    const zoomEase = masaT * masaT * (3 - 2 * masaT);
    this.masaZoom = 1 + MASA_ZOOM_MAX * zoomEase;
    if (R.masaWrap) {
      // Foco viajero por RENGLÓN COMPLETO (no por palabra): un cursor continuo
      // recorre los renglones tal como los partió el wrap del navegador, y
      // todas las palabras de un mismo renglón comparten exactamente el mismo
      // estado — el renglón entero aparece de golpe en negro, no palabra por
      // palabra. Asimétrico, como la referencia: lo ya leído se apaga a gris
      // NÍTIDO (sin blur, solo pierde tinta) y se queda visible detrás; lo que
      // aún no llega se pierde rápido con blur — una sola franja borrosa a la
      // vez, la del renglón que está por entrar.
      const wordEls = Array.from(R.masaWrap.children) as HTMLElement[];
      const lines: HTMLElement[][] = [];
      for (const el of wordEls) {
        const top = el.offsetTop;
        const currentLine = lines[lines.length - 1];
        if (currentLine && Math.abs(currentLine[0].offsetTop - top) < 1) {
          currentLine.push(el);
        } else {
          lines.push([el]);
        }
      }
      const nLines = lines.length;
      const cursor = masaT * nLines;
      const PEAK_RADIUS = 0.75; // ancho (en renglones) de la franja siempre nítida al 100%
      const PAST_FADE = 4; // cuántos renglones tarda en apagarse a gris
      const PAST_FLOOR = 0.35; // gris mínimo del texto ya leído (no desaparece)
      const FUTURE_BLUR_SPAN = 1; // cuántos renglones tarda en desenfocarse el que entra
      lines.forEach((lineEls, li) => {
        const d = li + 0.5 - cursor; // negativo = ya leído, positivo = por llegar
        let focus: number;
        let blurPx: number;
        if (Math.abs(d) <= PEAK_RADIUS) {
          focus = 1;
          blurPx = 0;
        } else if (d < 0) {
          const t = this.clamp01((-d - PEAK_RADIUS) / PAST_FADE);
          focus = 1 - t * (1 - PAST_FLOOR);
          blurPx = 0;
        } else {
          const t = this.clamp01((d - PEAK_RADIUS) / FUTURE_BLUR_SPAN);
          focus = 1 - t;
          blurPx = t * 8;
        }
        const opacity = String(focus);
        const filter = blurPx > 0.05 ? `blur(${blurPx}px)` : 'none';
        const color = d < -PEAK_RADIUS && focus < 0.7 ? '#9a8f72' : 'var(--ink)';
        lineEls.forEach((el) => {
          el.style.opacity = opacity;
          el.style.filter = filter;
          el.style.color = color;
        });
      });
      if (nLines) {
        const idxF = Math.max(0, Math.min(nLines - 1, cursor - 0.5));
        const i0 = Math.floor(idxF);
        const i1 = Math.min(nLines - 1, i0 + 1);
        const frac = idxF - i0;
        const centerOf = (li: number) => lines[li][0].offsetTop + lines[li][0].offsetHeight / 2;
        const y0 = centerOf(i0);
        const y1 = centerOf(i1);
        const lineCenterY = y0 + (y1 - y0) * frac;
        // Donde se ancla la linea enfocada. En una pantalla normal va al centro
        // y el pan -que se dibuja ENCIMA, z-index 6 contra 1- pasa por detras
        // de las palabras sin taparlas, porque hay alto de sobra a los lados.
        //
        // Acostado no lo hay: medido en 796x298, el pan ocupa y 29..193 y la
        // linea enfocada cae en 149, o sea justo en medio de la imagen. Se leia
        // "La masa madre es un fermento natural de harina y agua que [pan]
        // forma el pan en un", con la hogaza dibujada entre las palabras.
        //
        // Anclando al 24 % en vez de al 50 % el texto sube a la franja de
        // titulo -justo debajo de la barra, que mide 43px- y la imagen se queda
        // sola en el centro. Es la misma lectura que ya tienen los rotulos de
        // Fermentacion y Horneado, que en este tramo se colocan arriba.
        const anclaMasa = this.masaAnclaAlta() ? 0.24 : 0.5;
        R.masaWrap.style.transform = `translate(-50%, ${vh * anclaMasa - lineCenterY}px)`;
      }
      R.masaWrap.style.opacity = this.masaActive ? '1' : '0';
    }
    const fadeT = scrolled >= masaEnd ? this.clamp01((scrolled - masaEnd) / (0.12 * vh)) : 0;
    R.stage.style.opacity = String(1 - fadeT);
  }
}
