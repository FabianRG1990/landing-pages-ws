import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROGRAMAS, SERVICIOS, SITE } from '@adn-business-ui-shared/data/site';

/** Un tramo de la secuencia: empieza en `t`, dura `d`, ambos en 0..1. */
interface Tramo {
  t: number;
  d: number;
}

/** Una fila de la tabla, leida desde la columna a la que pertenece. */
interface Campo {
  etiqueta: string;
  valor: string;
  destacar: boolean;
}

/** Una columna de la tabla, vuelta del reves para el telefono. */
interface Tarjeta {
  clave: string;
  nombre: string;
  eje: string;
  campos: Campo[];
}

/**
 * Los programas.
 *
 * Al llegar no hay tabla. Hay sitio vacio. Con el scroll, las cuatro
 * esquinas del contorno entran desde sus diagonales y se encuentran en el
 * medio de los cantos; la cuadricula se traza regla a regla; la columna de
 * etiquetas entra por la izquierda, las cabeceras caen desde arriba y cada
 * programa se escribe celda a celda. Al final la fila de entregables se
 * tine de ambar: lo que el cliente se lleva a casa.
 *
 * Nada se atenua y nada estaba puesto de antemano. Las piezas no existen y
 * despues existen, que es lo que significa ensamblar.
 *
 * Un unico ScrollTrigger con pin + scrub gobierna todo. Cada pieza lee un
 * solo numero —`--e`, `--rh`, `--rv`— y el CSS deriva de el su traslacion
 * y su opacidad, asi que por fotograma solo se escribe una propiedad por
 * elemento, y solo cuando cambia.
 */
@Component({
  selector: 'app-programas',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './programas.html',
  styleUrl: './programas.scss',
})
export class ProgramasComponent {
  protected readonly p = PROGRAMAS;
  protected readonly s = SERVICIOS;
  protected readonly site = SITE;

  /**
   * La tabla girada: una tarjeta por programa, con sus filas dentro.
   *
   * En el telefono la tabla no cabe —780px de ancho minimo contra 348
   * utiles—, asi que debajo de 900px cada columna se presenta como una
   * tarjeta entera. Esta vista sale del MISMO `PROGRAMAS` que alimenta la
   * tabla: se duplica la plantilla, nunca el texto, de modo que las dos
   * ramas no pueden desincronizarse.
   */
  protected readonly tarjetas: Tarjeta[] = this.p.columnas.map((c, col) => ({
    clave: c.clave,
    nombre: c.nombre,
    eje: c.eje,
    campos: this.p.filas.map((f) => ({
      etiqueta: f.etiqueta,
      valor: f.valores[col],
      destacar: f.destacar,
    })),
  }));

  /** De donde viene cada esquina. El orden es el del marcado: TL, TR, BR, BL. */
  protected readonly esquinas = [
    { dx: '-46px', dy: '-38px' },
    { dx: '46px', dy: '-38px' },
    { dx: '46px', dy: '38px' },
    { dx: '-46px', dy: '38px' },
  ];

  private readonly escena = viewChild.required<ElementRef<HTMLElement>>('escena');
  private readonly marco = viewChild.required<ElementRef<HTMLElement>>('marco');
  private readonly piel = viewChild.required<ElementRef<HTMLElement>>('piel');
  private readonly armazon = viewChild.required<ElementRef<SVGSVGElement>>('armazon');
  private readonly piezas = viewChildren<ElementRef<SVGPathElement>>('pieza');
  private readonly lista = viewChild.required<ElementRef<HTMLElement>>('lista');
  private readonly fichas = viewChildren<ElementRef<HTMLElement>>('ficha');

  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Pantallas de scroll que dura el anclaje. */
  private static readonly PANTALLAS = 2.6;

