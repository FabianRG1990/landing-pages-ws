/**
 * Deformador de paneles por GPU para la vuelta de pagina del libro.
 *
 * POR QUE EXISTE. La vuelta compone el contenido celda a celda con
 * `ctx.transform` + `drawImage`, y eso en WebKit cuesta lo que cuesta el
 * RELLENO, no las llamadas. Medido con el mismo banco en los tres motores, una
 * pasada de malla de 16x16 sobre un lienzo de 0,88 Mpx:
 *
 *     WebKit 26,9 ms   ·   Blink 1,4 ms   ·   Gecko 0,5 ms
 *     0,064 Mpx/ms         0,74              2,0
 *
 * El giro dibuja 12,2 Mpx por fotograma —catorce veces el area del libro— y
 * Safari no tiene ese presupuesto: medido en un iPhone 15 cargando y a 60 Hz,
 * la vuelta iba a 102 ms por fotograma (10 fps) mientras abrir el libro, que no
 * compone malla, iba a 24 ms (41 fps).
 *
 * Prueba de concepto sobre el asset real, cuadro 102, lienzo 920x746:
 *
 *     webkit    canvas2D 10,18 ms   ->   WebGL 0,023 ms      443x
 *     chromium  canvas2D  0,61 ms   ->   WebGL 0,015 ms       41x
 *
 * Y NO ES SOLO VELOCIDAD. `drawCellAffine` coloca cada celda con una
 * transformada AFIN a partir de 3 esquinas, o sea un paralelogramo: las rectas
 * se quiebran en cada frontera de celda —se ve a simple vista al 340%— y de ahi
 * salen las costuras que hoy se tapan con una pasada de `fill`+`stroke` que
 * cuesta el 23% del fotograma. Con dos triangulos por celda el mapeo es
 * continuo por construccion y esa pasada deja de hacer falta.
 *
 * COMO ENCAJA. No se cambia el orden de composicion: esto dibuja en su propio
 * lienzo y el llamador lo estampa con `drawImage`, que respeta el `globalAlpha`
 * y el modo de fusion que ya tuviera puestos. Medido, ese puente NO se paga en
 * Safari: copiar un lienzo WebGL a uno 2D cuesta 0,183 ms contra los 0,200 de
 * copiar un lienzo 2D normal.
 *
 * La geometria NO se duplica aqui: el componente pasa las funciones que ya usa
 * (`quadHomography` + `meshPoint` + `meshVisible`) como cierres, para que no
 * puedan divergir dos copias de la misma formula.
 */

/** Punto ya en pixeles del lienzo de destino. */
export interface PuntoPx {
  x: number;
  y: number;
}

const VERT = `
attribute vec2 a;
attribute vec2 u;
varying vec2 v;
void main() {
  v = u;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D s;
void main() {
  gl_FragColor = texture2D(s, v);
}`;

export class WarpGL {
  private cv: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private prog: WebGLProgram | null = null;
  private locA = -1;
  private locU = -1;
  /** Una textura por panel. Los paneles se componen UNA vez en el arranque, asi que se sube una vez y ya. */
  private texturas = new WeakMap<HTMLCanvasElement, WebGLTexture>();
  private bufPos: WebGLBuffer | null = null;
  private bufUV: WebGLBuffer | null = null;
  private bufIdx: WebGLBuffer | null = null;
  /** Reservados por subdivision: cambiar de tamano el buffer en cada dibujado seria tirar la reserva. */
  private subCache = -1;
  private uvArr: Float32Array | null = null;
  private posArr: Float32Array | null = null;
  private idxArr: Uint16Array | null = null;
  /** Se apaga solo y para siempre si el contexto se pierde o algo falla: el llamador vuelve a canvas 2D. */
  private muerto = false;

  /** `true` si hay GPU disponible y no se ha caido. */
  get vivo(): boolean {
    return !this.muerto;
  }

