import { ChangeDetectionStrategy, Component, ElementRef, NgZone, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { NgStyle, isPlatformBrowser } from '@angular/common';
import { CONTACT } from '@bolleria-ui-shared';

const FRAME_COUNT = 169;
const FRAMES_DIR = 'assets/about-book-frames';
const LAST = 7; // 1..6 = historias con foto+texto, 7 = cierre (redes sociales)

// Cuadros calibrados a mano midiendo el movimiento real (diff de pixeles) entre
// cuadros del video: 1..42 tapa abriendose; 43..50 asentando (51 en adelante ya
// es el libro abierto, real y visualmente quieto). PAGE_REST es donde TERMINA
// la apertura de la tapa; los dos extremos de la vuelta de pagina son
// GIRO_LO/GIRO_HI.
//
// PAGE_REST era el 50, y estaba DENTRO del rebote de la apertura -medido, la
// pagina todavia recorre 1,6px entre el 50 y el 56 (ver CurlAsset.pose). Como cada
// "siguiente" volvia de un tiron desde el cuadro girado hasta aca, el libro
// saltaba a una pose que todavia no habia terminado de asentarse, y se veia.
// Medido contra el 137, en pixeles que cambian mas de 24 niveles:
//   cuadro 48: 23748   50: 15238   52: 10900   55: 9986   56: 9868   60: 10209
// El 56 es el suelo de esa curva: quita el 35% del salto sin tocar nada mas. La
// pagina derecha -donde vive el texto- se mueve 0.2-0.7 px entre el 50 y el 56,
// asi que el encuadre calibrado del texto no se entera.
const PAGE_REST = 56;
/**
 * Los dos extremos del GIRO, que no son los dos reposos.
 *
 * `PAGE_REST` y `PAGE_TURNED` son donde el libro se queda parado; el giro solo
 * necesita los cuadros en los que la hoja SE MUEVE de verdad. Medido cuadro a
 * cuadro sobre el video (pixeles que cambian mas de 8 niveles respecto al
 * anterior), el suelo de ruido del render esta entre 400 y 1700:
 *
 *   ...78: 1335   79: 674   80: 606   81: 435 | 82: 1986   83: 5403   84: 9763
 *   ...136: 2955  137: 2471  138: 3206  139: 1002 | 140: 964  141: 1229  142: 1427
 *
 * O sea: el 81 es el ultimo cuadro quieto y el 139 el ultimo con movimiento
 * real; a partir del 140 el libro solo tiembla. Recorrer 56->137 metia 26
 * cuadros muertos POR DELANTE del movimiento, y con la curva de aceleracion se
 * llevaban el 44% de la duracion: medido en el navegador con reloj virtual,
 * desde el clic pasaban 771 ms sin que se moviera un solo pixel del libro, y
 * 1270 ms de los 1912 -el 53%- quedaban por debajo del suelo de ruido. Eso no
 * se lee como un movimiento lento, se lee como una pausa y despues un tiron.
 *
 * Con 81->139 la accion entera baja a 1460 ms y el hueco quieto mas largo pasa
 * de 771 ms a 10 ms.
 */
const GIRO_LO = 81;
const GIRO_HI = 139;
/**
 * La vuelta de pagina se reproduce en tiempo LINEAL, sin curva de aceleracion.
 *
 * El video ya trae la suya: arranca en 1986 px por cuadro, sube hasta 40533 y
 * cae a 1002 al asentarse. Ponerle encima un `easeInOutCubic` es aplicar dos
 * aceleraciones seguidas, y ademas descolocadas -la curva va mas rapido por el
 * medio del tramo, donde el video es moderado, y frena justo en el aterrizaje,
 * que es donde el papel va mas rapido-. Medido en el navegador, el resultado
 * era un pico de 80066 px por cada 10 ms seguido de 300 ms planos: la hoja no
 * caia, daba un latigazo y despues flotaba.
 *
 * Se probaron tres curvas sobre el mismo tramo, midiendo la animacion real:
 *
 *   lineal      0% del tiempo por debajo del suelo de ruido, arranca en 5565
 *   smoothstep  12%, arranca en 1893 y concentra el pico en el medio
 *   salida suave 16%, arranca de golpe en 12928
 *
 * Lineal es la unica sin tiempo muerto Y con el arranque mas suave a la vez,
 * porque el propio video se encarga de entrar y salir despacio. La apertura de
 * la tapa NO usa esta curva: ahi no hay fisica grabada que respetar.
 */
const TIEMPO_LINEAL = (t: number): number => t;
// Lo que queda del corte -unos 9900 px de golpe, todavia mas que el fotograma
// mas brusco de la vuelta entera, que son 9301- se reparte en un fundido en vez
// de darse en un solo cuadro. Ver `dissolveTo`.
const SNAP_FADE_MS = 180;
/**
 * La COLA de la vuelta: el rebobinado hasta la pose de partida de su propia
 * direccion, solapado con la deceleracion del giro en vez de esperar a que
 * termine.
 *
 * El adelanto tiene un TOPE DURO: el solape tiene que empezar con la cadena ya
 * FUERA de la malla (cuadros 83 a 133). Durante la cola el video se cruza entre
 * dos cuadros pero el contenido se dibuja UNA sola vez, para el cuadro de
 * destino; si el cuadro de origen todavia tuviera malla, se veria la hoja en el
 * aire con el contenido ya plano y en reposo debajo.
 *
 * Ese tope hace que el adelanto sea ASIMETRICO, y no por capricho: yendo hacia
 * delante el primer cuadro legal es el 134, y del 134 al 139 el video todavia
 * se mueve de verdad (7776, 5202, 2955, 2471 y 3206 px por cuadro), asi que la
 * cola cae dentro del aterrizaje. Yendo hacia atras el primer cuadro legal es
 * el 82, y ahi el video YA paro: por debajo del 83 no queda movimiento que
 * solapar. No es un ajuste que falte, es la geometria del tramo.
 *
 * `TAIL_MS` es CORTO a proposito. Con las dos poses fuera (ver `poseAt`) el
 * contenido ya no viaja durante el cruce, asi que la cola solo tiene que
 * disolver el libro: 10282 px, no 21656. Lo que queda de esos 10282 son sobre
 * todo los adornos impresos del video, que estan a 4,02 px entre un reposo y
 * el otro y por lo tanto se DESDOBLAN mientras dure el cruce. Contra un
 * desdoblamiento no sirve alargar el fundido -alargarlo es tenerlo mas rato en
 * pantalla-: sirve acortarlo y meterlo donde algo lo tape.
 *
 * De ahi el par (adelanto 132, duracion 65): el cruce entero cae dentro del
 * aterrizaje. Medido en el lienzo, comparando cada instante del cruce con lo
 * que el aterrizaje mueve por si solo en ese mismo instante:
 *
 *   el aterrizaje solo   9614  4066  1763  1202   586    29   225
 *   cruce de  65 ms     +2483 +1240 +1827  +865  +661     0     0   -> 5 cuadros
 *   cruce de  90 ms     +2483  +389 +1358  +695  +316 +1150  +194   -> 7 cuadros
 *   cruce de 130 ms     +2483  -416  +890  +335  +208  +356  +390   -> 9 cuadros
 *
 * Los tres mueven lo mismo en total; lo que cambia es cuanto rato esta el
 * desdoblamiento en pantalla y si le queda aterrizaje encima. Con 65 ms se
 * acaba antes de que el aterrizaje se apague, y su punta vale el 26% de la de
 * este. Con 130 se sale por detras y quedan cuatro cuadros de desdoblamiento
 * sobre un libro ya quieto.
 */
const TAIL_MS = 65;
/**
 * La cola que `playChain` conduce dentro de su PROPIO bucle de rAF. Tiene que
 * ir ahi y no en un `dissolveTo` encadenado: `this.raf` es uno solo, asi que
 * dos bucles no pueden solaparse -el segundo cancelaria al primero-.
 */
interface ChainTail {
  /** Cuadro en el que termina la accion (la pose de partida de su direccion). */
  frame: number;
  /** Duracion del cruce. */
  ms: number;
  /** Cuanto se adelanta respecto al final de la cadena. */
  leadMs: number;
  /** Se ejecuta UNA vez, al empezar el solape, dentro de la zona de Angular. */
  alEmpezar?: () => void;
  /**
   * Desplazamiento horizontal del texto quieto, en px de video, en funcion del
   * instante. Solo lo pasa "siguiente" (ver DX_TEXTO_CRUCE).
   *
   * `t` se cuenta DESDE EL ARRANQUE DEL CRUCE y es negativo antes de el. Asi
   * las tablas calibradas no dependen de cuanto dure la vuelta.
   */
  dxTexto?: (t: number) => number;
  /**
   * Desplazamiento vertical de la foto quieta, en px de video, con el mismo
   * reloj que `dxTexto` (ver DY_FOTO_CRUCE). Lo pasan los dos sentidos: uno lo
   * pone y el otro lo deshace.
   */
  dyFoto?: (t: number) => number;
}
/**
 * En que milisegundo arrancaba el cruce en la cadena EN LA QUE SE CALIBRARON las
 * dos tablas de abajo: 52 cuadros de video a 22 ms, o sea `(139-81-6) * 22`.
 *
 * Es un numero HISTORICO y va escrito a mano, no derivado de las constantes de
 * velocidad: si manana la vuelta se acelera, este sigue siendo 1144, porque es
 * el reloj contra el que se midieron aquellos valores. Solo sirve para pasar
 * las tablas de "ms desde el principio de la cadena" -como se anotaron- a "ms
 * desde el arranque del cruce", que es donde de verdad viven.
 *
 * No puede calcularse aqui a partir de GIRO_LO/GIRO_HI/MS_PER_FRAME porque esas
 * se declaran mas abajo.
 */
const CRUCE_CALIBRADO_EN_MS = 1144;
/**
 * Desplazamiento horizontal del texto durante el cruce, CALIBRADO A MANO por
 * el dueno del sitio con `apps/bolleria/public/calibrador-aterrizaje.html`, en
 * cuadros de pantalla 70, 71 y 72 del recorrido de "siguiente".
 *
 * Va indexado por MILISEGUNDO y no por cuadro de video, porque durante el cruce
 * el cuadro que se dibuja es siempre el mismo -el de destino, el 81-: un valor
 * por cuadro de video no podria distinguir estos tres instantes.
 *
 * El cero es el ARRANQUE DEL CRUCE, no el de la cadena. Se calibro en una
 * cadena de 1276 ms cuyo cruce empezaba en 1144, asi que el cuadro 70 -que caia
 * en 1166,67- queda en +22,67. Anclarlo al cruce y no al principio es lo que
 * hace que la calibracion siga valiendo si se cambia la velocidad de la vuelta
 * (ver `msPorCuadro`): con milisegundos absolutos, acortar la cadena dejaba
 * estos tres instantes fuera de ella y el texto salia corrido desde el primer
 * cuadro. El cruce, en cambio, dura TAIL_MS pase lo que pase.
 *
 * El ultimo valor SE MANTIENE, no vuelve a cero. El texto no esta haciendo un
 * gesto de ida y vuelta: esta ACOMPANANDO a la hoja. Entre el cuadro 139 y el
 * 81 los adornos impresos de la pagina derecha se corren +4,02 px a la derecha
 * -medido sub-pixel-, o sea que el papel se desplaza, y el texto tiene que
 * quedarse donde el papel lo dejo. Devolverlo al sitio de partida deshace
 * justamente lo que se calibro.
 *
 * Antes del tramo si devuelve 0: ahi todavia no ha empezado el movimiento.
 */
const DX_TEXTO_CRUCE: readonly (readonly [number, number])[] = [
  [1000 / 60 * 70 - CRUCE_CALIBRADO_EN_MS, 1],
  [1000 / 60 * 71 - CRUCE_CALIBRADO_EN_MS, 2],
  [1000 / 60 * 72 - CRUCE_CALIBRADO_EN_MS, 3],
];
/**
 * Medio cuadro de pantalla de tolerancia en los dos extremos. El valor se clavo
 * "en el cuadro 70", y ese cuadro dura de 69,5 a 70,5: sin este margen el
 * primer punto se perdia -medido, el cuadro 70 recibia 2 en vez de 1- porque el
 * instante acumulado en coma flotante cae un pelo por debajo de 1166,666...
 */
const MEDIO_CUADRO_MS = 1000 / 120;
const dxTextoCruce = (t: number, desde: number): number => {
  const P = DX_TEXTO_CRUCE;
  // Antes del tramo se sostiene lo que ya hubiera puesto, igual que la foto (ver
  // `dyFotoCruce`). Devolver 0 dejo de valer cuando el reposo alto dejo de ser
  // cero: al encadenar "anterior" y luego "siguiente", el texto saltaba de
  // -2,06 a 0 en el primer cuadro de la vuelta.
  if (t < P[0][0] - MEDIO_CUADRO_MS) return desde;
  if (t <= P[0][0]) return P[0][1];
  if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
  for (let i = 0; i < P.length - 1; i++) {
    if (t >= P[i][0] && t <= P[i + 1][0]) {
      return P[i][1] + (P[i + 1][1] - P[i][1]) * ((t - P[i][0]) / (P[i + 1][0] - P[i][0]));
    }
  }
  return P[P.length - 1][1];
};
/**
 * Desplazamiento VERTICAL de la foto durante el cruce, CALIBRADO A MANO por el
 * dueno del sitio con `apps/bolleria/public/calibrador-aterrizaje-foto.html`,
 * en cuadros de pantalla 68 a 71 del recorrido de "siguiente".
 *
 * Hermano de DX_TEXTO_CRUCE y con la misma forma -milisegundos contados DESDE
 * EL ARRANQUE DEL CRUCE-, por el mismo motivo: durante el cruce el cuadro que
 * se dibuja es siempre el 81, asi que un valor por cuadro de video no podria
 * distinguir estos cuatro instantes. El primer punto sale negativo (-10,67)
 * porque cae justo antes de que el cruce empiece.
 *
 * NO es un gesto de la animacion: es una propiedad del cuadro de REPOSO al que
 * lleva "siguiente". Medido sobre las dos poses de reposo, la foto en el cuadro
 * 81 queda 12 px de lienzo mas ARRIBA que en el 139 -bordes: arriba 12, los
 * otros tres 0-1-, y estos 5 px de video (~6 de lienzo) son la mitad de esa
 * diferencia. Por eso el ultimo valor SE MANTIENE, y por eso "anterior" tiene
 * que deshacerlo (ver `prev`).
 *
 * El primer punto vale 0 a proposito: marca donde EMPIEZA el tramo. Antes de
 * el no se devuelve 0 sino lo que ya hubiera puesto (ver `dyFotoCruce`).
 */
const DY_FOTO_CRUCE: readonly (readonly [number, number])[] = [
  [1000 / 60 * 68 - CRUCE_CALIBRADO_EN_MS, 0],
  [1000 / 60 * 69 - CRUCE_CALIBRADO_EN_MS, 1],
  [1000 / 60 * 70 - CRUCE_CALIBRADO_EN_MS, 4],
  [1000 / 60 * 71 - CRUCE_CALIBRADO_EN_MS, 5],
];
/**
 * `desde` es lo que ya estuviera aplicado cuando arranco la cadena, y es lo que
 * se devuelve ANTES del tramo. No se devuelve 0 como en el texto porque aqui se
 * veria: la foto que se va esta entera en pantalla al empezar la vuelta -79.968
 * px medidos en el cuadro 81- y saltaria 6 px en el primer cuadro.
 *
 * El relevo cae dentro del tramo, en el cuadro de video 132,5, y ahi no se ve:
 * medido, la foto que se va queda en CERO pixeles visibles desde el 128.
 */
const dyFotoCruce = (t: number, desde: number): number => {
  const P = DY_FOTO_CRUCE;
  if (t < P[0][0] - MEDIO_CUADRO_MS) return desde;
  if (t <= P[0][0]) return P[0][1];
  if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
  for (let i = 0; i < P.length - 1; i++) {
    if (t >= P[i][0] && t <= P[i + 1][0]) {
      return P[i][1] + (P[i + 1][1] - P[i][1]) * ((t - P[i][0]) / (P[i + 1][0] - P[i][0]));
    }
  }
  return P[P.length - 1][1];
};
/**
 * MOVIMIENTO DEL PAPEL entre los dos cuadros de reposo, en px de video.
 *
 * El libro descansa en DOS cuadros distintos segun por donde se llegue: el 81
 * tras "siguiente" y el 139 tras "anterior". Y el papel NO esta en el mismo
 * sitio en los dos: medido siguiendo los adornos impresos de cada pagina por
 * correlacion normalizada con ajuste subpixel, del 81 al 139 la pagina derecha
 * se corre (-5,06, +1,17) y la izquierda (-1,23, -1,34). Es el grosor de una
 * hoja del taco.
 *
 * Solo se recoge el eje que cada contenido sabe mover -x el texto, y la foto-.
 * El eje cruzado (1,17 y 1,23) se queda sin compensar: son ~1,2px contra los 5
 * que se corregian, y meterlo exige un segundo buffer por contenido.
 */
const PAPEL_81_A_139_TEXTO_X = -5.06;
const PAPEL_81_A_139_FOTO_Y = -1.34;
/**
 * Lo que el contenido tiene que llevar puesto EN CADA CUADRO DE REPOSO.
 *
 * El bajo (81) es la calibracion a mano tal cual, sin tocar. El alto (139) sale
 * de sumarle el movimiento del papel: si el papel se corre y lo impreso no, lo
 * impreso deja de estar sobre el papel, que es exactamente lo que se veia.
 *
 * Antes el reposo alto valia CERO, y ademas "anterior" no llevaba a ese valor
 * sino que DESVANECIA lo que hubiera quedado puesto. Las dos cosas juntas daban
 * el defecto: la primera vuelta atras movia algo -habia un 3 y un 5 que gastar-
 * y de la segunda en adelante ya no quedaba nada, asi que la hoja se movia y lo
 * impreso se quedaba clavado y fuera de sitio.
 */
const DX_TEXTO_REPOSO_LO = DX_TEXTO_CRUCE[DX_TEXTO_CRUCE.length - 1][1];
const DY_FOTO_REPOSO_LO = DY_FOTO_CRUCE[DY_FOTO_CRUCE.length - 1][1];
const DX_TEXTO_REPOSO_HI = DX_TEXTO_REPOSO_LO + PAPEL_81_A_139_TEXTO_X;
const DY_FOTO_REPOSO_HI = DY_FOTO_REPOSO_LO + PAPEL_81_A_139_FOTO_Y;

/**
 * Curva del cruce: derivada MAXIMA al principio y cero al final.
 *
 * Los dos sentidos la quieren, por razones distintas que apuntan al mismo
 * sitio. En "siguiente" el cruce arranca en el cuadro 133, que es justo donde
 * el aterrizaje mueve mas (9614 px por cuadro de pantalla, contra 4066 en el
 * siguiente y 1763 en el otro): entrando de golpe, la parte mas cara del
 * rebobinado cae encima de la parte mas ruidosa del aterrizaje. En "anterior"
 * no hay nada que solapar -su primer cuadro legal es el 82 y ahi el video ya
 * paro, ver CUADROS_LEAD_PREV- y lo que hace falta es que el rebobinado empiece
 * en el instante en que la hoja se detiene, sin dejar hueco.
 *
 * Antes se usaba `smoothstep` en "siguiente" para no sumarse al pico del
 * aterrizaje. Es justo al reves: lo que hay que tapar es un desdoblamiento, y
 * un desdoblamiento no se tapa repartiendolo, se tapa metiendolo debajo de
 * algo que se mueva.
 */
const COLA_SIN_SOLAPE = (t: number): number => 1 - (1 - t) * (1 - t);
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
// Aparicion del contenido al abrir la tapa. Las dos paginas NO comparten
// rampa, porque no estan haciendo lo mismo:
//
//   - La DERECHA ya esta plana en el cuadro 22. Lo unico que le queda es el
//     asentamiento del libro, que es una TRASLACION (ver ASENT_APERTURA) y por
//     lo tanto se puede compensar entera. Asi que su texto va impreso desde que
//     la tapa deja de taparlo, y viaja con la pagina en vez de aparecer sobre
//     ella. El fundido de dos cuadros no es un fundido: es para no dejar un
//     borde duro en el primero.
//   - La IZQUIERDA es la hoja que acaba de caer, y hasta el ~48 sigue bajando,
//     girando sobre el lomo: en el cuadro 38 su borde exterior esta 34px mas
//     abajo que el del lomo. Medido, ahi no hay modelo barato que la describa
//     -ajustando una afin a tres de sus adornos, el cuarto falla 12,8px en el
//     36 y 9,7 en el 38-, y las `pose` del asset se desvian 5-7px de lo que
//     realmente hace. Asi que la foto se REVELA mientras la hoja se posa: su
//     error residual (13px en el 43, 0 en el 56) y su transparencia se apagan
//     juntos, y cuando esta del todo opaca ya esta en su sitio al pixel.
//
// El 24 es el primer cuadro en el que la tapa, todavia levantada, ya no cubre
// la zona del texto. Antes de ese, el texto se pintaria sobre la tapa.
const OPEN_TEXT_LO = 24;
const OPEN_TEXT_HI = 26;
const OPEN_PHOTO_HI = 56;
// Asentamiento del libro al abrir, en pixeles del video, contra el cuadro 56:
// [dx derecha, dy derecha, dx izquierda, dy izquierda], desde ASENT_LO.
//
// Esto NO se calibro a mano. Se MIDIO siguiendo los adornos impresos de cada
// pagina -lo unico con contraste dentro del papel- por correlacion normalizada
// con ajuste parabolico al subpixel, cuadro contra cuadro VECINO y acumulando
// hacia atras desde el 56. Contra el 56 directamente la pagina izquierda no se
// deja seguir: llega tan deformada que la correlacion baja a 0,57. El metodo se
// contrasto en la pagina derecha, donde la medida directa tambien vale, y las
// dos coinciden dentro de 0,7px en 30 cuadros.
//
// La columna derecha vale desde el 22: los dos adornos seguidos, a 220px uno de
// otro, se mueven con menos de 1,1px de diferencia, asi que ahi el movimiento es
// una traslacion y esta tabla lo describe entero.
//
// La izquierda solo desde ASENT_FOTO_LO, y por eso la foto no aparece antes:
// mas abajo la dispersion entre sus adornos pasa de 10px -no es una traslacion,
// es la hoja cayendo- y ahi va a cero, que es lo unico honesto que se puede
// poner. Si alguna vez se baja OPEN_PHOTO_LO, esta tabla NO sirve para el tramo
// nuevo: hay que medir la hoja con una malla, no con un desplazamiento.
const ASENT_LO = 22;
const ASENT_FOTO_LO = 43;
// La foto no puede aparecer antes de que su pagina se sepa describir: sale de
// aqui, y no de un numero suelto, para que las dos cosas no puedan separarse.
const OPEN_PHOTO_LO = ASENT_FOTO_LO;
const ASENT_APERTURA: readonly (readonly [number, number, number, number])[] = [
  [-56.7, 8.87, 0, 0], // 22
  [-52.96, 8.53, 0, 0], // 23
  [-49.57, 8.18, 0, 0], // 24
  [-46.41, 7.89, 0, 0], // 25
  [-43.26, 7.5, 0, 0], // 26
  [-40.09, 7.07, 0, 0], // 27
  [-37.06, 6.8, 0, 0], // 28
  [-34.17, 6.37, 0, 0], // 29
  [-31.23, 5.99, 0, 0], // 30
  [-28.37, 5.59, 0, 0], // 31
  [-25.92, 5.16, 0, 0], // 32
  [-23.63, 4.64, 0, 0], // 33
  [-21.32, 4.15, 0, 0], // 34
  [-19.08, 3.82, 0, 0], // 35
  [-17.1, 3.5, 0, 0], // 36
  [-15.12, 3.16, 0, 0], // 37
  [-13.24, 2.92, 0, 0], // 38
  [-11.43, 2.58, 0, 0], // 39
  [-9.77, 2.32, 0, 0], // 40
  [-8.24, 2.05, 0, 0], // 41
  [-6.8, 1.78, 0, 0], // 42
  [-4.26, 1.06, -8.42, -7.45], // 43
  [-3.23, 0.88, -6.83, -6.01], // 44
  [-2.22, 0.65, -5.51, -4.91], // 45
  [-1.4, 0.49, -4.15, -3.88], // 46
  [-0.68, 0.37, -3, -3.05], // 47
  [-0.13, 0.29, -2.04, -2.43], // 48
  [0.25, 0.16, -1.15, -1.93], // 49
  [0.43, 0.08, -0.49, -1.42], // 50
  [0.4, 0.05, -0.24, -1.03], // 51
  [0.35, 0.02, -0.15, -0.69], // 52
  [0.19, 0, -0.09, -0.44], // 53
  [0.05, 0.02, -0.03, -0.12], // 54
  [0.01, 0.02, 0, 0], // 55
  [0, 0, 0, 0], // 56
];
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
// Zona de la pagina donde va la copia, calibrada a mano sobre la hoja del
// cuadro 133 (calibrador-foto.html). Esta ventana y la malla `b` del asset son
// UNA SOLA cosa: `b` es la HOJA -no la foto- y esto es el recuadro de esa hoja
// donde se imprime. Cambiar uno sin el otro descuadra la copia; ya paso: al
// convertir la calibracion por un rectangulo que no era ninguno de los dos, las
// dos ventanas se encadenaron y la foto salio al 84% de largo -70% de
// superficie- y corrida 42 px de donde el usuario la habia puesto.
//
// Manda tambien sobre la foto QUIETA de la pagina izquierda, que se dibuja
// sobre esta misma malla del 133 (ver `restSurface`): por eso la copia aterriza
// justo donde se queda, sin relevo.
const SHEET_PHOTO_UV: [UV, UV, UV, UV] = [
  { u: 0.17633, v: 0.06671 },
  { u: 0.94096, v: 0.1376 },
  { u: 0.93282, v: 0.93409 },
  { u: 0.18047, v: 0.89216 },
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
// Sellado fino entre celdas contiguas del relleno: solo cierra el dentado del
// tamano de celda, no ensancha la silueta. Es lo unico que engorda la silueta
// de `buildSheetMask`; la dilatacion del borde que hubo aqui se quito porque
// adelantaba el recorte por el canto que avanza y eso se leia como un eco.
const MASK_SEAM = 2;
/**
 * Por donde corta la hoja a la foto QUIETA de la pagina izquierda, cuadro a
 * cuadro. Una recta por cuadro, en pixeles de video: `[ax, ay, bx, by, lado]`,
 * donde `lado` (+1/-1) dice cual semiplano se CONSERVA -el que apunta la
 * normal (-dy, dx) * lado-.
 *
 * Esto NO sale de ninguna malla: lo calibro el usuario a mano, cuadro por
 * cuadro, con `calibrador-corte.html`. Y es a proposito. Las dos mallas de
 * contenido del asset -`f` para el texto, `b` para la foto- son dos ajustes
 * independientes de la MISMA hoja que discrepan entre 65 y 290 px, y ninguna
 * de las dos esta calibrada en todo el recorrido: `f` es de fiar del 104 al
 * 118 y se desparrama hasta x=697 a partir del 119; `b` solo del 116 al 133.
 * Derivar de ellas la silueta que tapa la foto dio las dos caras del mismo
 * fallo -la foto asomando POR ENCIMA de la hoja, y el corte recto adelantado
 * que se comia la foto antes de que la hoja llegara-. La recta calibrada es
 * geometria pura por cuadro: no acumula, no depende del sentido de la vuelta
 * y no puede desincronizarse de nada.
 *
 * El indice 0 es el cuadro CORTE_LO. Entre cuadros se interpolan los dos
 * extremos: el compositor dibuja con cuadro fraccionario a 60 fps y sin
 * interpolar la recta iria a saltos de 45 ms.
 *
 * La primera fila -el 106- es la recta de fabrica del calibrador, la que el
 * usuario no llego a tocar. Cae a la derecha del borde de la foto (x=462), o
 * sea que no borra nada; esta aqui para que la entrada del corte en el 107 sea
 * un barrido y no un salto. La ultima -el 127- ya pasa por debajo de la foto
 * entera, asi que de ahi en adelante se mantiene y la foto queda tapada del
 * todo, que es justo lo que hace la hoja ya posada.
 */
const CORTE_LO = 106;
const CORTE_FOTO: readonly (readonly [number, number, number, number, number])[] = [
  [478, 170, 508, 570, 1],
  [383.08, 186.24, 501.54, 557.94, 1],
  [378.46, 186.24, 496.92, 557.94, 1],
  [373.85, 187.01, 492.31, 558.71, 1],
  [364.62, 190.85, 490.77, 560.25, 1],
  [354.62, 193.93, 485.38, 561.79, 1],
  [346.92, 199.32, 477.69, 567.17, 1],
  [339.23, 203.94, 470, 571.79, 1],
  [327.69, 205.48, 469.23, 572.56, 1],
  [316.15, 208.55, 460.77, 572.56, 1],
  [302.31, 212.4, 449.23, 573.33, 1],
  [290, 213.94, 436.92, 574.87, 1],
  [278.46, 220.87, 425.38, 581.79, 1],
  [260, 230.1, 417.69, 584.1, 1],
  [242.31, 237.03, 406.15, 584.87, 1],
  [226.15, 247.03, 400, 592.57, 1],
  [206.92, 257.04, 386.15, 599.5, 1],
  [188.46, 267.81, 373.08, 606.42, 1],
  [163.85, 289.36, 369.23, 616.43, 1],
  [96.92, 382.48, 406.15, 556.4, 1],
  [73.85, 475.59, 417.69, 506.38, 1],
  [66.15, 523.31, 410, 554.09, 1],
];
// Duracion proporcional a la distancia real recorrida (no un tiempo fijo por
// boton) -> la velocidad se siente igual sin importar desde que cuadro se
// arranque, y nunca hay que "adivinar" cuanto tarda cada tramo.
//
// 14 y no 22: la vuelta entera pasa de 1276 ms a 812, elegido por el dueno del
// sitio comparando las cinco velocidades en vivo. La razon no es el ritmo sino
// que se noten menos los defectos que quedan en el giro -cuanto menos rato en
// pantalla, menos ocasion de mirarlos-. 812 ms sigue estando en el rango de los
// lectores de libros reales, que rondan los 600-700.
//
// A esta cadencia se muestran 71 imagenes por segundo y la pantalla da 60, asi
// que algunos fotogramas del asset no se llegan a ver. No es un defecto: cada
// cuadro dibujado sigue siendo un fotograma entero (ver `draw`).
//
// Las dos tablas calibradas NO se ven afectadas por este numero: van ancladas
// al arranque del cruce (ver DX_TEXTO_CRUCE), no a un milisegundo de la cadena.
const MS_PER_FRAME = 14;
/**
 * Adelanto de la cola en cada sentido (ver TAIL_MS). No son numeros elegidos:
 * cada uno es la distancia desde el final de su cadena hasta el cuadro mas
 * pronto en que la cola puede arrancar sin que el contenido salte al pasar de
 * la rama de malla a la de reposo.
 *
 * Ese salto esta medido cuadro a cuadro, renderizando el mismo cuadro por las
 * dos ramas (px que cambian mas de 24 niveles):
 *
 *   126: 61744   128: 49322   130: 34040   131: 27215   132: 12074
 *   133:  2225   134:     0   135:     0
 *
 * O sea que a partir del 134 las dos ramas dibujan exactamente lo mismo, y en
 * el 133 se diferencian en 2225 px -la curvatura que le queda a la hoja-. Vale
 * la pena pagarlos: adelantar del 134 al 133 duplica el movimiento del propio
 * aterrizaje disponible para tapar el rebobinado (11297 px por cuadro de
 * pantalla en el 133 contra 5795 en el 134). Del 132 hacia atras ya no: 12074
 * px de salto es mas que todo lo que cuesta el rebobinado entero.
 *
 * Van en CUADROS y no en milisegundos: lo que esta medido arriba es un cuadro
 * de video -el 133-, no un instante. Los milisegundos salen de multiplicar por
 * la velocidad vigente en cada llamada (ver `msPorCuadro`), asi el cruce sigue
 * arrancando en el 133 aunque la vuelta se acelere.
 *
 * Van aqui y no junto a TAIL_MS porque necesitan MESH_LO/MESH_HI/GIRO_*.
 */
const CUADROS_LEAD_NEXT = GIRO_HI - MESH_HI;
const CUADROS_LEAD_PREV = MESH_LO - 1 - GIRO_LO;

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

/** Los siete numeros de arriba, mas el giro, para una pagina concreta. */
interface AjusteTexto {
  /** Cuerpo de letra en px del panel. */
  font: number;
  /** Ancho de columna: donde corta el reparto en renglones. */
  measure: number;
  /** Interlineado y aire entre parrafos, en multiplos del cuerpo. */
  line: number;
  para: number;
  /** Alto reservado para la espiga divisoria. */
  divider: number;
  /** Centro del bloque dentro del panel. */
  u: number;
  v: number;
  /** Giro del bloque sobre su propio centro, en grados. */
  giro: number;
}
const TEXTO_BASE: AjusteTexto = {
  font: STORY_FONT,
  measure: STORY_MEASURE,
  line: STORY_LINE,
  para: STORY_PARA,
  divider: STORY_DIVIDER_H,
  u: PAGE_CENTER_U,
  v: PAGE_CENTER_V,
  giro: 0,
};

/**
 * Los valores de cada pagina, calibrados a mano UNA POR UNA por el dueno del
 * sitio con `apps/bolleria/public/calibrador-texto.html`, mirando el render.
 *
 * Antes esto era una tabla de EXCEPCIONES con una sola fila, porque `TEXTO_BASE`
 * salia de una busqueda automatica equilibrada sobre las 7 a la vez y solo la 4
 * se salia. Ya no: las siete estan calibradas y las siete se apartan de esa
 * base, asi que ahora la fila por pagina es lo honesto. `TEXTO_BASE` se queda
 * con lo que de verdad sigue siendo comun -interlineado y aire entre parrafos-
 * y como red de seguridad si algun dia se anade una pagina sin calibrar.
 *
 * Que el cuerpo suba de 48 a 55 no es un capricho de escala: el optimo
 * automatico estaba calculado para no rozar los dibujos de las esquinas en
 * NINGUNA de las siete, o sea que lo mandaba la pagina mas apretada y las
 * demas quedaban chicas de mas.
 *
 * LA TIPOGRAFIA ES LA MISMA EN TODAS MENOS EN LA 4. El calibrador propone en
 * cada pagina el maximo cuerpo que esa pagina admite, y eso da uno distinto por
 * hoja -55, 56, 58, 61-; pero el libro se lee de corrido y ahi la letra cambiaba
 * de tamano al pasar de pagina. Se unifico en el valor de la PAGINA 1
 * (`TEXTO_COMUN`), y lo que sigue siendo propio de cada una es donde se apoya
 * el bloque -u, v- y cuanto se inclina para acompanar al papel.
 *
 * Por eso de cada pasada del calibrador se toman SOLO `u`, `v` y `giro`. El
 * cuerpo que propone se descarta a proposito, y no por descuido: subirlo a 56
 * haria que la 1 y la 3 -que ya estan en su limite- rocen los dibujos de las
 * esquinas.
 *
 * La 4 es la excepcion, por lo de siempre: es la unica historia con DOS
 * parrafos y su bloque es el mas alto del libro. Con el cuerpo comun no le
 * cabria, asi que se queda en 45/469.
 *
 * En la 7 -la de cierre- `v` NO coloca el bloque: ahi la altura sale de la
 * franja que queda libre por encima de los enlaces de redes, que son <a> reales
 * del DOM y no se pueden mover (ver `renderTextPanel` y SOCIAL_POS). Su `v`
 * solo marca el eje del giro, y por eso vale 0.3484 y no algo cercano al medio.
 */
const TEXTO_COMUN = { font: 55, measure: 575, divider: 39 } as const;
const TEXTO_POR_PAGINA: Readonly<Record<number, Partial<AjusteTexto>>> = {
  1: { ...TEXTO_COMUN, u: 0.5027, v: 0.4638, giro: -0.42 },
  2: { ...TEXTO_COMUN, u: 0.5107, v: 0.4695, giro: 0.97 },
  3: { ...TEXTO_COMUN, u: 0.4969, v: 0.5229, giro: -0.31 },
  4: { font: 45, measure: 469, divider: 32, u: 0.5114, v: 0.5306, giro: -0.34 },
  5: { ...TEXTO_COMUN, u: 0.5008, v: 0.5163, giro: -0.24 },
  6: { ...TEXTO_COMUN, u: 0.4839, v: 0.4716, giro: -0.3 },
  7: { ...TEXTO_COMUN, u: 0.5246, v: 0.3484, giro: -0.75 },
};

const ajusteTexto = (page: number): AjusteTexto => ({ ...TEXTO_BASE, ...(TEXTO_POR_PAGINA[page] ?? {}) });

// --- La MARCA impresa en la pagina izquierda de la de cierre. Es un colofon:
// el sello con el que se cierra el libro, no un logo pegado sobre una foto.
//
// Se compone con `multiply` y SIN sombra proyectada, al contrario que las
// fotos: aquello son copias apoyadas sobre la pagina y esto es tinta absorbida
// por el papel. Es la misma razon por la que los textos van con `multiply` (ver
// el paso 3 de drawContent), y ademas es lo que deja que el grano y el
// degradado de la pagina se vean A TRAVES del trazo.
const LOGO_URL = 'assets/logo-clean.webp';
const LOGO_PAGE = LAST;
const LOGO_LINE = 'Recetario Artesanal';
// Fraccion del ancho del panel que ocupa la marca. En un colofon el sello va
// suelto, con aire alrededor: llenar la caja lo convierte en una etiqueta.
const LOGO_ANCHO = 0.62;
// Centro OPTICO, no geometrico: un bloque centrado por calculo se lee como
// caido hacia abajo, y mas cuando lleva una linea de texto colgando debajo.
// El alza es CHICA -1,5% y no el 4% habitual- porque la perspectiva de la
// pagina ya regala aire por debajo: el borde inferior esta mas cerca de la
// camara y ocupa mas pixeles, asi que un alza normal deja la marca visiblemente
// arriba en pantalla aunque en el papel este centrada.
const LOGO_CENTRO_V = 0.485;

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
// Posicion relativa (0..1 dentro del panel de cierre) del CENTRO de cada boton
// de red, usada tanto para dibujarlos como para ubicar encima los <a> reales
// que los hacen clickeables (ver socialLinkStyle).
//
// La separacion (0.13) sale de las medidas de abajo: con los 0.11 de cuando
// esto eran dos palabras sueltas, dos pildoras de 68 de alto quedaban a 22
// unidades de panel -unos 9px en pantalla-, tocandose casi. Con 0.13 respiran.
const SOCIAL_POS = { instagram: { u: PAGE_CENTER_U, v: 0.62 }, facebook: { u: PAGE_CENTER_U, v: 0.75 } };

/**
 * El boton de red, en unidades del panel (700x820). No hay medidas en pixeles
 * de pantalla: se dibuja en el mismo lienzo que la frase de cierre y se estampa
 * con ella, asi que hereda de balde la perspectiva, la curvatura, la textura y
 * la luz del papel. Es lo que lo hace parte de la impresion y no algo pegado
 * encima -que es justo lo que fallaba con el boton hecho de HTML.
 *
 * El ancho es holgadamente menor que la columna de texto (575) para que el
 * boton no compita con la frase de cierre que tiene encima.
 */
const SOCIAL_BTN = {
  w: 304,
  h: 60,
  r: 30,
  /** Lado del glifo y aire entre glifo y palabra. */
  icono: 27,
  gap: 13,
  /** Cuerpo de la palabra y separacion entre letras (el aire de versalita del sitio). */
  font: 22,
  track: 3,
} as const;
/**
 * Cuanto mas alta es el area pulsable que el cajetin dibujado.
 *
 * Medido en un movil de 390px: ahi el libro entero mide 342px y el boton baja a
 * 42x8px, que con el dedo es casi imposible de acertar. El area crece la mitad
 * de su alto, que es lo que cabe en el aire entre los dos cajetines (106.6
 * unidades de panel entre centros, 90 de area: quedan 16.6 sin tocarse). No
 * puede crecer mas sin que el area de Facebook empiece a robarle pulsaciones a
 * la de Instagram.
 */
const SOCIAL_HIT_ALTO = 1.5;

/**
 * Los glifos oficiales de cada red, tomados de Phosphor Icons -el paquete
 * @ng-icons ya instalado en el workspace-, no redibujados a mano. Vienen en un
 * lienzo de 256x256; `drawSocialGlyph` los escala.
 *
 * Se usa la variante de CONTORNO y no la maciza. Medido en pantalla, el glifo
 * macizo a este tamano -unos 10px reales- se empastaba: la camara de Instagram
 * quedaba en un cuadrado dorado y la f de Facebook en un disco, porque sus
 * huecos caen por debajo del pixel. El contorno ademas comparte grosor de linea
 * con el filete del cajetin, que es lo que hace que los dos se lean como una
 * sola pieza impresa.
 */
type SocialKind = 'instagram' | 'facebook';

const SOCIAL_GLYPH: Readonly<Record<SocialKind, string>> = {
  instagram:
    'M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z',
  facebook:
    'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm8,191.63V152h24a8,8,0,0,0,0-16H136V112a16,16,0,0,1,16-16h16a8,8,0,0,0,0-16H152a32,32,0,0,0-32,32v24H96a8,8,0,0,0,0,16h24v63.63a88,88,0,1,1,16,0Z',
};

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
  /** Boton de red sobre el que esta el puntero (o el foco), si hay alguno. */
  private readonly socialHover = signal<SocialKind | null>(null);

  /**
   * Marca o desmarca un boton de red y repinta.
   *
   * El boton esta dibujado DENTRO de la hoja, asi que no puede responder al
   * puntero con CSS: probado, el resplandor de una capa HTML encima sale
   * rectangular y sin la inclinacion del papel, y se ve pegado. Lo que se
   * cambia es la pagina entera por su version con ese cajetin marcado, que es
   * la unica manera de que la respuesta ocurra en la tinta y no sobre ella.
   */
  marcaSocial(kind: SocialKind | null): void {
    if (this.socialHover() === kind) return;
    this.socialHover.set(kind);
    if (this.ready()) this.draw(this.lastDrawn);
  }

  /** La pagina `page`, en su version marcada si toca. */
  private panelDeTexto(page: number): HTMLCanvasElement | null {
    const marcado = this.socialHover();
    if (page === LAST && marcado) return this.socialPanels[marcado] ?? this.textPanels[page - 1] ?? null;
    return this.textPanels[page - 1] ?? null;
  }

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
  /** Buffer para `conDxTexto`, y el desplazamiento vigente (ver DX_TEXTO_CRUCE). */
  private dxBuf: [number, number][] | null = null;
  private textoDx = 0;
  /** Lo mismo para la foto, en vertical (ver DY_FOTO_CRUCE). */
  private dyBuf: [number, number][] | null = null;
  private fotoDy = 0;
  /**
   * Velocidad de la vuelta, en ms por cuadro de video. Arranca en MS_PER_FRAME
   * y es un CAMPO y no la constante para poder probar otra sin recompilar: en
   * el build de desarrollo basta con
   * `ng.getComponent(document.querySelector('bol-about-book')).msPorCuadro = 11`
   * desde la consola. Asi se eligio el valor actual, comparando en vivo.
   *
   * Todo lo que depende del tiempo de la cadena sale de aqui -duracion y
   * adelanto de la cola-, para que al cambiarla el cruce siga arrancando en el
   * mismo CUADRO y no en el mismo milisegundo. Las dos tablas calibradas no
   * dependen de ella: van ancladas al arranque del cruce (ver DX_TEXTO_CRUCE).
   */
  private msPorCuadro = MS_PER_FRAME;
  private poseBuf: Record<'left' | 'right', [number, number][] | null> = { left: null, right: null };
  // Tres lienzos auxiliares del tamaño del canvas, reutilizados cuadro a
  // cuadro (crear un canvas por cuadro seria basura para el GC en pleno 45fps):
  // `contentLayer` junta todo lo que dibujamos nosotros, `maskLayer` la silueta
  // de la hoja que tapa lo que esta quieto, y `shadeLayer` la luminancia del
  // propio video por la que se multiplica el resultado.
  private contentLayer: HTMLCanvasElement | null = null;
  private maskLayer: HTMLCanvasElement | null = null;
  private acumLayer: HTMLCanvasElement | null = null;
  private acumClave: string | null = null;
  private acumFrame = 0;
  /** Semiplano calibrado que tapa la foto quieta (ver CORTE_FOTO). */
  private corteLayer: HTMLCanvasElement | null = null;
  private shadeLayer: HTMLCanvasElement | null = null;
  private paperLayer: HTMLCanvasElement | null = null;
  // La foto entrante se compone aparte para poder recortarla por el dorso antes
  // de juntarla con el resto (ver `buildBackMask`).
  private backLayer: HTMLCanvasElement | null = null;
  private backMaskLayer: HTMLCanvasElement | null = null;
  // Cruce de poses en curso (null = no hay ninguno). `t` va de 0 a 1 ya
  // suavizado. Mientras esta puesto, `draw` cruza los dos cuadros del video y
  // `restSurface` interpola las dos poses, para que el contenido se DESPLACE en
  // vez de fundirse consigo mismo (ver `dissolveTo`).
  private fundido: { desde: number; hacia: number; t: number } | null = null;
  // Buferes de la malla interpolada (ver `lerpMesh`): 289 vertices por cara,
  // reconstruidos en cada tick, asi que no se reservan cada vez.
  private meshBuf: CurlFrame | null = null;
  private meshBufF: [number, number][] | null = null;
  private meshBufB: [number, number][] | null = null;
  private wheatIcon: HTMLImageElement | null = null;
  /** La marca cruda, y el panel ya compuesto con ella (ver renderLogoPanel). */
  private logoArt: ImageBitmap | null = null;
  private logo: HTMLCanvasElement | null = null;
  /**
   * Buffer del desplazamiento de apertura (ver ASENT_APERTURA). Uno por lado:
   * los dos se piden dentro del mismo dibujo, y compartirlo dejaria al segundo
   * pisando lo que lee el primero -el mismo motivo por el que `conDyFoto` no
   * reusa el de `conDxTexto`-.
   */
  private asentBuf: Record<'left' | 'right', [number, number][] | null> = { left: null, right: null };
  private textPanels: HTMLCanvasElement[] = [];
  /** La pagina de cierre repintada con uno u otro boton marcado. Ver `marcaSocial`. */
  private socialPanels: Record<'instagram' | 'facebook', HTMLCanvasElement | null> = { instagram: null, facebook: null };
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private raf = 0;

  constructor() {
    if (this.isBrowser) this.arrancarCuandoSeAcerque();
  }

  /**
   * El libro NO se descarga al abrir la pagina, sino cuando el visitante se
   * acerca a el.
   *
   * `boot()` pide de golpe los 169 cuadros del libro mas las fotos: 170
   * peticiones y unos 6 MB. Al lanzarse desde el constructor eso ocurria a la
   * vez que el hero pedia los suyos, y en 4G medido el libro se llevaba el
   * 79 % de la linea durante los primeros catorce segundos — el primer cuadro
   * del hero se pedia a los 4,5 s y no llegaba hasta los 17,2 s. Resultado: se
   * recorria toda la portada sin animacion, que es exactamente el sintoma de
   * "las imagenes cargan y las animaciones salen completamente perdidas".
   *
   * El libro esta a unas ocho pantallas de scroll del hero, asi que no hay
   * ningun motivo para competir con el. Con `rootMargin` de dos pantallas
   * empieza a cargar bastante antes de asomar y llega listo; hasta entonces su
   * canvas ya estaba invisible por diseño (`.is-ready`).
   */
  private arrancarCuandoSeAcerque(): void {
    // Sin IntersectionObserver (o si algo falla) se carga igual, como antes:
    // vale mas un arranque temprano que un libro que no llega nunca.
    if (typeof IntersectionObserver === 'undefined') {
      void this.boot();
      return;
    }
    queueMicrotask(() => {
      const el = this.canvasRef?.()?.nativeElement;
      if (!el) {
        void this.boot();
        return;
      }
      const io = new IntersectionObserver(
        (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          io.disconnect();
          void this.boot();
        },
        // Cuatro pantallas de antelacion, no dos: el hero mide 700vh, asi que
        // el libro esta a unas ocho pantallas del inicio y con un margen corto
        // la peticion salia demasiado tarde —medido: entraba en pantalla a los
        // 15,8 s y todavia no habia cargado—. Con 400% empieza a bajar cuando
        // el visitante va por la mitad del hero, que para entonces ya tiene sus
        // cuadros y no compite por la linea.
        { rootMargin: '400% 0px' },
      );
      io.observe(el);
    });
  }

  private async boot(): Promise<void> {
    await Promise.all([
      ...Array.from({ length: FRAME_COUNT }, (_, i) => this.loadFrame(i)),
      ...STORIES.map((s, i) => this.loadPhoto(i, s.photo)),
      this.loadWheatIcon(),
      this.loadLogo(),
      this.loadCurl(),
      this.prepareFonts(),
    ]);
    this.photos = this.rawPhotos.map((p) => (p ? this.renderPhotoPanel(p) : null));
    this.textPanels = STORIES.map((s, i) => this.renderTextPanel(s, i === LAST - 1, i + 1));
    // La pagina de cierre se pinta ademas con cada boton resaltado. Son dos
    // lienzos mas -no hay forma de "encender" un trozo de un bitmap ya
    // estampado- y se cambian enteros al pasar el puntero (ver marcaSocial).
    const cierre = STORIES[LAST - 1];
    this.socialPanels = {
      instagram: this.renderTextPanel(cierre, true, LAST, 'instagram'),
      facebook: this.renderTextPanel(cierre, true, LAST, 'facebook'),
    };
    // Despues de `prepareFonts`: el panel se compone UNA sola vez, asi que una
    // familia que no este lista en este instante se queda de reemplazo para
    // siempre (mismo motivo que los paneles de texto).
    this.logo = this.logoArt ? this.renderLogoPanel(this.logoArt) : null;
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

  private async loadLogo(): Promise<void> {
    try {
      const res = await fetch(LOGO_URL);
      this.logoArt = await createImageBitmap(await res.blob());
    } catch {
      // se ignora: sin marca, la pagina de cierre queda como estaba -en blanco-
      this.logoArt = null;
    }
  }

  private async loadCurl(): Promise<void> {
    try {
      const res = await fetch(CURL_URL);
      const data = (await res.json()) as CurlAsset;
      if (!data?.frames || !data?.grid?.[0]) return;
      this.curl = data;
      this.curlGrid = data.grid[0];
      for (const m of Object.values(data.frames)) {
        if (m.bv) m.bv = this.limpiaVisibilidad(m.bv);
      }
      this.buildFlatFront();
    } catch {
      // se ignora: sin malla, drawContent deja el contenido quieto en su pagina
    }
  }

  /**
   * Quita el RUIDO de `bv`: vertices sueltos que dicen mirar al lado contrario
   * que sus ocho vecinos, o al reves. Una superficie desarrollable es suave, asi
   * que un vertice que se lleva la contraria a todo su entorno no es geometria,
   * es error de medida.
   *
   * Por que importa tanto un vertice: una celda solo cuenta como visible si sus
   * CUATRO vertices lo son, de modo que un unico bit erroneo abre un agujero de
   * 2x2 celdas. En los cuadros 121 y 123 hay dos de esos alineados en la misma
   * columna -filas 5 y 6, columna 9-, y juntos abren una FRANJA que partia la
   * foto entrante por la mitad. Es el "se parte en tres" que se veia.
   *
   * Que no es sospecha: desde el cuadro 117 las 256 celdas de `b` tienen area
   * con signo positiva, o sea que la superficie esta entera de cara. Un vertice
   * de espaldas ahi dentro no puede existir.
   *
   * Se corrige por dos criterios, los dos SIN umbral que ajustar, porque un
   * umbral de mayoria acaba corriendo las fronteras de verdad -probado: con
   * "toda la vecindad menos uno" el cuadro 119, cuya frontera es real y ocupa
   * media malla, perdia un vertice de ella-:
   *
   *   1. Vertice RODEADO POR COMPLETO de vecinos del signo contrario. No es una
   *      frontera: una frontera tiene dos lados.
   *   2. AGUJEROS: grupos de ceros que no llegan al borde de la malla. Una zona
   *      de espaldas de verdad se abre hacia fuera; una isla de ceros encerrada
   *      en pleno dorso visible no puede existir. Esto es lo que pilla las
   *      parejas y los trios contiguos, que el criterio 1 no ve.
   *
   * Efecto medido sobre el asset: toca 8 cuadros de 169 -el 88 y del 118 al
   * 125-, con 11 vertices rodeados, 1 aislado y 22 de agujero. El 119 queda
   * intacto, y los cuadros 121, 122, 123 y 125 se quedan sin un solo cero, que
   * es justo lo que dice su geometria.
   *
   * SOLO SE TOCA `bv`. `fv` tiene vertices con la misma pinta, pero manda sobre
   * el texto de la cara frontal, que ya esta calibrado y no entra en este
   * encargo.
   */
  private limpiaVisibilidad(vis: string): string {
    const g = this.curlGrid;
    const out = vis.split('');
    // 1) Vertices rodeados por completo. Se lee la vecindad ORIGINAL, no la que
    //    se va corrigiendo: si no, el barrido se propaga y una correccion
    //    justifica la siguiente.
    for (let r = 0; r < g; r++) {
      for (let c = 0; c < g; c++) {
        let n = 0;
        let t = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const R = r + dr;
            const C = c + dc;
            if (R < 0 || R >= g || C < 0 || C >= g) continue;
            t++;
            if (vis[R * g + C] === '1') n++;
          }
        }
        if (vis[r * g + c] === '1') {
          if (n === 0) out[r * g + c] = '0';
        } else if (n === t) {
          out[r * g + c] = '1';
        }
      }
    }
    // 2) Agujeros: se inunda el cero desde el borde de la malla y lo que no se
    //    alcanza queda encerrado, o sea que es agujero. Vecindad de 4 a
    //    proposito: un hueco unido al exterior solo por una diagonal tambien
    //    abre celdas, asi que cuenta como agujero.
    const alcanzado = new Uint8Array(g * g);
    const pila: number[] = [];
    for (let i = 0; i < g * g; i++) {
      const r = (i / g) | 0;
      const c = i % g;
      if ((r === 0 || c === 0 || r === g - 1 || c === g - 1) && out[i] === '0') {
        alcanzado[i] = 1;
        pila.push(i);
      }
    }
    while (pila.length) {
      const i = pila.pop() as number;
      const r = (i / g) | 0;
      const c = i % g;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const R = r + dr;
        const C = c + dc;
        if (R < 0 || R >= g || C < 0 || C >= g) continue;
        const k = R * g + C;
        if (!alcanzado[k] && out[k] === '0') {
          alcanzado[k] = 1;
          pila.push(k);
        }
      }
    }
    for (let i = 0; i < g * g; i++) if (out[i] === '0' && !alcanzado[i]) out[i] = '1';
    return out.join('');
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
   * Compone la marca de la pagina de cierre en un panel propio, una sola vez al
   * cargar, con la MISMA caja que un panel de foto: se warpea a la superficie
   * izquierda igual que ellas, asi que tiene que compartir su proporcion o la
   * marca saldria estirada.
   *
   * El panel se deja en tinta sobre transparente -nada de fondo de papel, al
   * reves que `renderPhotoPanel`-: lo que hay debajo es la pagina de verdad, y
   * es la que tiene que verse a traves del trazo.
   */
  private renderLogoPanel(img: ImageBitmap): HTMLCanvasElement {
    const aspect = AboutBookComponent.quadAspect(CONTENT_LEFT_QUAD);
    const w = 720;
    const h = Math.round(w / aspect);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const lw = w * LOGO_ANCHO;
    const lh = lw * (img.height / img.width);
    const linea = Math.round(w * 0.05);
    // Aire entre la marca y la linea, en cuerpos de la propia linea: asi la
    // relacion se mantiene si cambia el tamano.
    const hueco = Math.round(linea * 1.15);
    const alto = lh + hueco + linea;
    const y0 = h * LOGO_CENTRO_V - alto / 2;
    ctx.drawImage(img, (w - lw) / 2, y0, lw, lh);

    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.font = `italic 500 ${linea}px "Cormorant Garamond", serif`;
    ctx.fillText(LOGO_LINE, w / 2, y0 + lh + hueco + linea * 0.8);
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
  private renderTextPanel(story: StoryContent, isClosing: boolean, page: number, marcado: SocialKind | null = null): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = PANEL_W;
    c.height = PANEL_H;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3d2a';
    // Los siete numeros de la tipografia salen de aqui y no de las constantes
    // sueltas: la pagina 4 lleva los suyos (ver TEXTO_POR_PAGINA).
    const t = ajusteTexto(page);
    const cx = PANEL_W * t.u;

    /**
     * El giro se aplica al LIENZO, no a cada renglon: asi el bloque entero
     * -renglones, aire entre parrafos y espiga- rota como una sola pieza sobre
     * su propio centro. Rotar renglon a renglon los abriria en abanico.
     *
     * Se deshace antes de los rotulos de redes a proposito: los <a> reales del
     * DOM se colocan con SOCIAL_POS (ver socialLinkStyle), asi que girarlos los
     * dejaria pintados en un sitio y clicables en otro.
     */
    const giraLienzo = (): void => {
      if (!t.giro) return;
      const cy = PANEL_H * t.v;
      ctx.translate(cx, cy);
      ctx.rotate((t.giro * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    };

    if (isClosing) {
      // La pagina de cierre usa el MISMO motor de reparto que las historias.
      // Antes pasaba `maxWidth` a fillText, que no reparte: aprieta la linea
      // horizontalmente hasta que quepa. Con la frase de cierre eso ya la
      // dejaba al 70% de su ancho -letras estrechadas, distintas del resto del
      // libro- y al subir el cuerpo habria bajado al 59%.
      ctx.font = `italic 500 ${Math.round(t.font * 0.95)}px "Cormorant Garamond", serif`;
      const rows = story.lines.flatMap((line) => this.wrapLine(ctx, line, t.measure, false));
      const step = t.font * 0.95 * t.line;
      // El bloque se centra en la franja que queda por encima de los enlaces de
      // redes, cuya posicion es fija porque los <a> reales del DOM se colocan
      // con ella (ver socialLinkStyle). La franja arranca en 0.20 y no en 0
      // para que la frase no se suba al borde de arriba y deje un vacio entre
      // ella y los enlaces: con el cuerpo nuevo la frase ocupa 3 renglones, no
      // 2, y centrada en el panel entero quedaba muy alta.
      const zoneLo = PANEL_H * 0.2;
      const zoneHi = PANEL_H * (SOCIAL_POS.instagram.v - 0.09);
      let y = zoneLo + (zoneHi - zoneLo - rows.length * step) / 2 + t.font * 0.95 * 0.8;
      ctx.save();
      giraLienzo();
      for (const row of rows) {
        ctx.fillText(row, cx, y);
        y += step;
      }
      ctx.restore();
      // Los botones van DENTRO del mismo giro que la frase: son tinta de esta
      // pagina, no algo apoyado encima, y tienen que inclinarse con ella.
      ctx.save();
      giraLienzo();
      this.drawSocialButton(ctx, SOCIAL_POS.instagram, 'instagram', marcado === 'instagram');
      this.drawSocialButton(ctx, SOCIAL_POS.facebook, 'facebook', marcado === 'facebook');
      ctx.restore();
      return c;
    }

    ctx.font = `400 ${t.font}px "Cormorant Garamond", serif`;
    // Se reparte en renglones primero, sin dibujar todavia: asi se conoce el
    // alto real del bloque completo -espiga incluida- y se centra de verdad.
    const paragraphs = story.lines.map((line) => this.wrapLine(ctx, line, t.measure, true));

    const rowH = t.font * t.line;
    const paraGap = t.font * t.para;
    const totalRows = paragraphs.reduce((sum, rows) => sum + rows.length, 0);
    const blockHeight = totalRows * rowH + (paragraphs.length - 1) * paraGap + t.divider;
    // 0.8 del cuerpo aproxima el alto visible de la letra por encima de su
    // linea base, para centrar el texto que realmente se ve y no la caja
    // invisible de lineas, que arranca en la base de la primera. El centro
    // vertical sale de los dibujos de las esquinas, igual que el horizontal.
    let y = PANEL_H * t.v - blockHeight / 2 + t.font * 0.8;

    ctx.save();
    giraLienzo();
    for (let i = 0; i < paragraphs.length; i++) {
      for (const row of paragraphs[i]) {
        ctx.fillText(row, cx, y);
        y += rowH;
      }
      if (i < paragraphs.length - 1) y += paraGap;
    }
    this.drawTextDivider(ctx, cx, y - rowH + t.font * 0.42 + t.divider / 2);
    ctx.restore();
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

  /** Contorno de pildora, el mismo que usan los CTA del sitio (radio = medio alto). */
  private pillPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
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
  }

  /**
   * Un boton de red, impreso en la pagina.
   *
   * Es un CAJETIN DE FILETE, no una pildora con relieve: un contorno fino en el
   * mismo oro del divisor de espiga, la palabra en versalitas espaciadas y el
   * logo de la red, todo del mismo color y sin una sola luz especular.
   *
   * La version anterior era una placa metalica con degradado, brillo y sombra
   * proyectada. Se veia bien, pero delataba lo que era: un boton de pantalla
   * pegado sobre la foto de un libro. Nada impreso tiene reflejos propios ni
   * proyecta sombra sobre el papel que lo sostiene. Quitando el relieve, el
   * boton pasa a estar hecho de lo mismo que el resto de la pagina -tinta- y
   * el ojo deja de leerlo como un anadido.
   *
   * Todo el lienzo se estampa con `multiply` (ver drawRestText), que solo puede
   * OSCURECER el papel: por eso aca no hay ningun color claro. Los que habia
   * -crema sobre dorado- serian simplemente invisibles.
   */
  private drawSocialButton(ctx: CanvasRenderingContext2D, pos: { u: number; v: number }, kind: SocialKind, marcado = false): void {
    const { w, h, r, icono, gap, font, track } = SOCIAL_BTN;
    const cx = PANEL_W * pos.u;
    const cy = PANEL_H * pos.v;

    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.strokeStyle = GOLD;
    // Un filete de imprenta es fino y parejo. Mas grueso empieza a leerse como
    // el borde de un boton de interfaz, que es justo lo que se esta evitando.
    // Al marcarlo engorda apenas lo justo para notarse.
    ctx.lineWidth = marcado ? 2.4 : 1.6;
    this.pillPath(ctx, cx - w / 2, cy - h / 2, w, h, r);
    if (marcado) {
      // Tinta muy diluida, no un relleno: el cajetin se "moja" al pasar por
      // encima. Un fondo opaco lo sacaria del papel y desharia lo editorial.
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.fill();
      ctx.restore();
    }
    ctx.stroke();

    // Glifo y palabra se centran COMO GRUPO: centrar cada uno por su lado
    // dejaria el conjunto descolgado a un lado del cajetin.
    const label = kind === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK';
    ctx.font = `600 ${font}px Cinzel, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const anchoTexto = this.measureTracked(ctx, label, track);
    let px = cx - (icono + gap + anchoTexto) / 2;
    this.drawSocialGlyph(ctx, kind, px, cy - icono / 2, icono);
    px += icono + gap;
    this.fillTracked(ctx, label, px, cy, track);
    ctx.restore();
  }

  /** Ancho de un rotulo contando el aire entre letras, que `measureText` no ve. */
  private measureTracked(ctx: CanvasRenderingContext2D, text: string, track: number): number {
    const letras = [...text];
    return letras.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + track * (letras.length - 1);
  }

  /** Escribe letra a letra: el canvas no tiene el `letter-spacing` del sitio. */
  private fillTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, track: number): void {
    let cx = x;
    for (const ch of [...text]) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + track;
    }
  }

  /** El logo de la red, del lienzo de 256 en que viene al tamano pedido. */
  private drawSocialGlyph(ctx: CanvasRenderingContext2D, kind: SocialKind, x: number, y: number, size: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 256, size / 256);
    ctx.fill(new Path2D(SOCIAL_GLYPH[kind]));
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
    this.backLayer = this.ensureLayer(this.backLayer, c.width, c.height);
    this.backMaskLayer = this.ensureLayer(this.backMaskLayer, c.width, c.height);
  }

  private lastDrawn = 1;
  // Transicion en curso (null = reposo, se dibuja solo `current`). Ver next()/prev().
  private transition: { leaving: number; entering: number; towardHigh: boolean } | null = null;

  /** Indice en `frames` del cuadro `n` (1-based), recortado al rango real. */
  private static frameIdx(n: number): number {
    return Math.max(1, Math.min(FRAME_COUNT, Math.floor(n))) - 1;
  }

  /**
   * Pinta un cuadro FRACCIONARIO: los dos vecinos, el segundo con la parte
   * decimal como opacidad.
   *
   * Redondeando, el video no puede entregar mas de un cuadro por cada avance de
   * uno entero, y la curva de la vuelta frena hasta velocidad cero: medido a
   * 10ms, en los ultimos 200ms la imagen se quedaba CONGELADA 40, 60 y 50ms y
   * luego pegaba saltos de 47793, 33789 y 16664 pixeles. Cuatro brincos con
   * pausas entre medias, que es como se lee la judder. Calculado, empieza en el
   * cuadro 125: de ahi al final la curva entrega menos de 60 imagenes distintas
   * por segundo, y llega a una cada 73ms.
   *
   * Las dos opacidades NO son `alpha` y `alpha*k`. Encadenar dos `source-over`
   * con opacidades p y q deja el destino a `(1-p)(1-q)`, y con esa pareja
   * ingenua eso no vale `1-alpha`: la mezcla acaba pesando `alpha*(2-alpha)` en
   * vez de `alpha`. Con `alpha = 1` da igual -sale p = 1, q = k, que es lo
   * correcto- y por eso todo el giro estaba bien; pero en el cruce de la cola,
   * al saturar la cadena, `k` caia de 0,999 a 0 y el error se descargaba de
   * golpe: medido, 10863 pixeles en un solo paso donde los vecinos movian 4400.
   *
   * Resolviendo el sistema sale exacto y sin lienzo intermedio:
   *
   *     q = alpha * k                 (peso del cuadro de arriba)
   *     p = alpha * (1 - k) / (1 - q) (peso del de abajo)
   *
   * y entonces (1-p)(1-q) = 1 - alpha, que es justo lo que se pide.
   *
   * Queda un solo aviso: en el BORDE de la silueta, donde uno de los dos
   * cuadros ya es transparente, el resultado favorece al de abajo por uno o dos
   * pixeles. Los cuadros del video traen alfa y eso no se puede arreglar con
   * dos `drawImage` sin componer antes en un lienzo aparte.
   */
  private pintaCuadro(
    ctx: CanvasRenderingContext2D,
    frame: number,
    ox: number,
    oy: number,
    dw: number,
    dh: number,
    alpha: number,
  ): void {
    if (alpha <= 0) return;
    const a = this.frames[AboutBookComponent.frameIdx(frame)];
    if (!a) return;
    const k = frame - Math.floor(frame);
    const b = k > 0.002 ? this.frames[AboutBookComponent.frameIdx(frame + 1)] : null;
    ctx.save();
    if (!b || b === a) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(a, ox, oy, dw, dh);
    } else {
      const q = alpha * k;
      const p = q >= 1 ? 0 : (alpha * (1 - k)) / (1 - q);
      if (p > 0) {
        ctx.globalAlpha = p;
        ctx.drawImage(a, ox, oy, dw, dh);
      }
      ctx.globalAlpha = q;
      ctx.drawImage(b, ox, oy, dw, dh);
    }
    ctx.restore();
  }

  /**
   * El cuadro se CUANTIZA al fotograma mas cercano, y se hace aqui para que lo
   * reciban ya redondeado el video, la malla, las poses y las rampas.
   *
   * El eco de la hoja. Con el cuadro fraccionario, `pintaCuadro` mezclaba los
   * dos fotogramas vecinos con transparencia. Entre el 119 y el 120 la hoja se
   * desplaza mucho, asi que esa mezcla pintaba DOS HOJAS a medio opacar: de ahi
   * salian a la vez el doble contorno, el papel translucido y el borde que no
   * cerraba -tres cosas que parecian defectos distintos y eran una sola-. Los
   * fotogramas del asset estan impecables; comprobado sobre el webp crudo con
   * fondo a cuadros: hoja opaca y un solo canto.
   *
   * Y se redondea para TODO, no solo para el video. Redondeando solo el video,
   * la mascara que recorta la foto se quedaba hasta medio fotograma por delante
   * de la hoja que recorta, y la foto asomaba por encima del papel. El contenido
   * esta impreso en la hoja: si la hoja avanza por fotogramas, el contenido
   * avanza con ella.
   *
   * No introduce saltos por si mismo: lo que se pierde es una interpolacion que
   * nunca fue suavidad, sino dos poses superpuestas.
   *
   * A 14 ms por cuadro la secuencia corre a 71 imagenes por segundo, o sea por
   * encima de los 60 Hz de la pantalla: hay fotogramas del asset que no llegan
   * a verse. Es deliberado (ver MS_PER_FRAME) y no rompe nada -cada cuadro que
   * se dibuja es un fotograma entero y coherente, no una mezcla-.
   */
  private draw(frameCrudo: number): void {
    const frame = Math.round(frameCrudo);
    const ctx = this.ctx;
    const c = this.canvasRef()?.nativeElement;
    const bmp = this.frames[AboutBookComponent.frameIdx(frame)];
    if (!ctx || !c || !bmp) return;
    this.lastDrawn = frame;
    ctx.clearRect(0, 0, c.width, c.height);
    const scale = Math.min(c.width / bmp.width, c.height / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    const ox = (c.width - dw) / 2;
    const oy = (c.height - dh) / 2;
    this.pintaCuadro(ctx, frame, ox, oy, dw, dh, 1);
    // Cruce de poses: encima del cuadro de destino se desvanece el de origen.
    // Solo el LIBRO -el contenido va despues, una sola vez y a opacidad plena-.
    const fu = this.fundido;
    if (fu) this.pintaCuadro(ctx, fu.desde, ox, oy, dw, dh, 1 - fu.t);

    // Sin condicionar a `coverOpen`: ese booleano hacia que el contenido
    // apareciera de golpe en un solo cuadro al terminar la apertura. Ahora
    // drawContent lo ata al cuadro (ver OPEN_TEXT_LO) y devuelve sin dibujar
    // nada mientras la tapa todavia esta cubriendo la pagina.
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
   * La marca de la pagina de cierre, si es la que toca. Va aparte de
   * `photoPanel` A PROPOSITO: por esa ruta le caerian la sombra de copia y el
   * estampado opaco, que son de una foto apoyada y no de tinta en el papel.
   */
  private logoPanel(page: number): HTMLCanvasElement | null {
    return page === LOGO_PAGE ? this.logo : null;
  }

  /**
   * Desplazamiento del asentamiento del libro en este cuadro (ver
   * ASENT_APERTURA), en pixeles del video. Cero cuando el libro ya esta quieto,
   * que es el caso de casi todos los cuadros.
   *
   * Se interpola entre cuadros porque el compositor dibuja con cuadros
   * fraccionarios a 60Hz: sin interpolar, el contenido daria un salto en cada
   * cambio de cuadro del video mientras la pagina se mueve suave.
   */
  private asentamiento(frame: number, side: 'left' | 'right'): [number, number] {
    const i = frame - ASENT_LO;
    const ult = ASENT_APERTURA.length - 1;
    if (i >= ult) return [0, 0];
    const k = Math.max(0, Math.floor(i));
    const t = Math.max(0, Math.min(1, i - k));
    const A = ASENT_APERTURA[k];
    const B = ASENT_APERTURA[Math.min(k + 1, ult)];
    const o = side === 'right' ? 0 : 2;
    return [A[o] + (B[o] - A[o]) * t, A[o + 1] + (B[o + 1] - A[o + 1]) * t];
  }

  /**
   * Mueve una superficie de reposo con la pagina mientras el libro se asienta.
   * Devuelve `pts` tal cual -sin copiar ni recorrer- cuando no hay nada que
   * mover, que es lo que pasa en todos los cuadros salvo la apertura.
   */
  private conAsentamiento(pts: [number, number][], side: 'left' | 'right', frame: number): [number, number][] {
    const [dx, dy] = this.asentamiento(frame, side);
    if (dx === 0 && dy === 0) return pts;
    const out = (this.asentBuf[side] ??= pts.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < pts.length; i++) {
      out[i][0] = pts[i][0] + dx;
      out[i][1] = pts[i][1] + dy;
    }
    return out;
  }

  /**
   * Malla de la hoja en el cuadro EXACTO que se esta mostrando. `draw()`
   * redondea el cuadro para elegir el bitmap, asi que la geometria se pide con
   * el mismo indice redondeado: interpolar entre cuadros dejaria el contenido
   * medio cuadro adelantado respecto al papel sobre el que va impreso.
   */
  private meshAt(frame: number): CurlFrame | null {
    const r = Math.round(frame);
    if (!this.curl || r < MESH_LO || r > MESH_HI) return null;
    const f0 = Math.floor(frame);
    const a = this.curl.frames[String(f0)] ?? null;
    // Borde bajo (82,x): el cuadro de abajo no tiene malla, asi que no hay nada
    // que interpolar y se cae al redondeo, igual que antes.
    if (!a) return this.curl.frames[String(r)] ?? null;
    const k = frame - f0;
    const b = k > 0.002 ? (this.curl.frames[String(f0 + 1)] ?? null) : null;
    return b ? this.lerpMesh(a, b, k) : a;
  }

  /**
   * Malla a medio camino entre dos cuadros medidos, para que la hoja se mueva a
   * la cadencia de la pantalla y no a la del video (ver `pintaCuadro`). Si el
   * papel se interpolara y el contenido no, volveriamos justo a lo que costo
   * arreglar: el texto y la foto despegandose de la pagina.
   *
   * `fv` y `bv` NO se interpolan: son mapas de bits de visibilidad, no numeros.
   * Se toman los del cuadro mas cercano, medio cuadro de error como mucho, que
   * es exactamente el que ya habia al redondear.
   *
   * Los vertices van en buferes reutilizados: son 289 puntos por cara y esto
   * corre en cada tick de rAF.
   */
  private lerpMesh(a: CurlFrame, b: CurlFrame, k: number): CurlFrame {
    const cerca = k < 0.5 ? a : b;
    const n = a.f.length;
    if (!this.meshBufF || this.meshBufF.length !== n) this.meshBufF = a.f.map(() => [0, 0] as [number, number]);
    const pf = this.meshBufF;
    for (let i = 0; i < n; i++) {
      pf[i][0] = a.f[i][0] + (b.f[i][0] - a.f[i][0]) * k;
      pf[i][1] = a.f[i][1] + (b.f[i][1] - a.f[i][1]) * k;
    }
    let pb = cerca.b;
    if (a.b && b.b && a.b.length === b.b.length) {
      const m = a.b.length;
      if (!this.meshBufB || this.meshBufB.length !== m) this.meshBufB = a.b.map(() => [0, 0] as [number, number]);
      pb = this.meshBufB;
      for (let i = 0; i < m; i++) {
        pb[i][0] = a.b[i][0] + (b.b[i][0] - a.b[i][0]) * k;
        pb[i][1] = a.b[i][1] + (b.b[i][1] - a.b[i][1]) * k;
      }
    }
    const out = (this.meshBuf ??= { f: pf, fv: a.fv, b: pb, bv: a.bv });
    out.f = pf;
    out.fv = cerca.fv;
    out.fa = a.fa !== undefined && b.fa !== undefined ? a.fa + (b.fa - a.fa) * k : cerca.fa;
    out.b = pb;
    out.bv = cerca.bv;
    out.ba = a.ba !== undefined && b.ba !== undefined ? a.ba + (b.ba - a.ba) * k : cerca.ba;
    return out;
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
    // entre las dos.
    const fu = this.fundido;
    const pts = fu
      ? this.posePts(base.pts, side, fu.desde, fu.hacia, fu.t)
      : this.posePts(base.pts, side, frame, 0, 0);
    // Y por ultimo el asentamiento de la apertura, que es lo que hace que el
    // contenido pueda estar IMPRESO desde antes de que el libro se pare en vez
    // de aparecer sobre el ya quieto. Va aqui, en el unico sitio por el que
    // pasan las dos rutas -reposo y vuelta-, para que las dos lo lleven igual.
    const conAs = this.conAsentamiento(pts, side, frame);
    return conAs === base.pts ? base : { pts: conAs, vis: base.vis, uv: base.uv };
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

  /**
   * NINGUNA de las dos paginas lleva pose. El asset trae una para cada lado y
   * aqui se ignoran las dos; `about-book-curl.json` no se toca, solo se deja de
   * leer ese bloque.
   *
   * La pose existia para que el contenido acompañara a la pagina durante el
   * rebobinado, y no delatara que esta sobrepuesto mientras los adornos
   * impresos del video se desdoblan. El problema es lo que cuesta. Medido en el
   * lienzo real, el salto entero del rebobinado (cuadro 139 -> 81) son 21656 px
   * que cambian mas de 24 niveles, y se reparten asi:
   *
   *   nuestra foto, movida por la pose izquierda   15695   (72%)
   *   el texto (solo cambio de sombreado)           3256
   *   los adornos impresos del video                2532
   *
   * O sea: la pose mete SEIS VECES mas desdoblamiento del que evita. Con las
   * dos fuera, el salto baja de 21656 a 10282 px y la foto no se mueve ni un
   * pixel durante el cruce.
   *
   * Por que no se puede arreglar deformando, que era lo primero que probe: el
   * CONTORNO del libro no se mueve entre los dos reposos -medido sub-pixel,
   * borde derecho +0,11 px de media y max 0,45, borde izquierdo -0,24 y max
   * 0,50- mientras que los adornos impresos de la pagina derecha se corren
   * 4,02 px. No es que el libro se desplace: es que la hoja de encima es otra y
   * el bloque de paginas se queda donde esta. Cualquier transformacion que
   * registre los adornos descuadra el canto del libro contra el fondo, que es
   * el borde de mas contraste del cuadro. Se probaron una afin global ajustada
   * a los cuatro adornos (1,0 px de residuo, pero 4-5,5 px de desplazamiento
   * del contorno) y un parche local difuminado (el adorno superior derecho
   * esta a 7 px del canto y no queda papel donde apagar la mascara).
   *
   * El precio de quitarlas: la foto queda hasta ~5 px corrida respecto a la
   * pagina en los extremos del giro, y el texto hasta 5 px. Es estatico, sobre
   * papel en blanco y sin nada con que compararlo -los adornos son del video y
   * el contenido no los toca-. Durante la vuelta el desfase se reparte en 50
   * cuadros, a 0,1 px por cuadro.
   *
   * Se deja como una salida temprana, y no borrando la maquinaria, para que
   * volver a activarlas sea quitar esta linea.
   */
  private poseAt(_frame: number, _side: 'left' | 'right'): Warp | null {
    return null;
  }

  /** Un punto por el warp; `null` es la identidad. */
  private static warpPoint(w: Warp | null, x: number, y: number): Point {
    if (!w) return { x, y };
    const [a, b, c, d, e, f, g, h] = w;
    const k = 1 / (g * x + h * y + 1);
    return { x: (a * x + b * y + c) * k, y: (d * x + e * y + f) * k };
  }

  /**
   * Coloca los puntos de una superficie con la pose de `frame`, y si `t > 0`
   * los lleva un `t` del camino hacia la que tendrian en `hacia`.
   *
   * Los dos cuadros son FRACCIONARIOS y se interpolan entre sus dos vecinos,
   * igual que el video y la malla (ver `pintaCuadro`). Redondear el origen del
   * cruce parecia inofensivo -en el solape el libro ya casi no se mueve- pero
   * no lo era: entre las poses 136 y 137 la foto se desplaza 0,514px, y al
   * cruzar el 136,5 daba ese medio pixel de golpe. Medido, 10923 pixeles de la
   * foto cambiaban en un solo paso, sin que la luminancia se moviera: era
   * geometria pura.
   *
   * Se interpolan siempre POSICIONES, nunca las matrices: mezclar homografias
   * entrada a entrada no significa nada geometrico.
   *
   * Devuelve `pts` tal cual -sin copiar ni recorrer- cuando no hay ninguna pose
   * que aplicar, que es el caso de casi todos los cuadros.
   */
  private posePts(
    pts: [number, number][],
    side: 'left' | 'right',
    frame: number,
    hacia: number,
    t: number,
  ): [number, number][] {
    const f0 = Math.floor(frame);
    const k = frame - f0;
    const a0 = this.poseAt(f0, side);
    const a1 = k > 0.002 ? this.poseAt(f0 + 1, side) : a0;
    const cruce = t > 0;
    const h0 = cruce ? this.poseAt(Math.floor(hacia), side) : null;
    const hk = cruce ? hacia - Math.floor(hacia) : 0;
    const h1 = cruce && hk > 0.002 ? this.poseAt(Math.floor(hacia) + 1, side) : h0;
    if (!a0 && !a1 && !h0 && !h1) return pts;
    const out = (this.poseBuf[side] ??= pts.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0];
      const y = pts[i][1];
      const p = AboutBookComponent.warpPoint(a0, x, y);
      const q = a1 === a0 ? p : AboutBookComponent.warpPoint(a1, x, y);
      let px = p.x + (q.x - p.x) * k;
      let py = p.y + (q.y - p.y) * k;
      if (cruce) {
        const r = AboutBookComponent.warpPoint(h0, x, y);
        const s = h1 === h0 ? r : AboutBookComponent.warpPoint(h1, x, y);
        px += (r.x + (s.x - r.x) * hk - px) * t;
        py += (r.y + (s.y - r.y) * hk - py) * t;
      }
      out[i][0] = px;
      out[i][1] = py;
    }
    return out;
  }

  /**
   * Foto quieta de la pagina izquierda. La sombra se derrama FUERA del
   * contenido, asi que va antes.
   *
   * Va MULTIPLICADA por la luminancia del cuadro, igual que durante la vuelta.
   * Antes iba directa al `ctx` mientras que la vuelta la estampaba sombreada,
   * asi que la foto cambiaba de brillo de golpe en los dos limites de la
   * malla: medido sobre su huella real, el multiplicador saltaba de 1,000 a
   * 0,917 al entrar por el cuadro 83 y de 0,927 a 1,000 al salir por el 134.
   * En el arranque se escondia -la hoja ya estaba despegando y todo se movia-,
   * pero en el aterrizaje no tenia donde: era lo unico que cambiaba y se leia
   * como que la foto CRECIA, porque su marco blanco pasaba de 214 a 240 y un
   * blanco mas brillante se lee como mas grueso. No habia ni un pixel de
   * desplazamiento: renderizando el MISMO cuadro 133 por las dos rutas, los
   * bordes caian en la misma x y todo el cambio era un factor de 1,08 a 1,12.
   *
   * Sombreando siempre, el multiplicador queda continuo de punta a punta
   * -0,917 en el 83, 0,927 en el 133, 0,923 en el 134, 0,922 en el 56-: 0,6%
   * de deriva repartida en 99 cuadros, en vez de dos escalones del 8%. El
   * precio es que la foto en reposo se oscurece un 7,8% y recibe el degradado
   * de la pagina, que es justamente lo que le pasa a algo impreso.
   *
   * El texto no hizo falta tocarlo: ya iba con `multiply` en las dos rutas, y
   * por eso nunca tuvo este salto -medido, 3304px de diferencia entre rutas
   * contra los 44851 de la foto-.
   */
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
    const main = this.canvasRef()?.nativeElement;
    const box = main ? this.contentBox(null, ox, oy, scale, main, frame) : null;
    // El sombreado se lee ANTES de pintar nada nuestro -la sombra de la copia
    // incluida-, o entraria en el factor y la foto saldria oscurecida dos
    // veces (ver `captureShade`).
    const shade = main && box && box.w && box.h ? this.captureShade(box, main) : null;
    const paper = main && box && shade ? this.capturePaper(box, main) : null;
    // La foto quieta y su sombra van las dos con el desplazamiento calibrado
    // (ver DY_FOTO_CRUCE); si solo lo llevara una, la copia se despegaria de su
    // sombra en los 65 ms del cruce.
    const ptsFoto = this.conDyFoto(s.pts);
    // La sombra se apaga CON la copia. Antes iba siempre a fuerza plena: con el
    // fundido de 107ms no se notaba, pero con el revelado de la apertura -medio
    // segundo- dejaba una sombra entera alrededor de una foto casi invisible, y
    // el conjunto se leia como un rectangulo gris flotando en la pagina.
    this.drawPrintShadow(ctx, this.meshCorners(ptsFoto, s.uv, ox, oy, scale), alpha);
    let capa: HTMLCanvasElement | null = null;
    let cl: CanvasRenderingContext2D | null = null;
    if (main && box && shade) {
      capa = this.contentLayer = this.ensureLayer(this.contentLayer, main.width, main.height);
      cl = capa.getContext('2d');
    }
    if (!box || !shade || !capa || !cl) {
      // Sin canvas o sin capa no se puede sombrear: se degrada a lo de antes
      // -foto directa- en vez de no pintar nada.
      ctx.save();
      if (alpha < 1) ctx.globalAlpha = alpha;
      this.drawOnMesh(ctx, img, ptsFoto, s.vis, s.uv, ox, oy, scale);
      ctx.restore();
      return;
    }
    cl.setTransform(1, 0, 0, 1, 0, 0);
    cl.globalAlpha = 1;
    cl.globalCompositeOperation = 'source-over';
    // Estos lienzos auxiliares nacen en 'low' y ahi el warp sale mas blando.
    cl.imageSmoothingEnabled = true;
    cl.imageSmoothingQuality = 'high';
    cl.clearRect(box.x, box.y, box.w, box.h);
    this.drawOnMesh(cl, img, ptsFoto, s.vis, s.uv, ox, oy, scale);
    if (paper) {
      // Nada de lo nuestro puede quedar donde no hay papel. Mismo recorte que
      // en la vuelta, para que las dos rutas coincidan tambien en el borde.
      // `destination-in` toca todo el lienzo si no se acota con un clip.
      cl.save();
      cl.beginPath();
      cl.rect(box.x, box.y, box.w, box.h);
      cl.clip();
      cl.globalCompositeOperation = 'destination-in';
      cl.drawImage(paper, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      cl.restore();
      cl.globalCompositeOperation = 'source-over';
    }
    this.stampShaded(ctx, capa, box, shade, alpha);
  }

  /**
   * Estampa TINTA sobre la pagina: se compone en una capa aparte con
   * `source-over` y se multiplica UNA sola vez al pasarla al cuadro.
   *
   * No es un rodeo, es la correccion de un defecto real. Warpear con `multiply`
   * ya puesto en el destino multiplica cada pixel tantas veces como celdas de
   * la malla lo tocan, y `drawOnMesh` pinta las celdas con medio subpixel de
   * solape para no dejar costuras: en toda esa banda la tinta se aplica dos
   * veces y sale mas oscura.
   *
   * Medido sobre el adorno dorado del final del texto: en reposo salia
   * #ab7540 -un marron rojizo- contra el #c7984d de la vuelta de pagina, que
   * si compone en capa. Enrutando el reposo por aqui da #c89a50, o sea el de
   * la vuelta. El oro es lo que mas lo delata porque al oscurecerse se desatura
   * hacia el ladrillo; la tinta marron del texto solo se veia algo mas oscura,
   * y por eso el defecto habia pasado desapercibido.
   *
   * Devuelve false si no hay capa donde componer, para que el llamador pueda
   * degradar a multiply directo en vez de no pintar nada.
   */
  private estampaTinta(
    ctx: CanvasRenderingContext2D,
    box: Box | null,
    alpha: number,
    dibuja: (cl: CanvasRenderingContext2D) => void,
  ): boolean {
    const main = this.canvasRef()?.nativeElement;
    if (!main || !box || !box.w || !box.h) return false;
    const capa = (this.contentLayer = this.ensureLayer(this.contentLayer, main.width, main.height));
    const cl = capa.getContext('2d');
    if (!cl) return false;
    cl.setTransform(1, 0, 0, 1, 0, 0);
    cl.globalAlpha = 1;
    cl.globalCompositeOperation = 'source-over';
    // Estos lienzos auxiliares nacen en 'low' y ahi el warp sale mas blando.
    cl.imageSmoothingEnabled = true;
    cl.imageSmoothingQuality = 'high';
    cl.clearRect(box.x, box.y, box.w, box.h);
    dibuja(cl);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = alpha;
    ctx.drawImage(capa, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    ctx.restore();
    return true;
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
    const main = this.canvasRef()?.nativeElement;
    const box = main ? this.contentBox(null, ox, oy, scale, main, frame) : null;
    const pinta = (c2: CanvasRenderingContext2D): void =>
      this.drawOnMesh(c2, img, this.conDxTexto(s.pts), s.vis, s.uv, ox, oy, scale);
    if (this.estampaTinta(ctx, box, alpha, pinta)) return;
    // Sin capa donde componer se degrada a lo de antes: multiply directo, que
    // oscurece el solape de las celdas pero al menos pinta.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    if (alpha < 1) ctx.globalAlpha = alpha;
    pinta(ctx);
    ctx.restore();
  }

  /**
   * La marca quieta de la pagina de cierre. Va sobre la superficie IZQUIERDA,
   * como la foto, pero compuesta como el texto: `multiply` y sin sombra. Es
   * tinta en el papel, no una copia apoyada encima.
   */
  private drawRestLogo(
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
      this.drawPanelInQuad(ctx, img, CONTENT_LEFT_QUAD, ox, oy, scale, false, alpha, true);
      return;
    }
    const main = this.canvasRef()?.nativeElement;
    const box = main ? this.contentBox(null, ox, oy, scale, main, frame) : null;
    // El mismo desplazamiento que llevaria la foto en su sitio: la marca ocupa
    // esa misma superficie y tiene que moverse con ella (ver DY_FOTO_CRUCE).
    const pinta = (c2: CanvasRenderingContext2D): void =>
      this.drawOnMesh(c2, img, this.conDyFoto(s.pts), s.vis, s.uv, ox, oy, scale);
    if (this.estampaTinta(ctx, box, alpha, pinta)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    if (alpha < 1) ctx.globalAlpha = alpha;
    pinta(ctx);
    ctx.restore();
  }

  /**
   * Aplica el desplazamiento calibrado del cruce (ver DX_TEXTO_CRUCE). Reusa un
   * buffer: son 289 vertices y esto corre en cada cuadro de pantalla.
   */
  private conDxTexto(pts: [number, number][]): [number, number][] {
    if (this.textoDx === 0) return pts;
    const out = (this.dxBuf ??= pts.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < pts.length; i++) {
      out[i][0] = pts[i][0] + this.textoDx;
      out[i][1] = pts[i][1];
    }
    return out;
  }

  /**
   * Aplica el desplazamiento calibrado de la foto (ver DY_FOTO_CRUCE). Reusa un
   * buffer PROPIO, no el de `conDxTexto`: los dos se piden dentro del mismo
   * dibujo y compartirlo dejaria al segundo pisando lo que lee el primero.
   *
   * Tiene que envolver TAMBIEN el `meshCorners` de la sombra impresa, no solo
   * el `drawOnMesh` de la foto: la sombra se dibuja aparte y por otro camino, y
   * si no se mueve con ella la copia se despega de su propia sombra.
   */
  private conDyFoto(pts: [number, number][]): [number, number][] {
    if (this.fotoDy === 0) return pts;
    const out = (this.dyBuf ??= pts.map(() => [0, 0] as [number, number]));
    for (let i = 0; i < pts.length; i++) {
      out[i][0] = pts[i][0];
      out[i][1] = pts[i][1] + this.fotoDy;
    }
    return out;
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

  /**
   * Region del canvas que toca esta composicion (todo lo demas ni se limpia ni
   * se recorre).
   *
   * Con `frame`, el margen crece ademas con el desplazamiento del asentamiento
   * de ese cuadro (ver ASENT_APERTURA). El margen fijo son 32px de video y el
   * desplazamiento llega a 57: sin esto, contenido movido hacia afuera se
   * quedaria recortado en el borde de la caja. Fuera de la apertura el
   * desplazamiento es cero y la caja sale exactamente igual que antes, asi que
   * la vuelta de pagina no paga nada por esto.
   */
  private contentBox(mesh: CurlFrame | null, ox: number, oy: number, scale: number, main: HTMLCanvasElement, frame?: number): Box {
    const pts: [number, number][] = [
      ...CONTENT_LEFT_QUAD.map((p) => [p.x, p.y] as [number, number]),
      ...CONTENT_RIGHT_QUAD.map((p) => [p.x, p.y] as [number, number]),
    ];
    if (mesh) {
      pts.push(...mesh.f);
      if (mesh.b) pts.push(...mesh.b);
    }
    // Margen: la dilatacion de la mascara mas el radio de la sombra ambiente,
    // mas -si se pidio- lo que el asentamiento mueve el contenido en este cuadro.
    let asent = 0;
    if (frame !== undefined) {
      for (const lado of ['left', 'right'] as const) {
        const [dx, dy] = this.asentamiento(frame, lado);
        asent = Math.max(asent, Math.abs(dx), Math.abs(dy));
      }
    }
    const pad = (MASK_DILATE + 24 + asent) * scale;
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
   * LA HOJA ES LA MALLA, y nada mas. Se rellenan celda a celda las DOS caras
   * ENTERAS y se cose el pliegue que queda entre ellas. Se fueron la dilatacion
   * del borde, la envolvente convexa y el filtro por `ba`: eran parches sobre
   * una silueta que se quedaba corta, y cada uno traia su propio defecto -la
   * dilatacion adelantaba el recorte por el canto que avanza y en movimiento se
   * leia como un eco, como si cayeran dos hojas; la envolvente cerraba en recto
   * sobre la pagina izquierda y cortaba la foto en vertical, 22601 px de 77379
   * en el cuadro 112-.
   *
   * Tres cosas la hacen cubrir de verdad:
   *
   *   a) LA MALLA ENTERA, no solo las celdas que el video destapa. Una celda
   *      que el rizo esconde sigue siendo PAPEL: lo que se deja de ver ahi es
   *      lo IMPRESO, no la hoja.
   *
   *   b) LAS DOS CARAS SIEMPRE. `ba` es la opacidad de la foto entrante y
   *      estaba decidiendo geometria: del cuadro 108 al 116 vale 0, asi que
   *      media hoja quedaba fuera de su propia silueta. Meterla quita entre
   *      8000 y 26000 px de foto asomando por encima del papel.
   *
   *   c) EL PLIEGUE COSIDO. `f` y `b` no son la misma malla: son dos ajustes
   *      independientes de la misma hoja, cada uno cuadrado donde se ve su
   *      propio contenido, y se separan hasta 290 px. Donde la hoja enrolla, el
   *      labio cae JUSTO ENTRE los dos y ninguno lo cubre. Se cierra celda a
   *      celda -la envolvente de la celda (r,c) de `f` con su homologa espejada
   *      de `b`-: al ser local no puede meter cunas sobre la pagina, que es lo
   *      que arruinaba la envolvente global. En el cuadro 118 la foto que
   *      asomaba baja de 14823 a 8474 px.
   *
   * Medido en la vuelta real, en la franja del lomo -donde la hoja ya paso y no
   * puede quedar nada de la pagina de abajo-: 20720 -> 4289 px en el cuadro
   * 114, 21265 -> 425 en el 115, 23094 -> 6239 en el 116, y CERO del 119 al
   * 133, donde antes quedaban entre 506 y 23379. El texto quieto de la pagina
   * derecha no pierde ni un pixel: recupera la tira que la dilatacion le comia.
   *
   * Esto solo funciona si la malla sigue al papel en TODOS los cuadros. Los del
   * 116 y el 117 se calibraron a ciegas -con `ba`=0 el calibrador no dibujaba
   * nada- y quedaron fuera de la hoja; estan puestos por interpolacion entre el
   * 115 y el 118 en el asset.
   *
   * Devuelve null si no hay ninguna malla; ahi el llamador no punza, igual que
   * antes de que existiera la malla.
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
    // Sella el dentado entre celdas contiguas, que es del tamano de la celda.
    // No ensancha la silueta: son 2 px de video.
    m.lineWidth = MASK_SEAM * scale;
    const g = this.curlGrid;
    // Cuando una cara se ve ENTERA, la hoja esta plana y ella sola es la
    // silueta: la otra esta justo detras, papel contra papel, y su ajuste ya no
    // esta sujeto a nada porque el video no la muestra. Pasa del 83 al 107 -el
    // frente, hoja plana sobre la pagina derecha- y del 127 al 133 -el dorso,
    // hoja plana sobre la izquierda-. Sin esta guarda, en el cuadro 133 la
    // malla `f` se desparrama hasta x=697, cruzando el lomo hasta la pagina
    // derecha, y al rellenarla entera se comia 625 px del texto quieto de alli.
    // En el cruce -108 al 126- ninguna esta llena y entran las dos, que es
    // justo donde hacen falta.
    const soloFrente = !mesh.fv.includes('0');
    const soloDorso = !soloFrente && !!mesh.bv && !mesh.bv.includes('0');
    const caraFrente = soloDorso ? null : mesh.f;
    // El dorso solo entra donde LLEVA FOTO. No porque la opacidad mande sobre
    // la geometria, sino porque `ba` marca justo los cuadros que el usuario
    // calibro a mano: donde vale 0, `b` sigue siendo el ajuste automatico y
    // sobresale del papel. Medido en la vuelta real, el borde derecho de la
    // foto quieta pasaba de 560 a 411 px entre el cuadro 109 y el 115 -la foto
    // se cortaba en recto mucho antes de que la hoja llegara-, y el acumulado
    // dejaba ese recorte fijo para el resto de la vuelta. Con el dorso fuera de
    // esos cuadros el borde se queda en 557..560, que es donde tiene que estar.
    const caraDorso = soloFrente || (mesh.ba ?? 0) <= 0 ? null : mesh.b;
    const pinta = (pol: Point[]): void => {
      m.beginPath();
      for (let k = 0; k < pol.length; k++) {
        if (k === 0) m.moveTo(pol[k].x, pol[k].y);
        else m.lineTo(pol[k].x, pol[k].y);
      }
      m.closePath();
      m.fill();
      m.stroke();
    };
    const celda = (face: readonly [number, number][], r: number, c: number): Point[] => {
      const id = [r * g + c, r * g + c + 1, (r + 1) * g + c + 1, (r + 1) * g + c];
      return id.map((i) => ({ x: ox + face[i][0] * scale, y: oy + face[i][1] * scale }));
    };
    if (!caraFrente && !caraDorso) return null;
    for (let r = 0; r < g - 1; r++) {
      for (let c = 0; c < g - 1; c++) {
        const cf = caraFrente ? celda(caraFrente, r, c) : null;
        // La celda homologa del dorso es la misma hoja vista por el otro lado,
        // o sea espejada en COLUMNAS -la bisagra de `f` es la columna u=0 y la
        // de `b` la u=1-. Comprobado en los cuadros donde las dos caras estan
        // calibradas a mano: espejando solo columnas se separan 69-114 px;
        // espejando tambien las filas, 167-195.
        const cb = caraDorso ? celda(caraDorso, r, g - 2 - c) : null;
        if (cf) pinta(cf);
        if (cb) pinta(cb);
        if (cf && cb) pinta(AboutBookComponent.convexHull([...cf, ...cb]));
      }
    }
    return this.maskLayer;
  }

  /**
   * La silueta de la hoja ACUMULADA desde que empezo la vuelta.
   *
   * Sobre la pagina a la que la hoja VA, lo que ya tapo no puede destaparse:
   * la hoja gira en un solo sentido. Asi que la silueta correcta de ese lado no
   * es la del cuadro suelto sino la union de todos los cuadros recorridos.
   *
   * Sin esto la foto de debajo REAPARECIA: 21933 px en el cuadro 124 despues de
   * estar tapada del todo en el 123. La causa es que del 119 en adelante el
   * video no destapa ni una celda del frente, su ajuste deja de estar sujeto a
   * nada -llega a x=697, cruzando el lomo- y unas veces cubre el rizo por
   * casualidad y otras no. Acumulando, la foto baja sola de 83061 px a 0 sin un
   * solo repunte en toda la vuelta.
   *
   * SOLO vale para el lado que se TAPA. Sobre la pagina que la hoja destapa
   * haria justo lo contrario -no dejar aparecer nunca lo que hay debajo-, asi
   * que ese lado se queda con la silueta del cuadro exacto (ver `drawContent`).
   *
   * Cuesta una copia por dibujado. Se probo repintar los N cuadros anteriores
   * en cada uno y con GPU real el percentil 95 se iba a 74 ms; asi se queda en
   * el presupuesto de los 16,7.
   *
   * Se reinicia cuando cambia la vuelta, el sentido o la escala del lienzo: lo
   * acumulado esta en pixeles de pantalla y dejaria de valer.
   */
  private acumulaSilueta(
    plana: HTMLCanvasElement,
    frame: number,
    haciaIzquierda: boolean,
    ox: number,
    oy: number,
    scale: number,
    box: Box,
    main: HTMLCanvasElement,
  ): HTMLCanvasElement {
    this.acumLayer = this.ensureLayer(this.acumLayer, main.width, main.height);
    const m = this.acumLayer.getContext('2d');
    if (!m) return plana;
    const t = this.transition;
    const clave = `${t?.leaving}>${t?.entering}:${haciaIzquierda}:${ox}:${oy}:${scale}`;
    // "Avanza" es en el sentido de la marcha; volver atras dentro de la misma
    // vuelta significa que se esta reproduciendo al reves y lo acumulado sobra.
    const avanza = haciaIzquierda ? frame >= this.acumFrame : frame <= this.acumFrame;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalAlpha = 1;
    m.globalCompositeOperation = 'source-over';
    if (clave !== this.acumClave || !avanza) {
      m.clearRect(0, 0, this.acumLayer.width, this.acumLayer.height);
      this.acumClave = clave;
    }
    this.acumFrame = frame;
    m.drawImage(plana, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
    return this.acumLayer;
  }

  /**
   * Lo que la hoja le tapa a la foto quieta de la pagina izquierda: el
   * semiplano que hay que BORRAR, listo para `punch`. Sale de la recta que el
   * usuario calibro para este cuadro (ver CORTE_FOTO).
   *
   * Devuelve null cuando no hay nada que tapar -antes de CORTE_LO-, para que el
   * llamador no punce y la foto se vea entera.
   */
  private corteFoto(frame: number, ox: number, oy: number, scale: number, box: Box, main: HTMLCanvasElement): HTMLCanvasElement | null {
    const i = frame - CORTE_LO;
    if (i <= 0) return null;
    const ult = CORTE_FOTO.length - 1;
    const k = Math.min(Math.floor(i), ult);
    // Pasado el ultimo cuadro calibrado la recta se queda quieta: alli ya pasa
    // por debajo de la foto entera y la deja tapada del todo, que es lo que
    // hace la hoja una vez posada.
    const t = k >= ult ? 0 : i - k;
    const A = CORTE_FOTO[k];
    const B = CORTE_FOTO[Math.min(k + 1, ult)];
    const ax = A[0] + (B[0] - A[0]) * t;
    const ay = A[1] + (B[1] - A[1]) * t;
    const bx = A[2] + (B[2] - A[2]) * t;
    const by = A[3] + (B[3] - A[3]) * t;
    const lado = A[4];

    this.corteLayer = this.ensureLayer(this.corteLayer, main.width, main.height);
    const m = this.corteLayer.getContext('2d');
    if (!m) return null;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalAlpha = 1;
    m.globalCompositeOperation = 'source-over';
    m.clearRect(box.x, box.y, box.w, box.h);
    m.fillStyle = '#000';

    // El vector director va NORMALIZADO. Sin normalizar, el semiplano se
    // construye multiplicando la longitud del segmento por L y las esquinas del
    // poligono se van a las decenas de miles de pixeles: el recorte deja de
    // caer donde toca.
    const dx = bx - ax;
    const dy = by - ay;
    const n = Math.hypot(dx, dy) || 1;
    const ux = dx / n;
    const uy = dy / n;
    // `lado` marca el semiplano que se CONSERVA; aqui se pinta el contrario.
    const nx = uy * lado;
    const ny = -ux * lado;
    const L = 3000;
    const P = (x: number, y: number): [number, number] => [ox + x * scale, oy + y * scale];
    const esq: [number, number][] = [
      P(ax - ux * L, ay - uy * L),
      P(ax + ux * L, ay + uy * L),
      P(ax + ux * L + nx * L, ay + uy * L + ny * L),
      P(ax - ux * L + nx * L, ay - uy * L + ny * L),
    ];
    m.beginPath();
    m.moveTo(esq[0][0], esq[0][1]);
    for (let j = 1; j < esq.length; j++) m.lineTo(esq[j][0], esq[j][1]);
    m.closePath();
    m.fill();
    return this.corteLayer;
  }

  /**
   * Silueta del DORSO QUE SE VE, celda a celda: solo los cuadrilateros de `b`
   * cuyos cuatro vertices miran a camara. Es el recorte de la foto entrante.
   *
   * Por que hace falta: la foto se dibuja con `fillOccluded`, o sea que tambien
   * se pinta sobre las celdas que el rollo tapa. Eso es DELIBERADO -sin ello la
   * foto sale acribillada, ver `drawOnMesh`- pero esas celdas ocultas estan
   * proyectadas donde la hoja ya no esta, asi que la foto se salia del canto.
   * Lo unico que la recortaba era `clipPaper`, que solo pregunta "hay papel
   * aqui" y debajo esta la pagina izquierda, de modo que dejaba pasar todo.
   *
   * Medido con reloj virtual sobre la vuelta real: la foto se derramaba fuera
   * de la hoja durante 9 cuadros de pantalla -unos 150ms-, con un pico de 18932
   * pixeles y una diferencia de color media de 350..390 sobre 765 en los
   * ultimos seis. Fuera de ese tramo este recorte no cambia ni un pixel.
   *
   * NO se usa una envolvente convexa de la malla entera: una hoja enrollada no
   * es convexa, y su envolvente deja la foto fuera del papel justo en los
   * cuadros del rollo, que son los que fallaban.
   *
   * Se diferencia de `buildSheetMask` en dos cosas, y las dos a proposito: alli
   * se rellena la malla ENTERA -porque una celda escondida sigue siendo papel-
   * y aqui solo el dorso QUE SE VE -porque lo que se recorta es lo IMPRESO-.
   * Y aqui si se dilata MASK_DILATE, para que el borde de la copia no asome por
   * el canto de la hoja.
   */
  private buildBackMask(
    pts: [number, number][],
    vis: string,
    ox: number,
    oy: number,
    scale: number,
    box: Box,
    main: HTMLCanvasElement,
  ): HTMLCanvasElement | null {
    this.backMaskLayer = this.ensureLayer(this.backMaskLayer, main.width, main.height);
    const m = this.backMaskLayer.getContext('2d');
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
    const g = this.curlGrid;
    let alguna = false;
    for (let r = 0; r < g - 1; r++) {
      for (let c = 0; c < g - 1; c++) {
        const id = [r * g + c, r * g + c + 1, (r + 1) * g + c + 1, (r + 1) * g + c];
        if (!id.every((i) => vis[i] === '1')) continue;
        alguna = true;
        m.beginPath();
        for (let k = 0; k < 4; k++) {
          const p = pts[id[k]];
          const x = ox + p[0] * scale;
          const y = oy + p[1] * scale;
          if (k === 0) m.moveTo(x, y);
          else m.lineTo(x, y);
        }
        m.closePath();
        m.fill();
        m.stroke();
      }
    }
    return alguna ? this.backMaskLayer : null;
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
    // Dos rampas, no una: ver OPEN_TEXT_LO. Fuera de la apertura las dos valen
    // 1, asi que durante la vuelta -donde la malla manda- son indistinguibles.
    const aTexto = AboutBookComponent.ramp(frame, OPEN_TEXT_LO, OPEN_TEXT_HI);
    const aFoto = AboutBookComponent.ramp(frame, OPEN_PHOTO_LO, OPEN_PHOTO_HI);
    if (aTexto <= 0 && aFoto <= 0) return;

    const t = this.transition;
    // `f` redondeado se queda SOLO para lo que necesita un entero de verdad:
    // elegir que historia va en cada cara. Todo lo que es continuo -la malla,
    // las poses y las rampas- recibe el cuadro fraccionario, o el papel se
    // moveria a 60 imagenes por segundo y el contenido a 15 (ver
    // `pintaCuadro`).
    const f = Math.round(frame);
    // `front` es la cara de la hoja que en los cuadros bajos es la página
    // DERECHA (lleva el texto) y `back` la que en los altos es la IZQUIERDA
    // (lleva la foto). `prev()` recorre los mismos cuadros al revés, así que lo
    // único que cambia con el sentido es qué historia va en cada cara.
    const front = !t ? this.current() : t.towardHigh ? t.leaving : t.entering;
    const back = !t ? this.current() : t.towardHigh ? t.entering : t.leaving;
    const mesh = t ? this.meshAt(frame) : null;

    if (!mesh) {
      // Hoja quieta: una sola doble página, sin nada que la ocluya. Sin la
      // malla cargada el relevo cae al medio del recorrido -degrada al
      // comportamiento anterior en vez de romperse.
      const cut = this.curl ? MESH_LO : (MESH_LO + MESH_HI) / 2;
      const page = !t || f < cut ? front : back;
      this.drawRestPhoto(ctx, this.photoPanel(page), frame, ox, oy, scale, aFoto);
      this.drawRestLogo(ctx, this.logoPanel(page), frame, ox, oy, scale, aFoto);
      this.drawRestText(ctx, this.panelDeTexto(page), frame, ox, oy, scale, aTexto);
      return;
    }

    const box = this.contentBox(mesh, ox, oy, scale, main, frame);
    if (!box.w || !box.h) return;
    const shade = this.captureShade(box, main);
    if (!shade) return;
    const paper = this.capturePaper(box, main);
    const mask = this.buildSheetMask(mesh, ox, oy, scale, box, main);
    // Con los cuadros subiendo, la hoja se va de la pagina derecha y cae sobre
    // la izquierda: la de la foto es la que se tapa y la del texto la que se
    // destapa. Al reves cuando se vuelve atras.
    const haciaIzquierda = this.transition?.towardHigh !== false;
    // La foto quieta NO se recorta con la silueta de la malla: lleva su propio
    // corte calibrado a mano, cuadro a cuadro (ver CORTE_FOTO). Al ser una
    // recta por cuadro, y no algo acumulado, vale igual en los dos sentidos.
    const tapaFoto = this.corteFoto(frame, ox, oy, scale, box, main);
    // El texto sigue con la silueta, y con el rastro acumulado cuando es EL el
    // que se tapa -al volver atras-: alli la malla `f` deja de estar sujeta al
    // video en los ultimos cuadros y sin acumular el texto reaparecia.
    const rastro = !haciaIzquierda && mask ? this.acumulaSilueta(mask, frame, haciaIzquierda, ox, oy, scale, box, main) : null;
    const tapaTexto = haciaIzquierda ? mask : rastro;
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
    const punch = (capa: HTMLCanvasElement | null): void => {
      if (!capa) return;
      // Mismo motivo que en stampShaded: `destination-out` toca todo el lienzo
      // si no se acota con un clip.
      cl.save();
      cl.beginPath();
      cl.rect(box.x, box.y, box.w, box.h);
      cl.clip();
      cl.globalCompositeOperation = 'destination-out';
      cl.drawImage(capa, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
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
    const inShadow = mesh.b && backPhoto ? AboutBookComponent.ramp(frame, IN_SHADOW_LO, IN_SHADOW_HI) : 0;
    // Lo que esta QUIETO durante la vuelta -la foto de la pagina izquierda y el
    // texto que se destapa en la derecha- va sobre las mismas superficies de
    // reposo que usa `drawContent` con la hoja parada. Si aqui fueran
    // cuadrilateros planos y alli mallas (o al reves), el traspaso al empezar y
    // al terminar la vuelta volveria a saltar.
    // Ambas llevan la pose del cuadro (ver CurlAsset.pose): durante la vuelta la
    // foto que se va sigue sobre la pagina izquierda de verdad, y el texto que se
    // destapa sobre la pagina de debajo, que NO esta donde estaba la hoja.
    const restL = this.restSurface('left', frame);
    const restR = this.restSurface('right', frame);

    // 1) Sombras de las copias, con `multiply` sobre el cuadro. La de la copia
    //    quieta se recorta igual que ella: si no, al taparla la hoja quedaría
    //    un rectángulo oscuro flotando sobre el papel.
    if (leftPhoto || inShadow > 0) {
      reset();
      if (leftPhoto) {
        // Con el desplazamiento calibrado puesto, igual que en reposo: es la
        // MISMA foto antes y durante la vuelta (ver DY_FOTO_CRUCE), y sin esto
        // pegaria un salto de 6 px en el primer cuadro del giro siguiente.
        this.drawPrintShadow(cl, restL ? this.meshCorners(this.conDyFoto(restL.pts), restL.uv, ox, oy, scale) : this.scaleQuad(CONTENT_LEFT_QUAD, ox, oy, scale));
      }
      punch(tapaFoto);
      if (inShadow > 0 && mesh.b) {
        this.drawPrintShadow(cl, this.meshCorners(mesh.b, SHEET_PHOTO_UV, ox, oy, scale), inShadow);
      }
      clipPaper();
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = aFoto;
      ctx.drawImage(this.contentLayer, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      ctx.restore();
    }

    // 2) Las COPIAS (opacas): la que se va, quieta en la página izquierda y
    //    recortada por la silueta de la hoja, y la que entra, ya impresa en el
    //    dorso de la hoja. Van juntas en una capa que se estampa multiplicada
    //    por la luminancia del cuadro.
    reset();
    if (leftPhoto) {
      if (restL) this.drawOnMesh(cl, leftPhoto, this.conDyFoto(restL.pts), restL.vis, restL.uv, ox, oy, scale);
      else this.drawImageInQuad(cl, leftPhoto, this.scaleQuad(CONTENT_LEFT_QUAD, ox, oy, scale));
    }
    punch(tapaFoto);
    // `ba` decide cuando entra la foto del dorso (ver CurlFrame). Antes la
    // condicion era `bv.includes('1')` —una sola celda de 289— y como el warp
    // rellena las celdas ocultas, bastaba ese pixel de dorso para pintar la
    // foto ENTERA encima de la pagina. Resultado: la foto tapaba el texto
    // desde el cuadro 88, apareciendo y desapareciendo con el ruido de `bv`.
    const ba = mesh.ba ?? (mesh.bv?.includes('1') ? 1 : 0);
    if (backPhoto && mesh.b && mesh.bv && ba > 0.002) {
      // La foto entrante NO se pinta directa sobre la capa: va a la suya, se
      // recorta por el dorso que se ve y solo entonces se junta. Ver
      // `buildBackMask` para por que hace falta y por que no vale el hull.
      const capaB = (this.backLayer = this.ensureLayer(this.backLayer, main.width, main.height));
      const bl = capaB.getContext('2d');
      const recorte = this.buildBackMask(mesh.b, mesh.bv, ox, oy, scale, box, main);
      if (bl && recorte) {
        bl.setTransform(1, 0, 0, 1, 0, 0);
        bl.globalAlpha = 1;
        bl.globalCompositeOperation = 'source-over';
        // Estos lienzos auxiliares nacen en 'low' y ahi el warp sale mas blando.
        bl.imageSmoothingEnabled = true;
        bl.imageSmoothingQuality = 'high';
        bl.clearRect(box.x, box.y, box.w, box.h);
        this.drawOnMesh(bl, backPhoto, mesh.b, mesh.bv, SHEET_PHOTO_UV, ox, oy, scale, true);
        // `destination-in` toca todo el lienzo si no se acota con un clip.
        bl.save();
        bl.beginPath();
        bl.rect(box.x, box.y, box.w, box.h);
        bl.clip();
        bl.globalCompositeOperation = 'destination-in';
        bl.drawImage(recorte, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
        bl.restore();
        bl.globalCompositeOperation = 'source-over';
        cl.globalAlpha = ba;
        cl.drawImage(capaB, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
        cl.globalAlpha = 1;
      } else {
        // Sin capa o sin dorso que recortar se degrada a lo de antes -foto
        // directa- en vez de no pintar nada.
        cl.globalAlpha = ba;
        this.drawOnMesh(cl, backPhoto, mesh.b, mesh.bv, SHEET_PHOTO_UV, ox, oy, scale, true);
        cl.globalAlpha = 1;
      }
    }
    clipPaper();
    this.stampShaded(ctx, this.contentLayer, box, shade, aFoto);

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
      punch(tapaTexto);
      if (frontVisible && frontText) {
        cl.globalAlpha = fa;
        // `frontPts` mezcla plano->malla en los primeros cuadros de la vuelta,
        // para empalmar sin salto con el texto recto de la hoja en reposo.
        this.drawOnMesh(cl, frontText, this.frontPts(mesh, frame), mesh.fv, SHEET_TEXT_UV, ox, oy, scale);
        cl.globalAlpha = 1;
      }
      clipPaper();
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = aTexto;
      ctx.drawImage(this.contentLayer, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      ctx.restore();
    }

    // 4) La MARCA de la pagina de cierre, en un paso propio de `multiply`.
    //
    //    No cabe en el de los textos: a la marca la tapa la silueta de la FOTO
    //    -esta en la pagina izquierda- y al texto la suya, y en un mismo paso
    //    solo cabe un `punch`.
    //
    //    Y no cabe en el de las copias: alli el contenido se estampa OPACO y se
    //    usa dos veces -multiply contra el sombreado y recorte `destination-in`-
    //    lo que eleva su alfa al cuadrado y adelgaza el trazo, exactamente el
    //    problema que llevo los textos a su propio paso.
    const restLogo = this.logoPanel(front);
    const backLogo = this.logoPanel(back);
    const logoEntra = backLogo != null && mesh.b != null && mesh.bv != null && ba > 0.002;
    if (restLogo || logoEntra) {
      reset();
      if (restLogo) {
        if (restL) this.drawOnMesh(cl, restLogo, this.conDyFoto(restL.pts), restL.vis, restL.uv, ox, oy, scale);
        else this.drawImageInQuad(cl, restLogo, this.scaleQuad(CONTENT_LEFT_QUAD, ox, oy, scale));
      }
      punch(tapaFoto);
      if (logoEntra && backLogo && mesh.b && mesh.bv) {
        // `fillOccluded` como en la foto entrante: entre el 106 y el 126 hay
        // hasta 61 de los 169 vertices sin cara visible, y sin rellenarlos el
        // dorso sale acribillado.
        cl.globalAlpha = ba;
        this.drawOnMesh(cl, backLogo, mesh.b, mesh.bv, SHEET_PHOTO_UV, ox, oy, scale, true);
        cl.globalAlpha = 1;
      }
      clipPaper();
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = aFoto;
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
    if (ink) {
      // Misma correccion que en `estampaTinta`, y por el mismo motivo: el warp
      // por celdas de `drawImageInQuad` tambien solapa, asi que con `multiply`
      // puesto en el destino la tinta se aplicaria dos veces en el solape.
      const main = this.canvasRef()?.nativeElement;
      const box = main ? this.contentBox(null, ox, oy, scale, main) : null;
      if (this.estampaTinta(ctx, box, alpha, (c2) => this.drawImageInQuad(c2, img, dst))) return;
    }
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
   * GIRO_LO y GIRO_HI: hay que volver siempre al mismo punto de partida
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
   * contenido si, pero el LIBRO no: entre los dos extremos del giro ha pasado una
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
  private playChain(waypoints: number[], cola?: ChainTail, curva?: (t: number) => number): Promise<void> {
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
      if (cola) {
        // Sin animacion la cola no tiene nada que solapar, pero su efecto de
        // estado -pasar de pagina- sigue haciendo falta.
        cola.alEmpezar?.();
        this.physFrame = cola.frame;
        this.draw(cola.frame);
      }
      return Promise.resolve();
    }

    cancelAnimationFrame(this.raf);
    const durationMs = totalDist * this.msPorCuadro;
    // Por defecto, la curva de siempre. La vuelta de pagina pasa la SUYA (ver
    // `TIEMPO_LINEAL`); la apertura y el reinicio se quedan con esta.
    const ease = curva ?? ((t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2));
    // Instante en que arranca la cola y en que termina todo (ver TAIL_MS).
    const colaEn = cola ? Math.max(0, durationMs - cola.leadMs) : Infinity;
    const finEn = cola ? colaEn + cola.ms : durationMs;
    // Fuera de la zona de Angular: cada tick solo dibuja en el canvas (no toca
    // signals), asi que no hace falta -ni conviene- disparar deteccion de
    // cambios de toda la app en cada uno de los ~60 ticks por segundo.
    return this.zone.runOutsideAngular(
      () =>
        new Promise<void>((resolve) => {
          const start = performance.now();
          let arrancada = false;
          const tick = (now: number): void => {
            const t = now - start;
            const tt = Math.min(1, t / durationMs);
            const f = frameAtProgress(totalDist * ease(tt));
            // Antes de dibujar: los desplazamientos calibrados en este instante
            // (ver DX_TEXTO_CRUCE y DY_FOTO_CRUCE). El reloj que se les pasa
            // cuenta desde el ARRANQUE DEL CRUCE, no desde el de la cadena: es
            // lo que hace que sigan valiendo si cambia la velocidad. Una cadena
            // sin cola -abrir y cerrar el libro- los pone a cero: ahi se vuelve
            // a la pagina 1 y no hay nada que arrastrar.
            const tc = t - colaEn;
            this.textoDx = cola?.dxTexto ? cola.dxTexto(tc) : 0;
            this.fotoDy = cola?.dyFoto ? cola.dyFoto(tc) : 0;
            if (!cola || t < colaEn) {
              this.draw(f);
            } else {
              if (!arrancada) {
                arrancada = true;
                // `alEmpezar` escribe signals (la pagina actual), y esto corre
                // fuera de la zona: sin `zone.run` la deteccion de cambios no
                // se dispara y el contador "04 / 07" y los botones se quedan
                // en el valor anterior hasta el siguiente evento.
                this.zone.run(() => cola.alEmpezar?.());
              }
              const ct = Math.min(1, (t - colaEn) / cola.ms);
              // El origen del cruce es el cuadro VIVO de la cadena mientras
              // esta siga corriendo -no un 137 congelado-, asi que el giro y el
              // rebobinado no se pisan: son el mismo movimiento continuo.
              // Cuando la cadena termina, `tt` se satura y `f` se queda quieto
              // en el final por si solo.
              this.fundido = ct < 1 ? { desde: f, hacia: cola.frame, t: COLA_SIN_SOLAPE(ct) } : null;
              this.draw(cola.frame);
            }
            if (t < finEn) {
              this.raf = requestAnimationFrame(tick);
            } else {
              this.fundido = null;
              this.physFrame = cola ? cola.frame : finalTarget;
              // El desplazamiento NO se limpia: el texto se queda donde la hoja
              // lo dejo (ver DX_TEXTO_CRUCE). Lo que si hace falta es un ultimo
              // dibujo con su valor FINAL, porque a 60Hz es normal que el
              // ultimo tick caiga antes de `finEn` con la curva a medias -por
              // ejemplo en t=1198, con dx 2,88- y el siguiente ya no dibuje: el
              // reposo se quedaria a mitad de camino.
              // `cola.ms` es el final del cruce en el reloj de las tablas:
              // `finEn - colaEn`.
              const fin = cola?.dxTexto ? cola.dxTexto(cola.ms) : this.textoDx;
              const finY = cola?.dyFoto ? cola.dyFoto(cola.ms) : this.fotoDy;
              if (fin !== this.textoDx || finY !== this.fotoDy) {
                this.textoDx = fin;
                this.fotoDy = finY;
                this.draw(this.physFrame);
              }
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
    // La apertura termina en PAGE_REST -su cuadro calibrado, dentro del que el
    // libro deja de rebotar- pero el libro se QUEDA en GIRO_LO, que es de donde
    // arranca la vuelta de pagina. Si no, el primer "siguiente" pagaria un
    // `dissolveTo` de 180 ms para recorrer 56->81 antes de empezar a moverse, y
    // esa es exactamente la pausa que este trabajo quita.
    //
    // Cambiar de cuadro aqui no se ve. Medido sobre el lienzo real (1040x844),
    // en pixeles que cambian mas de 24 niveles:
    //
    //   56 -> 81  (este relevo)          1148
    //   56 -> 57  (un cuadro quieto)      249   <- el grano propio del render
    //   110 -> 111 (un cuadro del giro) 17795
    //
    // O sea, cinco veces el grano de un cuadro quieto -es grano acumulado de 25
    // cuadros- y la quinceava parte de un solo cuadro de la vuelta. Y sobre
    // todo, esta REPARTIDO: el mapa de diferencias no tiene ninguna forma, solo
    // pixeles de borde sueltos. No hay nada que se mueva. Las poses de la
    // pagina izquierda entre esos dos cuadros distan 0,13 px.
    this.physFrame = GIRO_LO;
    this.draw(this.physFrame);
    this.busy.set(false);
  }

  async restart(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() !== LAST) return;
    this.busy.set(true);
    // Se sale de la pagina de cierre con el puntero encima de un boton: sus
    // <a> se destruyen ahi mismo y el `mouseleave` ya no llega nunca, asi que
    // la marca se quedaria puesta y al volver a la 7 el cajetin apareceria
    // encendido sin nadie encima.
    this.marcaSocial(null);
    await this.playChain([PAGE_REST, 1]);
    this.coverOpen.set(false);
    this.current.set(1);
    this.busy.set(false);
  }

  /**
   * El rebobinado va AL FINAL, no al principio.
   *
   * El video trae un solo tramo de vuelta, asi que cada "siguiente" tiene que
   * arrancar en GIRO_LO. Rebobinando al entrar, cada repeticion pagaba ese
   * movimiento por delante: medido, desde el clic pasaban 180ms de rebobinado,
   * luego 780ms con el libro casi quieto -entre 400 y 1800 pixeles cambiando,
   * frente a los 6000-35000 de la vuelta- y solo entonces se levantaba la hoja.
   * Se leia como dos cosas separadas: un movimiento preparatorio, tres cuartos
   * de segundo de nada, y despues la accion. La pagina 1->2 no lo tenia -ahi el
   * libro ya venia en GIRO_LO y el rebobinado era un no-op- y es justo la
   * unica que se sentia bien.
   *
   * Terminando cada accion en el cuadro que SU PROPIA direccion necesita para
   * empezar, repetir "siguiente" o repetir "anterior" ya no tiene nada por
   * delante: el giro arranca al pulsar -medido, 0 pixeles cambiando en los
   * primeros 200ms, igual que la 1->2-. Solo CAMBIAR de direccion sigue pagando
   * un rebobinado de entrada, que con un unico tramo de vuelta es inevitable;
   * pasa de ser el caso habitual a ser el raro.
   *
   * Ese rebobinado final NO va detras del giro sino DENTRO de el: se le pasa a
   * `playChain` como cola y arranca `CUADROS_LEAD_NEXT`/`CUADROS_LEAD_PREV`
   * antes de que la cadena
   * termine, porque puesto detras dejaba ~120ms de nada entre un movimiento y
   * el otro (ver TAIL_MS). Por eso aqui ya no hay ningun `dissolveTo` de
   * salida, y el cambio de pagina viaja en `alEmpezar`.
   */
  async next(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() >= LAST) return;
    this.busy.set(true);
    // No-op salvo que se venga de un "anterior": ahi el libro esta en GIRO_HI.
    await this.dissolveTo(GIRO_LO, SNAP_FADE_MS);
    const entra = this.current() + 1;
    this.transition = { leaving: this.current(), entering: entra, towardHigh: true };
    // Lo que ya estuviera aplicado: es lo que se sostiene hasta que empieza el
    // tramo calibrado, en vez de saltar (ver `dyFotoCruce` y `dxTextoCruce`).
    const dxDesde = this.textoDx;
    const dyDesde = this.fotoDy;
    await this.playChain([GIRO_HI], {
      frame: GIRO_LO,
      ms: TAIL_MS,
      // En CUADROS por `msPorCuadro`, no la constante: el adelanto es "seis
      // cuadros de video antes del final", y eso no puede quedarse en 132 ms si
      // la vuelta cambia de velocidad (ver CUADROS_LEAD_NEXT).
      leadMs: CUADROS_LEAD_NEXT * this.msPorCuadro,
      // Solo "siguiente" lleva desplazamiento CALIBRADO del texto (ver
      // DX_TEXTO_CRUCE). En "anterior" la tabla esta vacia y se usa un espejo.
      dxTexto: (t: number): number => dxTextoCruce(t, dxDesde),
      dyFoto: (t: number): number => dyFotoCruce(t, dyDesde),
      // Se limpia la transicion al EMPEZAR la cola, no al terminar la cadena.
      // El solape arranca en el cuadro 133, el ultimo de la malla, y ahi las dos
      // ramas de `drawContent` ya solo se diferencian en 2225 px (ver
      // CUADROS_LEAD_NEXT); del 134 en adelante son identicas.
      alEmpezar: () => {
        this.transition = null;
        this.current.set(entra);
      },
    }, TIEMPO_LINEAL);
    this.busy.set(false);
  }

  async prev(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() <= 1) return;
    this.busy.set(true);
    // Se sale de la pagina de cierre con el puntero encima de un boton: sus
    // <a> se destruyen ahi mismo y el `mouseleave` ya no llega nunca, asi que
    // la marca se quedaria puesta y al volver a la 7 el cajetin apareceria
    // encendido sin nadie encima.
    this.marcaSocial(null);
    // No-op salvo que se venga de un "siguiente": ahi el libro esta en GIRO_LO.
    await this.dissolveTo(GIRO_HI, SNAP_FADE_MS);
    const entra = this.current() - 1;
    this.transition = { leaving: this.current(), entering: entra, towardHigh: false };
    // El desplazamiento del texto es una propiedad del cuadro de REPOSO, no un
    // gesto de la animacion: en el 81 el papel esta 4,02px a la derecha que en
    // el 139 (ver DX_TEXTO_CRUCE). "Anterior" devuelve el libro al 139, asi que
    // tiene que deshacerlo o el texto se queda corrido para siempre.
    // Esto es un ESPEJO provisional -recorre el tramo con la curva del cruce-,
    // no una calibracion: la tabla de "anterior" esta vacia.
    //
    // Va del valor VIVO al que exige el reposo alto (ver DX_TEXTO_REPOSO_HI), no
    // a cero. Del vivo para que no haya salto al arrancar -medido, poner el
    // valor de golpe cambia 45045 px contra los 96 que mueve la animacion en ese
    // instante: seria un pop de toda la pagina al hacer clic-. Y al valor del
    // reposo alto para que al terminar lo impreso quede SOBRE el papel, venga de
    // donde venga y sea la primera vuelta atras o la quinta.
    const dxDesde = this.textoDx;
    // La foto tiene exactamente el mismo problema, y por la misma razon: sus 5
    // px son una propiedad del cuadro 81, donde la foto queda 12 px de lienzo
    // mas arriba que en el 139 (ver DY_FOTO_CRUCE). Mismo espejo, y mismo
    // destino: el valor que exige el reposo alto, no cero.
    const dyDesde = this.fotoDy;
    await this.playChain([GIRO_LO], {
      frame: GIRO_HI,
      ms: TAIL_MS,
      leadMs: CUADROS_LEAD_PREV * this.msPorCuadro,
      // `t` ya viene contado desde el arranque del cruce, asi que "antes del
      // cruce" es simplemente t<=0 y el desvanecido ocupa sus TAIL_MS.
      dxTexto: (t: number): number => {
        if (t <= 0) return dxDesde;
        return dxDesde + (DX_TEXTO_REPOSO_HI - dxDesde) * COLA_SIN_SOLAPE(Math.min(1, t / TAIL_MS));
      },
      dyFoto: (t: number): number => {
        if (t <= 0) return dyDesde;
        return dyDesde + (DY_FOTO_REPOSO_HI - dyDesde) * COLA_SIN_SOLAPE(Math.min(1, t / TAIL_MS));
      },
      alEmpezar: () => {
        this.transition = null;
        this.current.set(entra);
      },
    }, TIEMPO_LINEAL);
    this.busy.set(false);
  }

  pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  /**
   * Posición y tamaño reales (en px CSS, no de canvas) del área clickeable de
   * cada botón de red, para que caiga exactamente encima del botón que se
   * dibujó en la hoja -misma cadena de proyección que usa el compositor para
   * estamparlo, así que los dos se mueven juntos por definición.
   */
  socialLinkStyle(kind: SocialKind): Record<string, string> {
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
    // Se pasa el cuadro real en el que el libro esta parado. Hoy la superficie
    // de la pagina derecha ya no depende del cuadro -su pose quedo fuera, ver
    // `poseAt`- asi que da igual cual se pase; se deja `physFrame` porque es lo
    // correcto si algun dia esa pagina vuelve a llevar pose.
    const s = this.restSurface('right', this.physFrame);
    const enPantalla = ((): ((u: number, v: number) => { x: number; y: number }) => {
      if (s) {
        const h = AboutBookComponent.quadHomography(AboutBookComponent.uvQuad(s.uv));
        return (u, v) => {
          const enPagina = h(u, v);
          const p = this.meshPoint(s.pts, enPagina.x, enPagina.y, ox, oy, scale);
          return { x: p.x / this.dpr, y: p.y / this.dpr };
        };
      }
      const [tl, tr, br, bl] = this.scaleQuad(CONTENT_RIGHT_QUAD, ox, oy, scale);
      return (u, v) => {
        const top = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u };
        const bottom = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u };
        return { x: (top.x + (bottom.x - top.x) * v) / this.dpr, y: (top.y + (bottom.y - top.y) * v) / this.dpr };
      };
    })();
    const centro = enPantalla(pos.u, pos.v);
    // El area clickeable se MIDE sobre la hoja, no se fija en pixeles: el libro
    // escala con la pantalla y una caja fija dejaria de cubrir el boton pintado
    // -en movil llegaba a ser mas grande que el, tanto que las dos cajas se
    // solapaban y la de Facebook robaba clics a la de Instagram.
    const mu = SOCIAL_BTN.w / PANEL_W / 2;
    const mv = (SOCIAL_BTN.h * SOCIAL_HIT_ALTO) / PANEL_H / 2;
    const izq = enPantalla(pos.u - mu, pos.v);
    const der = enPantalla(pos.u + mu, pos.v);
    const arr = enPantalla(pos.u, pos.v - mv);
    const aba = enPantalla(pos.u, pos.v + mv);
    return {
      left: `${centro.x}px`,
      top: `${centro.y}px`,
      width: `${Math.hypot(der.x - izq.x, der.y - izq.y)}px`,
      height: `${Math.hypot(aba.x - arr.x, aba.y - arr.y)}px`,
    };
  }
}
