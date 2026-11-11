/**
 * El agua sobre el metal: una simulación de ondas en una textura pequeña
 * (un texel cada PX_TEXEL px de pantalla). El cursor arrastra un trazo por
 * ella y la ecuación de ondas hace el resto: detrás del dedo se abre la
 * estela, las ondas se alejan hacia los lados, se cruzan y se apagan, como
 * un dedo que cruza el agua. Quieto, el cursor no hace nada.
 *
 * Alto y velocidad viven en una textura de coma flotante (media precisión
 * si se puede) que se alterna entre dos búferes. Si el equipo no puede
 * dibujar en una, no hay agua y el metal sigue igual.
 */

/** Píxeles de pantalla por texel: las ondas son anchas, no hace falta más. */
const PX_TEXEL = 6;
/** Pasos de simulación por segundo: la velocidad de las ondas no depende de los fps. */
const PASOS_POR_S = 60;
/** Cuánto se conserva de la velocidad en cada paso: las ondas viven ~2 s. */
const AMORTIGUA = 0.982;
/** Radio del dedo, en texels. */
const RADIO = 3.4;

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

const PASO = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uPaso;
uniform vec4 uTrazo;
uniform float uFuerza;

void main() {
  vec2 uv = gl_FragCoord.xy * uPaso;
  vec4 i = texture2D(uTex, uv);
  float media = 0.25 * (
    texture2D(uTex, uv + vec2(uPaso.x, 0.0)).r +
    texture2D(uTex, uv - vec2(uPaso.x, 0.0)).r +
    texture2D(uTex, uv + vec2(0.0, uPaso.y)).r +
    texture2D(uTex, uv - vec2(0.0, uPaso.y)).r);
  i.g += (media - i.r) * 2.0;
  i.g *= ${AMORTIGUA};
  i.r += i.g;

  // El dedo: el tramo que recorrió desde el paso anterior hunde el agua.
  vec2 p = gl_FragCoord.xy;
  vec2 ab = uTrazo.zw - uTrazo.xy;
  float s = clamp(dot(p - uTrazo.xy, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  float d = length(p - uTrazo.xy - ab * s);
  i.r -= uFuerza * (1.0 - smoothstep(0.0, ${RADIO.toFixed(2)}, d));
  gl_FragColor = i;
}`;

export class Agua {
  private readonly prog: WebGLProgram;
  private readonly uTex: WebGLUniformLocation | null;
  private readonly uPaso: WebGLUniformLocation | null;
  private readonly uTrazo: WebGLUniformLocation | null;
  private readonly uFuerza: WebGLUniformLocation | null;
  private texturas: WebGLTexture[] = [];
  private buferes: WebGLFramebuffer[] = [];
  private actual = 0;
  private ancho = 0;
  private alto = 0;
  private resto = 0;
  // El trazo pendiente, en px de pantalla, y su fuerza.
  private trazo: [number, number, number, number] | null = null;
  private fuerza = 0;

  private constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly tipo: number,
    prog: WebGLProgram,
  ) {
    this.prog = prog;
    this.uTex = gl.getUniformLocation(prog, 'uTex');
    this.uPaso = gl.getUniformLocation(prog, 'uPaso');
    this.uTrazo = gl.getUniformLocation(prog, 'uTrazo');
    this.uFuerza = gl.getUniformLocation(prog, 'uFuerza');
  }

  /** El agua, o null si este equipo no puede simularla. */
  static crear(gl: WebGLRenderingContext): Agua | null {
    const medio = gl.getExtension('OES_texture_half_float');
    const medioLineal = gl.getExtension('OES_texture_half_float_linear');
    const entero = gl.getExtension('OES_texture_float');
    const enteroLineal = gl.getExtension('OES_texture_float_linear');
    const tipos: number[] = [];
    if (medio && medioLineal) tipos.push(medio.HALF_FLOAT_OES);
    if (entero && enteroLineal) tipos.push(gl.FLOAT);
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return null;
    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    gl.shaderSource(fs, PASO);
    gl.compileShader(fs);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    // Se queda con el primer tipo en el que de verdad se puede dibujar.
    for (const tipo of tipos) {
      const agua = new Agua(gl, tipo, prog);
      if (agua.medir(64, 64)) return agua;
      agua.liberar();
    }
    gl.deleteProgram(prog);
    return null;
  }

  /** El paso de un texel, en coordenadas de textura (para leer el agua). */
  get paso(): [number, number] {
    return [1 / this.ancho, 1 / this.alto];
  }

  /** La textura con el alto del agua en el canal rojo. */
  get textura(): WebGLTexture {
    return this.texturas[this.actual];
  }

  /**
   * El dedo pasó de (x0, y0) a (x1, y1), en px de pantalla; la fuerza va
   * de 0 a 1. Se acumula hasta el siguiente paso.
   */
  arrastrar(x0: number, y0: number, x1: number, y1: number, fuerza: number): void {
    this.trazo = this.trazo ? [this.trazo[0], this.trazo[1], x1, y1] : [x0, y0, x1, y1];
    this.fuerza = Math.max(this.fuerza, fuerza);
  }

  /**
   * Avanza la simulación dt segundos sobre una pantalla de w×h px. Deja
   * enlazado el búfer de la pantalla y su programa sin tocar: quien llama
   * vuelve a poner el suyo.
   */
  avanzar(dt: number, w: number, h: number): void {
    const gl = this.gl;
    const tw = Math.max(2, Math.ceil(w / PX_TEXEL));
    const th = Math.max(2, Math.ceil(h / PX_TEXEL));
    if (tw !== this.ancho || th !== this.alto) this.medir(tw, th);
    this.resto = Math.min(this.resto + dt * PASOS_POR_S, 3);
    if (this.resto < 1) return;
    gl.useProgram(this.prog);
    gl.viewport(0, 0, this.ancho, this.alto);
    gl.uniform1i(this.uTex, 0);
    gl.uniform2f(this.uPaso, 1 / this.ancho, 1 / this.alto);
    gl.activeTexture(gl.TEXTURE0);
    while (this.resto >= 1) {
      this.resto -= 1;
      const t = this.trazo;
      // De px de pantalla (y hacia abajo) a texels (y hacia arriba).
      if (t) gl.uniform4f(this.uTrazo, t[0] / PX_TEXEL, this.alto - t[1] / PX_TEXEL, t[2] / PX_TEXEL, this.alto - t[3] / PX_TEXEL);
      else gl.uniform4f(this.uTrazo, -99, -99, -99, -99);
      gl.uniform1f(this.uFuerza, t ? this.fuerza : 0);
      this.trazo = null;
      this.fuerza = 0;
      const sig = 1 - this.actual;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.buferes[sig]);
      gl.bindTexture(gl.TEXTURE_2D, this.texturas[this.actual]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.actual = sig;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  liberar(): void {
    this.texturas.forEach((t) => this.gl.deleteTexture(t));
    this.buferes.forEach((b) => this.gl.deleteFramebuffer(b));
    this.texturas = [];
    this.buferes = [];
  }

  /** Crea (o rehace, al cambiar de tamaño) los dos búferes, en calma. */
  private medir(w: number, h: number): boolean {
    const gl = this.gl;
    this.liberar();
    this.ancho = w;
    this.alto = h;
    for (let i = 0; i < 2; i++) {
      const tex = gl.createTexture();
      const fb = gl.createFramebuffer();
      if (!tex || !fb) return false;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, this.tipo, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.texturas.push(tex);
      this.buferes.push(fb);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return false;
      }
      // Agua en calma: alto y velocidad a cero.
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.actual = 0;
    this.resto = 0;
    return true;
  }
}
