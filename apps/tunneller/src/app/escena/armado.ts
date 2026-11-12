import { gsap } from 'gsap';

const SVG = 'http://www.w3.org/2000/svg';

/** De dónde llega cada esquina, en el orden TL, TR, BR, BL. */
const DESDE = [
  [-46, -38],
  [46, -38],
  [46, 38],
  [-46, 38],
] as const;

export interface Esquinas {
  readonly piezas: SVGPathElement[];
  readonly quitar: () => void;
}

/**
 * Las cuatro esquinas en L de una pieza, en un SVG encima de ella. Cada una
 * cubre media anchura y media altura, así que se encuentran en el centro
 * de cada canto, sobre una recta, y la unión no se ve. Se miden en píxeles
 * (y se vuelven a medir si la pieza cambia de tamaño) para que el trazo
 * tenga 1 px y la curva el mismo radio que la pieza.
 */
export function esquinas(pieza: HTMLElement, radio: number, color: string): Esquinas {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'trazo');
  svg.setAttribute('aria-hidden', 'true');
  const piezas = [0, 1, 2, 3].map(() => {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', '1');
    svg.appendChild(p);
    return p;
  });
  pieza.appendChild(svg);
  const medir = () => {
    const w = pieza.offsetWidth, h = pieza.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const a = 0.5, d = w - 0.5, b = h - 0.5, cx = w / 2, cy = h / 2;
    const r = Math.max(0, Math.min(radio - 0.5, cx - 1, cy - 1));
    const arco = (x: number, y: number) => `A${r} ${r} 0 0 1 ${x} ${y}`;
    const caminos = [
      `M${a} ${cy}V${a + r}${arco(a + r, a)}H${cx}`,
      `M${cx} ${a}H${d - r}${arco(d, a + r)}V${cy}`,
      `M${d} ${cy}V${b - r}${arco(d - r, b)}H${cx}`,
      `M${cx} ${b}H${a + r}${arco(a, b - r)}V${cy}`,
    ];
    piezas.forEach((p, i) => p.setAttribute('d', caminos[i]));
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(pieza);
  return {
    piezas,
    quitar: () => {
      ro.disconnect();
      svg.remove();
    },
  };
}

