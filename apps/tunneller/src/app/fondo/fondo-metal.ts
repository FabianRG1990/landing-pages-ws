import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Escenario } from '../escenario/escenario';

/**
 * El tono de la página (0 negro, 1 blanco) baja sin pausas de la plata
 * suave del hero al negro del pie: cada tramo de scroll oscurece un poco,
 * nunca se queda plano y nunca cae de golpe (ver perfilDeTono).
 */
const TONO_ARRIBA = 0.8;
const TONO_ABAJO = 0.015;
/**
 * El texto pasa de oscuro a claro entre el último texto de «Cómo trabaja»
 * y la cabecera de Control. Bajo el primero el tono no baja de
 * TONO_OSCURO_MIN; el halo de calma de los grises medios (ver FRAG) hace
 * el resto para que todo se lea a 4.5:1 o más.
 */
const ULTIMO_OSCURO = '#recorrido .etapa__texto';
const PRIMERO_CLARO = '#control .cabeza-seccion';
const TONO_OSCURO_MIN = 0.48;
/** Filas de pantalla en las que se manda el tono al sombreador. */
const FILAS = 48;
/** Muestras del perfil a lo largo del documento. */
const MUESTRAS = 512;

/**
 * Perfil del tono a lo largo del documento, de 0 a `alto` px. Arriba el
 * gris baja algo más despacio y abajo algo más deprisa; el paso de un
 * ritmo al otro se reparte en media página (una rampa suave, nunca un
 * escalón), centrado en el cambio de texto [a, b]. La proporción entre los
 * dos ritmos es la justa para que bajo `a` el tono siga en TONO_OSCURO_MIN.
 */
function perfilDeTono(alto: number, a: number, b: number): Float32Array {
  const paso = alto / (MUESTRAS - 1);
  const c = (a + b) / 2;
  const w = alto * 0.25;
  const construir = (k: number) => {
    const t = new Float32Array(MUESTRAS);
    let acc = 0;
    for (let i = 0; i < MUESTRAS; i++) {
      t[i] = acc;
      const x = Math.min(1, Math.max(0, ((i + 0.5) * paso - (c - w)) / (2 * w)));
      acc += (1 + k * x * x * (3 - 2 * x)) * paso;
    }
    for (let i = 0; i < MUESTRAS; i++) {
      t[i] = TONO_ARRIBA - (TONO_ARRIBA - TONO_ABAJO) * (t[i] / acc);
      // Pasado el cambio de texto el gris se hunde algo más, poco a poco,
      // para que el pie llegue a negro de verdad.
      const x = Math.min(1, Math.max(0, ((i + 0.5) * paso - b) / Math.max(1, alto - b)));
      t[i] *= 1 - 0.5 * x * x * (3 - 2 * x);
    }
    return t;
  };
  let lo = 0, hi = 4;
  if (leerPerfil(construir(0), alto, a) >= TONO_OSCURO_MIN) return construir(0);
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (leerPerfil(construir(m), alto, a) >= TONO_OSCURO_MIN) hi = m;
    else lo = m;
  }
  return construir(hi);
}

function leerPerfil(t: Float32Array, alto: number, y: number): number {
  const f = Math.min(MUESTRAS - 1, Math.max(0, (y / alto) * (MUESTRAS - 1)));
  const i = Math.min(MUESTRAS - 2, Math.floor(f));
  return t[i] + (t[i + 1] - t[i]) * (f - i);
}

/** Bloques de texto: detrás de ellos el metal se aplana para que se lean. */
const CALMA =
  '.hero__texto, .cabeza-seccion, .etapa, .tarjeta, .proyecto, .nota, .pie__llamada';

const MAX_ONDAS = 4;
const MAX_CAJAS = 12;

