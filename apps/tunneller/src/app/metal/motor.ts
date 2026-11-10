import { FRAGMENTO, VERTICE } from './shader';

export interface Uniformes {
  tiempo: number;
  /** Desplazamiento de la luz por el cursor, en unidades de reflejo. */
  luz: readonly [number, number];
  revelar: number;
  /** Bisel y radio de la pantalla en píxeles CSS. */
  marco: number;
  radio: number;
}

const NOMBRES = [
  'uRes',
  'uTime',
  'uLuz',
  'uRevelar',
  'uMarco',
  'uRadio',
] as const;
type Nombre = (typeof NOMBRES)[number];

/**
 * Dibuja una pieza de metal en un lienzo. No tiene reloj propio: el
 * componente llama a dibujar() desde su bucle.
 *
 * El borde del bisel tiene que salir nítido contra la pantalla, así que la
 * resolución es la de pantalla (con la densidad limitada). Si los primeros
 * fotogramas son lentos, baja sola.
 */
export class MotorMetal {
  private gl: WebGLRenderingContext | null = null;
  private ubicaciones = new Map<Nombre, WebGLUniformLocation | null>();
  private escala = 1;
  private muestras: number[] = [];
  private ancho = 0;
  private alto = 0;
  private factor = 1;
  perdido = false;

  constructor(
    private readonly lienzo: HTMLCanvasElement,
    private readonly tactil: boolean,
  ) {}

  iniciar(): boolean {
    const gl = this.lienzo.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    });
    if (!gl) return false;
    this.gl = gl;

    const programa = this.compilar(gl);
    if (!programa) return false;

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

  /** Recalcula el tamaño del búfer al cambiar el del lienzo. */
  ajustar(): void {
    const ppp = Math.min(window.devicePixelRatio || 1, this.tactil ? 1.5 : 2);
    this.factor = ppp * this.escala;
    const w = Math.max(1, Math.round(this.lienzo.clientWidth * this.factor));
    const h = Math.max(1, Math.round(this.lienzo.clientHeight * this.factor));
    if (w === this.ancho && h === this.alto) return;
    this.ancho = w;
    this.alto = h;
    this.lienzo.width = w;
    this.lienzo.height = h;
    this.gl?.viewport(0, 0, w, h);
  }

  /** Mide los primeros fotogramas reales y baja la resolución si hace falta. */
  registrarFotograma(ms: number): void {
    if (this.escala <= 0.6 || ms <= 0 || ms > 250) return;
    this.muestras.push(ms);
    if (this.muestras.length < 40) return;
    const orden = [...this.muestras].sort((a, b) => a - b);
    const mediana = orden[Math.floor(orden.length / 2)];
    this.muestras = [];
    if (mediana > 21) {
      this.escala = Math.max(0.6, this.escala * 0.78);
      this.ajustar();
    }
  }

  dibujar(u: Uniformes): void {
    const gl = this.gl;
    if (!gl || this.perdido) return;
    const l = (n: Nombre) => this.ubicaciones.get(n) ?? null;
    gl.uniform2f(l('uRes'), this.ancho, this.alto);
    gl.uniform1f(l('uTime'), u.tiempo);
    gl.uniform2f(l('uLuz'), ...u.luz);
    gl.uniform1f(l('uRevelar'), u.revelar);
    gl.uniform1f(l('uMarco'), u.marco * this.factor);
    gl.uniform1f(l('uRadio'), u.radio * this.factor);
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
        console.warn('[tunneller] shader:', gl.getShaderInfoLog(s));
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
      console.warn('[tunneller] programa:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }
}
