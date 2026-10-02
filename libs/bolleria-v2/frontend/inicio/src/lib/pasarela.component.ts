import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * «Escrito en harina»: la pasarela entre el hero y el libro.
 *
 * Es la misma idea que el zigzag de siempre -imagen a un lado, texto al otro, y
 * se cruzan en cada tramo-, pero ninguna de las dos piezas «entra» deslizándose:
 *
 *   - la imagen la ESTAMPA un sello de madera que baja, aprieta y se levanta, y
 *     lo que queda es la huella en tinta sepia, del mismo grabado que el trigo
 *     del fondo;
 *   - el título lo ESCRIBE un dedo sobre un puñado de harina, letra a letra y
 *     trazo a trazo: el surco deja ver la mesa y la harina apartada se amontona
 *     a los lados.
 *
 * ── La coreografía
 *
 * Cada tramo es una escena que se queda FIJA un momento (`position: sticky`
 * dentro de un contenedor algo más alto que ella), lo justo para terminar.
 *
 * El scroll DISPARA y nada más. Cuando la escena va SUBIENDO, ya a la vista, la
 * secuencia -estampar, escribir, enseñar el texto- se reproduce entera a su
 * ritmo (`FASES`, en segundos), y ese ritmo es siempre el mismo: la rueda no la
 * acelera, no la frena y no la deshace. Subiendo, lo hecho se queda hecho; solo
 * cuando la escena sale entera por abajo se reinicia, sin verse, para volver a
 * estamparse la próxima vez que se baje.
 *
 * Así se llegó aquí:
 *   - atada píxel a píxel al scroll, cada fase corta era un salto de rueda, y
 *     darles sitio pedía 7,5 pantallas;
 *   - arrastrada por el scroll para que la palabra acabara antes de irse, el
 *     sello se comprimía en unos fotogramas y entraba «a la fuerza»;
 *   - arrancando ya con la escena quieta, esta se quedaba siete golpes de rueda
 *     sin moverse y el scroll se sentía a baches.
 * Una mano estampa y escribe a su velocidad, no a la de la rueda. Por eso arranca
 * antes de que la escena se detenga: a un ritmo de lectura normal la palabra
 * acaba con la escena ya quieta. Bajando muy deprisa puede irse escribiéndose,
 * y es lo que se prefiere a que la rueda la atropelle.
 *
 * Lo único que corre por su cuenta es el polvillo que levanta el dedo, que es
 * decorativo y se apaga solo.
 *
 * DEMOSTRACIÓN: los textos y las imágenes son de relleno.
 */
interface Tramo {
  n: string;
  hora: string;
  titulo: string;
  texto: string;
  sello: string;
  /** El texto que corre por el borde de la huella, abajo. */
  orla: string;
}

/** Lo que dura la secuencia de un tramo, en segundos. */
const DURACION = 1.8;

/**
 * Cuándo pasa cada cosa, en segundos, pasado a fracción de `DURACION`.
 *
 * Son DOS animaciones que arrancan juntas, y ninguna espera a la otra:
 *
 *   - el sello: baja en 0,65 s -un objeto grande que se posa; por debajo de
 *     medio segundo entraba como un golpe, «agresivo, como puesto a la
 *     fuerza»-, aprieta, se despega recto y se aparta;
 *   - lo escrito: la hora aparece al momento, el dedo escribe 1,5 s a velocidad
 *     constante y el texto entra cuando la palabra está acabando.
 *
 * Antes la escritura esperaba a que el sello se fuera, y bajando a buen ritmo
 * lo único que se llegaba a ver era una fila de sellos sobre harina sin nada
 * escrito.
 */
const FASES = {
  bajaDesde: 0 / DURACION,
  apoya: 0.65 / DURACION,
  levanta: 0.8 / DURACION,
  /** Se levanta recto hasta aquí y desde aquí se aparta hacia fuera. */
  aparta: 1.0 / DURACION,
  fuera: 1.45 / DURACION,
  horaHasta: 0.35 / DURACION,
  escribeDesde: 0.1 / DURACION,
  escribeHasta: 1.6 / DURACION,
  textoDesde: 1.3 / DURACION,
  textoHasta: 1.8 / DURACION,
};

/**
 * La secuencia se dispara cuando el borde de arriba de la escena sube hasta
 * esta fracción de la pantalla: el sello ya se ve entero, y la escena aún tiene
 * ese trecho por subir antes de quedarse fija.
 */
const DISPARO = 0.35;