  /**
   * Prepara el lienzo al tamano pedido.
   *
   * El tamano se toca lo MENOS posible: redimensionar un lienzo WebGL en Safari
   * de iOS tiene una fuga de memoria conocida (WebKit 219780), asi que esto solo
   * debe llamarse cuando de verdad cambia el lienzo principal (arranque y
   * `resize`), nunca por fotograma.
   */
  private preparar(w: number, h: number): boolean {
    if (this.muerto) return false;
    if (!this.cv) {
      try {
        this.cv = document.createElement('canvas');
        this.cv.width = w;
        this.cv.height = h;
        const gl = this.cv.getContext('webgl', {
          alpha: true,
          antialias: true,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
          // Se estampa con `drawImage` en el MISMO turno, pero sin esto la
          // especificacion permite que el buffer ya se haya vaciado.
          preserveDrawingBuffer: true,
        });
        if (!gl) return this.rendirse();
        this.gl = gl;
        this.cv.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          this.rendirse();
        });
        if (!this.compilar()) return false;
      } catch {
        return this.rendirse();
      }
    } else if (this.cv.width !== w || this.cv.height !== h) {
      this.cv.width = w;
      this.cv.height = h;
    }
    return true;
  }

  private rendirse(): false {
    this.muerto = true;
    this.gl = null;
    this.cv = null;
    return false;
  }

  private compilar(): boolean {
    const gl = this.gl;
    if (!gl) return false;
    const sh = (tipo: number, src: string): WebGLShader | null => {
      const s = gl.createShader(tipo);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    const pr = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !pr) return this.rendirse();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return this.rendirse();
    this.prog = pr;
    gl.useProgram(pr);
    this.locA = gl.getAttribLocation(pr, 'a');
    this.locU = gl.getAttribLocation(pr, 'u');
    this.bufPos = gl.createBuffer();
    this.bufUV = gl.createBuffer();
    this.bufIdx = gl.createBuffer();
    // Alfa PREMULTIPLICADO, que es como el navegador espera el lienzo al
    // estamparlo: asi `source-over` sale identico al del canvas 2D.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    return true;
  }

  private textura(img: HTMLCanvasElement): WebGLTexture | null {
    const gl = this.gl;
    if (!gl) return null;
    const ya = this.texturas.get(img);
    if (ya) return ya;
    const t = gl.createTexture();
    if (!t) return null;
    gl.bindTexture(gl.TEXTURE_2D, t);
    // Los paneles NO son potencia de dos, asi que en WebGL 1 solo valen
    // CLAMP_TO_EDGE y filtros sin mipmap.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const ani =
      gl.getExtension('EXT_texture_filter_anisotropic') ??
      (gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') as EXT_texture_filter_anisotropic | null);
    if (ani) gl.texParameterf(gl.TEXTURE_2D, ani.TEXTURE_MAX_ANISOTROPY_EXT, gl.getParameter(ani.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
    this.texturas.set(img, t);
    return t;
  }

  /** Rejilla de indices y coordenadas de textura, reusada mientras no cambie la subdivision. */
  private rejilla(sub: number): void {
    if (this.subCache === sub) return;
    const n = sub + 1;
    this.uvArr = new Float32Array(n * n * 2);
    this.posArr = new Float32Array(n * n * 2);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 2;
        this.uvArr[i] = x / sub;
        this.uvArr[i + 1] = y / sub;
      }
    }
    this.idxArr = new Uint16Array(sub * sub * 6);
    this.subCache = sub;
  }

  /**
   * Dibuja `img` deformado sobre la malla y lo estampa en `dst`.
   *
   * `punto(eu, ev)` devuelve donde cae ese punto del panel en pixeles del
   * lienzo de destino; `celdaVisible(gx, gy)` decide si el video enseña esa
   * celda. Las dos las provee el componente para que la geometria viva en un
   * solo sitio.
   *
   * Devuelve `false` si no se pudo dibujar; ahi el llamador tiene que usar el
   * camino de canvas 2D de siempre.
   */
  render(
    dst: CanvasRenderingContext2D,
    img: HTMLCanvasElement,
    sub: number,
    punto: (eu: number, ev: number) => PuntoPx,
    celdaVisible: (gx: number, gy: number) => boolean,
    fillOccluded: boolean,
  ): boolean {
    const W = dst.canvas.width;
    const H = dst.canvas.height;
    if (!W || !H || !img.width || !img.height) return false;
    if (!this.preparar(W, H)) return false;
    const gl = this.gl;
    if (!gl || !this.prog) return false;
    const tex = this.textura(img);
    if (!tex) return this.rendirse();

    this.rejilla(sub);
    // `rejilla` acaba de crear los tres, y `preparar` el lienzo. Se comprueban
    // en vez de afirmarlos con `!`: si alguno faltara, `render` devuelve false
    // y el dibujado cae al camino de canvas 2D, que es exactamente lo que hay
    // que hacer -y no reventar a mitad de un volteo.
    const pos = this.posArr;
    const idx = this.idxArr;
    const uv = this.uvArr;
    const cv = this.cv;
    if (!pos || !idx || !uv || !cv) return false;
    const n = sub + 1;

    // Vertices. SIN el `bleed` del camino 2D: alli cada celda se ensancha medio
    // paso para tapar el dentado entre celdas dibujadas por separado; aqui
    // comparten vertice y solapar solo duplicaria la mezcla del contenido
    // semitransparente.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const p = punto(x / sub, y / sub);
        const i = (y * n + x) * 2;
        pos[i] = (p.x / W) * 2 - 1;
        pos[i + 1] = 1 - (p.y / H) * 2;
        if (p.x < x0) x0 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.x > x1) x1 = p.x;
        if (p.y > y1) y1 = p.y;
      }
    }
    if (!isFinite(x0) || x1 <= x0 || y1 <= y0) return false;

    // Dos pasadas en orden de pintor, igual que el camino 2D: primero las
    // celdas que el rollo tapa (solo con `fillOccluded`) y encima las visibles.
    let k = 0;
    for (let pass = fillOccluded ? 0 : 1; pass < 2; pass++) {
      const quiere = pass === 1;
      for (let gy = 0; gy < sub; gy++) {
        for (let gx = 0; gx < sub; gx++) {
          if (celdaVisible(gx, gy) !== quiere) continue;
          const a = gy * n + gx;
          idx[k++] = a;
          idx[k++] = a + 1;
          idx[k++] = a + n;
          idx[k++] = a + 1;
          idx[k++] = a + n + 1;
          idx[k++] = a + n;
        }
      }
    }
    if (k === 0) return true; // nada que dibujar, pero el camino funciono

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.locU);
    gl.vertexAttribPointer(this.locU, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.locA);
    gl.vertexAttribPointer(this.locA, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx.subarray(0, k), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, k, gl.UNSIGNED_SHORT, 0);

    // Solo la caja que se ha tocado: estampar el lienzo entero cuesta lo mismo
    // que dibujarlo, y la hoja rara vez ocupa todo.
    const bx = Math.max(0, Math.floor(x0) - 1);
    const by = Math.max(0, Math.floor(y0) - 1);
    const bw = Math.min(W, Math.ceil(x1) + 1) - bx;
    const bh = Math.min(H, Math.ceil(y1) + 1) - by;
    if (bw <= 0 || bh <= 0) return true;
    dst.drawImage(cv, bx, by, bw, bh, bx, by, bw, bh);
    return true;
  }
}
