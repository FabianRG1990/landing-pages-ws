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
import { Agua } from './agua';

/** El gris de toda la página: #252525, el mismo que pinta el CSS. */
const TONO = 37 / 255;
/**
 * Cuánto se aparta del gris el metal en reposo (los pliegues que fluyen).
 * Por debajo de 1 para que el fondo acompañe sin competir con el texto;
 * la estela del cursor va aparte y conserva su fuerza.
 */
const PLIEGUES = 0.6;

/** Bloques de texto: detrás de ellos el metal se aplana para que se lean. */
const CALMA =
  '.hero__texto, .cabeza-seccion, .etapa, .tarjeta, .proyecto, .nota, .pie__llamada';

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
#define AGUA_RELIEVE 1.5
#define TONO ${TONO.toFixed(6)}
#define PLIEGUES ${PLIEGUES.toFixed(3)}
uniform vec2 uRes;
uniform float uEsc;
uniform float uT;
uniform vec2 uDesp;
uniform float uAparece;
uniform float uAgita;
uniform vec4 uCajas[${MAX_CAJAS}];
uniform float uNCajas;
uniform sampler2D uAgua;
uniform vec2 uAguaPaso;
uniform float uHayAgua;
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

// Relieve: pliegues anchos con el dominio deformado, que fluyen despacio
// (el agua del cursor va aparte).
float altura(vec2 q, float relieve) {
  vec2 p = (q + uDesp) / RELIEVE_ESCALA;
  float f = uT * 0.035;
  vec2 w = vec2(snoise(p * 0.55 + vec2(f, 0.0)), snoise(p * 0.55 + vec2(7.3, -f * 0.9)));
  vec2 pw = p + w * 0.85;
  float h = snoise(pw + vec2(0.0, f * 0.6)) + 0.14 * snoise(pw * 2.05 + vec2(3.1, -f));
  h *= relieve * RELIEVE_ALTO * (1.0 + uAgita);
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

// El color de la lámina con normal n: el estudio reflejado, con su
// brillo especular y el desdoblamiento prismático.
vec3 color(vec3 n) {
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
  return vec3(metal(lumR, TONO), metal(lumG, TONO), metal(lumB, TONO));
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uEsc;
  float tono = TONO;

  // Calma detrás del texto: ahí el metal se aplana para que se lea.
  float calma = 0.0;
  for (int i = 0; i < ${MAX_CAJAS}; i++) {
    if (float(i) >= uNCajas) break;
    vec4 b = uCajas[i];
    float d = caja(q - (b.xy + b.zw * 0.5), b.zw * 0.5);
    float c = 1.0 - smoothstep(-10.0, 280.0, d);
    calma = max(calma, c);
  }
  float relieve = 1.0 - 0.6 * calma;

  float e = 2.0;
  float h = altura(q, relieve);
  float gx = (altura(q + vec2(e, 0.0), relieve) - h) / e * 1900.0;
  float gy = (altura(q + vec2(0.0, e), relieve) - h) / e * 1900.0;
  vec3 nPliegues = normalize(vec3(-gx * 0.17, gy * 0.17, 1.0));
  vec3 n = nPliegues;
  // El agua del cursor inclina la superficie con su pendiente; detrás del
  // texto se calma como el resto.
  if (uHayAgua > 0.5) {
    vec2 uv = gl_FragCoord.xy / uRes;
    float ax = texture2D(uAgua, uv + vec2(uAguaPaso.x, 0.0)).r - texture2D(uAgua, uv - vec2(uAguaPaso.x, 0.0)).r;
    float ay = texture2D(uAgua, uv + vec2(0.0, uAguaPaso.y)).r - texture2D(uAgua, uv - vec2(0.0, uAguaPaso.y)).r;
    n = normalize(n + vec3(-ax, -ay, 0.0) * AGUA_RELIEVE * relieve);
  }

  // Los pliegues se atenúan hacia el gris (PLIEGUES); lo que añade el agua
  // se suma entero, con la misma fuerza que tenía.
  vec3 soloPliegues = color(nPliegues);
  vec3 col = vec3(tono) + (soloPliegues - vec3(tono)) * PLIEGUES + (color(n) - soloPliegues);
  // Detrás del texto el metal se funde con el mismo gris.
  col = mix(col, vec3(tono), calma * 0.45);
  // Al cargar, el metal despierta: el primer cuadro es el gris plano (el
  // mismo que pinta la página antes de que haya WebGL) y el relieve crece
  // desde ahí, sin ningún salto de color.
  col = mix(vec3(tono), col, uAparece);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

/**
 * El fondo de toda la página: una lámina de metal líquido en escala de
 * grises que refleja un estudio de luz, sobre un gris parejo (#252525)
 * en toda la página. Los pliegues fluyen atenuados (ver PLIEGUES).
 *
 * El cursor (o el dedo al arrastrar) ondula el metal como un dedo que
 * cruza el agua: detrás deja una estela de ondas que se abren hacia los
 * lados y se apagan; la fuerza sigue a la velocidad, acotada, así que un
 * movimiento rápido no la vuelve caótica. Nada más lanza ondas: el
 * contenido que entra no mueve el fondo.
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
      // El agua usa el mismo triángulo: el atributo va en la misma posición.
      gl.bindAttribLocation(prog, 0, 'a');
      gl.linkProgram(prog);
    }
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
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
      aparece: u('uAparece'), res: u('uRes'), esc: u('uEsc'), t: u('uT'), desp: u('uDesp'), agita: u('uAgita'),
      prisma: u('uPrisma'),
      cajas: u('uCajas'), nCajas: u('uNCajas'),
      agua: u('uAgua'), aguaPaso: u('uAguaPaso'), hayAgua: u('uHayAgua'),
    };

    const tactil = matchMedia('(pointer: coarse)').matches;
    const reducido = this.escenario.reducido();
    // Píxeles de búfer por píxel CSS: el metal es de baja frecuencia.
    let escala = tactil ? 0.55 : 0.7;

    let t = 0;

    // ---- El cursor: arrastra el dedo por el agua ----
    const agua = reducido ? null : Agua.crear(gl);
    gl.useProgram(prog);
    let px = NaN, py = NaN; // la última posición del puntero
    const apuntar = (x: number, y: number) => {
      if (agua && !Number.isNaN(px)) {
        // Más deprisa, más ola; acotada para que un tirón no lo vuelva caos.
        const d = Math.hypot(x - px, y - py);
        agua.arrastrar(px, py, x, y, Math.min(1, d / 40) * 0.5);
      }
      px = x;
      py = y;
    };
    // Al salir o levantar el dedo, el siguiente trazo empieza de cero.
    const cortar = () => (px = NaN);
    // Ratón y lápiz por puntero; el dedo por touchmove, porque al hacer
    // scroll el navegador se queda el gesto y deja de mandar pointermove.
    const alMover = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') apuntar(e.clientX, e.clientY);
    };
    const alArrastrar = (e: TouchEvent) => {
      const d = e.touches[0];
      if (d) apuntar(d.clientX, d.clientY);
    };
    const alSalir = cortar;
    addEventListener('pointermove', alMover, { passive: true });
    addEventListener('touchstart', alArrastrar, { passive: true });
    addEventListener('touchmove', alArrastrar, { passive: true });
    addEventListener('touchend', alSalir, { passive: true });
    this.doc.documentElement.addEventListener('pointerleave', alSalir);

    // ---- Medidas de la página ----
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
    let aparece = 0;

    const pintar = (dt: number) => {
      const w = Math.max(1, Math.round(innerWidth * escala));
      const h = Math.max(1, Math.round(canvas.clientHeight * escala));
      if (w !== ancho || h !== alto) {
        canvas.width = ancho = w;
        canvas.height = alto = h;
      }
      if (agua) {
        agua.avanzar(dt, innerWidth, canvas.clientHeight);
        gl.useProgram(prog);
      }
      gl.viewport(0, 0, w, h);
      // El metal va unido a la página, a media velocidad (profundidad).
      const ds = scrollY - ultimoScroll;
      ultimoScroll = scrollY;
      dy += ds * 0.4;
      agita += (Math.min(0.5, Math.abs(ds) / 120) - agita) * Math.min(1, dt * 2);

      const vh = innerHeight;
      if (rebuscar) {
        rebuscar = false;
        cajasEl = Array.from(this.doc.querySelectorAll<HTMLElement>(CALMA));
      }
      const cajas: number[] = [];
      cajasEl.forEach((el) => {
        if (cajas.length === MAX_CAJAS * 4) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom < -80 || r.top > vh + 80) return;
        cajas.push(r.left, r.top, r.width, r.height);
      });
      const nCajas = cajas.length / 4;
      while (cajas.length < MAX_CAJAS * 4) cajas.push(0, 0, 0, 0);

      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.esc, escala);
      gl.uniform1f(U.t, t);
      gl.uniform2f(U.desp, 0, dy);
      gl.uniform1f(U.agita, reducido ? 0 : agita);
      // El prisma solo con ratón: en el teléfono los tres canales iguales.
      gl.uniform1f(U.prisma, tactil ? 0 : 0.011);
      gl.uniform4fv(U.cajas, cajas);
      gl.uniform1f(U.nCajas, nCajas);
      if (agua) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, agua.textura);
        gl.uniform1i(U.agua, 0);
        gl.uniform2f(U.aguaPaso, ...agua.paso);
      }
      gl.uniform1f(U.hayAgua, agua ? 1 : 0);
      // El despertar: 1,6 s con salida suave; con movimiento reducido, ya.
      aparece = reducido ? 1 : Math.min(1, aparece + dt / 1.6);
      gl.uniform1f(U.aparece, 1 - Math.pow(1 - aparece, 3));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Hasta el primer cuadro la página pinta el gris plano por su cuenta;
      // con él ya en el lienzo, el lienzo toma el relevo.
      if (!html.classList.contains('con-metal')) html.classList.add('con-metal');
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
      // Durante el arranque la página aún se está montando: esos cuadros
      // lentos no dicen nada del equipo y no bajan la calidad.
      if (t < 1.5) {
        pintar(dt);
        return;
      }
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
      removeEventListener('resize', alRedimensionar);
      this.doc.documentElement.removeEventListener('pointerleave', alSalir);
      mo.disconnect();
      agua?.liberar();
      html.classList.remove('con-metal');
    });
  }
}
