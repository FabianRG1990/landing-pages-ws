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

// En reposo la lámina está plana y pinta TONO exacto, sin degradados ni
// reflejos. Solo el agua del cursor la inclina; ahí aparece el metal: la
// pendiente refleja un estudio con tres cajas de luz (la receta de Paper
// Shaders / Shader Effects), con un brillo especular fino y un
// desdoblamiento prismático casi imperceptible. Al calmarse el agua vuelve
// al gris liso.
const FRAG = /* glsl */ `
precision highp float;
#define AGUA_RELIEVE 1.5
#define TONO ${TONO.toFixed(6)}
uniform vec2 uRes;
uniform float uT;
uniform sampler2D uAgua;
uniform vec2 uAguaPaso;
uniform float uHayAgua;
uniform float uPrisma;

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

// De la diferencia de brillo con la lámina plana al gris: d = 0 es TONO
// exacto, y los reflejos suben o bajan alrededor.
float metal(float d) {
  float sube = mix(0.2, 0.08, TONO) * mix(0.3, 1.0, smoothstep(0.02, 0.3, TONO));
  float baja = mix(0.05, 0.12, TONO);
  return TONO + (d > 0.0 ? sube * (1.0 - exp(-d * 1.4)) : baja * max(d, -0.12) / 0.12);
}

void main() {
  if (uHayAgua < 0.5) {
    gl_FragColor = vec4(vec3(TONO), 1.0);
    return;
  }
  vec2 uv = gl_FragCoord.xy / uRes;
  float ax = texture2D(uAgua, uv + vec2(uAguaPaso.x, 0.0)).r - texture2D(uAgua, uv - vec2(uAguaPaso.x, 0.0)).r;
  float ay = texture2D(uAgua, uv + vec2(0.0, uAguaPaso.y)).r - texture2D(uAgua, uv - vec2(0.0, uAguaPaso.y)).r;
  vec3 n = normalize(vec3(-ax * AGUA_RELIEVE, -ay * AGUA_RELIEVE, 1.0));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);

  // Brillo especular fino de una luz alta a la izquierda.
  vec3 H = normalize(vec3(-0.35, 0.55, 1.0));
  float esp = pow(max(dot(n, H), 0.0), 220.0) * 0.35;
  // Lo que refleja la lámina plana: se resta, para que en reposo quede TONO.
  float plano = estudio(vec2(0.0)) + pow(H.z, 220.0) * 0.35;

  float lumG = estudio(R.xy) + esp - plano;
  // Desdoblamiento prismático: el azul mira el estudio un poco girado y el
  // rojo, simétrico; más fuerte en las pendientes.
  float dth = uPrisma * (0.4 + (1.0 - n.z) * 1.3);
  float lumB = estudio(vec2(R.x + R.y * dth, R.y - R.x * dth)) + esp - plano;
  float lumR = 2.0 * lumG - lumB;

  gl_FragColor = vec4(clamp(vec3(metal(lumR), metal(lumG), metal(lumB)), 0.0, 1.0), 1.0);
}`;

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

/**
 * El fondo de toda la página: un gris parejo (#252525) que es una lámina
 * de mercurio en reposo. El cursor (o el dedo al arrastrar) la ondula como
 * un dedo que cruza el metal líquido: detrás deja una estela de ondas
 * lentas y gruesas que se abren hacia los lados y se apagan; la fuerza
 * sigue a la velocidad, acotada, así que un movimiento rápido no la vuelve
 * caótica.
 *
 * Un solo triángulo a pantalla completa, a menos píxeles que la pantalla
 * y con calidad adaptable. Con movimiento reducido no hay agua: el lienzo
 * pinta el gris liso.
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
    // Sin ondas (movimiento reducido) el fondo es el gris del CSS: no hace
    // falta WebGL.
    if (this.escenario.reducido()) return;
    const canvas = this.lienzo().nativeElement;
    const html = this.doc.documentElement;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return;
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
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    const agua = Agua.crear(gl);
    // Sin agua no hay nada que pintar distinto del gris del CSS.
    if (!agua) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u('uRes'), t: u('uT'), prisma: u('uPrisma'),
      agua: u('uAgua'), aguaPaso: u('uAguaPaso'), hayAgua: u('uHayAgua'),
    };

    const tactil = matchMedia('(pointer: coarse)').matches;
    // Píxeles de búfer por píxel CSS: las ondas son de baja frecuencia.
    let escala = tactil ? 0.55 : 0.7;
    let t = 0;

    // ---- El cursor: arrastra el dedo por el metal ----
    let px = NaN, py = NaN; // la última posición del puntero
    const apuntar = (x: number, y: number) => {
      if (!Number.isNaN(px)) {
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
    addEventListener('pointermove', alMover, { passive: true });
    addEventListener('touchstart', alArrastrar, { passive: true });
    addEventListener('touchmove', alArrastrar, { passive: true });
    addEventListener('touchend', cortar, { passive: true });
    html.addEventListener('pointerleave', cortar);

    let ancho = 0, alto = 0;
    let ultimo = performance.now();
    let lentos = 0, cuadros = 0;
    let bucle = 0;

    const pintar = (dt: number) => {
      const w = Math.max(1, Math.round(innerWidth * escala));
      const h = Math.max(1, Math.round(canvas.clientHeight * escala));
      if (w !== ancho || h !== alto) {
        canvas.width = ancho = w;
        canvas.height = alto = h;
      }
      agua.avanzar(dt, innerWidth, canvas.clientHeight);
      gl.useProgram(prog);
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.t, t);
      // El prisma solo con ratón: en el teléfono los tres canales iguales.
      gl.uniform1f(U.prisma, tactil ? 0 : 0.011);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, agua.textura);
      gl.uniform1i(U.agua, 0);
      gl.uniform2f(U.aguaPaso, ...agua.paso);
      gl.uniform1f(U.hayAgua, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Un lienzo opaco nace negro: hasta el primer cuadro el body lo tapa
      // con el mismo gris; con el cuadro ya pintado, el lienzo toma el relevo.
      if (!html.classList.contains('con-metal')) html.classList.add('con-metal');
    };

    const cuadro = (ahora: number) => {
      bucle = requestAnimationFrame(cuadro);
      const dt = Math.min(ahora - ultimo, 64) / 1000;
      ultimo = ahora;
      t += dt;
      // Calidad adaptable: si el equipo no llega, menos píxeles. Durante el
      // arranque la página aún se está montando: esos cuadros lentos no
      // dicen nada del equipo.
      if (t >= 1.5) {
        cuadros++;
        if (dt > 0.021) lentos++;
        if (cuadros === 45) {
          if (lentos > 12 && escala > 0.4) escala = Math.max(0.4, escala * 0.85);
          cuadros = 0;
          lentos = 0;
        }
      }
      pintar(dt);
    };
    bucle = requestAnimationFrame(cuadro);

    this.destruir.onDestroy(() => {
      cancelAnimationFrame(bucle);
      removeEventListener('pointermove', alMover);
      removeEventListener('touchstart', alArrastrar);
      removeEventListener('touchmove', alArrastrar);
      removeEventListener('touchend', cortar);
      html.removeEventListener('pointerleave', cortar);
      agua.liberar();
      html.classList.remove('con-metal');
    });
  }
}
