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
 * El tono de la página baja de forma continua de arriba abajo: plata suave
 * (no blanco) en el hero, grises cada vez más hondos y negro en el pie,
 * sin ningún punto en el que se note el cambio. Cada referencia es un
 * punto de la página (leído en vivo) con su tono (0 negro, 1 blanco).
 * El paso de texto oscuro a texto claro cae entre «Cómo trabaja» y
 * Control, en el espacio sin texto; ahí el gris baja algo más deprisa.
 */
const REFERENCIAS: readonly { sel: string; borde: 'top' | 'bottom'; tono: number }[] = [
  { sel: '#inicio', borde: 'top', tono: 0.8 },
  { sel: '#recorrido', borde: 'top', tono: 0.78 },
  { sel: '.recorrido', borde: 'bottom', tono: 0.7 },
  { sel: '#control .cabeza-seccion', borde: 'top', tono: 0.27 },
  { sel: '#proyectos', borde: 'top', tono: 0.21 },
  { sel: '#demo', borde: 'top', tono: 0.13 },
  { sel: '#demo', borde: 'bottom', tono: 0.06 },
];

/** Bloques de texto: detrás de ellos el metal se aplana para que se lean. */
const CALMA =
  '.hero__texto, .cabeza-seccion, .etapa, .tarjeta, .proyecto, .nota, .pie__llamada';

const N = REFERENCIAS.length;
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
uniform vec2 uRes;
uniform float uEsc;
uniform float uT;
uniform vec2 uDesp;
uniform float uAgita;
uniform float uRefY[${N}];
uniform float uRefT[${N}];
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

// Tono de cada fila: interpolación suave entre las referencias.
float tonoEn(float y) {
  float t = uRefT[0];
  for (int i = 1; i < ${N}; i++) {
    t = mix(t, uRefT[i], smoothstep(uRefY[i - 1], uRefY[i], y));
  }
  return t;
}

// Relieve: pliegues anchos con el dominio deformado, que fluyen despacio,
// más el dedo del cursor y las ondas que lanzan las secciones.
float altura(vec2 q, float relieve) {
  vec2 p = (q + uDesp) / 1900.0;
  float f = uT * 0.05;
  vec2 w = vec2(snoise(p * 0.55 + vec2(f, 0.0)), snoise(p * 0.55 + vec2(7.3, -f * 0.9)));
  vec2 pw = p + w * 0.85;
  float h = snoise(pw + vec2(0.0, f * 0.6)) + 0.14 * snoise(pw * 2.05 + vec2(3.1, -f));
  h *= relieve * (1.0 + uAgita);
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
  float sube = mix(0.5, 0.2, tono);
  float baja = mix(0.08, 0.2, tono);
  return tono + (d > 0.0 ? sube * (1.0 - exp(-d * 1.4)) : baja * d / 0.12);
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uEsc;
  float tono = tonoEn(q.y);

  float calma = 0.0;
  for (int i = 0; i < ${MAX_CAJAS}; i++) {
    if (float(i) >= uNCajas) break;
    vec4 b = uCajas[i];
    float d = caja(q - (b.xy + b.zw * 0.5), b.zw * 0.5);
    calma = max(calma, 1.0 - smoothstep(-10.0, 140.0, d));
  }
  float relieve = 1.0 - 0.88 * calma;

  float e = 2.0;
  float h = altura(q, relieve);
  float gx = (altura(q + vec2(e, 0.0), relieve) - h) / e * 1900.0;
  float gy = (altura(q + vec2(0.0, e), relieve) - h) / e * 1900.0;
  vec3 n = normalize(vec3(-gx * 0.17, gy * 0.17, 1.0));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);

  // Brillo especular fino de una luz alta a la izquierda.
  vec3 H = normalize(vec3(-0.35, 0.55, 1.0));
  float esp = pow(max(dot(n, H), 0.0), 220.0) * 0.9;

  float lumG = estudio(R.xy) + esp;
  // Desdoblamiento prismático: el azul mira el estudio un poco girado y el
  // rojo, simétrico; más fuerte en las pendientes. Casi imperceptible.
  float dth = uPrisma * (0.4 + (1.0 - n.z) * 1.3);
  float lumB = estudio(vec2(R.x + R.y * dth, R.y - R.x * dth)) + esp;
  float lumR = 2.0 * lumG - lumB;

  vec3 col = vec3(metal(lumR, tono), metal(lumG, tono), metal(lumB, tono));
  // Detrás del texto el metal se funde con el tono de esa altura (un punto
  // más lejos del color del texto): con pliegues tan grandes, aplanar no
  // bastaba y en el teléfono una franja de luz cruzaba bajo las letras.
  col = mix(col, vec3(tono + (tono > 0.5 ? 0.04 : -0.03)), calma * 0.7);
  col += 0.02 * (1.0 - q.y / (uRes.y / uEsc));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

/**
 * El fondo de toda la página: una lámina de metal líquido en escala de
 * grises que refleja un estudio de luz. Su tono baja de forma continua de
 * la plata del hero al negro del pie (ver REFERENCIAS).
 *
 * El cursor (o el dedo al arrastrar) empuja el metal con inercia: hunde la
 * superficie y deja una estela que se cierra sola; su fuerza está acotada,
 * así que un movimiento rápido no la vuelve caótica. Las secciones pueden
 * lanzar una onda suave con `tunneller:onda` ({x, y} en px de pantalla).
 *
 * Un solo triángulo a pantalla completa, a menos píxeles que la pantalla
 * (el metal es de baja frecuencia) y con calidad adaptable. Se detiene con
 * la pausa; con movimiento reducido se dibuja solo al desplazarse.
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
      refY: u('uRefY'), refT: u('uRefT'), ondas: u('uOndas'), prisma: u('uPrisma'),
      cajas: u('uCajas'), nCajas: u('uNCajas'),
      cursor: u('uCursor'), estela: u('uEstela'), presencia: u('uPresencia'),
    };
    gl.uniform1fv(U.refT, REFERENCIAS.map((r) => r.tono));
    html.classList.add('con-metal');
    this.escenario.conMetal.set(true);

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
    const refs = REFERENCIAS.map((r) => ({ el: this.doc.querySelector<HTMLElement>(r.sel), borde: r.borde }));
    let cajasEl: HTMLElement[] = [];
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
      }
      // Las referencias en coordenadas de pantalla, siempre crecientes.
      let previo = -1e6;
      const refY = refs.map(({ el, borde }) => {
        const b = el?.getBoundingClientRect();
        const y = b ? (borde === 'top' ? b.top : b.bottom) : previo + 1;
        previo = Math.max(previo + 1, y);
        return previo;
      });
      const cajas: number[] = [];
      for (const el of cajasEl) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.bottom < -80 || b.top > vh + 80) continue;
        cajas.push(b.left, b.top, b.width, b.height);
        if (cajas.length === MAX_CAJAS * 4) break;
      }
      const nCajas = cajas.length / 4;
      while (cajas.length < MAX_CAJAS * 4) cajas.push(0, 0, 0, 0);

      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.esc, escala);
      gl.uniform1f(U.t, t);
      gl.uniform2f(U.desp, 0, dy);
      gl.uniform1f(U.agita, reducido ? 0 : agita);
      gl.uniform1fv(U.refY, refY);
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
      if (this.escenario.pausado()) {
        pintar(0);
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
      html.classList.remove('con-metal');
    });
  }
}