/** La letra en trazo único, en el formato de Vara.js (ver `assets/pasarela/LEEME.txt`). */
interface FuenteTrazo {
  p: { tf: number; space: number };
  c: Record<string, { paths: { d: string; mx: number; my: number }[] }>;
}

/** Ancho del surco que deja el dedo, en fracción de la altura de la letra (`tf`). */
const SURCO = 0.078;
/**
 * Ancho de la máscara que destapa lo escrito, en surcos. Tiene que cubrir el
 * montón de harina apartada entero: si lo corta, alrededor de cada letra se ve
 * el borde duro de la máscara (pasó: un contorno claro, como una pegatina).
 */
const ORILLA = 3.4;

/** Un trazo del título, colocado: se dibuja tal cual o hasta una longitud. */
interface Trazo {
  camino: Path2D;
  /** Dónde va su origen, en unidades de la letra. */
  tx: number;
  ty: number;
  /** Lo que mide, en unidades de la letra. */
  largo: number;
  /** Dónde empieza dentro del título entero. */
  desde: number;
  /** Puntos a lo largo del trazo, ya en píxeles del lienzo: x, y, x, y… */
  puntos: Float32Array;
  /** La longitud recorrida en cada punto. */
  recorrido: Float32Array;
}

interface Lienzo {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** La harina sin tocar. */
  limpia: HTMLCanvasElement;
  /** La harina con el título entero ya escrito. */
  escrita: HTMLCanvasElement;
  /** Lo que lleva escrito el dedo hasta ahora: por ahí se ve `escrita`. */
  mascara: HTMLCanvasElement;
  tmp: HTMLCanvasElement;
  trazos: Trazo[];
  total: number;
  /** De unidades de la letra a píxeles del lienzo. */
  escala: number;
  ox: number;
  oy: number;
  /** Ancho de la máscara, en unidades de la letra: el surco y sus orillas. */
  anchoMascara: number;
  /** La zona que cambia al escribir; el resto del lienzo no se toca. */
  zona: [number, number, number, number];
  dpr: number;
  /** Último avance pintado; NaN obliga a pintar. */
  pintado: number;
  /** Hasta dónde había escrito el dedo en el fotograma anterior. */
  escrito: number;
}

interface Mota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  r: number;
}

interface Piezas {
  tramo: HTMLElement;
  sello: HTMLElement;
  estampa: HTMLElement;
  sombra: HTMLElement;
  /** La misma sombra ya difuminada: se cruzan por opacidad (ver `estampa`). */
  sombraBlanda: HTMLElement;
  huella: HTMLElement;
  harina: HTMLElement;
  hora: HTMLElement;
  cuerpo: HTMLElement;
  lienzo: Lienzo | null;
  motas: Mota[];
  /** Lado hacia el que entra y sale el sello: hacia fuera de la página. */
  lado: number;
  /** Avance del tramo ya suavizado, y el último aplicado al DOM. */
  avance: number;
  aplicado: number;
  /** Medidas con las que se construyó el lienzo: si no cambian, no se rehace. */
  medida: string;
}

/** Tramos rectos con que se aproxima cada curva al medirla y recorrerla. */
const PASOS_CURVA = 16;

/**
 * Recorre un camino de la fuente y devuelve puntos a lo largo de él y lo que
 * mide. La fuente solo usa `m`, `c` (cúbicas relativas, que pueden encadenarse
 * sin repetir la letra) y `z`; cualquier otra orden se ignora.
 */