  /* --- El guion, en fracciones del recorrido ---
     Los tramos se solapan a proposito: mientras la cuadricula todavia se
     esta trazando ya entra la columna de etiquetas, y cada programa pisa un
     poco al anterior. Sin solape la secuencia se lee como una lista de
     pasos y no como algo que se monta. */
  private static readonly MARCO: Tramo = { t: 0.0, d: 0.15 };
  private static readonly ETIQUETAS: Tramo = { t: 0.13, d: 0.1 };
  private static readonly REGLAS: Tramo = { t: 0.17, d: 0.09 };
  private static readonly PIEL: Tramo = { t: 0.2, d: 0.12 };
  private static readonly PROGRAMA: Tramo[] = [
    { t: 0.33, d: 0.1 },
    { t: 0.52, d: 0.1 },
    { t: 0.71, d: 0.1 },
  ];
  private static readonly AMBAR: Tramo = { t: 0.9, d: 0.1 };

  /** La rejilla de celdas: [fila][columna], columna 0 = etiquetas. */
  private rejilla: HTMLElement[][] = [];
  /** El contenido deslizante de cada celda, en la misma rejilla. */
  private contenidos: (HTMLElement | null)[][] = [];
  /** La fila destacada, o null si el dato dejara de marcarla. */
  private filaClave: HTMLElement | null = null;

  private avance = 0;
  /** El teclado llego a la tabla: esconderla deja de tener sentido. */
  private libre = false;
  /** Ultimo valor escrito por elemento y propiedad, para no repetir. */
  private readonly escrito = new WeakMap<Element, Record<string, string>>();

  constructor() {
    afterNextRender(() => {
      if (!this.esNavegador) return;

      // Las tarjetas del telefono tienen su propia entrada y no dependen
      // del anclaje, asi que se arman antes del corte de abajo.
      this.entradaFichas();

      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const angosto = matchMedia('(max-width: 900px)').matches;
      // Sin anclaje la tabla se lee como un documento normal, que es justo
      // el estado que ya deja el CSS. No hay nada que deshacer.
      if (reduce || angosto) return;

      this.recogerRejilla();
      if (this.rejilla.length < 2) return;

      const escena = this.escena().nativeElement;
      escena.classList.add('prog__escena--anima');

      gsap.registerPlugin(ScrollTrigger);
      this.medirArmazon();

      const st = ScrollTrigger.create({
        trigger: escena,
        start: 'top top',
        end: () => `+=${window.innerHeight * ProgramasComponent.PANTALLAS}`,
        pin: true,
        pinSpacing: true,
        scrub: true,
        onUpdate: (self) => this.pintar(self.progress),
      });

      // Estado inicial: sin esto la tabla se ve entera hasta el primer
      // onUpdate y desaparece de golpe al mover la rueda.
      this.pintar(0);

      // El marco cambia de alto cuando la tipografia termina de cargar y en
      // cada reflujo; el contorno se rehace y se repinta donde iba.
      const ro = new ResizeObserver(() => {
        this.medirArmazon();
        this.pintar(this.avance);
      });
      ro.observe(this.marco().nativeElement);

      // Un enlace todavia sin ensamblar con el foco del teclado encima es un
      // fallo de accesibilidad, no un efecto: si alguien tabula hasta aqui,
      // la tabla se monta entera. No se mata el ScrollTrigger —eso soltaria
      // el pin a media pantalla y daria un salto—, solo se deja de pintar.
      const soltar = () => {
        if (this.libre) return;
        this.libre = true;
        this.montarTodo();
      };
      this.marco().nativeElement.addEventListener('focusin', soltar);

      this.destroyRef.onDestroy(() => {
        st.kill();
        ro.disconnect();
        this.marco().nativeElement.removeEventListener('focusin', soltar);
      });
    });
  }

