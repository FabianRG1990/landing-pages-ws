/**
 * TEMPORAL — panel de diagnóstico para el fallo reportado en Safari de iOS
 * (iPhone, iOS 26.5): scroll durísimo, deriva en diagonal y el libro que no
 * llega a dibujarse nunca. Ninguno de los tres se reproduce en WebKit de
 * escritorio con Playwright, que no tiene ni el techo de memoria de iOS ni su
 * pila de gestos, así que el único instrumento posible es el teléfono real.
 *
 * Se activa SOLO con `?diag=1` en la URL: un visitante normal no lo ve ni
 * paga su coste. Cuando el caso se cierre, este archivo se borra entero junto
 * con sus llamadas (`diagRegistra` en el hero y en el libro, `instalaDiag` en
 * app.ts) — son cuatro sitios, todos marcados con la palabra DIAG.
 */

export type DiagFuente = () => Record<string, unknown>;

const fuentes = new Map<string, DiagFuente>();

/** ¿Pidió el visitante el panel? Falso en el servidor y en una visita normal. */
export function diagActivo(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('diag') === '1';
}

/**
 * Publica un bloque de estado. Se llama SIEMPRE (es una línea y no cuesta
 * nada); quien decide si se lee es `instalaDiag`, que solo corre con `?diag=1`.
 */
export function diagRegistra(nombre: string, f: DiagFuente): void {
  fuentes.set(nombre, f);
}

/**
 * Cuentafotogramas. Se mira el PEOR intervalo de la última ventana, no la
 * media: una animación que va a 60 y da un parón de 250 ms se lee mal en la
 * media y se ve fatal en pantalla. Es justo lo que hay que poder leer en el
 * teléfono mientras pasa la cortina.
 */
const reloj = { fps: 0, peor: 0 };
function arrancaReloj(): void {
  let previo = 0;
  let peorVentana = 0;
  let cuenta = 0;
  let inicio = 0;
  const paso = (t: number): void => {
    if (previo) {
      const dt = t - previo;
      if (dt > peorVentana) peorVentana = dt;
      cuenta++;
      if (t - inicio >= 500) {
        reloj.fps = Math.round((cuenta * 1000) / (t - inicio));
        reloj.peor = Math.round(peorVentana);
        cuenta = 0;
        peorVentana = 0;
        inicio = t;
      }
    } else {
      inicio = t;
    }
    previo = t;
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function pinta(pre: HTMLElement): void {
  const partes: string[] = [];
  for (const [nombre, f] of fuentes) {
    let cuerpo: string;
    try {
      cuerpo = Object.entries(f())
        .map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join('\n');
    } catch (e) {
      cuerpo = `  <la propia fuente falló: ${String(e)}>`;
    }
    partes.push(`▸ ${nombre}\n${cuerpo}`);
  }
  const d = document.documentElement;
  partes.push(
    [
      '▸ pagina',
      `  FPS: ${reloj.fps}   peor pausa: ${reloj.peor} ms   <- disparar la cortina y mirar aqui`,
      `  viewport: ${window.innerWidth}x${window.innerHeight}  dpr ${window.devicePixelRatio}`,
      `  scrollX: ${Math.round(window.scrollX)}   <- distinto de 0 = deriva lateral`,
      `  scrollW/clientW: ${d.scrollWidth}/${d.clientWidth}`,
      `  scrollY: ${Math.round(window.scrollY)} de ${d.scrollHeight}`,
      `  coarse: ${matchMedia('(pointer: coarse)').matches}  reduce: ${matchMedia('(prefers-reduced-motion: reduce)').matches}`,
      `  memoria: ${(performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 'n/d'}`,
    ].join('\n'),
  );
  pre.textContent = partes.join('\n\n');
}

export function instalaDiag(): void {
  if (typeof document === 'undefined' || !diagActivo()) return;

  const caja = document.createElement('div');
  caja.setAttribute('data-diag', '1');
  // `fixed` + `pointer-events: none` para no robarle ni un toque a la página
  // que estamos midiendo: un panel que intercepta gestos falsearía justo lo
  // que se quiere observar.
  caja.style.cssText = [
    'position:fixed',
    'left:0',
    'right:0',
    'bottom:0',
    'z-index:2147483647',
    'max-height:46vh',
    'overflow:auto',
    'pointer-events:none',
    'background:rgba(10,12,6,0.92)',
    'color:#d8e8a0',
    'font:11px/1.35 ui-monospace,Menlo,Consolas,monospace',
    'padding:8px 10px',
    'white-space:pre',
    '-webkit-user-select:text',
    'user-select:text',
  ].join(';');

  const pre = document.createElement('div');
  caja.appendChild(pre);
  document.body.appendChild(caja);

  // Un refresco por fotograma sería ruido ilegible en un teléfono; 4 veces por
  // segundo se lee y sigue siendo suficiente para ver un contador subir
  // mientras el dedo se mueve.
  arrancaReloj();
  pinta(pre);
  setInterval(() => pinta(pre), 250);
}
