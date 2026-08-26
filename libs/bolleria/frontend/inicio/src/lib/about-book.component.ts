import { ChangeDetectionStrategy, Component, ElementRef, NgZone, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { NgStyle, isPlatformBrowser } from '@angular/common';
import { CONTACT } from '@bolleria-ui-shared';

const FRAME_COUNT = 169;
const FRAMES_DIR = 'assets/about-book-frames';
const LAST = 7; // 1..6 = historias con foto+texto, 7 = cierre (redes sociales)

// Cuadros calibrados a mano midiendo el movimiento real (diff de pixeles) entre
// cuadros del video: 1..42 tapa abriendose; 43..50 asentando (51 en adelante ya
// es el libro abierto, real y visualmente quieto). PAGE_REST/PAGE_TURNED son los
// dos "stops" en reposo de la vuelta de pagina.
//
// PAGE_REST era el 50, y estaba DENTRO del rebote de la apertura -medido, la
// pagina todavia recorre 1,6px entre el 50 y el 56 (ver CurlAsset.pose). Como cada
// "siguiente" vuelve de un tiron desde PAGE_TURNED hasta aca, el libro saltaba a
// una pose que todavia no habia terminado de asentarse, y el corte se veia.
// Medido contra el 137, en pixeles que cambian mas de 24 niveles:
//   cuadro 48: 23748   50: 15238   52: 10900   55: 9986   56: 9868   60: 10209
// El 56 es el suelo de esa curva: quita el 35% del salto sin tocar nada mas. La
// pagina derecha -donde vive el texto- se mueve 0.2-0.7 px entre el 50 y el 56,
// asi que el encuadre calibrado del texto no se entera.
const PAGE_REST = 56;
const PAGE_TURNED = 137;
// Lo que queda del corte -unos 9900 px de golpe, todavia mas que el fotograma
// mas brusco de la vuelta entera, que son 9301- se reparte en un fundido en vez
// de darse en un solo cuadro. Ver `dissolveTo`.
const SNAP_FADE_MS = 180;
// --- COREOGRAFIA DE LA VUELTA DE PAGINA ---
// La hoja arranca a moverse en el cuadro 83 y termina de aterrizar en el 133.
// En todo ese tramo su forma NO es un cuadrilatero: se enrolla como una onda,
// y el mejor plano posible ya erra 8.5px en el cuadro 93 y 22px en el 106.
// Por eso la geometria viene de una MALLA de 17x17 vertices por cuadro
// (about-book-curl.json), ajustada como superficie desarrollable —el mismo
// modelo cono→cilindro de Hong, Card & Chen (2006) que usa iBooks—, con una
// cara frontal y una dorsal y su mascara de visibilidad por vertice. El
// contenido se pega a esa malla, asi que acompaña a la hoja en toda la vuelta
// y en los dos sentidos, sin fundidos que lo despeguen del papel.
//
// La malla se reajusto cuadro a cuadro contra la silueta real de la hoja y
// contra los ornamentos impresos en ella (que son la prueba objetiva de si el
// contenido la sigue). Dos cosas cambiaron respecto al ajuste anterior:
//
//   1. La camara del render NO es ortografica: la hoja CRECE al levantarse
//      hacia el objetivo. Medido, con proyeccion ortografica el papel plano se
//      queda ~100px corto en el cuadro 107 por mucho que se gire. El ajuste
//      nuevo lleva perspectiva debil (distancia de camara 600px), y por eso
//      alcanza la silueta real en todo el tramo.
//   1b. La linea de doblez va aproximadamente PARALELA al lomo, que es lo que
//      hace una pagina al pasar. Sin esa restriccion el ajuste elegia un
//      pliegue casi perpendicular —un doblez horizontal a media hoja— porque
//      con la hoja de canto muchas formas dan la misma silueta; y ese pliegue
//      es lo que hacia resbalar el texto hacia el borde inferior a partir del
//      cuadro 106. La comprobacion no es la silueta: son los ornamentos
//      impresos en la propia hoja, rastreados cuadro a cuadro desde el 83. En
//      el tramo donde se ven bien (83-102) el ajuste los clava con 1,4px de
//      error medio: el contenido no puede resbalar mas que eso.
//   2. `fv` se apaga del todo en cuanto la cara frontal baja del 10% visible
//      (cuadro 121) y no se vuelve a encender: la hoja que se dio vuelta no
//      vuelve, y sin eso unos pocos vertices sueltos del rizo dejaban asomar
//      una tira de texto sobre la pagina izquierda.
//
// El DORSO (`b`/`bv`) viene del ajuste anterior, remuestreado a 17x17: ese
// lado ya funcionaba, y un modelo de un solo eje de giro no puede posar la
// hoja sobre el plano de la pagina izquierda —el libro es una V, no un
// espejo—. Texto y foto nunca se ven a la vez en el mismo sitio, asi que cada
// cara puede venir de su propio ajuste sin que se note.
const MESH_LO = 83;
const MESH_HI = 133;
// La hoja EN REPOSO lleva el texto sobre un PLANO, no sobre la malla calibrada.
// La malla del cuadro 83 describe una superficie curva de verdad -flecha medida
// de 11,8px en el renglon de arriba y 9,7 en el de abajo, contra 0,9 en el
// centro- y las oraciones salian arqueadas. Una homografia de 4 esquinas lleva
// rectas a rectas, asi que sobre el plano salen exactamente rectas.
//
// El plano y la malla se separan hasta 13,5px (4,5 de media) en el cuadro 83.
// Ese corrimiento se desvanece entre MESH_LO y este cuadro (ver `frontPts`), a
// menos de 1,7px por cuadro contra los 4-7px que ya se mueve el papel ahi. El
// archivo de calibracion no se toca en ningun momento, y desde aqui se usa tal
// cual, vertice a vertice.
const FLAT_BLEND_HI = 95;
const CURL_URL = 'assets/about-book-curl.json';
// Aparicion del contenido al abrir la tapa: el libro esta >=95% abierto ya en
// el cuadro 43 y solo se asienta hasta el 50, asi que el contenido se funde
// en ese tramo en vez de aparecer de golpe al final.
const OPEN_FADE_LO = 43;
const OPEN_FADE_HI = 50;
// La sombra de la copia entrante recien tiene sentido cuando la hoja ya esta
// casi plana sobre la pagina izquierda (el dorso pasa a ser 100% visible en el
// 120); antes la hoja esta de canto y una sombra proyectada seria falsa.
const IN_SHADOW_LO = 122;
const IN_SHADOW_HI = 133;

// Zona del contenido dentro de la hoja, en coordenadas (u,v) de la propia
// pagina —no de la pantalla—, que es lo que la malla sabe mapear. Cada esquina
// se obtuvo invirtiendo la malla en su cuadro ancla hasta caer EXACTAMENTE
// sobre las coordenadas marcadas a mano: el texto en el cuadro 83 (la hoja
// todavia quieta en la pagina derecha) y la foto en el 133 (la hoja ya
// asentada en la izquierda). Asi el relevo entre el contenido quieto y el
// contenido pegado a la hoja es continuo al pixel, sin salto.
type UV = { u: number; v: number };
// Encuadre del texto dentro de la hoja: un RECTANGULO en coordenadas de la
// propia pagina, no un cuadrilatero libre.
//
// Antes eran cuatro esquinas marcadas a mano en el calibrador. Se cambiaron
// porque, medidas contra la decoracion impresa en la propia pagina, metian dos
// defectos que se veian:
//
//   1. CIZALLA. El borde de arriba del cuadrilatero iba a 1,45 grados y el de
//      abajo a 3,36: casi 2 grados de abanico que NO son perspectiva, sino la
//      zona estando torcida. Sumados a la perspectiva real hacian que el primer
//      parrafo se leyera en diagonal mientras el segundo se veia recto.
//   2. CORRIMIENTO. Los cuatro dibujos de las esquinas estan en (u,v) de
//      pagina en 0.133/0.185, 0.885/0.096, 0.039/0.882 y 0.924/0.910, asi que
//      el centro de la pagina segun su propia decoracion es u=0.502. El texto
//      caia en u=0.542: un 4,2% del ancho corrido hacia la derecha, pegado a
//      los dibujos de ese lado y despegado de los de la izquierda.
//
// Siendo un rectangulo en (u,v), las lineas del panel se mapean a lineas
// horizontales de la pagina y todo el abanico que queda es la perspectiva de
// verdad.
//
// Los valores de ahora salen de calibrar el bloque a mano, con la herramienta
// que dibuja el texto por ESTE mismo camino (comprobado: 0.0000 px de desvio
// geometrico contra el componente, 0.3 px midiendo la tinta ya pintada). Sigue
// siendo un rectangulo -sus lados son perpendiculares y del mismo largo, asi
// que no reintroduce cizalla-: es el de antes encogido al 98.4%, girado 1.93
// grados y corrido. El texto se mueve 14.5 px respecto del encuadre anterior,
// 20.2 px en el punto que mas.
//
// El giro no es un capricho: el borde de arriba de la hoja no es horizontal en
// esta camara, y el bloque recto se leia caido contra el.
//
// OJO al tocar estos numeros: dos esquinas quedan fuera de la pagina (u y v
// negativas) y `meshPoint` RECORTA fuera de [0,1] en vez de extrapolar, asi que
// las celdas del panel que caen ahi se aplastan contra el borde. Con las siete
// paginas actuales esa franja esta vacia -medido, ni una letra la toca-, pero
// agrandar el bloque o alargar un texto puede meter tinta en ella.
const SHEET_TEXT_UV: [UV, UV, UV, UV] = [
  { u: 0.00927, v: -0.02594 },
  { u: 0.95354, v: 0.00581 },
  { u: 0.92178, v: 0.95008 },
  { u: -0.02248, v: 0.91832 },
];
const SHEET_PHOTO_UV: [UV, UV, UV, UV] = [
  { u: 0.2077, v: 0.10285 },
  { u: 0.92175, v: 0.1881 },
  { u: 0.91433, v: 0.95486 },
  { u: 0.20515, v: 0.89667 },
];
// El contenido no se dibuja "encima" de la hoja: se MULTIPLICA por la
// luminancia del propio cuadro del video. Asi hereda gratis la sombra que la
// hoja proyecta sobre la pagina izquierda (medida: hasta -211 niveles de gris
// en el nucleo, -59.7 de media de pagina), el rebote de luz, el grano y el
// ruido de compresion —nada de eso hay que simularlo, ya esta en el pixel.
// 232.5 es la luminancia medida del papel a plena luz: dividir por ella deja
// el papel en factor 1.0 (o sea, el contenido sale con su color propio) y
// solo oscurece donde el video ya esta oscuro. El factor real vive entre 0.25
// y 1.08; el 0.5% que pasa de 1.0 satura, que es exactamente lo que hace el
// papel.
const SHADE_WHITE = 232.5;
// Ganancia 255/232.5 aplicada con `color-dodge` contra un gris constante:
// dodge(Cb, Cs) = Cb/(1-Cs), asi que Cs = 1 - 232.5/255 = 0.0882 -> 22.5/255.
// Se hace con modos de composicion y no con ctx.filter porque Safari anterior
// a 17.4 ignora el filtro por completo y ahi la correccion desapareceria.
const SHADE_GAIN_LEVEL = Math.round((1 - SHADE_WHITE / 255) * 255);
// La silueta de la malla erra unos pocos pixeles contra el borde real de la
// hoja. Se dilata la mascara de oclusion ese tanto (en px de video) para que
// el contenido quieto se esconda un pelo ANTES de que la hoja lo tape: que
// asome papel de mas es invisible; que asome contenido sobre la hoja, no.
const MASK_DILATE = 8;
// Duracion proporcional a la distancia real recorrida (no un tiempo fijo por
// boton) -> la velocidad se siente igual sin importar desde que cuadro se
// arranque, y nunca hay que "adivinar" cuanto tarda cada tramo.
const MS_PER_FRAME = 22;

// Mismo dorado que usa el resto del sitio para acentos/ornamentos (ver
// `.bol-book__wheat` en about-book.component.scss) -se reutiliza para el
// divisor del texto, en vez de inventar un color nuevo.
const GOLD = '#C8912A';
// --- TIPOGRAFIA DE LAS HISTORIAS ---
// Los tres numeros de abajo (cuerpo, medida y centro) NO son preferencias: son
// el optimo de una busqueda, y solo tienen sentido juntos.
//
// El metodo: se rectifica la pagina real al espacio del panel invirtiendo la
// superficie de reposo (la PLANA, ver FLAT_BLEND_HI, que es la que decide donde
// cae cada letra sobre el papel); se localizan los cuatro dibujos de esquina y
// se separan en DOS GRUPOS, los de la izquierda y los de la derecha, ademas de
// la canaleta del lomo y los cantos; y se busca en las tres dimensiones a la
// vez el mayor cuerpo que deja al menos 10px de holgura contra todo Y ADEMAS
// queda equilibrado -a menos de 6px de diferencia entre lo que separa el texto
// de los dibujos de un lado y los del otro-, dibujando las 7 paginas completas,
// espiga divisoria y rotulos de redes incluidos.
//
// Optimo medido: 48px con medida 504 y centro 0.525 -> 15.5px a los dibujos de
// la izquierda y 20.6px a los de la derecha. Son 14% mas que los 42 anteriores.
//
// El equilibrio es una condicion de la busqueda y no un extra: buscando solo el
// maximo se llega a 50.5px, pero con el texto a 1.4px de un grupo de dibujos y
// a 20px del otro, y esa asimetria se ve a simple vista aunque no haya choque.
//
// Dos trampas que costaron una vuelta entera de medicion:
//   - Buscar con el texto sin tildes miente. La i de "dias", la o de
//     "tradicion" y la n de "pequenos" suben por encima de la altura de x y son
//     justo lo que roza el dibujo de la esquina de arriba.
//   - La pagina de cierre cuenta como una mas. Dejarla fuera de la busqueda dio
//     un cuerpo que no le cabia.
const STORY_FONT = 48;
// Medida (ancho de columna) = 10.5 veces el cuerpo. Salio de la busqueda, no de
// una regla: con la columna un pelo mas estrecha los renglones se alejan de los
// dibujos laterales y el bloque entero puede crecer.
const STORY_MEASURE = 504;
// Interlineado y aire entre parrafos, en multiplos del cuerpo. 1.38 es el mismo
// que daban los 58px sobre 42, asi que el ritmo vertical no cambia, solo escala.
const STORY_LINE = 1.38;
const STORY_PARA = 0.5;
// Alto reservado para la espiga divisoria DENTRO del bloque. Va contado en el
// alto total a proposito: dejandola fuera, el bloque se centra mal y el adorno
// termina sobre el dibujo de la esquina de abajo.
const STORY_DIVIDER_H = 34;
// Centro del texto dentro del panel, contra la DECORACION IMPRESA en la pagina
// y no contra el borde del papel ni a ojo. Los cuatro dibujos de esquina estan
// en (u,v) de pagina en 0.133/0.185, 0.885/0.096, 0.039/0.882 y 0.924/0.910: su
// centro geometrico cae en u=0.502, pero no basta con ponerlo ahi porque no
// invaden la pagina por igual -el de arriba a la derecha llega hasta u=0.693 y
// el de arriba a la izquierda solo hasta u=0.227-. El horizontal sale por tanto
// de la busqueda, que iguala las distancias MEDIDAS a un grupo y al otro; el
// vertical si es el centro geometrico de los cuatro.
const PAGE_CENTER_U = 0.525;
const PAGE_CENTER_V = 0.519;
// --- La foto es una COPIA IMPRESA apoyada sobre la pagina, no un dibujo en
// ella. Los tres valores de abajo son los que separan un composite creible de
// uno amateur; ninguno es una preferencia estetica suelta.
// Borde de papel de la copia, como fraccion de su lado corto: una copia de
// laboratorio moderna lleva 4-6% (3-5mm reales). Va HACIA ADENTRO del area
// marcada a mano, para no invadir la pagina mas alla de lo que se pidio.
const PRINT_BORDER = 0.05;
// El papel de la copia NO es blanco puro: blanco puro sobre una pagina crema
// se lee como un agujero recortado. Es el blanco del papel de la pagina con
// ~6% mas de luz.
// Medido sobre el render: el papel de la pagina da R-B=+24..+39 de calidez y
// la copia salia en +29 pero con el azul alto, o sea mas fria de lo que le
// toca. Se le baja el azul para dejarla dentro del rango del papel que la
// rodea, conservando el +5..+9% de luz sobre la pagina que corresponde a una
// copia fotografica (mas clara que el papel del libro, pero no blanca).
const PRINT_PAPER = '#F7F0E2';
// Una copia tiene ~0.25mm de grosor: su sombra es CHICA y nitida, no la
// sombra difusa de una tarjeta de interfaz (el error mas comun). Ademas va
// tintada en calido -un negro neutro sobre papel crema da un gris muerto que
// delata el composite al instante.
const PRINT_SHADOW = 'hsl(28 32% 17%)';
// Mismo trazo de espiga de trigo que ya existe en el fondo decorativo del
// sitio (about-book.component.scss, `.bol-book__wheat`) -se reutiliza en el
// divisor del texto para que hable el mismo idioma visual que el resto de la
// marca, en vez de inventar un ornamento sin relacion con el sitio.
const WHEAT_ICON_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='22' viewBox='0 0 14 22'%3E%3Cpath d='M7 1v20M7 5c-1.8.3-3 1.5-3.6 3 1.8.9 3 .3 3.6-1.2M7 5c1.8.3 3 1.5 3.6 3-1.8.9-3 .3-3.6-1.2M7 11c-1.8.3-3 1.5-3.6 3 1.8.9 3 .3 3.6-1.2M7 11c1.8.3 3 1.5 3.6 3-1.8.9-3 .3-3.6-1.2' stroke='%23C8912A' stroke-width='1.3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

interface Point {
  x: number;
  y: number;
}
type Quad = [Point, Point, Point, Point]; // topLeft, topRight, bottomRight, bottomLeft

/**
 * Malla de la hoja que se voltea, un registro por cuadro del video.
 *
 * `f`/`b` son los GRID*GRID vertices de la cara frontal y la dorsal, en
 * coordenadas de video (860x698) y en orden fila-mayor: el indice r*GRID+c
 * corresponde a (u = c/(GRID-1), v = r/(GRID-1)) de la pagina, con u del lomo
 * hacia el canto y v de arriba abajo. `fv`/`bv` son cadenas de '0'/'1' con la
 * visibilidad de cada vertice: al enrollarse, tramos enteros de la hoja dejan
 * de mirar a la camara y ahi no se debe pintar nada. `b` es null hasta que el
 * dorso empieza a asomar (cuadro 116).
 */
interface CurlFrame {
  f: [number, number][];
  fv: string;
  /**
   * Opacidad del texto de la cara frontal, 0..1. Se apaga solo cuando la hoja
   * se pone de canto: por debajo del 42% de su superficie inicial el dorso
   * empieza a comerse la zona de texto (13% de ella en el cuadro 112, 25% en el
   * 113) y, como el dorso no se dibuja, faltarian letras de forma intermitente
   * —que es justo el parpadeo que tenia el asset anterior—. Va precalculado y
   * es MONOTONO decreciente: una vez que el texto empieza a apagarse no puede
   * reaparecer.
   */
  fa?: number;
  b: [number, number][] | null;
  bv: string | null;
  /**
   * Opacidad de la foto impresa en el dorso, 0..1. Precalculada y MONOTONA
   * creciente. Existe por dos motivos, los dos fisicos:
   *
   *   a) Una hoja muestra una cara O la otra. Mientras se lea el texto del
   *      frente no puede verse la foto del dorso en el mismo sitio, asi que
   *      `ba` vale 0 mientras `fa` sea mayor que 0.
   *   b) La foto solo donde hay dorso de verdad. `bv` es ruido en los cuadros
   *      medios —1 celda visible en el 88, ninguna en el 92, 4 en el 95,
   *      ninguna en el 103, 269 en el 114 y otra vez 4 en el 116— y como
   *      `drawOnMesh` con `fillOccluded` dibuja la foto ENTERA en cuanto hay
   *      una sola celda visible, la foto tapaba la pagina desde el cuadro 88.
   */
  ba?: number;
}
/**
 * Warp proyectivo plano `[a, b, c, d, e, f, g, h]`, con el noveno termino fijo
 * a 1 -> `(x,y) => ((a*x + b*y + c) / w, (d*x + e*y + f) / w)` con
 * `w = g*x + h*y + 1`. En pixeles de video, antes de la escala del canvas.
 */
type Warp = [number, number, number, number, number, number, number, number];
interface CurlAsset {
  grid: [number, number];
  frames: Record<string, CurlFrame>;
  /**
   * Pose de cada pagina, cuadro a cuadro: `l` para la izquierda y `r` para la
   * derecha. Cada entrada lleva la superficie ANCLA de ese lado -el plano del
   * cuadro 83 para el texto, la malla `b` del 133 para la foto- a la pose que
   * esa pagina tiene REALMENTE en ese cuadro del video.
   *
   * Hace falta porque el libro no tiene UNA pose de reposo, tiene DOS: se queda
   * en el cuadro 56 tras abrir y tras `prev`, y en el 137 tras `next` -entre
   * medias ha pasado una hoja de un taco al otro-. Con el contenido soldado a
   * una sola superficie por lado, el texto caia clavado en el 56 y hasta 7px
   * fuera en el 137, y la foto justo al reves: clavada en el 137 y 6px fuera en
   * el 56. En los 180ms de `dissolveTo` el libro recorre esa diferencia entera
   * -22565 pixeles del cuadro cambian, y los adornos impresos de las cuatro
   * esquinas salen DOBLES al superponer las dos poses- mientras el contenido,
   * identico en las dos capas del fundido, no se movia ni un pixel. Eso es lo
   * que delataba que estaba sobrepuesto y no impreso.
   *
   * Medida: se rastrea la TINTA de dos adornos impresos por pagina, los unicos
   * dos que correlacionan por encima de 0,75 en todo el tramo (el de la esquina
   * rizada de la derecha no pasa de 0,66 porque su plantilla ya viene curvada en
   * el 83, y una tercera mancha de la izquierda resulto ser el canto del taco,
   * no un adorno). Dos puntos bien separados determinan EXACTAMENTE una
   * similitud, y se comprobo mirando: aplicada, el doblete desaparece tambien en
   * las esquinas que no se usaron para ajustar. Antes se probo un ajuste denso
   * por ECC y se descarto: se iba a soluciones absurdas -14% de escala, esquinas
   * moviendose 17px- en los cuadros donde parte de esa hoja ya no existe. Ojo
   * tambien con el rastreo por parches en rejilla: los cantos del taco NO se
   * mueven cuando la hoja pasa de un lado al otro, son mayoria, y un ajuste
   * robusto acaba tirando los adornos por atipicos y midiendo cero.
   *
   * Fuera de los tramos donde la pagina es de verdad lo que se ve, la serie se
   * completa con rampas suaves colocadas donde el contenido esta TAPADO: la
   * derecha entre el 84 y el 96 (el texto quieto esta oculto >=98% por la hoja) y
   * la izquierda entre el 128 y el 133 (la foto quieta esta al 2,7% en el 128 y
   * al 0% desde el 130). Por construccion la identidad cae en el cuadro ancla de
   * cada lado, asi que el relevo entre superficie de reposo y malla no salta. Y
   * donde el movimiento medido baja de 0,35px -el ruido del rastreo- se fuerza
   * identidad exacta, para que con el libro parado no quede ni un subpixel de
   * temblor: entre el 56 y el 82 el texto no se mueve absolutamente nada.
   */
  pose?: Record<string, { l: Warp; r: Warp }>;
}
/** Region rectangular del canvas (en pixeles reales del canvas, ya con dpr). */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Zonas de contenido marcadas A MANO por el dueno del sitio sobre el frame
// real (frame_0050.webp, 860x698px nativos), con una herramienta de picking
// hecha para eso. NO son las esquinas de la pagina del libro: son el area
// exacta donde el quiere ver la foto y el texto, ya con el aire que el
// decidio respecto al borde de la pagina. Por eso se usan tal cual, sin
// margen extra ni correccion de perspectiva encima -cualquier "ajuste" que
// se les haga los aleja de lo que se pidio. Si hay que moverlas, se vuelven
// a marcar con la herramienta, no se estiman.
const CONTENT_LEFT_QUAD: Quad = [
  { x: 197, y: 282 },
  { x: 397, y: 250 },
  { x: 456, y: 467 },
  { x: 241, y: 507 },
];
const CONTENT_RIGHT_QUAD: Quad = [
  { x: 445, y: 243 },
  { x: 637, y: 215 },
  { x: 720, y: 427 },
  { x: 513, y: 458 },
];

interface StoryContent {
  photo: string | null;
  lines: string[];
}
// Las 6 historias (foto + texto) confirmadas + la pagina de cierre (sin foto,
// frase + redes). El orden de archivo (about-1..6) coincide con el orden
// narrativo confirmado con el dueño del negocio.
const STORIES: StoryContent[] = [
  { photo: 'assets/about-1.webp', lines: ['Hola, pasa! Vamos a contarte un poco de nosotros.'] },
  { photo: 'assets/about-2.webp', lines: ['Somos una panadería artesanal y estamos ubicados en Grecia.'] },
  {
    photo: 'assets/about-3.webp',
    lines: ['Nuestro espacio es el resultado de dos historias que se encontraron: la disciplina del deporte y la tradición de una familia panadera.'],
  },
  {
    photo: 'assets/about-4.webp',
    lines: [
      'Desde el inicio quisimos hacer algo diferente: apostar por productos artesanales y saludables, como el pan de masa madre.',
      'Y ofrecer también esos pequeños gusticos que tanto nos gustan, como los croissants y la repostería.',
    ],
  },
  { photo: 'assets/about-5.webp', lines: ['Trabajamos todos los días por hornear mejor, crear mejor contenido y atenderles cada vez más bonito.'] },
  { photo: 'assets/about-6.webp', lines: ['Te esperamos de lunes a domingo, con pan recién horneado y un cafécito caliente.'] },
  { photo: null, lines: ['Esta historia se sigue horneando todos los días.', 'Acompañanos para verla crecer.'] },
];
// Tamaño de lienzo fuente para los paneles de texto/foto (proporcion generica
// de pagina; el warp de 4 puntos absorbe la perspectiva real al dibujar).
const PANEL_W = 700;
const PANEL_H = 820;
// Posicion relativa (0..1 dentro del panel de cierre) de cada icono de red,
// usada tanto para dibujarlos en el panel como para ubicar los <a> reales
// encima del canvas (ver socialLinkStyle).
const SOCIAL_POS = { instagram: { u: PAGE_CENTER_U, v: 0.63 }, facebook: { u: PAGE_CENTER_U, v: 0.74 } };

/**
 * Álbum "Acerca de nosotros": un único render, el mismo canvas/video de
 * siempre. Las 169 cuadros del video (fondo removido) se reproducen como
 * sprite; las 6 historias (foto izquierda / texto derecha) y el cierre se
 * componen ENCIMA de esos mismos cuadros, en las zonas marcadas a mano sobre
 * el frame real (`CONTENT_LEFT_QUAD`/`CONTENT_RIGHT_QUAD`) — nunca un motor
 * de render aparte, para que todo comparta exactamente el mismo color,
 * perspectiva y luz del video real.
 *
 * Durante la vuelta de página, el texto que se va viaja literalmente sobre la
 * hoja real que se curva en el video: `FLAP_RECTS` es la posición/rotación
 * real de esa hoja, medida cuadro a cuadro comparando cada cuadro contra
 * PAGE_REST (donde cambia, ahí está la hoja moviéndose) y orientando la
 * mancha resultante con PCA. Así el contenido se deforma junto con la hoja
 * real del video, no con una curva de página inventada aparte.
 */
@Component({
  selector: 'bol-about-book',
  standalone: true,
  imports: [NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-book.component.html',
  styleUrl: './about-book.component.scss',
})
export class AboutBookComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly zone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly last = LAST;
  readonly contact = CONTACT;
  readonly ready = signal(false);
  readonly coverOpen = signal(false);
  readonly busy = signal(false);
  readonly current = signal(1);
  // El titulo esta pegado al libro a proposito (ver SCSS) y la tapa lo tapa un
  // instante real durante la apertura -este signal dispara el pulso de
  // "elevacion" (escala + sombra) sincronizado con ese momento exacto, para
  // que se sienta como el libro levantandose hacia la camara, no un simple
  // tapado plano de la imagen sobre el texto.
  readonly lifting = signal(false);
  // Solo la pagina de cierre tiene links reales (redes sociales); se
  // posicionan como <a> de verdad encima del canvas (ver socialLinkStyle) para
  // que sean clickeables — todo lo demas es pixeles de canvas, sin DOM.
  readonly showSocialLinks = computed(() => this.coverOpen() && !this.busy() && this.current() === LAST);

  // ImageBitmap (no <img>): un <img> ya decodificado puede ser descartado por el
  // navegador bajo presion de memoria y forzar un redecode silencioso -y una
  // pausa real- la primera vez que se vuelve a dibujar, minutos despues de la
  // precarga. ImageBitmap mantiene los pixeles decodificados en memoria mientras
  // se conserve la referencia, sin ese riesgo.
  private frames: ImageBitmap[] = [];
  // Fotos crudas, tal como se descargan (a color completo, sin procesar).
  private rawPhotos: (ImageBitmap | null)[] = [];
  // Panel final por foto: solo la foto, con recorte "cover" que llena el
  // lienzo sin deformarla (ver renderPhotoPanel) -se warpea entera a
  // CONTENT_LEFT_QUAD igual que un panel de texto, nunca por separado.
  private photos: (HTMLCanvasElement | null)[] = [];
  // Malla de la hoja cuadro a cuadro (about-book-curl.json). Si no carga, la
  // vuelta de pagina sigue funcionando: el contenido simplemente se queda
  // quieto en su pagina en vez de acompañar a la hoja (ver drawContent).
  private curl: CurlAsset | null = null;
  private curlGrid = 0;
  // Rejilla PLANA equivalente a la hoja en reposo (ver FLAT_BLEND_HI): la
  // homografia de las cuatro esquinas de la malla del cuadro 83, muestreada en
  // la misma rejilla GRIDxGRID. Se genera una sola vez al cargar.
  private flatFront: [number, number][] | null = null;
  // Desplazamiento plano-menos-malla en el cuadro 83, fijo. Es lo que `frontPts`
  // desvanece durante los primeros cuadros de la vuelta.
  private flatOffset: [number, number][] | null = null;
  private flatVis = '';
  // Buffers reutilizados para la geometria que se calcula por cuadro (mezcla
  // plano->malla y pose de la pagina). Crear tres arrays de 289 puntos en cada
  // uno de los ~60 cuadros por segundo seria basura para el GC.
  private blendBuf: [number, number][] | null = null;
  private poseBuf: Record<'left' | 'right', [number, number][] | null> = { left: null, right: null };
  // Tres lienzos auxiliares del tamaño del canvas, reutilizados cuadro a
  // cuadro (crear un canvas por cuadro seria basura para el GC en pleno 45fps):
  // `contentLayer` junta todo lo que dibujamos nosotros, `maskLayer` la silueta
  // de la hoja que tapa lo que esta quieto, y `shadeLayer` la luminancia del
  // propio video por la que se multiplica el resultado.
  private contentLayer: HTMLCanvasElement | null = null;
  private maskLayer: HTMLCanvasElement | null = null;
  private shadeLayer: HTMLCanvasElement | null = null;
  private paperLayer: HTMLCanvasElement | null = null;
  // Cruce de poses en curso (null = no hay ninguno). `t` va de 0 a 1 ya
  // suavizado. Mientras esta puesto, `draw` cruza los dos cuadros del video y
  // `restSurface` interpola las dos poses, para que el contenido se DESPLACE en
  // vez de fundirse consigo mismo (ver `dissolveTo`).
  private fundido: { desde: number; hacia: number; t: number } | null = null;
  private wheatIcon: HTMLImageElement | null = null;
  private textPanels: HTMLCanvasElement[] = [];
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private raf = 0;

  constructor() {
    if (this.isBrowser) void this.boot();
  }

  private async boot(): Promise<void> {
    await Promise.all([
      ...Array.from({ length: FRAME_COUNT }, (_, i) => this.loadFrame(i)),
      ...STORIES.map((s, i) => this.loadPhoto(i, s.photo)),
      this.loadWheatIcon(),
      this.loadCurl(),
      this.prepareFonts(),
    ]);
    this.photos = this.rawPhotos.map((p) => (p ? this.renderPhotoPanel(p) : null));
    this.textPanels = STORIES.map((s, i) => this.renderTextPanel(s, i === LAST - 1));
    this.sizeCanvas();
    this.draw(1);
    this.ready.set(true);
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private async prepareFonts(): Promise<void> {
    try {
      // Los pesos/estilos que realmente usa el panel. Cinzel entra aqui tambien:
      // los paneles se dibujan UNA vez al cargar, asi que una familia que no
      // este lista en ese instante se queda con la de reemplazo para siempre.
      await Promise.all([
        document.fonts.load(`400 ${STORY_FONT}px "Cormorant Garamond"`),
        document.fonts.load(`italic 500 ${STORY_FONT}px "Cormorant Garamond"`),
        document.fonts.load('600 24px Cinzel'),
      ]);
    } catch {
      // se ignora: si la fuente no carga a tiempo, el panel usa la de reemplazo del navegador
    }
  }

  private async loadFrame(i: number): Promise<void> {
    const url = `${FRAMES_DIR}/frame_${String(i + 1).padStart(4, '0')}.webp`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      this.frames[i] = await createImageBitmap(blob);
    } catch {
      // se ignora: draw() simplemente omite el cuadro si no llego a cargar
    }
  }

  private async loadPhoto(i: number, url: string | null): Promise<void> {
    if (!url) {
      this.rawPhotos[i] = null;
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      this.rawPhotos[i] = await createImageBitmap(blob);
    } catch {
      this.rawPhotos[i] = null;
    }
  }

  private async loadCurl(): Promise<void> {
    try {
      const res = await fetch(CURL_URL);
      const data = (await res.json()) as CurlAsset;
      if (!data?.frames || !data?.grid?.[0]) return;
      this.curl = data;
      this.curlGrid = data.grid[0];
      this.buildFlatFront();
    } catch {
      // se ignora: sin malla, drawContent deja el contenido quieto en su pagina
    }
  }

  // createImageBitmap() no decodifica de forma confiable un blob SVG en Chromium
  // (InvalidStateError, verificado); un <img> normal si lo hace, por eso este
  // icono se carga distinto al resto de los assets (frames/fotos, que son
  // raster y si funcionan bien con createImageBitmap).
  private async loadWheatIcon(): Promise<void> {
    try {
      this.wheatIcon = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('no se pudo cargar el icono de trigo'));
        img.src = WHEAT_ICON_URL;
      });
    } catch {
      this.wheatIcon = null;
    }
  }

  /**
   * Compone la foto de una historia en un panel propio, una sola vez al
   * cargar: solo la foto, recorte "cover" (llena el panel sin deformar la
   * imagen original), sin marco ni ornamento de ningun tipo. El panel se
   * warpea despues a CONTENT_LEFT_QUAD, que es el area exacta marcada a
   * mano, asi que la foto llega justo hasta esas 4 esquinas: cualquier
   * margen interno aqui la encogeria respecto a lo que se marco.
   */
  private renderPhotoPanel(img: ImageBitmap): HTMLCanvasElement {
    const aspect = AboutBookComponent.quadAspect(CONTENT_LEFT_QUAD);
    const w = 720;
    const h = Math.round(w / aspect);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return c;

    // Papel de la copia (el borde blanco de una foto de laboratorio).
    const border = Math.round(Math.min(w, h) * PRINT_BORDER);
    ctx.fillStyle = PRINT_PAPER;
    ctx.fillRect(0, 0, w, h);

    const iw = w - border * 2;
    const ih = h - border * 2;
    const crop = AboutBookComponent.coverCropRect(img, iw / ih);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, border, border, iw, ih);

    // Grado de copia impresa. Dos correcciones, ambas fisicas:
    // 1) La tinta sobre papel no llega al negro puro (densidad ~1.1 en papel
    //    sin estucar): se levanta el piso de negro. Una foto con negros 0,0,0
    //    apoyada en papel crema es imposible y el ojo lo detecta.
    // 2) Una pantalla satura mas que la tinta: se baja un poco la saturacion.
    ctx.save();
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = 'rgb(28,24,20)';
    ctx.fillRect(border, border, iw, ih);
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#808080';
    ctx.fillRect(border, border, iw, ih);
    ctx.restore();

    return c;
  }

  /**
   * Sombra de la copia sobre la pagina, en el espacio del canvas (no del
   * panel): tres capas debiles -contacto, media y ambiente- en vez de una
   * sola fuerte, con desplazamiento vertical al doble del horizontal. Las
   * distancias van en fraccion del lado corto de la copia, asi que la sombra
   * escala con el libro sin recalibrarse. Se dibuja ANTES que la copia.
   */
  private drawPrintShadow(ctx: CanvasRenderingContext2D, dst: Quad, strength = 1): void {
    const s = Math.min(
      Math.hypot(dst[1].x - dst[0].x, dst[1].y - dst[0].y),
      Math.hypot(dst[3].x - dst[0].x, dst[3].y - dst[0].y),
    );
    const layers = [
      { dx: 0, dy: 0, blur: 0.006 * s, alpha: 0.35 }, // contacto
      { dx: 0.004 * s, dy: 0.008 * s, blur: 0.016 * s, alpha: 0.19 }, // media
      { dx: 0.008 * s, dy: 0.016 * s, blur: 0.05 * s, alpha: 0.1 }, // ambiente
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = PRINT_SHADOW;
    for (const l of layers) {
      ctx.save();
      // Safari <16.4 ignora ctx.filter: degrada a sombra nitida, no rompe.
      ctx.filter = `blur(${l.blur.toFixed(2)}px)`;
      ctx.globalAlpha = l.alpha * strength;
      ctx.translate(l.dx, l.dy);
      ctx.beginPath();
      ctx.moveTo(dst[0].x, dst[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(dst[i].x, dst[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Dibuja el texto (o la frase de cierre + redes) de una historia en un
   * panel propio, una sola vez al cargar. Se compone después sobre el canvas
   * con el warp de 4 puntos -nunca se re-renderiza texto en cada frame de la
   * animación, solo se transforma el bitmap ya dibujado.
   */
  private renderTextPanel(story: StoryContent, isClosing: boolean): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = PANEL_W;
    c.height = PANEL_H;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3d2a';
    const cx = PANEL_W * PAGE_CENTER_U;

    if (isClosing) {
      // La pagina de cierre usa el MISMO motor de reparto que las historias.
      // Antes pasaba `maxWidth` a fillText, que no reparte: aprieta la linea
      // horizontalmente hasta que quepa. Con la frase de cierre eso ya la
      // dejaba al 70% de su ancho -letras estrechadas, distintas del resto del
      // libro- y al subir el cuerpo habria bajado al 59%.
      ctx.font = `italic 500 ${Math.round(STORY_FONT * 0.95)}px "Cormorant Garamond", serif`;
      const rows = story.lines.flatMap((line) => this.wrapLine(ctx, line, STORY_MEASURE, false));
      const step = STORY_FONT * 0.95 * STORY_LINE;
      // El bloque se centra en la franja que queda por encima de los enlaces de
      // redes, cuya posicion es fija porque los <a> reales del DOM se colocan
      // con ella (ver socialLinkStyle). La franja arranca en 0.20 y no en 0
      // para que la frase no se suba al borde de arriba y deje un vacio entre
      // ella y los enlaces: con el cuerpo nuevo la frase ocupa 3 renglones, no
      // 2, y centrada en el panel entero quedaba muy alta.
      const zoneLo = PANEL_H * 0.2;
      const zoneHi = PANEL_H * (SOCIAL_POS.instagram.v - 0.09);
      let y = zoneLo + (zoneHi - zoneLo - rows.length * step) / 2 + STORY_FONT * 0.95 * 0.8;
      for (const row of rows) {
        ctx.fillText(row, cx, y);
        y += step;
      }
      this.drawSocialIcon(ctx, SOCIAL_POS.instagram, '#5e6a34', 'instagram');
      this.drawSocialIcon(ctx, SOCIAL_POS.facebook, '#5e6a34', 'facebook');
      return c;
    }

    ctx.font = `400 ${STORY_FONT}px "Cormorant Garamond", serif`;
    // Se reparte en renglones primero, sin dibujar todavia: asi se conoce el
    // alto real del bloque completo -espiga incluida- y se centra de verdad.
    const paragraphs = story.lines.map((line) => this.wrapLine(ctx, line, STORY_MEASURE, true));

    const rowH = STORY_FONT * STORY_LINE;
    const paraGap = STORY_FONT * STORY_PARA;
    const totalRows = paragraphs.reduce((sum, rows) => sum + rows.length, 0);
    const blockHeight = totalRows * rowH + (paragraphs.length - 1) * paraGap + STORY_DIVIDER_H;
    // 0.8 del cuerpo aproxima el alto visible de la letra por encima de su
    // linea base, para centrar el texto que realmente se ve y no la caja
    // invisible de lineas, que arranca en la base de la primera. El centro
    // vertical sale de los dibujos de las esquinas, igual que el horizontal.
    let y = PANEL_H * PAGE_CENTER_V - blockHeight / 2 + STORY_FONT * 0.8;

    for (let i = 0; i < paragraphs.length; i++) {
      for (const row of paragraphs[i]) {
        ctx.fillText(row, cx, y);
        y += rowH;
      }
      if (i < paragraphs.length - 1) y += paraGap;
    }
    this.drawTextDivider(ctx, cx, y - rowH + STORY_FONT * 0.42 + STORY_DIVIDER_H / 2);
    return c;
  }

  /**
   * Reparte una linea en renglones que quepan en `measure`. `lower` la pasa a
   * minuscula tipografica, como en la referencia del libro: no cambia el
   * contenido de la historia, solo como se imprime en la pagina.
   */
  private wrapLine(ctx: CanvasRenderingContext2D, line: string, measure: number, lower: boolean): string[] {
    const words = (lower ? line.toLowerCase() : line).split(' ');
    const rows: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > measure && current) {
        rows.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) rows.push(current);
    return rows;
  }

  /** Divisor decorativo bajo el texto: mismo trazo de trigo dorado que el resto del sitio (ver GOLD/WHEAT_ICON_URL), no un adorno inventado aparte. */
  private drawTextDivider(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 84, y);
    ctx.lineTo(cx - 19, y);
    ctx.moveTo(cx + 19, y);
    ctx.lineTo(cx + 84, y);
    ctx.stroke();
    if (this.wheatIcon) {
      const size = 26;
      ctx.translate(cx, y);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(this.wheatIcon, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }

  private drawSocialIcon(ctx: CanvasRenderingContext2D, pos: { u: number; v: number }, color: string, kind: 'instagram' | 'facebook'): void {
    const x = PANEL_W * pos.u;
    const y = PANEL_H * pos.v;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '600 24px Cinzel, serif';
    ctx.fillText(kind === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK', x, y);
    ctx.restore();
  }

  private readonly onResize = (): void => {
    this.sizeCanvas();
    this.draw(this.lastDrawn);
  };

  private sizeCanvas(): void {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return;
    const box = c.parentElement;
    if (!box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box.clientWidth || box.offsetWidth;
    const h = box.clientHeight || box.offsetHeight;
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
    // Los tres lienzos auxiliares se reservan ACA y no la primera vez que se
    // usan: medido, reservarlos dentro de la vuelta de pagina cuesta un tiron
    // de ~120ms en el primer cuadro de la primera vuelta. Aca el coste cae en
    // la carga/resize, donde no hay nada animandose.
    this.contentLayer = this.ensureLayer(this.contentLayer, c.width, c.height);
    this.maskLayer = this.ensureLayer(this.maskLayer, c.width, c.height);
    this.shadeLayer = this.ensureLayer(this.shadeLayer, c.width, c.height);
    this.paperLayer = this.ensureLayer(this.paperLayer, c.width, c.height);
  }

  private lastDrawn = 1;
  // Transicion en curso (null = reposo, se dibuja solo `current`). Ver next()/prev().
  private transition: { leaving: number; entering: number; towardHigh: boolean } | null = null;

  private draw(frame: number): void {
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    const idx = Math.max(1, Math.min(FRAME_COUNT, Math.round(frame))) - 1;
    const bmp = this.frames[idx];
    if (!ctx || !c || !bmp) return;
    this.lastDrawn = frame;
    ctx.clearRect(0, 0, c.width, c.height);
    const scale = Math.min(c.width / bmp.width, c.height / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    const ox = (c.width - dw) / 2;
    const oy = (c.height - dh) / 2;
    ctx.drawImage(bmp, ox, oy, dw, dh);
    // Cruce de poses: encima del cuadro de destino se desvanece el de origen.
    // Solo el LIBRO -el contenido va despues, una sola vez y a opacidad plena-.
    const fu = this.fundido;
    const viejo = fu ? this.frames[Math.max(1, Math.min(FRAME_COUNT, Math.round(fu.desde))) - 1] : null;
    if (fu && viejo) {
      ctx.save();
      ctx.globalAlpha = 1 - fu.t;
      ctx.drawImage(viejo, ox, oy, dw, dh);
      ctx.restore();
    }

    // Sin condicionar a `coverOpen`: ese booleano hacia que el contenido
    // apareciera de golpe en un solo cuadro al terminar la apertura. Ahora
    // drawContent lo funde segun el cuadro (ver OPEN_FADE_LO/HI) y devuelve
    // sin dibujar nada mientras la tapa todavia esta cerrandose.
    this.drawContent(ctx, frame, ox, oy, scale);
  }

  /** Punto en coords de video -> coords reales del canvas (offset + escala del drawImage). */
  private toCanvas(p: Point, ox: number, oy: number, scale: number): Point {
    return { x: ox + p.x * scale, y: oy + p.y * scale };
  }

  private scaleQuad(q: Quad, ox: number, oy: number, scale: number): Quad {
    return q.map((p) => this.toCanvas(p, ox, oy, scale)) as Quad;
  }

  /** Rectangulo fuente que recorta `img` al centro para igualar `targetAspect` (equivalente a `object-fit: cover`) -evita estirar/deformar la foto original. */
  private static coverCropRect(img: ImageBitmap, targetAspect: number): { sx: number; sy: number; sw: number; sh: number } {
    const iw = img.width;
    const ih = img.height;
    const imgAspect = iw / ih;
    if (imgAspect > targetAspect) {
      const sw = ih * targetAspect;
      return { sx: (iw - sw) / 2, sy: 0, sw, sh: ih };
    }
    const sh = iw / targetAspect;
    return { sx: 0, sy: (ih - sh) / 2, sw: iw, sh };
  }

  /**
   * Homografia (proyeccion real, no afin ni bilineal) que mapea el cuadrado
   * unitario [0,1]x[0,1] al cuadrilatero real de la pagina -misma tecnica de
   * "corner-pin" que usa cualquier compositor de VFX para insertar contenido
   * en una superficie filmada en angulo. Formula cerrada estandar (Heckbert,
   * "Fundamentals of Texture Mapping and Image Warping", 1989) para mapear
   * un cuadrado a un cuadrilatero arbitrario: a diferencia de interpolar
   * bilinealmente las 4 esquinas (lo que se usaba antes), esto reproduce
   * exactamente lo que veria una camara real mirando esa misma superficie
   * plana, sin el efecto "en cuna" que aparece cuando el cuadrilatero no es
   * un paralelogramo (que es siempre el caso de una pagina filmada en
   * angulo real, nunca de frente).
   */
  private static quadHomography(quad: Quad): (u: number, v: number) => Point {
    const [p0, p1, p2, p3] = quad; // u,v = (0,0) (1,0) (1,1) (0,1)
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const dy3 = p0.y - p1.y + p2.y - p3.y;

    const denom = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / denom;
    const h = (dx1 * dy3 - dx3 * dy1) / denom;
    const a = p1.x - p0.x + g * p1.x;
    const b = p3.x - p0.x + h * p3.x;
    const cx = p0.x;
    const d = p1.y - p0.y + g * p1.y;
    const e = p3.y - p0.y + h * p3.y;
    const cy = p0.y;

    return (u: number, v: number): Point => {
      const wgt = g * u + h * v + 1;
      return { x: (a * u + b * v + cx) / wgt, y: (d * u + e * v + cy) / wgt };
    };
  }

  /** Proporcion ancho/alto real de un cuadrilatero (promedio de sus lados opuestos, en el mismo espacio de coordenadas que sus puntos). */
  private static quadAspect(q: Quad): number {
    const [tl, tr, br, bl] = q;
    const dist = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);
    const w = (dist(tl, tr) + dist(bl, br)) / 2;
    const h = (dist(tl, bl) + dist(tr, br)) / 2;
    return w / h;
  }

  /** Rampa lineal 0..1 entre `lo` y `hi`, recortada fuera del tramo. */
  private static ramp(v: number, lo: number, hi: number): number {
    if (hi === lo) return v >= hi ? 1 : 0;
    return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  }

  private photoPanel(page: number): HTMLCanvasElement | null {
    return this.photos[page - 1] ?? null;
  }

  /**
   * Malla de la hoja en el cuadro EXACTO que se esta mostrando. `draw()`
   * redondea el cuadro para elegir el bitmap, asi que la geometria se pide con
   * el mismo indice redondeado: interpolar entre cuadros dejaria el contenido
   * medio cuadro adelantado respecto al papel sobre el que va impreso.
   */
  private meshAt(frame: number): CurlFrame | null {
    const f = Math.round(frame);
    if (!this.curl || f < MESH_LO || f > MESH_HI) return null;
    return this.curl.frames[String(f)] ?? null;
  }

  /** Posicion en pantalla del punto (u,v) de la pagina, interpolando entre los vertices de la malla. */
  private meshPoint(pts: [number, number][], u: number, v: number, ox: number, oy: number, scale: number): Point {
    const g = this.curlGrid;
    const n = g - 1;
    const x = Math.min(n - 1e-6, Math.max(0, u * n));
    const y = Math.min(n - 1e-6, Math.max(0, v * n));
    const c = Math.floor(x);
    const r = Math.floor(y);
    const fx = x - c;
    const fy = y - r;
    const a = pts[r * g + c];
    const b = pts[r * g + c + 1];
    const d = pts[(r + 1) * g + c];
    const e = pts[(r + 1) * g + c + 1];
    const px = (a[0] * (1 - fx) + b[0] * fx) * (1 - fy) + (d[0] * (1 - fx) + e[0] * fx) * fy;
    const py = (a[1] * (1 - fx) + b[1] * fx) * (1 - fy) + (d[1] * (1 - fx) + e[1] * fx) * fy;
    return { x: ox + px * scale, y: oy + py * scale };
  }

  /**
   * true si las 4 esquinas de la celda de malla que contiene (u,v) miran a la
   * camara. Al enrollarse, tramos enteros de la hoja quedan de espaldas: ahi no
   * se dibuja nada y se deja el pixel del video tal cual. Como el papel de
   * nuestros paneles es del mismo crema que la pagina, el hueco solo se nota si
   * justo cae una letra dentro -y en esos cuadros la hoja esta casi de canto.
   */
  private meshVisible(vis: string, u: number, v: number): boolean {
    const g = this.curlGrid;
    const n = g - 1;
    const c = Math.min(n - 1, Math.max(0, Math.floor(u * n)));
    const r = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    return vis[r * g + c] === '1' && vis[r * g + c + 1] === '1' && vis[(r + 1) * g + c] === '1' && vis[(r + 1) * g + c + 1] === '1';
  }

  /**
   * Superficie sobre la que va el contenido QUIETO de cada pagina.
   *
   * La pagina derecha en reposo es la cara frontal de la hoja en el cuadro 83, y
   * la izquierda es su dorso en el 133: los dos extremos del unico tramo de
   * vuelta que existe. Dibujar ahi el contenido quieto -y no sobre un
   * cuadrilatero plano- es lo que elimina el relevo. Con el cuadrilatero las
   * cuatro esquinas coincidian exactamente, pero el interior saltaba hasta
   * 4,9 px (media 2,1) en un solo cuadro al arrancar la vuelta, y 2,5 px al
   * aterrizar la foto: la pagina renderizada ya tiene 27 grados de rizo de
   * esquina en el cuadro 83 (wrap medido del ajuste) y el contenido quieto se
   * pintaba como si fuera perfectamente plana. Usando la misma superficie en
   * los dos lados del traspaso no hay nada que empalmar.
   *
   * Devuelve null si la malla no esta cargada; ahi los llamadores caen al
   * cuadrilatero plano de siempre.
   */
  private restSurface(side: 'left' | 'right', frame: number): { pts: [number, number][]; vis: string; uv: readonly UV[] } | null {
    const m = this.curl?.frames[String(side === 'right' ? MESH_LO : MESH_HI)];
    if (!m) return null;
    let base: { pts: [number, number][]; vis: string; uv: readonly UV[] } | null;
    if (side === 'right') {
      // El texto quieto va sobre el PLANO, no sobre la malla curva: es lo que
      // deja las oraciones rectas (ver FLAT_BLEND_HI). Su visibilidad es total
      // por definicion -un plano de frente no tiene tramos de espaldas-.
      base = this.flatFront ? { pts: this.flatFront, vis: this.flatVis, uv: SHEET_TEXT_UV } : { pts: m.f, vis: m.fv, uv: SHEET_TEXT_UV };
    } else {
      base = m.b && m.bv ? { pts: m.b, vis: m.bv, uv: SHEET_PHOTO_UV } : null;
    }
    if (!base) return null;
    // Durante un cruce de poses el contenido no se funde consigo mismo: viaja
    // entre las dos. Se interpolan las POSICIONES, no las matrices -mezclar
    // homografias entrada a entrada no significa nada geometrico-.
    const fu = this.fundido;
    if (fu) {
      const a = this.poseAt(fu.desde, side);
      const b = this.poseAt(fu.hacia, side);
      if (a || b) return { pts: this.mixWarp(a, b, fu.t, base.pts, side), vis: base.vis, uv: base.uv };
      return base;
    }
    const w = this.poseAt(frame, side);
    return w ? { pts: this.applyWarp(w, base.pts, side), vis: base.vis, uv: base.uv } : base;
  }

  /**
   * Genera `flatFront`: el plano que pasa por las cuatro esquinas de la malla
   * de reposo, muestreado en la misma rejilla que ella. Al venir de una
   * homografia, cualquier recta del panel sigue siendo recta al dibujarla.
   */
  private buildFlatFront(): void {
    const m = this.curl?.frames[String(MESH_LO)];
    const g = this.curlGrid;
    if (!m || !g) return;
    const esquina = (u: number, v: number): Point => {
      const n = g - 1;
      const p = m.f[Math.round(v * n) * g + Math.round(u * n)];
      return { x: p[0], y: p[1] };
    };
    const h = AboutBookComponent.quadHomography([esquina(0, 0), esquina(1, 0), esquina(1, 1), esquina(0, 1)]);
    const pts: [number, number][] = [];
    const off: [number, number][] = [];
    for (let r = 0; r < g; r++) {
      for (let c = 0; c < g; c++) {
        const p = h(c / (g - 1), r / (g - 1));
        const q = m.f[r * g + c];
        pts.push([p.x, p.y]);
        off.push([p.x - q[0], p.y - q[1]]);
      }
    }
    this.flatFront = pts;
    this.flatOffset = off;
    this.flatVis = '1'.repeat(g * g);
  }

  /**
   * Vertices de la cara frontal para este cuadro de la vuelta.
   *
   * Lo que se desvanece es el DESPLAZAMIENTO FIJO entre el plano de reposo y la
   * malla del cuadro 83, no una mezcla hacia la malla del cuadro actual. La
   * diferencia importa: mezclando hacia la malla del momento, la desviacion
   * crece con el rizo -medido, el texto llegaba a resbalar 1,8 veces lo que se
   * mueve el propio papel, y eso se ve-. Restando un desplazamiento que se
   * apaga, la hoja conserva EXACTAMENTE la forma calibrada en todo momento y lo
   * unico que queda es un corrimiento de 13,5px como mucho que se va solo, a
   * menos de 1,7px por cuadro contra los 4-7px que ya se mueve el papel.
   *
   * En MESH_LO da el plano exacto (relevo sin salto con la hoja quieta) y desde
   * FLAT_BLEND_HI devuelve la malla tal cual, sin tocar un solo vertice.
   */
  private frontPts(mesh: CurlFrame, frame: number): [number, number][] {
    const off = this.flatOffset;
    if (!off || frame >= FLAT_BLEND_HI) return mesh.f;
    const t = (frame - MESH_LO) / (FLAT_BLEND_HI - MESH_LO);
    const u = t <= 0 ? 0 : t >= 1 ? 1 : t;
    const k = 1 - u * u * (3 - 2 * u);
    const out = (this.blendBuf ??= mesh.f.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < mesh.f.length; i++) {
      out[i][0] = mesh.f[i][0] + off[i][0] * k;
      out[i][1] = mesh.f[i][1] + off[i][1] * k;
    }
    return out;
  }

  /** Pose de esta pagina en este cuadro, o null si es la identidad y no hay nada que aplicar (ver CurlAsset.pose). */
  private poseAt(frame: number, side: 'left' | 'right'): Warp | null {
    const p = this.curl?.pose?.[String(Math.round(frame))];
    if (!p) return null;
    const w = side === 'left' ? p.l : p.r;
    if (!w) return null;
    const identidad = w[0] === 1 && w[1] === 0 && w[2] === 0 && w[3] === 0 && w[4] === 1 && w[5] === 0 && w[6] === 0 && w[7] === 0;
    return identidad ? null : w;
  }

  private applyWarp(w: Warp, pts: [number, number][], side: 'left' | 'right'): [number, number][] {
    const out = (this.poseBuf[side] ??= pts.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < pts.length; i++) {
      const p = AboutBookComponent.warpPoint(w, pts[i][0], pts[i][1]);
      out[i][0] = p.x;
      out[i][1] = p.y;
    }
    return out;
  }

  /** Un punto por el warp; `null` es la identidad. */
  private static warpPoint(w: Warp | null, x: number, y: number): Point {
    if (!w) return { x, y };
    const [a, b, c, d, e, f, g, h] = w;
    const k = 1 / (g * x + h * y + 1);
    return { x: (a * x + b * y + c) * k, y: (d * x + e * y + f) * k };
  }

  /** Superficie a medio camino entre dos poses, interpolando posiciones (ver `fundido`). */
  private mixWarp(a: Warp | null, b: Warp | null, t: number, pts: [number, number][], side: 'left' | 'right'): [number, number][] {
    const out = (this.poseBuf[side] ??= pts.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < pts.length; i++) {
      const pa = AboutBookComponent.warpPoint(a, pts[i][0], pts[i][1]);
      const pb = AboutBookComponent.warpPoint(b, pts[i][0], pts[i][1]);
      out[i][0] = pa.x + (pb.x - pa.x) * t;
      out[i][1] = pa.y + (pb.y - pa.y) * t;
    }
    return out;
  }

  /** Foto quieta de la pagina izquierda. La sombra se derrama FUERA del contenido, asi que va antes. */
  private drawRestPhoto(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement | null,
    frame: number,
    ox: number,
    oy: number,
    scale: number,
    alpha = 1,
  ): void {
    if (!img || alpha <= 0) return;
    const s = this.restSurface('left', frame);
    if (!s) {
      this.drawPanelInQuad(ctx, img, CONTENT_LEFT_QUAD, ox, oy, scale, true, alpha);
      return;
    }
    this.drawPrintShadow(ctx, this.meshCorners(s.pts, s.uv, ox, oy, scale));
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    this.drawOnMesh(ctx, img, s.pts, s.vis, s.uv, ox, oy, scale);
    ctx.restore();
  }

  /** Texto quieto de la pagina derecha. `multiply` porque la tinta absorbe luz sobre el papel. */
  private drawRestText(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement | null,
    frame: number,
    ox: number,
    oy: number,
    scale: number,
    alpha = 1,
  ): void {
    if (!img || alpha <= 0) return;
    const s = this.restSurface('right', frame);
    if (!s) {
      this.drawPanelInQuad(ctx, img, CONTENT_RIGHT_QUAD, ox, oy, scale, false, alpha, true);
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    if (alpha < 1) ctx.globalAlpha = alpha;
    this.drawOnMesh(ctx, img, s.pts, s.vis, s.uv, ox, oy, scale);
    ctx.restore();
  }

  /** El cuadrilatero (u,v) del contenido visto como un Quad, para poder reusar `quadHomography` sobre el espacio de la pagina. */
  private static uvQuad(uv: readonly UV[]): Quad {
    return uv.map((p) => ({ x: p.u, y: p.v })) as Quad;
  }

  /** Las 4 esquinas del contenido ya proyectadas por la malla (para la sombra de la copia, que es una mancha difusa y no necesita la curvatura). */
  private meshCorners(pts: [number, number][], uv: readonly UV[], ox: number, oy: number, scale: number): Quad {
    return uv.map((p) => this.meshPoint(pts, p.u, p.v, ox, oy, scale)) as Quad;
  }

  /**
   * Dibuja un panel PEGADO a la hoja: cada celda del panel se coloca donde la
   * malla dice que esta ese trozo de papel en este cuadro. Es el mismo warp por
   * celdas de `drawImageInQuad`, pero la posicion de cada vertice sale de la
   * malla medida (superficie curva real) en vez de una homografia de 4 esquinas
   * (que solo sabe describir planos).
   */
  private drawOnMesh(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement,
    pts: [number, number][],
    vis: string,
    uv: readonly UV[],
    ox: number,
    oy: number,
    scale: number,
    fillOccluded = false,
  ): void {
    const SUB = 16;
    const toUV = AboutBookComponent.quadHomography(AboutBookComponent.uvQuad(uv));
    const bleed = 0.5 / SUB;
    const w = img.width;
    const h = img.height;
    // Con `fillOccluded`, DOS PASADAS en orden de pintor: primero las celdas que
    // el propio rollo tapa y encima las que se ven. Saltarlas dejaba agujeros:
    // entre los cuadros 106 y 126 hay hasta 61 de los 169 vertices sin ninguna
    // cara visible -el 36% de la hoja-, asi que la foto entrante salia
    // acribillada, con el borde dentado del tamano de la celda. Pintarlas debajo
    // rellena el hueco con papel contiguo en vez de dejarlo en blanco.
    //
    // Solo se activa para las FOTOS. En la cara frontal, durante el cambio de
    // cara (116-119) las dos caras estan parcialmente visibles y el texto se
    // estampa despues que la foto: rellenar ahi pondria el texto saliente por
    // encima de la foto entrante.
    for (let pass = fillOccluded ? 0 : 1; pass < 2; pass++) {
      const wantVisible = pass === 1;
      for (let gy = 0; gy < SUB; gy++) {
        for (let gx = 0; gx < SUB; gx++) {
          const eu0 = Math.max(0, gx / SUB - bleed);
          const ev0 = Math.max(0, gy / SUB - bleed);
          const eu1 = Math.min(1, (gx + 1) / SUB + bleed);
          const ev1 = Math.min(1, (gy + 1) / SUB + bleed);
          const a = toUV(eu0, ev0);
          const b = toUV(eu1, ev0);
          const c = toUV(eu0, ev1);
          const d = toUV(eu1, ev1);
          const seen =
            this.meshVisible(vis, a.x, a.y) &&
            this.meshVisible(vis, b.x, b.y) &&
            this.meshVisible(vis, c.x, c.y) &&
            this.meshVisible(vis, d.x, d.y);
          if (seen !== wantVisible) continue;
          this.drawCellAffine(
            ctx,
            img,
            w * eu0,
            h * ev0,
            w * (eu1 - eu0),
            h * (ev1 - ev0),
            this.meshPoint(pts, a.x, a.y, ox, oy, scale),
            this.meshPoint(pts, b.x, b.y, ox, oy, scale),
            this.meshPoint(pts, c.x, c.y, ox, oy, scale),
          );
        }
      }
    }
  }

  private ensureLayer(cur: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement {
    const c = cur ?? document.createElement('canvas');
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c;
  }

  /** Region del canvas que toca esta composicion (todo lo demas ni se limpia ni se recorre). */
  private contentBox(mesh: CurlFrame | null, ox: number, oy: number, scale: number, main: HTMLCanvasElement): Box {
    const pts: [number, number][] = [
      ...CONTENT_LEFT_QUAD.map((p) => [p.x, p.y] as [number, number]),
      ...CONTENT_RIGHT_QUAD.map((p) => [p.x, p.y] as [number, number]),
    ];
    if (mesh) {
      pts.push(...mesh.f);
      if (mesh.b) pts.push(...mesh.b);
    }
    // Margen: la dilatacion de la mascara mas el radio de la sombra ambiente.
    const pad = (MASK_DILATE + 24) * scale;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [px, py] of pts) {
      const x = ox + px * scale;
      const y = oy + py * scale;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    x0 = Math.max(0, Math.floor(x0 - pad));
    y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(main.width, Math.ceil(x1 + pad));
    y1 = Math.min(main.height, Math.ceil(y1 + pad));
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  }

  /** Envolvente convexa (cadena monotona de Andrew) de una nube de puntos. */
  private static convexHull(pts: Point[]): Point[] {
    const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: Point, a: Point, b: Point): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const half = (src: Point[]): Point[] => {
      const out: Point[] = [];
      for (const q of src) {
        while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
        out.push(q);
      }
      out.pop();
      return out;
    };
    return [...half(p), ...half([...p].reverse())];
  }

  /**
   * Silueta opaca de la hoja en movimiento, para tapar con ella el contenido
   * que esta quieto en las paginas.
   *
   * Es la ENVOLVENTE CONVEXA de los vertices de las dos caras, no el relleno
   * celda por celda de la malla. Motivo medido sobre los cuadros reales: entre
   * el 113 y el 125 la hoja enrolla un labio que el ajuste de superficie
   * desarrollable no modela -no hay vertices ahi-, asi que el relleno por
   * celdas dejaba ese trozo sin tapar y la foto quieta se pintaba encima de la
   * hoja levantada. La envolvente si lo cubre, y sobre la pagina derecha se
   * pasa apenas unos pixeles respecto al relleno por celdas (comprobado cuadro
   * a cuadro del 90 al 115). De paso es una sola figura en vez de 288.
   *
   * Encima se traza su borde con grosor MASK_DILATE para los pocos pixeles en
   * que la silueta ajustada se queda corta contra el borde real de la hoja.
   *
   * SOLO ENTRAN LAS CARAS QUE SE VEN. Desde el cuadro 119 la cara frontal no
   * tiene ni un vertice mirando a camara -`fv` es 0 de 289, y por eso `fa` ya
   * la apaga y no se dibuja nada de ella-, pero sus vertices seguian entrando
   * en la envolvente. Sin nada visible que ajustar, la superficie se va a la
   * deriva: en el cuadro 133 llegaba a x=697, o sea 200px al otro lado del
   * lomo, y como la envolvente convexa tiene lados rectos eso metia una cuna
   * diagonal sobre la pagina derecha que borraba el arranque de cada renglon
   * del texto entrante. Medido: tapaba el 2.4% de la tinta en el cuadro 131,
   * el 15.7% en el 132 y el 38.3% en el 133.
   *
   * Una cara que no se ve no puede tapar nada, asi que se descarta. Del 83 al
   * 118 las dos caras tienen vertices visibles y la mascara sale identica a la
   * de antes -comprobado cuadro a cuadro, misma area al 100.0%-, asi que el
   * tramo donde la envolvente se valido no cambia.
   */
  private buildSheetMask(
    mesh: CurlFrame,
    ox: number,
    oy: number,
    scale: number,
    box: Box,
    main: HTMLCanvasElement,
  ): HTMLCanvasElement | null {
    this.maskLayer = this.ensureLayer(this.maskLayer, main.width, main.height);
    const m = this.maskLayer.getContext('2d');
    if (!m) return null;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalAlpha = 1;
    m.globalCompositeOperation = 'source-over';
    m.clearRect(box.x, box.y, box.w, box.h);
    m.fillStyle = '#000';
    m.strokeStyle = '#000';
    m.lineJoin = 'round';
    m.lineCap = 'round';
    m.lineWidth = MASK_DILATE * scale;
    const pts: Point[] = [];
    for (const [face, vis] of [
      [mesh.f, mesh.fv],
      [mesh.b, mesh.bv],
    ] as const) {
      if (!face || !vis?.includes('1')) continue;
      for (const [px, py] of face) pts.push({ x: ox + px * scale, y: oy + py * scale });
    }
    const h = AboutBookComponent.convexHull(pts);
    if (h.length < 3) return null;
    m.beginPath();
    m.moveTo(h[0].x, h[0].y);
    for (let i = 1; i < h.length; i++) m.lineTo(h[i].x, h[i].y);
    m.closePath();
    m.fill();
    m.stroke();
    return this.maskLayer;
  }

  /**
   * Toma la luminancia del cuadro del video como factor de sombreado. Es el
   * corazon del asunto: no simulamos la luz de la escena, la tomamos prestada
   * del pixel que ya esta ahi, y asi el contenido hereda la sombra que la hoja
   * proyecta, el rebote calido, el grano y el ruido de compresion sin una sola
   * linea de sombreado propio.
   *
   * Se lee ANTES de pintar nada nuestro: si se leyera despues, la sombra que
   * dibujamos para la copia entraria en el factor y el contenido saldria
   * oscurecido dos veces (medido: el borde de la copia caia un 32% donde la
   * pagina que la rodea solo caia un 15%).
   */
  /**
   * Copia del cuadro del video tal cual, con su alfa. Se usa como recorte: el
   * contenido no puede pintarse donde no hay papel. La malla es un ajuste, no
   * calca la hoja al pixel, asi que sin este recorte la foto de la copia
   * entrante se salia del borde de la hoja y quedaba flotando sobre el fondo.
   * Se lee ANTES de pintar nada nuestro, igual que el sombreado: en cuanto
   * estampamos algo, el alfa del canvas principal deja de ser el del papel.
   */
  private capturePaper(box: Box, main: HTMLCanvasElement): HTMLCanvasElement | null {
    this.paperLayer = this.ensureLayer(this.paperLayer, main.width, main.height);
    const p = this.paperLayer.getContext('2d');
    if (!p) return null;
    p.setTransform(1, 0, 0, 1, 0, 0);
    p.globalAlpha = 1;
    p.globalCompositeOperation = 'source-over';
    p.clearRect(box.x, box.y, box.w, box.h);
    p.drawImage(main, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    return this.paperLayer;
  }

  private captureShade(box: Box, main: HTMLCanvasElement): CanvasRenderingContext2D | null {
    this.shadeLayer = this.ensureLayer(this.shadeLayer, main.width, main.height);
    const s = this.shadeLayer.getContext('2d');
    if (!s) return null;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalAlpha = 1;
    // Base blanca: donde el video es transparente (fuera de la silueta del
    // libro) el factor queda en 1.0 y el contenido sale con su color propio,
    // en vez de multiplicarse por cero y salir negro.
    s.globalCompositeOperation = 'source-over';
    s.fillStyle = '#fff';
    s.fillRect(box.x, box.y, box.w, box.h);
    s.drawImage(main, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    // A luminancia pura: el tono calido del papel ya lo lleva nuestro propio
    // panel, multiplicar tambien por el color del video lo aplicaria dos veces.
    s.globalCompositeOperation = 'saturation';
    s.fillStyle = '#808080';
    s.fillRect(box.x, box.y, box.w, box.h);
    // Ganancia 255/SHADE_WHITE: deja el papel a plena luz en factor 1.0.
    s.globalCompositeOperation = 'color-dodge';
    s.fillStyle = `rgb(${SHADE_GAIN_LEVEL},${SHADE_GAIN_LEVEL},${SHADE_GAIN_LEVEL})`;
    s.fillRect(box.x, box.y, box.w, box.h);
    return s;
  }

  private stampShaded(ctx: CanvasRenderingContext2D, content: HTMLCanvasElement, box: Box, s: CanvasRenderingContext2D, alpha: number): void {
    if (!this.shadeLayer) return;
    s.globalCompositeOperation = 'multiply';
    s.drawImage(content, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    // Recorte a la silueta del contenido: el multiply de arriba dejo el resto
    // del recuadro con la luminancia del video, que no se debe estampar.
    // Va dentro de un clip porque `destination-in` afecta TODO el lienzo, no
    // solo la zona dibujada: sin el clip cada cuadro recorreria los ~6.4M px
    // del canvas entero en vez de los ~1.2M del recuadro.
    s.save();
    s.beginPath();
    s.rect(box.x, box.y, box.w, box.h);
    s.clip();
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(content, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    s.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.shadeLayer, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    ctx.restore();
  }

  /**
   * Composición de fotos/textos sobre el video, ya en el sistema de
   * coordenadas real del canvas.
   *
   * Con la hoja quieta se dibuja la doble página que toca, con un fundido atado
   * al cuadro para que al abrir la tapa el contenido no aparezca de golpe.
   *
   * Durante la vuelta NO hay fundidos: el contenido va impreso sobre la hoja.
   * El texto de la cara frontal y la foto de la dorsal se pegan a la malla y se
   * deforman con ella; lo que está quieto en las páginas se recorta contra la
   * silueta de esa misma hoja, así que desaparece porque LA HOJA LO TAPA, no
   * porque se desvanezca. Es lo que hace que en los dos sentidos —siguiente y
   * anterior— el contenido nunca se despegue del papel.
   */
  private drawContent(ctx: CanvasRenderingContext2D, frame: number, ox: number, oy: number, scale: number): void {
    const main = this.canvasRef()?.nativeElement;
    if (!main) return;
    const alpha = AboutBookComponent.ramp(frame, OPEN_FADE_LO, OPEN_FADE_HI);
    if (alpha <= 0) return;

    const t = this.transition;
    const f = Math.round(frame);
    // `front` es la cara de la hoja que en los cuadros bajos es la página
    // DERECHA (lleva el texto) y `back` la que en los altos es la IZQUIERDA
    // (lleva la foto). `prev()` recorre los mismos cuadros al revés, así que lo
    // único que cambia con el sentido es qué historia va en cada cara.
    const front = !t ? this.current() : t.towardHigh ? t.leaving : t.entering;
    const back = !t ? this.current() : t.towardHigh ? t.entering : t.leaving;
    const mesh = t ? this.meshAt(f) : null;

    if (!mesh) {
      // Hoja quieta: una sola doble página, sin nada que la ocluya. Sin la
      // malla cargada el relevo cae al medio del recorrido -degrada al
      // comportamiento anterior en vez de romperse.
      const cut = this.curl ? MESH_LO : (MESH_LO + MESH_HI) / 2;
      const page = !t || f < cut ? front : back;
      this.drawRestPhoto(ctx, this.photoPanel(page), f, ox, oy, scale, alpha);
      this.drawRestText(ctx, this.textPanels[page - 1] ?? null, f, ox, oy, scale, alpha);
      return;
    }

    const box = this.contentBox(mesh, ox, oy, scale, main);
    if (!box.w || !box.h) return;
    const shade = this.captureShade(box, main);
    if (!shade) return;
    const paper = this.capturePaper(box, main);
    const mask = this.buildSheetMask(mesh, ox, oy, scale, box, main);
    this.contentLayer = this.ensureLayer(this.contentLayer, main.width, main.height);
    const cl = this.contentLayer.getContext('2d');
    if (!cl) return;
    const reset = (): void => {
      cl.setTransform(1, 0, 0, 1, 0, 0);
      cl.globalAlpha = 1;
      cl.globalCompositeOperation = 'source-over';
      // El canvas principal ya pide interpolacion de alta calidad; estos
      // lienzos auxiliares nacen en 'low' y ahi el texto warpeado sale mas
      // blando -y por lo tanto mas delgado- que dibujado directo.
      cl.imageSmoothingEnabled = true;
      cl.imageSmoothingQuality = 'high';
      cl.clearRect(box.x, box.y, box.w, box.h);
    };
    const punch = (): void => {
      if (!mask) return;
      // Mismo motivo que en stampShaded: `destination-out` toca todo el lienzo
      // si no se acota con un clip.
      cl.save();
      cl.beginPath();
      cl.rect(box.x, box.y, box.w, box.h);
      cl.clip();
      cl.globalCompositeOperation = 'destination-out';
      cl.drawImage(mask, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      cl.restore();
      cl.globalCompositeOperation = 'source-over';
    };
    // Nada de lo nuestro puede quedar donde no hay papel. La malla es un ajuste
    // y sobresale de la hoja real en los tramos flojos, asi que sin esto la foto
    // de la copia entrante se salia del borde y flotaba sobre el fondo.
    const clipPaper = (): void => {
      if (!paper) return;
      cl.save();
      cl.beginPath();
      cl.rect(box.x, box.y, box.w, box.h);
      cl.clip();
      cl.globalCompositeOperation = 'destination-in';
      cl.drawImage(paper, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      cl.restore();
      cl.globalCompositeOperation = 'source-over';
    };

    const leftPhoto = this.photoPanel(front);
    const rightText = this.textPanels[back - 1] ?? null;
    const frontText = this.textPanels[front - 1] ?? null;
    const backPhoto = this.photoPanel(back);
    // La sombra de la copia entrante solo si hay copia: la pagina de cierre no
    // lleva foto, y sin esta condicion quedaba su sombra suelta sobre la pagina
    // izquierda como un rectangulo gris flotando.
    const inShadow = mesh.b && backPhoto ? AboutBookComponent.ramp(f, IN_SHADOW_LO, IN_SHADOW_HI) : 0;
    // Lo que esta QUIETO durante la vuelta -la foto de la pagina izquierda y el
    // texto que se destapa en la derecha- va sobre las mismas superficies de
    // reposo que usa `drawContent` con la hoja parada. Si aqui fueran
    // cuadrilateros planos y alli mallas (o al reves), el traspaso al empezar y
    // al terminar la vuelta volveria a saltar.
    // Ambas llevan la pose del cuadro (ver CurlAsset.pose): durante la vuelta la
    // foto que se va sigue sobre la pagina izquierda de verdad, y el texto que se
    // destapa sobre la pagina de debajo, que NO esta donde estaba la hoja.
    const restL = this.restSurface('left', f);
    const restR = this.restSurface('right', f);

    // 1) Sombras de las copias, con `multiply` sobre el cuadro. La de la copia
    //    quieta se recorta igual que ella: si no, al taparla la hoja quedaría
    //    un rectángulo oscuro flotando sobre el papel.
    if (leftPhoto || inShadow > 0) {
      reset();
      if (leftPhoto) {
        this.drawPrintShadow(cl, restL ? this.meshCorners(restL.pts, restL.uv, ox, oy, scale) : this.scaleQuad(CONTENT_LEFT_QUAD, ox, oy, scale));
      }
      punch();
      if (inShadow > 0 && mesh.b) {
        this.drawPrintShadow(cl, this.meshCorners(mesh.b, SHEET_PHOTO_UV, ox, oy, scale), inShadow);
      }
      clipPaper();
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.contentLayer, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      ctx.restore();
    }

    // 2) Las COPIAS (opacas): la que se va, quieta en la página izquierda y
    //    recortada por la silueta de la hoja, y la que entra, ya impresa en el
    //    dorso de la hoja. Van juntas en una capa que se estampa multiplicada
    //    por la luminancia del cuadro.
    reset();
    if (leftPhoto) {
      if (restL) this.drawOnMesh(cl, leftPhoto, restL.pts, restL.vis, restL.uv, ox, oy, scale);
      else this.drawImageInQuad(cl, leftPhoto, this.scaleQuad(CONTENT_LEFT_QUAD, ox, oy, scale));
    }
    punch();
    // `ba` decide cuando entra la foto del dorso (ver CurlFrame). Antes la
    // condicion era `bv.includes('1')` —una sola celda de 289— y como el warp
    // rellena las celdas ocultas, bastaba ese pixel de dorso para pintar la
    // foto ENTERA encima de la pagina. Resultado: la foto tapaba el texto
    // desde el cuadro 88, apareciendo y desapareciendo con el ruido de `bv`.
    const ba = mesh.ba ?? (mesh.bv?.includes('1') ? 1 : 0);
    if (backPhoto && mesh.b && mesh.bv && ba > 0.002) {
      cl.globalAlpha = ba;
      this.drawOnMesh(cl, backPhoto, mesh.b, mesh.bv, SHEET_PHOTO_UV, ox, oy, scale, true);
      cl.globalAlpha = 1;
    }
    clipPaper();
    this.stampShaded(ctx, this.contentLayer, box, shade, alpha);

    // 3) Los TEXTOS, aparte y con `multiply` directo sobre el cuadro.
    //    No pueden ir en la capa de arriba: alli el contenido se usa dos veces
    //    -en el multiply contra el sombreado y en el recorte `destination-in`-
    //    y eso eleva su alfa al cuadrado. Un pixel de borde de letra con
    //    cobertura 0.5 acababa en 0.25, o sea que el nucleo del trazo quedaba
    //    igual pero el borde perdia tres cuartos de su peso: las letras se
    //    veian mas delgadas y mas claras en cuanto arrancaba la vuelta.
    //    Con `multiply` el alfa se aplica UNA sola vez, y ademas es el modelo
    //    correcto: la tinta absorbe luz sobre el papel, asi que el sombreado
    //    lo pone el propio pixel de destino sin necesidad del mapa aparte.
    // `fa` apaga el texto de la hoja cuando esta se pone de canto (ver CurlFrame).
    // Se aplica DENTRO de la capa, no al estampado: los dos textos se componen
    // juntos en ella y estamparlos por separado los multiplicaria dos veces
    // sobre el mismo pixel —en los cuadros bajos la hoja todavia cubre la
    // pagina derecha y ambos caen exactamente en el mismo sitio, asi que el
    // texto saldria al doble de oscuro—. El precio es que en los 4 cuadros con
    // fa < 1 el solape que deja el bleed del warp se pinta dos veces; con la
    // hoja ya de canto y el texto a media tinta no se aprecia.
    const fa = mesh.fa ?? 1;
    const frontVisible = frontText != null && fa > 0.002 && mesh.fv.includes('1');
    if (rightText || frontVisible) {
      reset();
      if (rightText) {
        if (restR) this.drawOnMesh(cl, rightText, restR.pts, restR.vis, restR.uv, ox, oy, scale);
        else this.drawImageInQuad(cl, rightText, this.scaleQuad(CONTENT_RIGHT_QUAD, ox, oy, scale));
      }
      punch();
      if (frontVisible && frontText) {
        cl.globalAlpha = fa;
        // `frontPts` mezcla plano->malla en los primeros cuadros de la vuelta,
        // para empalmar sin salto con el texto recto de la hoja en reposo.
        this.drawOnMesh(cl, frontText, this.frontPts(mesh, f), mesh.fv, SHEET_TEXT_UV, ox, oy, scale);
        cl.globalAlpha = 1;
      }
      clipPaper();
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.contentLayer, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      ctx.restore();
    }
  }

  /**
   * Dibuja `img` en `quad` con el warp de 4 puntos, con la sombra de copia
   * impresa si corresponde.
   *
   * `ink` lo compone con `multiply` en vez de `source-over`: es lo que
   * corresponde a los paneles de TEXTO, que son tinta sobre fondo transparente
   * y no un parche opaco. Ademas de ser el modelo fisico correcto (la tinta
   * absorbe la luz del papel que tiene debajo), deja el texto quieto y el
   * texto pegado a la hoja compuestos exactamente igual, para que al arrancar
   * la vuelta el trazo no cambie de peso.
   */
  private drawPanelInQuad(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement | ImageBitmap | null,
    quad: Quad,
    ox: number,
    oy: number,
    scale: number,
    printShadow = false,
    alpha = 1,
    ink = false,
  ): void {
    if (!img || alpha <= 0) return;
    const dst = this.scaleQuad(quad, ox, oy, scale);
    // La sombra se derrama FUERA del cuadrilatero, asi que va antes del dibujo.
    if (printShadow) this.drawPrintShadow(ctx, dst);
    ctx.save();
    if (ink) ctx.globalCompositeOperation = 'multiply';
    if (alpha < 1) ctx.globalAlpha = alpha;
    this.drawImageInQuad(ctx, img, dst);
    ctx.restore();
  }

  /**
   * Warp de 4 puntos sobre canvas 2D: se subdivide el destino en una grilla
   * fina y cada celda chica se dibuja con su propia afin -pero la POSICION de
   * cada vertice de la grilla se calcula con una homografia real (ver
   * `quadHomography`), no con interpolacion bilineal de las 4 esquinas. La
   * bilineal es exacta solo si el cuadrilatero es un paralelogramo; para un
   * trapecio real de perspectiva (como la pagina del libro filmada en
   * angulo, donde el lado de arriba mide 353px y el de abajo 297px) diverge
   * de la proyeccion real de la camara y el contenido insertado se ve "en
   * cuna" -mas ancho de un lado que del otro- aunque el trapecio en si sea
   * correcto: es el mismo defecto (perspectiva incorrecta por interpolar en
   * vez de proyectar) que hacia que las texturas se deformaran en juegos de
   * PS1 antes del "perspective-correct texture mapping".
   */
  private drawImageInQuad(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement | ImageBitmap, quad: Quad): void {
    const w = img.width;
    const h = img.height;
    // Grilla en vez de una sola transformacion para todo el cuadrilatero: con
    // la perspectiva tan marcada del video (trapecios bien inclinados), una
    // unica afin sobre un area grande se ve torcida. Cada celda chica de la
    // grilla es casi plana (poca perspectiva real dentro de si misma) y una
    // afin le alcanza sin distorsion visible. Una transformacion por celda
    // -sin recortar cada una con un path (clip)- evita la operacion mas cara
    // del canvas 2D; con 60fps durante la vuelta de pagina, hacerlo con clip
    // se notaba como cuadros perdidos.
    // El costo real medido (drawImage) es insignificante incluso en 60fps
    // (~7ms de un total de ~2000ms de animacion) -no hace falta escatimar
    // celdas por rendimiento, GRID alto es practicamente gratis.
    const GRID = 16;
    const atQuad = AboutBookComponent.quadHomography(quad);
    // Las celdas se agrandan medio pixel de fuente hacia cada lado para que
    // se solapen levemente con la vecina -sin esto, el redondeo de subpixel
    // del rasterizador deja una costura de 1px entre celdas.
    const bleed = 0.5 / GRID;
    for (let gy = 0; gy < GRID; gy++) {
      const v0 = gy / GRID;
      const v1 = (gy + 1) / GRID;
      for (let gx = 0; gx < GRID; gx++) {
        const u0 = gx / GRID;
        const u1 = (gx + 1) / GRID;
        const eu0 = Math.max(0, u0 - bleed);
        const ev0 = Math.max(0, v0 - bleed);
        const eu1 = Math.min(1, u1 + bleed);
        const ev1 = Math.min(1, v1 + bleed);
        const d0 = atQuad(eu0, ev0);
        const d1 = atQuad(eu1, ev0);
        const d2 = atQuad(eu0, ev1);
        this.drawCellAffine(ctx, img, w * eu0, h * ev0, w * (eu1 - eu0), h * (ev1 - ev0), d0, d1, d2);
      }
    }
  }

  /**
   * Dibuja el rectángulo fuente (sx,sy,sw,sh) mapeado por una afín de 3
   * puntos: (sx,sy)->d0 (esquina sup. izq.), (sx+sw,sy)->d1 (sup. der.),
   * (sx,sy+sh)->d2 (inf. izq.). Sin recorte por path: `drawImage` ya limita
   * el dibujo a ese rectángulo fuente, mucho más barato que un `clip()` por
   * celda -crítico para que la vuelta de página no pierda cuadros.
   */
  private drawCellAffine(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement | ImageBitmap,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    d0: Point,
    d1: Point,
    d2: Point,
  ): void {
    if (sw <= 0 || sh <= 0) return;
    const a = (d1.x - d0.x) / sw;
    const b = (d1.y - d0.y) / sw;
    const cc = (d2.x - d0.x) / sh;
    const d = (d2.y - d0.y) / sh;
    ctx.save();
    ctx.transform(a, b, cc, d, d0.x, d0.y);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.restore();
  }

  private reduced(): boolean {
    return this.isBrowser && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  // Cuadro fisico real donde esta el libro en reposo (nunca se asume, se seguimos paso a paso).
  private physFrame = 1;

  /**
   * Salta sin animar a "frame" (no-op si ya esta ahi). Solo se usa entre
   * PAGE_REST y PAGE_TURNED: hay que volver siempre al mismo punto de partida
   * porque el video trae UN solo tramo de vuelta de pagina y hay que
   * reproducirlo otra vez.
   */
  private snapTo(frame: number): void {
    this.fundido = null;
    if (this.physFrame === frame) return;
    this.physFrame = frame;
    this.draw(frame);
  }

  /**
   * Lo mismo que `snapTo`, pero fundiendo la pose vieja sobre la nueva.
   *
   * El comentario anterior daba por hecho que el salto era imperceptible
   * porque el contenido superpuesto es el mismo en los dos extremos. El
   * contenido si, pero el LIBRO no: entre PAGE_TURNED y PAGE_REST ha pasado una
   * hoja de un taco al otro, y con ella se mueven los dos bloques de paginas,
   * el lomo, los cantos y las sombras. Medido, el corte cambia de golpe unos
   * 9900 pixeles en mas de 24 niveles -mas que el fotograma mas brusco de toda
   * la vuelta, que son 9301- justo despues de que la animacion haya frenado
   * hasta 574. Ese contraste es lo que se lee como un golpe.
   *
   * No se arregla encajando los dos cuadros: probados todos los corrimientos
   * globales, el mejor explica el 5% de la diferencia. Son dos imagenes
   * distintas del libro, y la diferencia esta repartida por todos los bordes.
   * Lo que si funciona con dos imagenes casi iguales es no cortar: se pinta el
   * cuadro de destino y se desvanece el de origen por encima. El salto deja de
   * darse en un cuadro y se reparte en ~10.
   *
   * Se cruza SOLO EL LIBRO, no el lienzo entero. Antes se fotografiaba el
   * lienzo tal cual estaba -libro y contenido juntos- y se desvanecia encima
   * del nuevo. Eso funcionaba mientras el contenido era identico en los dos
   * extremos; desde que sigue a la pagina (ver CurlAsset.pose) ya no lo es, y
   * se veian las DOS copias del texto a la vez, cada una a media opacidad y
   * separadas ~4px (~6px la foto). Medido con reloj virtual, el contraste del
   * texto caia al 65,6% a mitad del fundido y volvia: un parpadeo muy visible,
   * mientras que el del libro apenas bajaba al 92-94%. Ahora el contenido se
   * dibuja UNA vez, a opacidad plena, sobre una pose interpolada entre las dos
   * (ver `fundido` y `restSurface`): en vez de fundirse consigo mismo, se
   * desplaza.
   *
   * El orden de pintado se conserva -destino a opacidad plena, origen encima
   * desvaneciendose- para que el borde de la silueta se comporte igual que
   * antes: los cuadros del video traen alfa, y cruzarlos al reves deja que el
   * fondo de la seccion se asome por los cantos.
   *
   * La curva es un smoothstep y no una rampa recta para que el fundido no
   * arranque de golpe: lo que delata un corte es el primer instante de cambio.
   */
  private dissolveTo(frame: number, ms: number): Promise<void> {
    const c = this.canvasRef()?.nativeElement;
    const ctx = this.ctx;
    // `reduced()` incluido: quien pide menos movimiento no quiere un fundido,
    // quiere que la cosa ya este donde tiene que estar.
    if (this.physFrame === frame || !this.isBrowser || !c || !ctx || this.reduced() || ms <= 0) {
      this.snapTo(frame);
      return Promise.resolve();
    }
    const desde = this.physFrame;
    this.physFrame = frame;
    cancelAnimationFrame(this.raf);
    return this.zone.runOutsideAngular(
      () =>
        new Promise<void>((resolve) => {
          const start = performance.now();
          const tick = (now: number): void => {
            const t = Math.min(1, (now - start) / ms);
            this.fundido = t < 1 ? { desde, hacia: frame, t: t * t * (3 - 2 * t) } : null;
            this.draw(frame);
            if (t < 1) {
              this.raf = requestAnimationFrame(tick);
            } else {
              resolve();
            }
          };
          this.raf = requestAnimationFrame(tick);
        }),
    );
  }

  /**
   * Anima de una sola vez desde el cuadro fisico actual, pasando por cada
   * punto de "waypoints" en orden, hasta el ultimo. Los puntos intermedios son
   * solo coordenadas por las que cruza el movimiento -NO paradas-: toda la
   * cadena usa UNA sola curva de aceleracion/desaceleracion de principio a
   * fin. Encadenar tramos con una curva independiente cada uno frena el
   * movimiento casi a cero en cada punto intermedio -una pausa artificial que
   * no existe en el video real.
   */
  private playChain(waypoints: number[]): Promise<void> {
    // Si un cruce de poses quedo a medias -por ejemplo porque se corto su rAF-,
    // aqui deja de tener sentido: la animacion manda.
    this.fundido = null;
    const path = [this.physFrame, ...waypoints];
    const segLengths = path.slice(1).map((p, i) => Math.abs(p - path[i]));
    const totalDist = segLengths.reduce((a, b) => a + b, 0);
    const finalTarget = path[path.length - 1];

    const frameAtProgress = (progress: number): number => {
      let remaining = progress;
      for (let i = 0; i < segLengths.length; i++) {
        const len = segLengths[i];
        if (remaining <= len || i === segLengths.length - 1) {
          const segT = len === 0 ? 1 : remaining / len;
          return path[i] + (path[i + 1] - path[i]) * Math.min(1, segT);
        }
        remaining -= len;
      }
      return finalTarget;
    };

    if (!this.isBrowser || totalDist === 0 || this.reduced()) {
      this.draw(finalTarget);
      this.physFrame = finalTarget;
      return Promise.resolve();
    }

    cancelAnimationFrame(this.raf);
    const durationMs = totalDist * MS_PER_FRAME;
    const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // Fuera de la zona de Angular: cada tick solo dibuja en el canvas (no toca
    // signals), asi que no hace falta -ni conviene- disparar deteccion de
    // cambios de toda la app en cada uno de los ~60 ticks por segundo.
    return this.zone.runOutsideAngular(
      () =>
        new Promise<void>((resolve) => {
          const start = performance.now();
          const tick = (now: number): void => {
            const tt = Math.min(1, (now - start) / durationMs);
            this.draw(frameAtProgress(totalDist * ease(tt)));
            if (tt < 1) {
              this.raf = requestAnimationFrame(tick);
            } else {
              this.physFrame = finalTarget;
              resolve();
            }
          };
          this.raf = requestAnimationFrame(tick);
        }),
    );
  }

  async open(): Promise<void> {
    if (this.busy() || this.coverOpen() || !this.ready()) return;
    this.busy.set(true);
    this.lifting.set(true);
    await this.playChain([PAGE_REST]);
    this.lifting.set(false);
    this.current.set(1);
    this.coverOpen.set(true);
    this.draw(this.physFrame);
    this.busy.set(false);
  }

  async restart(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() !== LAST) return;
    this.busy.set(true);
    await this.playChain([PAGE_REST, 1]);
    this.coverOpen.set(false);
    this.current.set(1);
    this.busy.set(false);
  }

  /**
   * El rebobinado va AL FINAL, no al principio.
   *
   * El video trae un solo tramo de vuelta, asi que cada "siguiente" tiene que
   * arrancar en PAGE_REST. Rebobinando al entrar, cada repeticion pagaba ese
   * movimiento por delante: medido, desde el clic pasaban 180ms de rebobinado,
   * luego 780ms con el libro casi quieto -entre 400 y 1800 pixeles cambiando,
   * frente a los 6000-35000 de la vuelta- y solo entonces se levantaba la hoja.
   * Se leia como dos cosas separadas: un movimiento preparatorio, tres cuartos
   * de segundo de nada, y despues la accion. La pagina 1->2 no lo tenia -ahi el
   * libro ya venia en PAGE_REST y el rebobinado era un no-op- y es justo la
   * unica que se sentia bien.
   *
   * Terminando cada accion en el cuadro que SU PROPIA direccion necesita para
   * empezar, repetir "siguiente" o repetir "anterior" ya no tiene nada por
   * delante: el giro arranca al pulsar. Y el rebobinado cae pegado al
   * aterrizaje, prolongando un asentamiento que ya esta en curso -los cuadros
   * 133 a 137 mueven 2,3, 1,3 y 0,4px- y arrancando con velocidad cero, porque
   * la curva es un smoothstep. Solo CAMBIAR de direccion sigue pagando un
   * rebobinado de entrada, que con un unico tramo de vuelta es inevitable; pasa
   * de ser el caso habitual a ser el raro.
   */
  async next(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() >= LAST) return;
    this.busy.set(true);
    // No-op salvo que se venga de un "anterior": ahi el libro esta en PAGE_TURNED.
    await this.dissolveTo(PAGE_REST, SNAP_FADE_MS);
    this.transition = { leaving: this.current(), entering: this.current() + 1, towardHigh: true };
    await this.playChain([PAGE_TURNED]);
    this.transition = null;
    this.current.set(this.current() + 1);
    this.draw(this.physFrame);
    await this.dissolveTo(PAGE_REST, SNAP_FADE_MS);
    this.busy.set(false);
  }

  async prev(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() <= 1) return;
    this.busy.set(true);
    // No-op salvo que se venga de un "siguiente": ahi el libro esta en PAGE_REST.
    await this.dissolveTo(PAGE_TURNED, SNAP_FADE_MS);
    this.transition = { leaving: this.current(), entering: this.current() - 1, towardHigh: false };
    await this.playChain([PAGE_REST]);
    this.transition = null;
    this.current.set(this.current() - 1);
    this.draw(this.physFrame);
    await this.dissolveTo(PAGE_TURNED, SNAP_FADE_MS);
    this.busy.set(false);
  }

  pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  /**
   * Posición real (en px CSS, no de canvas) del link de red social sobre el
   * panel de cierre, para que el <a> real quede clickeable exactamente encima
   * de donde el ícono se dibujó -interpolación bilineal del cuadrilátero real
   * de la página derecha, igual que el resto del compositor.
   */
  socialLinkStyle(kind: 'instagram' | 'facebook'): Record<string, string> {
    const c = this.canvasRef()?.nativeElement;
    if (!c) return { display: 'none' };
    const bmp = this.frames[Math.round(PAGE_REST) - 1];
    if (!bmp) return { display: 'none' };
    const scale = Math.min(c.width / bmp.width, c.height / bmp.height);
    const ox = (c.width - bmp.width * scale) / 2;
    const oy = (c.height - bmp.height * scale) / 2;
    const pos = SOCIAL_POS[kind];
    // Va por la MISMA superficie por la que se dibuja el panel -la hoja en
    // reposo con SHEET_TEXT_UV-, no por CONTENT_RIGHT_QUAD, que es otra zona
    // distinta: con el cuadrilatero el <a> caia desplazado respecto a la
    // palabra pintada. Esta es exactamente la cadena que usa drawOnMesh:
    // (u,v) del panel -> (u,v) de la pagina -> pixel de pantalla.
    // El cuadro en el que el libro esta parado ahora mismo, no PAGE_REST: al
    // llegar a la pagina de cierre con "siguiente" el libro queda en
    // PAGE_TURNED, y la pagina derecha de ahi no es la misma hoja ni esta en la
    // misma pose que en PAGE_REST (ver CurlAsset.pose), asi que las dos
    // superficies no son identicas.
    const s = this.restSurface('right', this.physFrame);
    if (s) {
      const enPagina = AboutBookComponent.quadHomography(AboutBookComponent.uvQuad(s.uv))(pos.u, pos.v);
      const p = this.meshPoint(s.pts, enPagina.x, enPagina.y, ox, oy, scale);
      return { left: `${p.x / this.dpr}px`, top: `${p.y / this.dpr}px` };
    }
    const [tl, tr, br, bl] = this.scaleQuad(CONTENT_RIGHT_QUAD, ox, oy, scale);
    const top = { x: tl.x + (tr.x - tl.x) * pos.u, y: tl.y + (tr.y - tl.y) * pos.u };
    const bottom = { x: bl.x + (br.x - bl.x) * pos.u, y: bl.y + (br.y - bl.y) * pos.u };
    const px = (top.x + (bottom.x - top.x) * pos.v) / this.dpr;
    const py = (top.y + (bottom.y - top.y) * pos.v) / this.dpr;
    return { left: `${px}px`, top: `${py}px` };
  }
}