/** Las esquinas llegan desde sus diagonales y se juntan. */
export function juntar(tl: gsap.core.Timeline, e: Esquinas, en: number): void {
  e.piezas.forEach((p, i) =>
    tl.fromTo(
      p,
      { x: DESDE[i][0], y: DESDE[i][1], opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' },
      en + i * 0.04,
    ),
  );
}

/** Cuando la pieza ya tiene su propio canto, el trazo se retira. */
export function retirar(tl: gsap.core.Timeline, e: Esquinas, en: number, hasta = 0): void {
  tl.to(e.piezas, { opacity: hasta, duration: 0.3, ease: 'power1.out' }, en);
}

/**
 * Una pantalla que se enciende: primero una raya de luz que se abre a lo
 * ancho y luego la imagen que se abre a lo alto, como un monitor.
 */
export function encender(tl: gsap.core.Timeline, panel: Element, en: number): void {
  tl.fromTo(
    panel,
    { opacity: 0, scaleX: 0.15, scaleY: 0.02 },
    { opacity: 1, scaleX: 1, duration: 0.2, ease: 'power2.out' },
    en,
  ).to(panel, { scaleY: 1, duration: 0.32, ease: 'expo.out' }, en + 0.17);
}

/** El fondo de la placa sube desde abajo, como un líquido que la llena. */
export function llenar(tl: gsap.core.Timeline, pieza: Element, en: number): void {
  tl.fromTo(pieza, { '--llena': 0 }, { '--llena': 1, duration: 0.42, ease: 'power2.inOut' }, en);
}

/** Bloques de texto: suben un poco y aparecen, uno tras otro. */
export function escribir(tl: gsap.core.Timeline, textos: Element[], en: number): void {
  if (textos.length)
    tl.from(textos, { y: 14, opacity: 0, duration: 0.3, stagger: 0.07, ease: 'power3.out' }, en);
}

/**
 * Las cifras de un texto cuentan hasta su valor. Se escribe en el nodo de
 * texto, pero sin pelear con Angular: si el texto cambia por otro lado (el
 * cambio de idioma), ese pasa a ser el original. Al llegar a 1 el texto es
 * exactamente el original.
 */
export function contar(tl: gsap.core.Timeline, elementos: Element[], en: number): () => void {
  const nodos = elementos
    .flatMap((el) => Array.from(el.childNodes))
    .filter((n): n is Text => n instanceof Text && /\d/.test(n.data))
    .map((nodo) => ({ nodo, original: nodo.data, escrito: nodo.data }));
  if (!nodos.length) return () => undefined;
  const estado = { p: 1 };
  const pintar = () => {
    for (const n of nodos) {
      if (n.nodo.data !== n.escrito) n.original = n.nodo.data;
      const t = n.original.replace(/\d+/g, (d) => String(Math.round(Number(d) * estado.p)));
      if (t !== n.nodo.data) n.nodo.data = t;
      n.escrito = t;
    }
  };
  tl.fromTo(estado, { p: 0 }, { p: 1, duration: 0.55, ease: 'power2.out', onUpdate: pintar, onStart: pintar }, en);
  return () => {
    for (const n of nodos) if (n.nodo.data === n.escrito) n.nodo.data = n.original;
  };
}

/** Atajo: los hijos de `en` que casan con `sel`. */
export function $$<T extends Element = HTMLElement>(sel: string, en: ParentNode): T[] {
  return Array.from(en.querySelectorAll<T>(sel));
}

/**
 * La miniatura de cada proyecto se dibuja pieza a pieza, según lo que es:
 * la ruleta gajo a gajo, el tablero casilla a casilla, el kanban columna a
 * columna y el contador de macros trazando sus anillos.
 */
export function dibujarMiniatura(tl: gsap.core.Timeline, svg: SVGSVGElement, i: number, en: number): void {
  const formas = $$<SVGElement>('rect, path, circle', svg);
  if (i === 0) {
    const [fondo, ...resto] = $$<SVGElement>(':scope > rect', svg);
    const gajos = $$<SVGPathElement>('g path', svg);
    const eje = svg.querySelector('g circle');
    tl.from(fondo, { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.25 }, en)
      .from(gajos, { scale: 0, rotation: -70, svgOrigin: '66 60', duration: 0.35, stagger: 0.09, ease: 'back.out(1.6)' }, en + 0.12)
      .from(eje, { scale: 0, transformOrigin: '50% 50%', duration: 0.2, ease: 'back.out(2)' }, en + 0.42)
      .from(resto.slice(0, -1), { x: 14, opacity: 0, duration: 0.22, stagger: 0.06 }, en + 0.2)
      .from(resto.slice(-1), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.28, ease: 'power3.out' }, en + 0.4);
  } else if (i === 1) {
    tl.from(formas, {
      scale: 0,
      opacity: 0,
      transformOrigin: '50% 50%',
      duration: 0.18,
      stagger: { grid: [8, 8], from: 'start', amount: 0.5 },
      ease: 'back.out(2)',
    }, en);
  } else if (i === 2) {
    const columnas = formas.filter((f) => f.getAttribute('fill') === '#1c2336');
    const cabeceras = formas.filter((f) => f.getAttribute('fill') === '#6f7891');
    const fichas = formas.filter((f) => !columnas.includes(f) && !cabeceras.includes(f));
    tl.from(columnas, { scaleY: 0, transformOrigin: '50% 0%', duration: 0.3, stagger: 0.08, ease: 'power3.out' }, en)
      .from(cabeceras, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.2, stagger: 0.08 }, en + 0.18)
      .from(fichas, { y: -12, opacity: 0, duration: 0.24, stagger: 0.05, ease: 'back.out(1.6)' }, en + 0.28);
  } else if (i === 3) {
    const circulos = $$<SVGCircleElement>('circle', svg);
    const pistas = circulos.filter((c) => !c.hasAttribute('stroke-dasharray'));
    const arcos = circulos.filter((c) => c.hasAttribute('stroke-dasharray'));
    tl.from(pistas, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.25, stagger: 0.06 }, en);
    arcos.forEach((c, k) => {
      const valor = c.getAttribute('stroke-dasharray') ?? '0 0';
      const hueco = valor.split(/\s+/)[1] ?? '0';
      tl.fromTo(
        c,
        { attr: { 'stroke-dasharray': `0 ${hueco}` } },
        { attr: { 'stroke-dasharray': valor }, duration: 0.5, ease: 'power2.out' },
        en + 0.15 + k * 0.1,
      );
    });
  } else if (formas.length) {
    tl.from(formas, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.25, stagger: { amount: 0.3 } }, en);
  }
}
