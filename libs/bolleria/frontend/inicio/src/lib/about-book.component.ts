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
const PAGE_REST = 50;
const PAGE_TURNED = 137;
// --- COREOGRAFIA DE LA VUELTA DE PAGINA ---
// La hoja arranca a moverse en el cuadro 83 y termina de aterrizar en el 133.
// En todo ese tramo su forma NO es un cuadrilatero: se enrolla como una onda,
// y el mejor plano posible ya erra 8.5px en el cuadro 93 y 22px en el 106.
// Por eso la geometria viene de una MALLA de 13x13 vertices por cuadro
// (about-book-curl.json), ajustada como superficie desarrollable —el mismo
// modelo cono→cilindro de Hong, Card & Chen (2006) que usa iBooks—, con una
// cara frontal y una dorsal y su mascara de visibilidad por vertice. El
// contenido se pega a esa malla, asi que acompaña a la hoja en toda la vuelta
// y en los dos sentidos, sin fundidos que lo despeguen del papel.
const MESH_LO = 83;
const MESH_HI = 133;
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
const SHEET_TEXT_UV: [UV, UV, UV, UV] = [
  { u: 0.10186, v: 0.17614 },
  { u: 0.82714, v: 0.14071 },
  { u: 0.85884, v: 0.88876 },
  { u: 0.11236, v: 0.94394 },
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
// Margen interno del panel de TEXTO dentro de su zona (la foto no lleva
// margen: va a sangre hasta las 4 esquinas marcadas a mano, ver
// CONTENT_LEFT_QUAD). Es la fraccion del ancho/alto del panel que queda como
// aire alrededor del parrafo.
const CONTENT_MARGIN = 0.17;
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
  b: [number, number][] | null;
  bv: string | null;
}
interface CurlAsset {
  grid: [number, number];
  frames: Record<string, CurlFrame>;
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
const SOCIAL_POS = { instagram: { u: 0.5, v: 0.63 }, facebook: { u: 0.5, v: 0.74 } };

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
  // Tres lienzos auxiliares del tamaño del canvas, reutilizados cuadro a
  // cuadro (crear un canvas por cuadro seria basura para el GC en pleno 45fps):
  // `contentLayer` junta todo lo que dibujamos nosotros, `maskLayer` la silueta
  // de la hoja que tapa lo que esta quieto, y `shadeLayer` la luminancia del
  // propio video por la que se multiplica el resultado.
  private contentLayer: HTMLCanvasElement | null = null;
  private maskLayer: HTMLCanvasElement | null = null;
  private shadeLayer: HTMLCanvasElement | null = null;
  private paperLayer: HTMLCanvasElement | null = null;
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
      await Promise.all([document.fonts.load('600 32px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"')]);
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

    const marginX = PANEL_W * CONTENT_MARGIN;
    const marginY = PANEL_H * CONTENT_MARGIN;

    if (isClosing) {
      ctx.font = 'italic 500 40px "Cormorant Garamond", serif';
      let y = PANEL_H * 0.42;
      for (const line of story.lines) {
        ctx.fillText(line, PANEL_W / 2, y, PANEL_W * 0.86);
        y += 52;
      }
      this.drawSocialIcon(ctx, SOCIAL_POS.instagram, '#5e6a34', 'instagram');
      this.drawSocialIcon(ctx, SOCIAL_POS.facebook, '#5e6a34', 'facebook');
      return c;
    }

    ctx.font = '400 42px "Cormorant Garamond", serif';
    const wrapWidth = PANEL_W - marginX * 2;
    const ROW_H = 58;
    const PARA_GAP = 20;