  /**
   * La entrada de las tarjetas del telefono.
   *
   * Cada una sube y aparece cuando cruza el borde de la pantalla, y deja
   * de observarse en cuanto entra: al volver a subir se queda puesta, que
   * es lo que espera quien relee. No toca el scroll —nada de anclar en un
   * aparato donde eso se percibe como que la pagina se trabo— ni pelea
   * con la barra que aparece y desaparece en Safari.
   *
   * El estado de partida lo pone esta clase y no el CSS a secas: sin
   * JavaScript, o antes de que hidrate, las tarjetas ya estan a la vista.
   * Con menos movimiento el CSS quita el desplazamiento y deja solo la
   * aparicion.
   */
  private entradaFichas(): void {
    const fichas = this.fichas().map((r) => r.nativeElement);
    if (!fichas.length) return;

    this.lista().nativeElement.classList.add('prog__tarjetas--anima');

    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('prog__tarjeta--dentro');
          io.unobserve(e.target);
        }
      },
      // El margen negativo evita que dispare con la tarjeta apenas
      // asomando por el canto inferior, que se lee como un parpadeo.
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    for (const f of fichas) io.observe(f);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  /**
   * La tabla, leida como matriz.
   *
   * El orden del documento ya da filas de arriba abajo y celdas de izquierda
   * a derecha, con la columna de etiquetas primero. No hace falta ningun
   * `data-` para saber donde esta cada pieza.
   */
  private recogerRejilla(): void {
    const marco = this.marco().nativeElement;
    const filas = Array.from(marco.querySelectorAll<HTMLTableRowElement>('.tabla tr'));

    this.rejilla = filas.map((tr) => Array.from(tr.children) as HTMLElement[]);
    this.contenidos = this.rejilla.map((celdas) =>
      celdas.map((c) => c.querySelector<HTMLElement>('.tabla__pieza')),
    );
    this.filaClave = marco.querySelector<HTMLElement>('.tabla__clave');
  }

  /**
   * Las cuatro esquinas en L.
   *
   * Cada una cubre media anchura y media altura, de modo que se encuentran
   * en el punto medio de cada canto: ahi la union cae sobre una recta y no
   * se ve. Van medio pixel adentro porque un trazo de 1px se pinta centrado
   * en la linea, y sin ese desplazamiento la mitad cae fuera de la caja.
   */
  private medirArmazon(): void {
    const svg = this.armazon().nativeElement;
    const caja = svg.getBoundingClientRect();
    const w = Math.max(0, caja.width - 1);
    const h = Math.max(0, caja.height - 1);
    if (w <= 0 || h <= 0) return;

    const marco = this.marco().nativeElement;
    const r = Math.min(
      Math.max(0, parseFloat(getComputedStyle(marco).borderTopLeftRadius) || 0),
      w / 2,
      h / 2,
    );
    const o = 0.5;
    const mx = o + w / 2;
    const my = o + h / 2;

    const caminos = [
      // arriba-izquierda: del medio del canto superior a la mitad del izquierdo
      `M ${mx} ${o} H ${o + r} A ${r} ${r} 0 0 0 ${o} ${o + r} V ${my}`,
      `M ${mx} ${o} H ${o + w - r} A ${r} ${r} 0 0 1 ${o + w} ${o + r} V ${my}`,
      `M ${o + w} ${my} V ${o + h - r} A ${r} ${r} 0 0 1 ${o + w - r} ${o + h} H ${mx}`,
      `M ${o} ${my} V ${o + h - r} A ${r} ${r} 0 0 0 ${o + r} ${o + h} H ${mx}`,
    ];

    this.piezas().forEach((ref, i) => ref.nativeElement.setAttribute('d', caminos[i]));
  }

  /**
   * Un tramo devuelve 0 antes de empezar, 1 al terminar, y una `smoothstep`
   * en medio: sin esquinas ni en la salida ni en la llegada.
   */
  private fase(p: number, { t, d }: Tramo, retraso = 0): number {
    const v = (p - t - retraso) / d;
    const u = v < 0 ? 0 : v > 1 ? 1 : v;
    return u * u * (3 - 2 * u);
  }

  private pintar(p: number): void {
    if (this.libre) return;
    this.avance = p;
    const C = ProgramasComponent;

    // 1. el contorno: cuatro piezas que convergen desde sus diagonales,
    //    encendidas en el trayecto y apagadas al encajar
    this.piezas().forEach((ref, i) => {
      const e = this.fase(p, C.MARCO, i * 0.012);
      this.poner(ref.nativeElement, '--e', e);
      this.poner(ref.nativeElement, '--vuelo', 4 * e * (1 - e));
    });

    // 2. la piel del marco, cuando el contorno ya cerro
    this.poner(this.piel().nativeElement, '--montado', this.fase(p, C.PIEL));

    const cols = this.p.columnas.length;

    this.rejilla.forEach((celdas, fila) => {
      for (let col = 0; col < celdas.length; col++) {
        const celda = celdas[col];
        const contenido = this.contenidos[fila][col];

        // 3. la cuadricula. La horizontal barre de izquierda a derecha con un
        //    retraso por columna: la regla viaja, no aparece.
        this.poner(celda, '--rh', this.fase(p, C.REGLAS, fila * 0.012 + col * 0.018));

        // 4. el contenido. La columna de etiquetas entra por la izquierda
        //    antes que nadie; cada programa tiene su propio tramo, y dentro
        //    de el las celdas caen fila a fila.
        const esEtiqueta = col === 0;
        const tramo = esEtiqueta ? C.ETIQUETAS : C.PROGRAMA[Math.min(col - 1, cols - 1)];
        const retraso = esEtiqueta ? fila * 0.011 : fila * 0.026;
        const e = this.fase(p, tramo, retraso);

        if (contenido) this.poner(contenido, '--e', e);

        // La separacion vertical de una columna llega con su programa: es
        // parte de esa pieza, no de la cuadricula comun.
        if (!esEtiqueta) {
          this.poner(celda, '--rv', this.fase(p, tramo, fila * 0.01));
        }
      }
    });

    // 5. el remate: la fila de entregables se tine cuando ya esta todo
    if (this.filaClave) this.poner(this.filaClave, '--ambar', this.fase(p, C.AMBAR));
  }

  /**
   * Escribe una propiedad solo si cambio.
   *
   * Casi todas las piezas pasan la mayor parte del recorrido en 0 o en 1;
   * sin este filtro se reescribirian ~130 propiedades por fotograma para
   * dejarlas como estaban.
   */
  private poner(el: Element, prop: string, valor: number): void {
    const v = valor.toFixed(3);
    let previo = this.escrito.get(el);
    if (!previo) {
      previo = {};
      this.escrito.set(el, previo);
    }
    if (previo[prop] === v) return;
    previo[prop] = v;
    (el as HTMLElement).style.setProperty(prop, v);
  }

  /** Deja la tabla montada y quieta, sin estilos en linea. */
  private montarTodo(): void {
    const limpiar = (el: Element | null, props: string[]) => {
      if (!el) return;
      for (const prop of props) (el as HTMLElement).style.removeProperty(prop);
      this.escrito.delete(el);
    };

    // Con todo en su sitio ya no hay nada que recortar, y la ranura no
    // puede seguir comiendose el anillo de foco de los enlaces.
    this.escena().nativeElement.style.setProperty('--ranura', 'visible');

    for (const ref of this.piezas()) limpiar(ref.nativeElement, ['--e', '--vuelo']);
    // La piel no puede volver a su reposo: fuera del ensamblaje vale 0, y el
    // marco sigue con su borde transparente mientras la clase este puesta.
    this.piel().nativeElement.style.setProperty('--montado', '1');

    this.rejilla.forEach((celdas, fila) => {
      celdas.forEach((celda, col) => {
        limpiar(celda, ['--rh', '--rv']);
        limpiar(this.contenidos[fila][col], ['--e']);
      });
    });
    limpiar(this.filaClave, ['--ambar']);
  }
}
