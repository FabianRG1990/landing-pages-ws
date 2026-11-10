import { FRAGMENTO, VERTICE } from './shader';

export interface Uniformes {
  tiempo: number;
  /** Borde superior de las secciones 2..5, en fracción de la altura del lienzo. */
  bordes: readonly [number, number, number, number];
  fundido: number;
  calmaA: readonly [number, number, number, number];
  calmaB: readonly [number, number, number, number];
  calmaC: readonly [number, number, number, number];
  pesoCalma: readonly [number, number, number];
  angulo: number;
  acento: number;
  energia: number;
  cobertura: number;
  flujo: number;
  inclinacion: readonly [number, number];
}

const NOMBRES = [
  'uRes',
  'uTime',
  'uEdges',
  'uFeather',
  'uCalmA',
  'uCalmB',
  'uCalmC',
  'uCalmW',
  'uAngle',
  'uAccent',
  'uEnergy',
  'uCover',
  'uFlow',
  'uTilt',
] as const;

type Nombre = (typeof NOMBRES)[number];

/**
 * Dibuja el metal en un lienzo. No tiene reloj propio: quien lo usa llama
 * a dibujar() desde su único bucle.
 *
 * La resolución interna es una fracción de la de pantalla: el metal es de
 * baja frecuencia y el escalado de CSS no le quita nitidez. Si los primeros
 * fotogramas son lentos, la fracción baja sola.
 */
export class MotorMetal {
  private gl: WebGLRenderingContext | null = null;
  private programa: WebGLProgram | null = null;
  private ubicaciones = new Map<Nombre, WebGLUniformLocation | null>();
  private escala: number;
  private readonly escalaMinima = 0.34;
  private muestras: number[] = [];
  private ancho = 0;
  private alto = 0;
  perdido = false;

  constructor(
    private readonly lienzo: HTMLCanvasElement,
    private readonly tactil: boolean,
  ) {
    this.escala = tactil ? 0.62 : 0.66;
  }

  iniciar(): boolean {
    const gl = this.lienzo.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    });
    if (!gl) return false;
    this.gl = gl;

    const programa = this.compilar(gl);
    if (!programa) return false;
    this.programa = programa;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(programa, 'aPos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(programa);
    for (const n of NOMBRES)
      this.ubicaciones.set(n, gl.getUniformLocation(programa, n));

    this.lienzo.addEventListener('webglcontextlost', this.alPerder, false);
    this.ajustar();
    return true;
  }

  /** Recalcula el tamaño del búfer. Devuelve true si cambió. */
  ajustar(): boolean {
    const ppp = Math.min(window.devicePixelRatio || 1, this.tactil ? 1 : 1.5);
    const w = Math.max(
      1,
      Math.round(this.lienzo.clientWidth * ppp * this.escala),
    );
    const h = Math.max(
      1,
      Math.round(this.lienzo.clientHeight * ppp * this.escala),
    );
    if (w === this.ancho && h === this.alto) return false;
    this.ancho = w;
    this.alto = h;
    this.lienzo.width = w;
    this.lienzo.height = h;
    this.gl?.viewport(0, 0, w, h);
    return true;
  }

  /** Mide la duración real de los primeros fotogramas y baja calidad si hace falta. */
  registrarFotograma(ms: number): void {
    if (this.muestras.length >= 45 || ms <= 0 || ms > 250) return;
    this.muestras.push(ms);
    if (this.muestras.length < 45) return;
    const orden = [...this.muestras].sort((a, b) => a - b);
    const mediana = orden[Math.floor(orden.length / 2)];
    if (mediana > 21 && this.escala > this.escalaMinima) {
      this.escala = Math.max(this.escalaMinima, this.escala * 0.72);
      this.muestras = [];
      this.ajustar();
    }
  }

  dibujar(u: Uniformes): void {
    const gl = this.gl;
    if (!gl || this.perdido) return;
    const l = (n: Nombre) => this.ubicaciones.get(n) ?? null;
    gl.uniform2f(l('uRes'), this.ancho, this.alto);
    gl.uniform1f(l('uTime'), u.tiempo);
    gl.uniform4f(l('uEdges'), ...u.bordes);
    gl.uniform1f(l('uFeather'), u.fundido);
    gl.uniform4f(l('uCalmA'), ...u.calmaA);
    gl.uniform4f(l('uCalmB'), ...u.calmaB);
    gl.uniform4f(l('uCalmC'), ...u.calmaC);
    gl.uniform3f(l('uCalmW'), ...u.pesoCalma);
    gl.uniform1f(l('uAngle'), u.angulo);
    gl.uniform1f(l('uAccent'), u.acento);
    gl.uniform1f(l('uEnergy'), u.energia);
    gl.uniform1f(l('uCover'), u.cobertura);
    gl.uniform1f(l('uFlow'), u.flujo);
    gl.uniform2f(l('uTilt'), ...u.inclinacion);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destruir(): void {
    this.lienzo.removeEventListener('webglcontextlost', this.alPerder, false);
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }

  private readonly alPerder = (e: Event) => {
    e.preventDefault();
    this.perdido = true;
  };

  private compilar(gl: WebGLRenderingContext): WebGLProgram | null {
    const sombreador = (tipo: number, fuente: string) => {
      const s = gl.createShader(tipo);
      if (!s) return null;
      gl.shaderSource(s, fuente);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[aurum] shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const v = sombreador(gl.VERTEX_SHADER, VERTICE);
    const f = sombreador(gl.FRAGMENT_SHADER, FRAGMENTO);
    if (!v || !f) return null;
    const p = gl.createProgram();
    if (!p) return null;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[aurum] programa:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }
}