    // Envuelve cada parrafo en filas primero, sin dibujar todavia -asi se
    // puede calcular el alto real del bloque completo y centrarlo dentro del
    // margen (antes quedaba siempre pegado arriba, dejando mucho vacio abajo
    // en historias de una sola linea, que es la mayoria).
    const paragraphs: string[][] = story.lines.map((line) => {
      // Minuscula tipografica (como en la referencia del libro): no cambia el
      // contenido real de la historia, solo como se imprime en la pagina.
      const words = line.toLowerCase().split(' ');
      let current = '';
      const rows: string[] = [];
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > wrapWidth && current) {
          rows.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) rows.push(current);
      return rows;
    });

    const totalRows = paragraphs.reduce((sum, rows) => sum + rows.length, 0);
    const blockHeight = totalRows * ROW_H + paragraphs.length * PARA_GAP;
    const contentHeight = PANEL_H - marginY * 2;
    // +34 aproxima el alto visible de la letra por encima de su linea base
    // (cap-height a 42px), para centrar el texto que realmente se ve, no la
    // caja invisible de lineas que arranca en la linea base de la primera.
    let y = marginY + (contentHeight - blockHeight) / 2 + 34;

    for (const rows of paragraphs) {
      for (const row of rows) {
        ctx.fillText(row, PANEL_W / 2, y);
        y += ROW_H;
      }
      y += PARA_GAP;
    }
    this.drawTextDivider(ctx, y - 10);
    return c;
  }

  /** Divisor decorativo bajo el texto: mismo trazo de trigo dorado que el resto del sitio (ver GOLD/WHEAT_ICON_URL), no un adorno inventado aparte. */
  private drawTextDivider(ctx: CanvasRenderingContext2D, y: number): void {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PANEL_W / 2 - 70, y);
    ctx.lineTo(PANEL_W / 2 - 16, y);
    ctx.moveTo(PANEL_W / 2 + 16, y);
    ctx.lineTo(PANEL_W / 2 + 70, y);
    ctx.stroke();
    if (this.wheatIcon) {
      const size = 22;
      ctx.translate(PANEL_W / 2, y);
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
    ctx.font = '600 20px Cinzel, serif';
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
  private restSurface(side: 'left' | 'right'): { pts: [number, number][]; vis: string; uv: readonly UV[] } | null {
    const m = this.curl?.frames[String(side === 'right' ? MESH_LO : MESH_HI)];
    if (!m) return null;
    if (side === 'right') return { pts: m.f, vis: m.fv, uv: SHEET_TEXT_UV };
    return m.b && m.bv ? { pts: m.b, vis: m.bv, uv: SHEET_PHOTO_UV } : null;
  }

  /** Foto quieta de la pagina izquierda. La sombra se derrama FUERA del contenido, asi que va antes. */
  private drawRestPhoto(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement | null,
    ox: number,
    oy: number,
    scale: number,
    alpha = 1,
  ): void {
    if (!img || alpha <= 0) return;
    const s = this.restSurface('left');
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
    ox: number,
    oy: number,
    scale: number,
    alpha = 1,
  ): void {
    if (!img || alpha <= 0) return;
    const s = this.restSurface('right');
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
    for (const face of [mesh.f, mesh.b]) {
      if (!face) continue;
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
      this.drawRestPhoto(ctx, this.photoPanel(page), ox, oy, scale, alpha);
      this.drawRestText(ctx, this.textPanels[page - 1] ?? null, ox, oy, scale, alpha);
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
    const restL = this.restSurface('left');
    const restR = this.restSurface('right');

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
    // `includes('1')`: de los cuadros 120 al 133 la cara frontal esta entera de
    // espaldas y del 83 al 115 no hay dorso; sin este corte se recorren igual
    // las 256 celdas del warp para no dibujar nada.
    // `includes('1')`: del 83 al 115 no hay dorso; sin este corte se recorren
    // igual las 256 celdas del warp para no dibujar nada.
    if (backPhoto && mesh.b && mesh.bv?.includes('1')) {
      this.drawOnMesh(cl, backPhoto, mesh.b, mesh.bv, SHEET_PHOTO_UV, ox, oy, scale, true);
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
    const frontVisible = frontText != null && mesh.fv.includes('1');
    if (rightText || frontVisible) {
      reset();
      if (rightText) {
        if (restR) this.drawOnMesh(cl, rightText, restR.pts, restR.vis, restR.uv, ox, oy, scale);
        else this.drawImageInQuad(cl, rightText, this.scaleQuad(CONTENT_RIGHT_QUAD, ox, oy, scale));
      }
      punch();
      if (frontVisible && frontText) this.drawOnMesh(cl, frontText, mesh.f, mesh.fv, SHEET_TEXT_UV, ox, oy, scale);
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
   * PAGE_REST y PAGE_TURNED, que con el contenido superpuesto ya listo en
   * ambos extremos se ven equivalentes -por eso el salto es imperceptible-
   * para poder reiniciar siempre desde el mismo punto antes de reproducir
   * otra vez el unico tramo de vuelta de pagina capturado en el video.
   */
  private snapTo(frame: number): void {
    if (this.physFrame === frame) return;
    this.physFrame = frame;
    this.draw(frame);
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

  async next(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() >= LAST) return;
    this.busy.set(true);
    this.snapTo(PAGE_REST);
    this.transition = { leaving: this.current(), entering: this.current() + 1, towardHigh: true };
    await this.playChain([PAGE_TURNED]);
    this.transition = null;
    this.current.set(this.current() + 1);
    this.draw(this.physFrame);
    this.busy.set(false);
  }

  async prev(): Promise<void> {
    if (this.busy() || !this.coverOpen() || this.current() <= 1) return;
    this.busy.set(true);
    this.snapTo(PAGE_TURNED);
    this.transition = { leaving: this.current(), entering: this.current() - 1, towardHigh: false };
    await this.playChain([PAGE_REST]);
    this.transition = null;
    this.current.set(this.current() - 1);
    this.draw(this.physFrame);
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
    const [tl, tr, , bl] = this.scaleQuad(CONTENT_RIGHT_QUAD, ox, oy, scale);
    const br = this.scaleQuad(CONTENT_RIGHT_QUAD, ox, oy, scale)[2];
    const top = { x: tl.x + (tr.x - tl.x) * pos.u, y: tl.y + (tr.y - tl.y) * pos.u };
    const bottom = { x: bl.x + (br.x - bl.x) * pos.u, y: bl.y + (br.y - bl.y) * pos.u };
    const px = (top.x + (bottom.x - top.x) * pos.v) / this.dpr;
    const py = (top.y + (bottom.y - top.y) * pos.v) / this.dpr;
    return { left: `${px}px`, top: `${py}px` };
  }
}