function muestrea(d: string, ox: number, oy: number): { puntos: number[]; largo: number } {
  const fichas = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const puntos: number[] = [];
  let largo = 0;
  let x = 0;
  let y = 0;
  let x0 = 0;
  let y0 = 0;
  let orden = '';
  let i = 0;
  const num = () => parseFloat(fichas[i++]);
  const apunta = (nx: number, ny: number) => {
    if (puntos.length) largo += Math.hypot(nx + ox - puntos[puntos.length - 2], ny + oy - puntos[puntos.length - 1]);
    puntos.push(nx + ox, ny + oy);
  };
  while (i < fichas.length) {
    if (/[a-zA-Z]/.test(fichas[i])) orden = fichas[i++];
    if (orden === 'm' || orden === 'M') {
      const dx = num();
      const dy = num();
      x = orden === 'm' ? x + dx : dx;
      y = orden === 'm' ? y + dy : dy;
      x0 = x;
      y0 = y;
      if (!puntos.length) puntos.push(x + ox, y + oy);
      // Tras un `m`, los pares que siguen son líneas.
      orden = orden === 'm' ? 'l' : 'L';
    } else if (orden === 'l' || orden === 'L') {
      const dx = num();
      const dy = num();
      x = orden === 'l' ? x + dx : dx;
      y = orden === 'l' ? y + dy : dy;
      apunta(x, y);
    } else if (orden === 'c' || orden === 'C') {
      const r = orden === 'c';
      const c1x = num() + (r ? x : 0);
      const c1y = num() + (r ? y : 0);
      const c2x = num() + (r ? x : 0);
      const c2y = num() + (r ? y : 0);
      const ex = num() + (r ? x : 0);
      const ey = num() + (r ? y : 0);
      for (let k = 1; k <= PASOS_CURVA; k++) {
        const t = k / PASOS_CURVA;
        const u = 1 - t;
        apunta(
          u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
          u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
        );
      }
      x = ex;
      y = ey;
    } else if (orden === 'z' || orden === 'Z') {
      x = x0;
      y = y0;
      apunta(x, y);
      orden = '';
    } else {
      i++;
    }
  }
  return { puntos, largo };
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const tramo = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const suave = (t: number) => t * t * (3 - 2 * t);
const sale = (t: number) => 1 - (1 - t) * (1 - t);

@Component({
  selector: 'bol-pasarela',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pasarela.component.html',
  styleUrl: './pasarela.component.scss',
})
export class PasarelaComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly tramos: Tramo[] = [
    {
      n: '01',
      hora: 'Nº 01 · Las tres de la madrugada',
      titulo: 'Masa madre',
      texto:
        'Antes que nadie se despierta ella. La alimentamos cada noche con harina y agua, y a las tres ya está viva, llena de burbujas, lista para empezar.',
      sello: 'assets/pasarela/sello-1.webp',
      orla: 'Nº 01 · Masa madre',
    },
    {
      n: '02',
      hora: 'Nº 02 · Las cuatro y media',
      titulo: 'A mano',
      texto:
        'Cada pieza se pliega y se forma a mano, sin prisa y sin atajos. La masa avisa cuándo está lista; nosotros solo sabemos escucharla.',
      sello: 'assets/pasarela/sello-2.webp',
      orla: 'Nº 02 · Hecho a mano',
    },
    {
      n: '03',
      hora: 'Nº 03 · Las seis en punto',
      titulo: 'Al horno',
      texto:
        'Sale la primera hornada: corteza que cruje, miga abierta y ese olor que llega hasta la esquina. Ahí empieza el día para todos.',
      sello: 'assets/pasarela/sello-3.webp',
      orla: 'Nº 03 · Recién horneado',
    },
  ];

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => this.arranca(destroyRef));
  }

  private arranca(destroyRef: DestroyRef): void {
    const raiz = this.host.nativeElement;
    const quieto = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const piezas: Piezas[] = Array.from(
      raiz.querySelectorAll<HTMLElement>('.bol-pas__tramo'),
    ).map((t, i) => ({
      tramo: t,
      sello: t.querySelector('.bol-pas__sello')!,
      estampa: t.querySelector('.bol-pas__estampa')!,
      sombra: t.querySelector('.bol-pas__sombra')!,
      sombraBlanda: t.querySelector('.bol-pas__sombra--blanda')!,
      huella: t.querySelector('.bol-pas__huella')!,
      harina: t.querySelector('.bol-pas__harina')!,
      hora: t.querySelector('.bol-pas__hora')!,
      cuerpo: t.querySelector('.bol-pas__cuerpo')!,
      lienzo: null,
      motas: [],
      lado: i % 2 === 0 ? -1 : 1,
      avance: NaN,
      aplicado: NaN,
      medida: '',
    }));

    // Los lienzos se construyen solo cuando la sección se acerca, un tramo por
    // fotograma, y solo si sus medidas cambiaron: hacerlo de golpe en la carga
    // eran tareas de medio segundo en un teléfono modesto.
    const harina = new Image();
    harina.decoding = 'async';
    let harinaLista = false;
    let fuente: FuenteTrazo | null = null;
    let vivo = true;
    let cerca = false;
    let raf = 0;
    let construccion = 0;
    let ultimo = performance.now();

    const construye = () => {
      if (construccion || !vivo || !cerca || !fuente || !harinaLista) return;
      const p = piezas.find((q) => q.medida !== this.medida(q));
      if (!p) return;
      const f = fuente;
      construccion = requestAnimationFrame(() => {
        construccion = 0;
        if (!vivo) return;
        p.lienzo = this.lienzo(p, harina, f);
        p.medida = this.medida(p);
        pide();
        construye();
      });
    };

    const fotograma = (ahora: number) => {
      raf = 0;
      if (!vivo) return;
      const dt = Math.min(64, ahora - ultimo);
      ultimo = ahora;
      const vh = window.innerHeight;
      const paso = dt / 1000 / DURACION;
      // Primero todas las lecturas y después todas las escrituras.
      const cajas = piezas.map((p) => p.tramo.getBoundingClientRect());
      let sigue = false;
      piezas.forEach((p, i) => {
        const r = cajas[i];
        // Dónde va la secuencia (0 a 1). Una vez disparada corre sola hasta el
        // final, a su ritmo, haga lo que haga el scroll.
        const disparada = r.top <= vh * DISPARO;
        if (quieto) p.avance = 1;
        else if (r.top >= vh) p.avance = 0;
        else if (Number.isNaN(p.avance) || r.bottom < -vh)
          // Ya pasada y lejos no hay nada que animar: se da por hecha. Así, al
          // llegar con un enlace a mitad de página no se ve correr.
          p.avance = r.bottom < 0 ? 1 : 0;
        else if (disparada || p.avance > 0) p.avance = Math.min(1, p.avance + paso);
        if (p.avance > 0 && p.avance < 1) sigue = true;
        else if (disparada && p.avance === 0) sigue = true;
        const a = p.avance;
        if (a !== p.aplicado) {
          this.estampa(p, a);
          const t = tramo(a, FASES.textoDesde, FASES.textoHasta);
          p.cuerpo.style.opacity = String(suave(t));
          p.cuerpo.style.transform = `translateY(${(1 - sale(t)) * 10}px)`;
          p.aplicado = a;
        }
        const w = tramo(a, FASES.escribeDesde, FASES.escribeHasta);
        if (p.lienzo && (p.motas.length || p.lienzo.pintado !== w)) {
          this.pinta(p, w, dt, !quieto);
          sigue ||= p.motas.length > 0;
        }
      });
      if (sigue) pide();
    };

    const pide = () => {
      if (!raf && vivo && cerca) raf = requestAnimationFrame(fotograma);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        cerca = e.isIntersecting;
        if (cerca) {
          ultimo = performance.now();
          pide();
          construye();
        }
      },
      // Con una pantalla de adelanto: el primer lienzo ya está hecho cuando la
      // escena llega.
      { rootMargin: '100% 0px' },
    );
    io.observe(raiz);

    const alMoverse = () => pide();
    window.addEventListener('scroll', alMoverse, { passive: true });
    window.addEventListener('resize', alMoverse, { passive: true });

    let reloj: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(reloj);
      reloj = setTimeout(construye, 120);
    });
    piezas.forEach((p) => ro.observe(p.harina));

    // `decode()` y no `onload`: la harina llega ya descodificada, fuera del hilo
    // principal, y el primer `drawImage` no la descodifica de golpe.
    harina.src = 'assets/pasarela/harina.webp';
    harina
      .decode()
      .catch(() => undefined)
      .then(() => {
        harinaLista = harina.naturalWidth > 0;
        construye();
      });
    fetch('assets/pasarela/satisfy-trazo.json')
      .then((r) => r.json() as Promise<FuenteTrazo>)
      .then((f) => {
        fuente = f;
        construye();
      })
      .catch(() => undefined);

    destroyRef.onDestroy(() => {
      vivo = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(construccion);
      io.disconnect();
      ro.disconnect();
      clearTimeout(reloj);
      window.removeEventListener('scroll', alMoverse);
      window.removeEventListener('resize', alMoverse);
    });
  }

  /** Lo que decide el tamaño del lienzo: si no cambia, no hay que rehacerlo. */
  private medida(p: Piezas): string {
    const c = p.harina;
    return `${c.clientWidth}x${c.clientHeight}@${Math.min(2, window.devicePixelRatio || 1)}`;
  }

  /**
   * El sello, sobre el recorrido del tramo (ver `FASES`):
   *
   *   baja      aparece despacio en el aire, algo grande -cerca del ojo- y un
   *             poco girado, con la sombra lejos y blanda, y se posa: arranca y
   *             frena suave, sin golpe;
   *   apoya     aprieta un pelo y la tinta aparece debajo;
   *   levanta   sube RECTO: se despega de la huella sin arrastrarla, y la sombra
   *             se separa;
   *   aparta    ya en el aire, se va hacia fuera de la página y se desvanece al
   *             final, cuando ha dejado libre la huella.
   */
  private estampa(p: Piezas, a: number): void {
    const F = FASES;
    const baja = suave(tramo(a, F.bajaDesde, F.apoya));
    const aprieta = Math.sin(Math.PI * tramo(a, F.apoya, F.levanta));
    const sube = sale(tramo(a, F.levanta, F.aparta));
    const va = suave(tramo(a, F.aparta, F.fuera));
    const bajando = a < F.apoya;
    // Altura sobre la mesa: 1 lejos, 0 apoyado.
    const h = bajando ? 1 - baja : 0.55 * sube + 0.45 * va;
    // Recorridos cortos: con 50 % de desplazamiento, 28° de giro y un 30 % de
    // escala el sello cruzaba media columna en la bajada y se veía lanzado.
    const dx = p.lado * (bajando ? 26 * h : 120 * va);
    const dy = bajando ? -16 * h : -10 * h;
    const esc = 1 + 0.14 * h - 0.02 * aprieta;
    const giro = p.lado * (bajando ? -12 * h : 10 * va);
    // Aparece a lo largo de la primera mitad de la bajada, no de golpe.
    const op = bajando
      ? suave(tramo(a, F.bajaDesde, F.apoya * 0.5))
      : 1 - suave(tramo(va, 0.5, 1));
    p.estampa.style.transform = `translate(${dx}%, ${dy}%) rotate(${giro}deg) scale(${esc})`;
    p.estampa.style.opacity = String(op);
    // La sombra cae abajo a la derecha (luz de arriba a la izquierda) y se
    // separa del sello cuanto más alto está; pegada a la mesa es corta y dura.
    // NO crece con él: el sello se ve más grande porque se acerca al ojo, pero
    // su sombra sobre la mesa mide lo que mide el sello.
    //
    // Lo blanda que es tampoco se anima con `filter: blur()`: eso repinta la
    // sombra en cada fotograma, y en Safari un filtro animado hunde el scroll.
    // Son dos sombras ya difuminadas -una dura, otra blanda- que se cruzan por
    // opacidad, que el compositor mueve sin repintar nada.
    const sombra = `translate(${dx + 52 * h}%, ${dy + 64 * h}%) scale(${0.97 + 0.06 * h})`;
    const opSombra = op * (0.85 - 0.25 * h);
    p.sombra.style.transform = sombra;
    p.sombra.style.opacity = String(opSombra * (1 - h));
    p.sombraBlanda.style.transform = sombra;
    p.sombraBlanda.style.opacity = String(opSombra * h);

    const tinta = suave(tramo(a, F.apoya + 0.01, F.levanta - 0.02));
    p.huella.style.opacity = String(tinta);
    p.huella.style.transform = `scale(${1 + 0.03 * (1 - tinta) - 0.012 * aprieta}) rotate(${p.lado * -3}deg)`;
    p.hora.style.opacity = String(suave(tramo(a, 0, F.horaHasta)));
  }

  /**
   * Pinta lo que lleva escrito el dedo. Solo se toca la zona del título: el
   * resto del lienzo es harina quieta.
   *
   * Lo escrito es `escrita` vista a través de una máscara: los trazos recorridos
   * hasta ahora, en orden, con el ancho del surco y sus orillas y la punta
   * redonda de la yema. En el trazo que está a medias la máscara se corta justo
   * donde va el dedo.
   */
  private pinta(p: Piezas, w: number, dt: number, conMotas: boolean): void {
    const l = p.lienzo!;
    const { ctx } = l;
    const [zx, zy, zw, zh] = l.zona;
    const largo = l.total * w;

    ctx.clearRect(zx, zy, zw, zh);
    ctx.drawImage(l.limpia, zx, zy, zw, zh, zx, zy, zw, zh);
    if (largo > 0) {
      const m = l.mascara.getContext('2d')!;
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.clearRect(zx, zy, zw, zh);
      this.recorre(m, l, largo, l.anchoMascara);
      m.setTransform(1, 0, 0, 1, 0, 0);

      const t = l.tmp.getContext('2d')!;
      t.globalCompositeOperation = 'source-over';
      t.clearRect(zx, zy, zw, zh);
      t.drawImage(l.escrita, zx, zy, zw, zh, zx, zy, zw, zh);
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(l.mascara, zx, zy, zw, zh, zx, zy, zw, zh);
      t.globalCompositeOperation = 'source-over';

      // Fuera la harina donde ya pasó el dedo, y en su sitio la escrita.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(l.mascara, zx, zy, zw, zh, zx, zy, zw, zh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(l.tmp, zx, zy, zw, zh, zx, zy, zw, zh);
    }

    // El dedo aparta harina al avanzar: polvillo que sale de la yema.
    if (conMotas && largo > l.escrito && w > 0 && w < 1) {
      const punta = this.punta(l, largo);
      const avance = (largo - l.escrito) * l.escala;
      const n = Math.min(10, Math.round(avance / (2.5 * l.dpr)));
      const s = l.escala * SURCO;
      for (let i = 0; i < n; i++) {
        p.motas.push({
          x: punta[0] + (Math.random() - 0.5) * s * 0.8,
          y: punta[1] + (Math.random() - 0.5) * s * 0.8,
          vx: (Math.random() - 0.5) * l.dpr * 0.09,
          vy: -(Math.random() * 0.8 + 0.25) * l.dpr * 0.05,
          vida: 1,
          r: (Math.random() * 1.1 + 0.5) * l.dpr,
        });
      }
    }
    l.escrito = largo;

    if (p.motas.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(zx, zy, zw, zh);
      ctx.clip();
      ctx.fillStyle = '#fffaf0';
      for (const mo of p.motas) {
        mo.vida -= dt / 700;
        mo.x += mo.vx * dt;
        mo.y += mo.vy * dt;
        mo.vy += 0.00012 * dt * l.dpr; // vuelven a caer
        if (mo.vida <= 0) continue;
        ctx.globalAlpha = mo.vida * 0.85;
        ctx.beginPath();
        ctx.arc(mo.x, mo.y, mo.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      p.motas = p.motas.filter((mo) => mo.vida > 0);
    }
    l.pintado = p.motas.length ? NaN : w;
  }

  /** Traza los trazos del título hasta `largo`, en el orden en que se escriben. */
  private recorre(
    c: CanvasRenderingContext2D,
    l: Lienzo,
    largo: number,
    ancho: number,
  ): void {
    c.strokeStyle = '#000';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = ancho;
    for (const t of l.trazos) {
      if (largo <= t.desde) break;
      const hecho = largo - t.desde;
      c.setTransform(
        l.escala,
        0,
        0,
        l.escala,
        l.ox + l.escala * t.tx,
        l.oy + l.escala * t.ty,
      );
      // Con la línea discontinua de un solo tramo se corta el trazo justo donde
      // va el dedo. Si ya está entero, sin cortes.
      c.setLineDash(hecho >= t.largo ? [] : [hecho, t.largo + ancho * 2]);
      c.stroke(t.camino);
    }
    c.setLineDash([]);
    // Sin esto el lienzo se queda con la escala de la letra puesta, y lo que se
    // dibuje después en él sale ampliado y fuera de sitio.
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Dónde está la yema cuando se lleva `largo` escrito, en píxeles del lienzo. */
  private punta(l: Lienzo, largo: number): [number, number] {
    for (const t of l.trazos) {
      if (largo > t.desde + t.largo) continue;
      const d = largo - t.desde;
      const r = t.recorrido;
      let i = 0;
      while (i < r.length - 1 && r[i + 1] < d) i++;
      return [t.puntos[i * 2], t.puntos[i * 2 + 1]];
    }
    const t = l.trazos[l.trazos.length - 1];
    return [t.puntos[t.puntos.length - 2], t.puntos[t.puntos.length - 1]];
  }

  /**
   * Coloca las letras del título como hace Vara.js: cada letra a continuación
   * de la anterior según su caja, y cada trazo con su desplazamiento.
   *
   * Los trazos se miden y se recorren con `muestrea`, no con un SVG: medir con
   * `getPointAtLength` costaba 75-170 ms por título en escritorio y más de un
   * segundo en un teléfono modesto, todo en el hilo principal.
   */
  private coloca(
    titulo: string,
    fuente: FuenteTrazo,
  ): {
    trazos: Omit<Trazo, 'puntos' | 'recorrido'>[];
    muestras: number[][];
    caja: [number, number, number, number];
  } {
    const trazos: Omit<Trazo, 'puntos' | 'recorrido'>[] = [];
    const muestras: number[][] = [];
    let pluma = 0;
    let desde = 0;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const letra of titulo) {
      if (letra === ' ') {
        pluma += fuente.p.space;
        continue;
      }
      const g = fuente.c[letra.charCodeAt(0)];
      if (!g) continue;
      const enLetra: {
        d: string;
        mx: number;
        my: number;
        puntos: number[];
        largo: number;
      }[] = [];
      let lx0 = Infinity;
      let lx1 = -Infinity;
      for (const c of g.paths) {
        const { puntos, largo } = muestrea(c.d, c.mx, -c.my);
        for (let i = 0; i < puntos.length; i += 2) {
          lx0 = Math.min(lx0, puntos[i]);
          lx1 = Math.max(lx1, puntos[i]);
        }
        enLetra.push({ ...c, puntos, largo });
      }
      // La letra empieza donde acabó la anterior: se corre lo que sobresale a la izquierda.
      const corre = pluma - lx0;
      for (const c of enLetra) {
        trazos.push({
          camino: new Path2D(c.d),
          tx: c.mx + corre,
          ty: -c.my,
          largo: c.largo,
          desde,
        });
        desde += c.largo;
        const pts = c.puntos.map((v, i) => (i % 2 === 0 ? v + corre : v));
        muestras.push(pts);
        for (let i = 0; i < pts.length; i += 2) {
          x0 = Math.min(x0, pts[i]);
          x1 = Math.max(x1, pts[i]);
          y0 = Math.min(y0, pts[i + 1]);
          y1 = Math.max(y1, pts[i + 1]);
        }
      }
      pluma += lx1 - lx0;
    }
    return { trazos, muestras, caja: [x0, y0, x1, y1] };
  }

  /**
   * Prepara la harina sin tocar y la harina con el título entero escrito, una
   * sola vez por tamaño. Al hacer scroll solo se recorre la máscara.
   */
  private lienzo(
    p: Piezas,
    harina: HTMLImageElement,
    fuente: FuenteTrazo,
  ): Lienzo {
    const caja = p.harina;
    const canvas = caja.querySelector('canvas')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // El lienzo desborda la caja (ver el SCSS): el puñado de harina necesita
    // sitio para deshacerse en polvo; cortado al borde de la caja se veía un
    // rectángulo. Medidas del lienzo y, dentro, las de la caja.
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const bw = caja.clientWidth * dpr;
    const bh = caja.clientHeight * dpr;
    canvas.width = W;
    canvas.height = H;
    const nuevo = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    };

    // La harina: el puñado se dibuja más grande que la caja para que el centro,
    // que es donde está espeso, quede bajo el título; y dos veces, para que
    // tape de verdad la mesa.
    const limpia = nuevo();
    const lc = limpia.getContext('2d')!;
    const hw = bw * 1.22;
    const hh = bh * 1.5;
    lc.drawImage(harina, (W - hw) / 2, (H - hh) / 2, hw, hh);
    lc.globalAlpha = 0.55;
    lc.drawImage(
      harina,
      (W - hw * 0.9) / 2,
      (H - hh * 0.8) / 2,
      hw * 0.9,
      hh * 0.8,
    );
    lc.globalAlpha = 1;

    // El título, del tamaño que quepa, centrado en la caja.
    const titulo = caja.querySelector('.bol-pas__titulo')!.textContent!.trim();
    const {
      trazos: colocados,
      muestras,
      caja: [gx0, gy0, gx1, gy1],
    } = this.coloca(titulo, fuente);
    const tf = fuente.p.tf;
    const escala = Math.min(
      (bh * 0.5) / tf,
      (bw * 0.78) / (gx1 - gx0 + tf * SURCO),
    );
    const ox = W / 2 - (escala * (gx0 + gx1)) / 2;
    const oy = H / 2 - (escala * (gy0 + gy1)) / 2;
    const surco = tf * SURCO;
    const anchoMascara = surco * ORILLA;

    const trazos: Trazo[] = colocados.map((t, i) => {
      const m = muestras[i];
      const puntos = new Float32Array(m.length);
      const recorrido = new Float32Array(m.length / 2);
      let acum = 0;
      for (let j = 0; j < m.length; j += 2) {
        puntos[j] = ox + escala * m[j];
        puntos[j + 1] = oy + escala * m[j + 1];
        if (j) acum += Math.hypot(m[j] - m[j - 2], m[j + 1] - m[j - 1]);
        recorrido[j / 2] = acum;
      }
      return { ...t, puntos, recorrido };
    });
    const total = colocados.reduce((s, t) => s + t.largo, 0);

    const base: Lienzo = {
      canvas,
      ctx: canvas.getContext('2d')!,
      limpia,
      escrita: nuevo(),
      mascara: nuevo(),
      tmp: nuevo(),
      trazos,
      total,
      escala,
      ox,
      oy,
      anchoMascara,
      zona: [0, 0, W, H],
      dpr,
      pintado: NaN,
      escrito: 0,
    };
    // La zona que cambia: el título y sus orillas, con aire para el polvillo.
    const aire = escala * anchoMascara + 40 * dpr;
    const zx = Math.max(0, Math.floor(ox + escala * gx0 - aire));
    const zy = Math.max(0, Math.floor(oy + escala * gy0 - aire));
    base.zona = [
      zx,
      zy,
      Math.min(W, Math.ceil(ox + escala * gx1 + aire)) - zx,
      Math.min(H, Math.ceil(oy + escala * gy1 + aire)) - zy,
    ];

    // El título entero, de una vez, con el ancho que se pida.
    const forma = (ancho: number, dx = 0, dy = 0) => {
      const c = nuevo();
      this.recorre(
        c.getContext('2d')!,
        { ...base, ox: ox + dx, oy: oy + dy },
        total,
        ancho,
      );
      return c;
    };
    // Difuminar con la sombra y no con `ctx.filter`, que Safari no pinta: se
    // dibuja fuera del lienzo y solo su sombra cae dentro.
    const difuso = (
      c: CanvasRenderingContext2D,
      radio: number,
      color: string,
      img: HTMLCanvasElement,
    ) => {
      c.save();
      c.shadowColor = color;
      c.shadowBlur = radio;
      c.shadowOffsetX = W * 3;
      c.translate(-W * 3, 0);
      c.drawImage(img, 0, 0);
      c.restore();
    };
    const s = escala * surco;

    const e = base.escrita.getContext('2d')!;
    e.drawImage(limpia, 0, 0);

    // 1. La harina que aparta el dedo se amontona a los dos lados del surco:
    //    queda más blanca y espesa en una franja a cada lado.
    e.save();
    e.globalCompositeOperation = 'source-atop';
    difuso(e, s * 0.3, 'rgba(255,253,248,0.85)', forma(surco * 1.6));
    e.restore();

    // 2. Esa orilla levantada echa una sombra corta abajo a la derecha (la luz
    //    viene de arriba a la izquierda, como en la mesa del fondo).
    const sombraOrilla = forma(surco * 1.8, s * 0.2, s * 0.25);
    sombraOrilla.getContext('2d')!.globalCompositeOperation = 'destination-out';
    sombraOrilla.getContext('2d')!.drawImage(forma(surco * 1.6), 0, 0);
    e.save();
    e.globalCompositeOperation = 'source-atop';
    difuso(e, s * 0.25, 'rgba(120,84,44,0.16)', sombraOrilla);
    e.restore();

    // 3. El surco: el dedo se lleva la harina y deja ver la mesa de verdad.
    const surcoForma = forma(surco);
    e.save();
    e.globalCompositeOperation = 'destination-out';
    difuso(e, s * 0.12, 'rgba(0,0,0,0.96)', surcoForma);
    e.restore();

    // 4. Debajo de la harina está la MADERA de la mesa: el surco se ve de su
    //    color. La mesa del fondo del sitio es crema -enharinada-, y dejando
    //    ver solo eso el surco salía gris y plano, sin nada que leer.
    const madera = nuevo();
    const md = madera.getContext('2d')!;
    md.drawImage(surcoForma, 0, 0);
    md.globalCompositeOperation = 'source-in';
    md.fillStyle = 'rgb(150,104,58)';
    md.fillRect(0, 0, W, H);
    e.globalAlpha = 0.62;
    difuso(e, s * 0.1, 'rgba(150,104,58,1)', madera);
    e.globalAlpha = 1;

    // 5. En el fondo del surco queda un velo de harina apelmazada.
    const velo = nuevo();
    const v = velo.getContext('2d')!;
    v.drawImage(limpia, 0, 0);
    v.globalCompositeOperation = 'destination-in';
    v.drawImage(surcoForma, 0, 0);
    e.globalAlpha = 0.16;
    e.drawImage(velo, 0, 0);
    e.globalAlpha = 1;

    // 6. Las paredes del surco: la de arriba a la izquierda tapa la luz y deja
    //    una sombra en el fondo junto a ella; la de enfrente la recibe.
    const pared = (dx: number, dy: number, color: string) => {
      const c = forma(surco);
      const k = c.getContext('2d')!;
      k.globalCompositeOperation = 'destination-out';
      k.drawImage(forma(surco, dx, dy), 0, 0);
      const d = nuevo();
      const kd = d.getContext('2d')!;
      difuso(kd, s * 0.12, color, c);
      kd.globalCompositeOperation = 'destination-in';
      kd.drawImage(surcoForma, 0, 0);
      e.drawImage(d, 0, 0);
    };
    pared(s * 0.24, s * 0.3, 'rgba(70,44,20,0.5)');
    pared(-s * 0.2, -s * 0.25, 'rgba(255,250,240,0.55)');

    const ctx = base.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(limpia, 0, 0);
    return base;
  }
}