// La receta del metal líquido de las librerías de referencia (Paper
// Shaders, Shader Effects): pliegues fundidos con el dominio deformado
// que inclinan la superficie, y el reflejo de un estudio con tres cajas
// de luz redondas sobre un fondo en penumbra. Donde la superficie está
// plana refleja la penumbra; donde se curva hacia una caja aparece un
// charco de luz nítido que resbala por el metal. Encima, un brillo
// especular fino y un desdoblamiento prismático casi imperceptible.
const FRAG = /* glsl */ `
precision highp float;
#define RELIEVE_ESCALA 2600.0
#define RELIEVE_ALTO 0.6
uniform vec2 uRes;
uniform float uEsc;
uniform float uT;
uniform vec2 uDesp;
uniform float uAgita;
uniform float uFilas[${FILAS}];
uniform float uSigno[${MAX_CAJAS}];
uniform vec4 uOndas[${MAX_ONDAS}];
uniform vec4 uCajas[${MAX_CAJAS}];
uniform float uNCajas;
uniform vec2 uCursor;
uniform vec2 uEstela;
uniform float uPresencia;
uniform float uPrisma;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float caja(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}
float gauss(vec2 d, float r) { return exp(-dot(d, d) / (r * r)); }

// Tono de cada fila: interpolación lineal entre las filas que manda la
// página (cada ${FILAS}-ava parte de la pantalla), tomadas de un perfil
// suave; entre fila y fila hay muy pocos píxeles.
float tonoEn(float y) {
  float f = clamp(y / (uRes.y / uEsc) * ${FILAS - 1}.0, 0.0, ${FILAS - 1}.0);
  float t = uFilas[0];
  for (int i = 1; i < ${FILAS}; i++) {
    t = mix(t, uFilas[i], clamp(f - float(i - 1), 0.0, 1.0));
  }
  return t;
}

// Relieve: pliegues anchos con el dominio deformado, que fluyen despacio,
// más el dedo del cursor y las ondas que lanzan las secciones.
float altura(vec2 q, float relieve) {
  vec2 p = (q + uDesp) / RELIEVE_ESCALA;
  float f = uT * 0.035;
  vec2 w = vec2(snoise(p * 0.55 + vec2(f, 0.0)), snoise(p * 0.55 + vec2(7.3, -f * 0.9)));
  vec2 pw = p + w * 0.85;
  float h = snoise(pw + vec2(0.0, f * 0.6)) + 0.14 * snoise(pw * 2.05 + vec2(3.1, -f));
  h *= relieve * RELIEVE_ALTO * (1.0 + uAgita);
  vec2 d = q - uCursor;
  float estela = gauss(q - (uCursor - uEstela * 0.22), 150.0 + length(uEstela) * 0.12);
  h += uPresencia * (-0.6 * gauss(d, 170.0) - 0.3 * estela * min(1.0, length(uEstela) / 500.0));
  for (int i = 0; i < ${MAX_ONDAS}; i++) {
    vec4 o = uOndas[i];
    float dt = uT - o.z;
    if (dt < 0.0 || dt > 5.0 || o.w <= 0.0) continue;
    float r = length(q - o.xy);
    float fr = (r - dt * 200.0) / 160.0;
    h += o.w * 0.2 * exp(-fr * fr) * exp(-dt * 0.7) * sin((r - dt * 200.0) * 0.022);
  }
  return h;
}

// El estudio reflejado: penumbra con un cielo que se aclara hacia arriba y
// tres cajas de luz (cenital, abajo a la izquierda, derecha) que derivan.
float estudio(vec2 r) {
  float a = uT * 0.02;
  vec2 p = vec2(r.x * cos(a) - r.y * sin(a), r.x * sin(a) + r.y * cos(a));
  float deriva = sin(uT * 0.07) * 0.05;
  float cielo = smoothstep(-0.7, 0.85, p.y);
  float lum = cielo * cielo * 0.4;
  float k = 0.3;
  lum += (1.0 - smoothstep(k * 0.21, k * 1.05, length(p - vec2(deriva, 0.55)))) * 1.75;
  lum += (1.0 - smoothstep(k * 0.25, k * 1.25, length(p - vec2(deriva - 0.45, -0.4)))) * 1.15;
  lum += (1.0 - smoothstep(k * 0.23, k * 1.15, length(p - vec2(deriva + 0.55, 0.1)))) * 1.1;
  return lum;
}

// Del brillo del estudio al gris de la página: la superficie plana queda
// en el tono de esa altura y los reflejos suben o bajan alrededor.
float metal(float lum, float tono) {
  float d = lum - 0.12;
  // Cerca del negro los reflejos se apagan: el pie se lee negro, con un
  // brillo tenue.
  float sube = mix(0.2, 0.08, tono) * mix(0.3, 1.0, smoothstep(0.02, 0.3, tono));
  float baja = mix(0.05, 0.12, tono);
  return tono + (d > 0.0 ? sube * (1.0 - exp(-d * 1.4)) : baja * d / 0.12);
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uEsc;
  float tono = tonoEn(q.y);

  // Calma detrás del texto, y hacia dónde alejar el gris: +1 si el texto
  // es oscuro (se aclara), -1 si es claro (se oscurece), 0 en las tarjetas.
  // El sentido se suma bloque a bloque, ponderado por su calma: si se
  // eligiera el del bloque más cercano, donde dos bloques empatan el halo
  // saltaría y dibujaría una recta de lado a lado.
  float calma = 0.0;
  float signo = 0.0;
  for (int i = 0; i < ${MAX_CAJAS}; i++) {
    if (float(i) >= uNCajas) break;
    vec4 b = uCajas[i];
    float d = caja(q - (b.xy + b.zw * 0.5), b.zw * 0.5);
    float c = 1.0 - smoothstep(-10.0, 280.0, d);
    calma = max(calma, c);
    signo += c * uSigno[i];
  }
  signo = clamp(signo, -1.0, 1.0);
  float relieve = 1.0 - 0.6 * calma;

  float e = 2.0;
  float h = altura(q, relieve);
  float gx = (altura(q + vec2(e, 0.0), relieve) - h) / e * 1900.0;
  float gy = (altura(q + vec2(0.0, e), relieve) - h) / e * 1900.0;
  vec3 n = normalize(vec3(-gx * 0.17, gy * 0.17, 1.0));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);

  // Brillo especular fino de una luz alta a la izquierda.
  vec3 H = normalize(vec3(-0.35, 0.55, 1.0));
  float esp = pow(max(dot(n, H), 0.0), 220.0) * 0.35;

  float lumG = estudio(R.xy) + esp;
  // Desdoblamiento prismático: el azul mira el estudio un poco girado y el
  // rojo, simétrico; más fuerte en las pendientes. Casi imperceptible.
  float dth = uPrisma * (0.4 + (1.0 - n.z) * 1.3);
  float lumB = estudio(vec2(R.x + R.y * dth, R.y - R.x * dth)) + esp;
  float lumR = 2.0 * lumG - lumB;

  vec3 col = vec3(metal(lumR, tono), metal(lumG, tono), metal(lumB, tono));
  // Detrás del texto el metal se funde con el tono de esa altura, un
  // punto más lejos del color del texto. El sentido lo da el texto, no el
  // tono: así no hay ningún umbral de gris en el que el fondo salte.
  // En los grises medios (donde cambia el texto) el halo se separa más.
  float halo = mix(0.015, 0.12, 1.0 - smoothstep(0.08, 0.25, abs(tono - 0.46)));
  col = mix(col, vec3(tono), calma * 0.45) + signo * halo * 0.85;
  col += 0.02 * (1.0 - q.y / (uRes.y / uEsc));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

/**
 * El fondo de toda la página: una lámina de metal líquido en escala de
 * grises que refleja un estudio de luz. Su tono baja de forma continua de
 * la plata del hero al negro del pie (ver perfilDeTono).
 *
 * El cursor (o el dedo al arrastrar) empuja el metal con inercia: hunde la
 * superficie y deja una estela que se cierra sola; su fuerza está acotada,
 * así que un movimiento rápido no la vuelve caótica. Las secciones pueden
 * lanzar una onda suave con `tunneller:onda` ({x, y} en px de pantalla).
 *
 * Un solo triángulo a pantalla completa, a menos píxeles que la pantalla
 * (el metal es de baja frecuencia) y con calidad adaptable. Con
 * movimiento reducido se dibuja solo al desplazarse.
 */
@Component({
  selector: 'app-fondo-metal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #lienzo aria-hidden="true"></canvas>`,
  styles: `
    canvas {
      position: fixed;
      inset: 0;
      z-index: -1;
      width: 100vw;
      height: 100lvh;
      pointer-events: none;
    }
  `,
})
export class FondoMetal {
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly doc = inject(DOCUMENT);
  private readonly escenario = inject(Escenario);
  private readonly destruir = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.montar());
  }

  private montar(): void {
    const canvas = this.lienzo().nativeElement;
    const html = this.doc.documentElement;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) {
      html.classList.add('sin-metal');
      return;
    }
    const sombreador = (tipo: number, src: string) => {
      const s = gl.createShader(tipo);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    const vs = sombreador(gl.VERTEX_SHADER, VERT);
    const fs = sombreador(gl.FRAGMENT_SHADER, FRAG);
    if (prog && vs && fs) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
    }
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      html.classList.add('sin-metal');
      return;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u('uRes'), esc: u('uEsc'), t: u('uT'), desp: u('uDesp'), agita: u('uAgita'),
      filas: u('uFilas'), ondas: u('uOndas'), prisma: u('uPrisma'),
      cajas: u('uCajas'), nCajas: u('uNCajas'), signo: u('uSigno'),
      cursor: u('uCursor'), estela: u('uEstela'), presencia: u('uPresencia'),
    };
    html.classList.add('con-metal');

    const tactil = matchMedia('(pointer: coarse)').matches;
    const reducido = this.escenario.reducido();
    // Píxeles de búfer por píxel CSS: el metal es de baja frecuencia.
    let escala = tactil ? 0.55 : 0.7;

    // ---- El cursor: posición con inercia y velocidad acotada ----
    let ox = innerWidth / 2, oy = innerHeight / 2; // objetivo
    let cx = ox, cy = oy; // posición suavizada
    let vx = 0, vy = 0; // estela suavizada (px/s)
    let presencia = 0, quiere = 0;
    let quietoDesde = 0;
    const apuntar = (x: number, y: number) => {
      ox = x;
      oy = y;
      quiere = 1;
      quietoDesde = 0;
    };
    // Ratón y lápiz por puntero; el dedo por touchmove, porque al hacer
    // scroll el navegador se queda el gesto y deja de mandar pointermove.
    const alMover = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') apuntar(e.clientX, e.clientY);
    };
    const alArrastrar = (e: TouchEvent) => {
      const d = e.touches[0];
      if (d) apuntar(d.clientX, d.clientY);
    };
    const alSalir = () => (quiere = 0);
    addEventListener('pointermove', alMover, { passive: true });
    addEventListener('touchstart', alArrastrar, { passive: true });
    addEventListener('touchmove', alArrastrar, { passive: true });
    addEventListener('touchend', alSalir, { passive: true });
    this.doc.documentElement.addEventListener('pointerleave', alSalir);

    // ---- Ondas suaves que lanzan las secciones ----
    const ondas = Array.from({ length: MAX_ONDAS }, () => [0, 0, -99, 0]);
    let siguiente = 0;
    let t = 0;
    const alOndear = (e: Event) => {
      if (reducido) return;
      const d = (e as CustomEvent<{ x: number; y: number; fuerza?: number }>).detail;
      ondas[siguiente] = [d.x, d.y, t, d.fuerza ?? 1];
      siguiente = (siguiente + 1) % MAX_ONDAS;
    };
    addEventListener('tunneller:onda', alOndear);

    // ---- Medidas de la página ----
    let cajasEl: HTMLElement[] = [];
    let signos: number[] = [];
    // El sentido del halo de cada bloque sale del color de su texto.
    const signoDe = (el: HTMLElement) => {
      if (el.matches('.tarjeta, .proyecto')) return 0;
      const [r, g, b] = (getComputedStyle(el).color.match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? 1 : -1;
    };
    // El perfil de tono se rehace solo si cambia la página (alto o las dos
    // marcas del cambio de texto, en coordenadas de documento).
    let perfil: Float32Array | null = null;
    let clavePerfil = '';
    const filas = new Float32Array(FILAS);
    let grisCabecera = -1;
    const marca = (sel: string, borde: 'top' | 'bottom', ultimo: boolean) => {
      const els = this.doc.querySelectorAll<HTMLElement>(sel);
      const el = ultimo ? els[els.length - 1] : els[0];
      const r = el?.getBoundingClientRect();
      return r ? Math.round((borde === 'top' ? r.top : r.bottom) + scrollY) : null;
    };
    // Las clases cambian a menudo (la etapa actual, los revelados): se
    // vuelve a buscar una sola vez, en el siguiente fotograma.
    let rebuscar = true;
    const mo = new MutationObserver(() => (rebuscar = true));
    mo.observe(this.doc.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

    let dy = 0;
    let ultimoScroll = scrollY;
    let agita = 0;
    let ancho = 0, alto = 0;
    let ultimo = performance.now();
    let lentos = 0, cuadros = 0;
    let bucle = 0;
    let sucio = true;

    const pintar = (dt: number) => {
      const w = Math.max(1, Math.round(innerWidth * escala));
      const h = Math.max(1, Math.round(canvas.clientHeight * escala));
      if (w !== ancho || h !== alto) {
        canvas.width = ancho = w;
        canvas.height = alto = h;
        gl.viewport(0, 0, w, h);
      }
      // El metal va unido a la página, a media velocidad (profundidad).
      const ds = scrollY - ultimoScroll;
      ultimoScroll = scrollY;
      dy += ds * 0.4;
      agita += (Math.min(0.5, Math.abs(ds) / 120) - agita) * Math.min(1, dt * 2);

      // Inercia del cursor: la posición sigue al puntero con retraso y la
      // estela es su velocidad suavizada y acotada.
      if (dt > 0) {
        const k = 1 - Math.exp(-dt * 7);
        const px = cx, py = cy;
        cx += (ox - cx) * k;
        cy += (oy - cy) * k;
        const lim = 900;
        const nvx = Math.max(-lim, Math.min(lim, (cx - px) / dt));
        const nvy = Math.max(-lim, Math.min(lim, (cy - py) / dt));
        const kv = 1 - Math.exp(-dt * 5);
        vx += (nvx - vx) * kv;
        vy += (nvy - vy) * kv;
        // Si el puntero se queda quieto mucho rato, el hueco se cierra.
        quietoDesde += dt;
        const objetivo = quiere * (quietoDesde > 2.5 ? 0.35 : 1);
        presencia += (objetivo - presencia) * (1 - Math.exp(-dt * 2.5));
      }

      const vh = innerHeight;
      if (rebuscar) {
        rebuscar = false;
        cajasEl = Array.from(this.doc.querySelectorAll<HTMLElement>(CALMA));
        signos = cajasEl.map(signoDe);
      }
      const altoDoc = this.doc.documentElement.scrollHeight;
      const a = marca(ULTIMO_OSCURO, 'bottom', true) ?? altoDoc * 0.55;
      const b = Math.max(a + 1, marca(PRIMERO_CLARO, 'top', false) ?? altoDoc * 0.6);
      const clave = `${altoDoc}|${a}|${b}`;
      if (clave !== clavePerfil || !perfil) {
        clavePerfil = clave;
        perfil = perfilDeTono(altoDoc, a, b);
      }
      // La cabecera toma el gris del metal a su altura, un punto más lejos
      // del color de su texto, y el texto pasa a claro sobre el metal hondo
      // (con margen, para que no parpadee).
      const tc = leerPerfil(perfil, altoDoc, scrollY + 36);
      const oscura = html.classList.contains('cabecera-oscura') ? tc < 0.5 : tc < 0.44;
      html.classList.toggle('cabecera-oscura', oscura);
      const gris = Math.round(Math.min(0.93, Math.max(0.04, oscura ? tc - 0.14 : tc + 0.2)) * 255);
      if (gris !== grisCabecera) {
        grisCabecera = gris;
        html.style.setProperty('--gris-cabecera', `${gris} ${gris} ${gris}`);
      }
      const altoLienzo = canvas.clientHeight;
      for (let i = 0; i < FILAS; i++)
        filas[i] = leerPerfil(perfil, altoDoc, scrollY + (i / (FILAS - 1)) * altoLienzo);
      const cajas: number[] = [];
      const signo: number[] = [];
      cajasEl.forEach((el, i) => {
        if (cajas.length === MAX_CAJAS * 4) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom < -80 || r.top > vh + 80) return;
        cajas.push(r.left, r.top, r.width, r.height);
        signo.push(signos[i] ?? 0);
      });
      const nCajas = cajas.length / 4;
      while (cajas.length < MAX_CAJAS * 4) cajas.push(0, 0, 0, 0);
      while (signo.length < MAX_CAJAS) signo.push(0);

      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.esc, escala);
      gl.uniform1f(U.t, t);
      gl.uniform2f(U.desp, 0, dy);
      gl.uniform1f(U.agita, reducido ? 0 : agita);
      gl.uniform1fv(U.filas, filas);
      gl.uniform1fv(U.signo, signo);
      // El prisma solo con ratón: en el teléfono los tres canales iguales.
      gl.uniform1f(U.prisma, tactil ? 0 : 0.011);
      gl.uniform4fv(U.ondas, ondas.flat());
      gl.uniform4fv(U.cajas, cajas);
      gl.uniform1f(U.nCajas, nCajas);
      gl.uniform2f(U.cursor, cx, cy);
      gl.uniform2f(U.estela, vx, vy);
      gl.uniform1f(U.presencia, reducido ? 0 : presencia);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const cuadro = (ahora: number) => {
      bucle = requestAnimationFrame(cuadro);
      const dt = Math.min(ahora - ultimo, 64) / 1000;
      ultimo = ahora;
      if (reducido) {
        // Quieto: solo se redibuja si la página se movió.
        if (scrollY !== ultimoScroll || sucio) {
          sucio = false;
          pintar(0);
        }
        return;
      }
      t += dt;
      // Calidad adaptable: si el equipo no llega, menos píxeles.
      cuadros++;
      if (dt > 0.021) lentos++;
      if (cuadros === 45) {
        if (lentos > 12 && escala > 0.4) escala = Math.max(0.4, escala * 0.85);
        cuadros = 0;
        lentos = 0;
      }
      pintar(dt);
    };
    bucle = requestAnimationFrame(cuadro);
    const alRedimensionar = () => (sucio = true);
    addEventListener('resize', alRedimensionar);

    this.destruir.onDestroy(() => {
      cancelAnimationFrame(bucle);
      removeEventListener('pointermove', alMover);
      removeEventListener('touchstart', alArrastrar);
      removeEventListener('touchmove', alArrastrar);
      removeEventListener('touchend', alSalir);
      removeEventListener('tunneller:onda', alOndear);
      removeEventListener('resize', alRedimensionar);
      this.doc.documentElement.removeEventListener('pointerleave', alSalir);
      mo.disconnect();
      html.classList.remove('con-metal', 'cabecera-oscura');
      html.style.removeProperty('--gris-cabecera');
    });
  }
}
