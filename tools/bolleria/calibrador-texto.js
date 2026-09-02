/**
 * Calibrador del TEXTO — libro de "Acerca de nosotros".
 *
 * Motor. La interfaz vive en `calibrador-texto.html`, que carga la app en un
 * iframe del MISMO ORIGEN y llama aquí:
 *
 *     montarCalibradorTexto(ventanaDelIframe, dondeVaElPanel)
 *
 * Corre SOBRE el componente real: se engancha a `AboutBookComponent` por
 * `ng.getComponent` y sustituye en caliente los paneles de texto ya
 * renderizados (`comp.textPanels[i]`). La app NO se toca: no hay una línea de
 * esto en `index.html` ni en el componente. Se abre en
 * http://localhost:4301/calibrador-texto.html
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HAY QUE REHACER EL PANEL EN VEZ DE MOVERLO
 *
 * Los siete números que colocan el texto -cuerpo, ancho de columna,
 * interlineado, aire entre párrafos, alto de la espiga y el centro (u,v)- son
 * constantes de MÓDULO en `about-book.component.ts`. No hay forma de cambiarlas
 * en caliente, así que aquí se replica el cálculo del bloque -y solo eso-: el
 * reparto en renglones (`wrapLine`), la espiga (`drawTextDivider`) y los
 * rótulos de redes (`drawSocialIcon`) se piden al componente de verdad, no se
 * copian. Lo replicado son las ~20 líneas de aritmética de `renderTextPanel`.
 *
 * Réplica verificada al montar: se reconstruyen los 7 paneles con los valores
 * de fábrica y se comparan píxel a píxel con los que hizo el componente. Si
 * alguno no coincide, el panel lateral lo avisa en rojo -es la señal de que las
 * historias o las fórmulas cambiaron y este archivo se quedó atrás.
 *
 * ---------------------------------------------------------------------------
 * VALORES POR PÁGINA
 *
 * Hoy el componente usa un único juego de números para las 7 páginas. La página
 * 4 es la única con DOS párrafos, y es la que se sale; con números globales no
 * se puede tocar sin mover las otras seis. Aquí cada página guarda los suyos, y
 * "aplicar a todas" copia los de la página actual al resto cuando lo que se
 * quiere es un ajuste global.
 *
 * Guarda en localStorage bajo `calib-texto-v1`.
 *
 * ---------------------------------------------------------------------------
 * LA CAJA
 *
 * Se dibuja sobre el canvas siguiendo la PERSPECTIVA REAL de la página derecha:
 * la misma cadena que usa el compositor para colocar cada letra
 * -(u,v) del panel -> (u,v) de la página -> píxel de pantalla- pasando por la
 * superficie de reposo (`restSurface`), no por `CONTENT_RIGHT_QUAD`, que es
 * otra zona y dejaría la caja desplazada respecto del texto pintado.
 *
 * La vuelta (píxel -> (u,v) del panel) es Newton sobre esa misma cadena: la
 * superficie es un plano y la función es suave, así que converge en 3-4 pasos.
 */
window.montarCalibradorTexto = async (W, dondeVaElPanel) => {
  const D = W.document;
  const CLAVE = 'calib-texto-v1';

  // Mismas medidas que el componente. PAGE_REST es el cuadro en el que el libro
  // se queda parado con la doble página a la vista.
  const PANEL_W = 700;
  const PANEL_H = 820;
  const PAGE_REST = 56;
  const PAGINAS = 7;
  const SOCIAL = { instagram: { u: 0.525, v: 0.63 }, facebook: { u: 0.525, v: 0.74 } };

  // Valores de fábrica: los que hoy están escritos en el componente.
  // `giro` no existe hoy en el componente -el texto se imprime siempre recto-,
  // así que su valor de fábrica es 0 y con 0 el panel sale idéntico al actual.
  // Aplicarlo al componente supone un parámetro más en `renderTextPanel`.
  const FABRICA = { font: 48, measure: 504, line: 1.38, para: 0.5, divider: 34, u: 0.525, v: 0.519, giro: 0 };

  /**
   * Las 7 historias, copiadas de `STORIES` en el componente. Es lo único
   * duplicado de verdad, porque el componente no las conserva en ninguna
   * propiedad después de renderizar. La comprobación de réplica del arranque
   * es justamente el guardia contra que esta copia se quede vieja.
   */
  const HISTORIAS = [
    ['Hola, pasa! Vamos a contarte un poco de nosotros.'],
    ['Somos una panadería artesanal y estamos ubicados en Grecia.'],
    ['Nuestro espacio es el resultado de dos historias que se encontraron: la disciplina del deporte y la tradición de una familia panadera.'],
    [
      'Desde el inicio quisimos hacer algo diferente: apostar por productos artesanales y saludables, como el pan de masa madre.',
      'Y ofrecer también esos pequeños gusticos que tanto nos gustan, como los croissants y la repostería.',
    ],
    ['Trabajamos todos los días por hornear mejor, crear mejor contenido y atenderles cada vez más bonito.'],
    ['Te esperamos de lunes a domingo, con pan recién horneado y un cafécito caliente.'],
    ['Esta historia se sigue horneando todos los días.', 'Acompañanos para verla crecer.'],
  ];

  const LIMITES = {
    font: [20, 90],
    measure: [150, 690],
    line: [1.0, 2.4],
    para: [0, 1.6],
    divider: [0, 90],
    u: [0.2, 0.8],
    v: [0.12, 0.88],
    giro: [-180, 180],
  };
  const acota = (k, x) => Math.min(LIMITES[k][1], Math.max(LIMITES[k][0], x));

  // --- Enganche al componente ------------------------------------------------

  const esperar = async () => {
    for (let i = 0; i < 300; i++) {
      const host = D.querySelector('bol-about-book');
      const c = host && W.ng && W.ng.getComponent(host);
      const lienzo = D.querySelector('canvas.bol-book__canvas');
      if (c && lienzo && c.textPanels && c.textPanels.length === PAGINAS && c.frames && c.frames[PAGE_REST - 1]) return { comp: c, cv: lienzo };
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('No apareció bol-about-book con los paneles de texto ya construidos.');
  };

  const { comp, cv } = await esperar();
  // Los originales, para poder volver atrás y para comprobar la réplica.
  const ORIGINALES = comp.textPanels.slice();

  // --- Estado ----------------------------------------------------------------

  let pagina = 4;
  let C = (() => {
    try {
      const guardado = JSON.parse(W.localStorage.getItem(CLAVE) || 'null');
      if (guardado && guardado.paginas) return guardado;
    } catch {
      /* dato corrupto: se empieza de cero */
    }
    return { paginas: {} };
  })();

  const guardar = () => {
    try {
      W.localStorage.setItem(CLAVE, JSON.stringify(C));
    } catch {
      /* modo privado o cuota llena: se sigue sin persistir */
    }
  };

  /** Valores por defecto de una página. La 7 (cierre) coloca su bloque con otra fórmula, así que su `v` de fábrica se calcula, no se inventa (ver `vDeCierre`). */
  const porDefecto = (n) => (n === PAGINAS ? { ...FABRICA, v: vCierre } : { ...FABRICA });

  const P = (n) => ({ ...porDefecto(n), ...(C.paginas[n] || {}) });

  const fijar = (n, k, valor) => {
    C.paginas[n] = { ...P(n), [k]: acota(k, valor) };
    guardar();
  };

  // --- Construcción del panel (réplica del cálculo, dibujo del componente) ----

  /**
   * `v` de fábrica de la página de cierre. El componente la centra en la franja
   * que queda por encima de los rótulos de redes (0.20 .. instagram-0.09) en
   * vez de en (u,v); esto traduce esa posición al mismo `v` que usan las
   * historias, para que abrir el calibrador no mueva nada.
   */
  const vDeCierre = () => {
    const c = D.createElement('canvas');
    c.width = PANEL_W;
    c.height = PANEL_H;
    const ctx = c.getContext('2d');
    ctx.textAlign = 'center';
    const cuerpo = FABRICA.font * 0.95;
    ctx.font = `italic 500 ${Math.round(cuerpo)}px "Cormorant Garamond", serif`;
    const rows = HISTORIAS[PAGINAS - 1].flatMap((l) => comp.wrapLine.call(comp, ctx, l, FABRICA.measure, false));
    const step = cuerpo * FABRICA.line;
    const zoneLo = PANEL_H * 0.2;
    const zoneHi = PANEL_H * (SOCIAL.instagram.v - 0.09);
    const alto = rows.length * step;
    const arriba = zoneLo + (zoneHi - zoneLo - alto) / 2;
    return (arriba + alto / 2) / PANEL_H;
  };
  const vCierre = vDeCierre();

  /**
   * Rehace el panel de una página con unos valores dados. Devuelve también el
   * alto real del bloque, que es lo que la caja necesita para dibujarse: no se
   * puede saber antes de repartir el texto en renglones.
   */
  function construye(n, p) {
    const cierre = n === PAGINAS;
    const c = D.createElement('canvas');
    c.width = PANEL_W;
    c.height = PANEL_H;
    const ctx = c.getContext('2d');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3d2a';
    const cx = PANEL_W * p.u;

    /**
     * El giro se aplica al LIENZO, no a cada renglón: así el bloque entero
     * -renglones, aire entre párrafos y espiga- rota como una sola pieza sobre
     * su propio centro, que es lo que hace Word. Rotar renglón a renglón los
     * separaría en abanico.
     *
     * Va antes de escribir y se deshace después, porque en la página de cierre
     * los rótulos de redes tienen que quedarse rectos: los <a> reales del DOM
     * se colocan con `SOCIAL_POS`, y girarlos los dejaría pintados en un sitio
     * y clicables en otro.
     */
    const giraLienzo = () => {
      if (!p.giro) return;
      const cy = PANEL_H * p.v;
      ctx.translate(cx, cy);
      ctx.rotate((p.giro * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    };

    if (cierre) {
      const cuerpo = p.font * 0.95;
      ctx.font = `italic 500 ${Math.round(cuerpo)}px "Cormorant Garamond", serif`;
      const rows = HISTORIAS[n - 1].flatMap((l) => comp.wrapLine.call(comp, ctx, l, p.measure, false));
      const step = cuerpo * p.line;
      const alto = rows.length * step;
      let y = PANEL_H * p.v - alto / 2 + cuerpo * 0.8;
      ctx.save();
      giraLienzo();
      for (const row of rows) {
        ctx.fillText(row, cx, y);
        y += step;
      }
      ctx.restore();
      comp.drawSocialIcon.call(comp, ctx, SOCIAL.instagram, '#5e6a34', 'instagram');
      comp.drawSocialIcon.call(comp, ctx, SOCIAL.facebook, '#5e6a34', 'facebook');
      return { canvas: c, alto, renglones: rows.length };
    }

    ctx.font = `400 ${p.font}px "Cormorant Garamond", serif`;
    const parrafos = HISTORIAS[n - 1].map((l) => comp.wrapLine.call(comp, ctx, l, p.measure, true));
    const rowH = p.font * p.line;
    const paraGap = p.font * p.para;
    const total = parrafos.reduce((s, r) => s + r.length, 0);
    const alto = total * rowH + (parrafos.length - 1) * paraGap + p.divider;
    let y = PANEL_H * p.v - alto / 2 + p.font * 0.8;
    ctx.save();
    giraLienzo();
    for (let i = 0; i < parrafos.length; i++) {
      for (const row of parrafos[i]) {
        ctx.fillText(row, cx, y);
        y += rowH;
      }
      if (i < parrafos.length - 1) y += paraGap;
    }
    comp.drawTextDivider.call(comp, ctx, cx, y - rowH + p.font * 0.42 + p.divider / 2);
    ctx.restore();
    return { canvas: c, alto, renglones: total };
  }

  /** Alto y ancho del bloque en coordenadas del panel, para la caja. */
  let ultimo = { alto: 0, renglones: 0 };

  function repinta(n) {
    const r = construye(n, P(n));
    comp.textPanels[n - 1] = r.canvas;
    if (n === pagina) ultimo = { alto: r.alto, renglones: r.renglones };
    comp.draw(comp.lastDrawn);
  }

  function repintaTodas() {
    for (let n = 1; n <= PAGINAS; n++) {
      const r = construye(n, P(n));
      comp.textPanels[n - 1] = r.canvas;
      if (n === pagina) ultimo = { alto: r.alto, renglones: r.renglones };
    }
    comp.draw(comp.lastDrawn);
  }

  // --- Comprobación de la réplica -------------------------------------------

  /**
   * Reconstruye cada página con los valores de fábrica y la compara con el
   * panel que hizo el componente. Debe dar 0: mismo texto, mismas fórmulas,
   * mismo dibujo. Cualquier otra cosa significa que este archivo se quedó atrás
   * respecto del componente, y calibrar sobre él daría números que al aplicarse
   * no reproducen lo que se vio.
   */
  function compruebaReplica() {
    const fallos = [];
    for (let n = 1; n <= PAGINAS; n++) {
      const mio = construye(n, porDefecto(n)).canvas;
      const suyo = ORIGINALES[n - 1];
      if (!suyo || suyo.width !== mio.width || suyo.height !== mio.height) {
        fallos.push(n);
        continue;
      }
      const a = mio.getContext('2d').getImageData(0, 0, mio.width, mio.height).data;
      const b = suyo.getContext('2d').getImageData(0, 0, suyo.width, suyo.height).data;
      let distintos = 0;
      for (let i = 3; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8) distintos++;
      if (distintos > 200) fallos.push(n + ' (' + distintos + 'px)');
    }
    return fallos;
  }

  // --- Geometría: panel <-> pantalla ----------------------------------------

  /** Homografía de 4 esquinas, misma que `quadHomography` en el componente. */
  function homografia(q) {
    const [p0, p1, p2, p3] = q;
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const dy3 = p0.y - p1.y + p2.y - p3.y;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den;
    const h = (dx1 * dy3 - dx3 * dy1) / den;
    const a = p1.x - p0.x + g * p1.x;
    const b = p3.x - p0.x + h * p3.x;
    const d = p1.y - p0.y + g * p1.y;
    const e = p3.y - p0.y + h * p3.y;
    return (u, v) => {
      const w = g * u + h * v + 1;
      return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w };
    };
  }

  /** Escala y márgenes con los que el componente encaja el vídeo en el canvas. */
  const encaje = () => {
    const bmp = comp.frames[PAGE_REST - 1];
    const sc = Math.min(cv.width / bmp.width, cv.height / bmp.height);
    return { sc, ox: (cv.width - bmp.width * sc) / 2, oy: (cv.height - bmp.height * sc) / 2 };
  };

  /**
   * (x,y) en el panel -> píxel CSS dentro del canvas. Es la cadena del
   * compositor: panel -> (u,v) de página por la homografía del área impresa ->
   * vértice de la malla de reposo -> píxel, y de píxel de canvas a px CSS.
   */
  function aPantalla(px, py) {
    const s = comp.restSurface.call(comp, 'right', comp.physFrame);
    const { sc, ox, oy } = encaje();
    if (!s) return { x: 0, y: 0 };
    const enPagina = homografia(s.uv.map((p) => ({ x: p.u, y: p.v })))(px / PANEL_W, py / PANEL_H);
    const p = comp.meshPoint.call(comp, s.pts, enPagina.x, enPagina.y, ox, oy, sc);
    return { x: p.x / comp.dpr, y: p.y / comp.dpr };
  }

  /**
   * La vuelta NO se hace invirtiendo el punto del puntero. Se intentó con
   * Newton y falla justo donde más se necesita: la malla recorta las
   * coordenadas fuera del papel, así que en cuanto un tirador queda por debajo
   * del borde inferior de la página la proyección se aplana, el jacobiano se
   * anula y no hay inversa. Medido: los tiradores `s` y `se` dejaban de
   * responder en cuanto el bloque se movía hacia abajo.
   *
   * En su lugar, el gesto trabaja con el DESPLAZAMIENTO. Este jacobiano
   * inverso, tomado en el centro de la caja -un punto que siempre cae sobre el
   * papel-, convierte "cuántos píxeles se movió el ratón en pantalla" en
   * "cuántos píxeles del panel son". Es una aproximación de primer orden a una
   * perspectiva suave: a lo largo de un arrastre entero el error es de pocos
   * píxeles, contra un tirador que no responde en absoluto.
   */
  function conversorDeArrastre() {
    const b = caja();
    const cx = b.cx;
    const cy = b.cy;
    const eps = 4;
    const f = aPantalla(cx, cy);
    const fx = aPantalla(cx + eps, cy);
    const fy = aPantalla(cx, cy + eps);
    const j11 = (fx.x - f.x) / eps;
    const j12 = (fy.x - f.x) / eps;
    const j21 = (fx.y - f.y) / eps;
    const j22 = (fy.y - f.y) / eps;
    const det = j11 * j22 - j12 * j21;
    if (!det || !Number.isFinite(det)) return null;
    return (dsx, dsy) => ({ x: (j22 * dsx - j12 * dsy) / det, y: (-j21 * dsx + j11 * dsy) / det });
  }

  /** ¿Cae el punto dentro del contorno de la caja, ya proyectado? Lanzamiento de rayo sobre el polígono real, sin invertir nada. */
  function dentroDeLaCaja(x, y) {
    const pol = [];
    const lado = (fx0, fy0, fx1, fy1) => {
      for (let i = 0; i < 8; i++) {
        const q = puntoCaja(fx0 + ((fx1 - fx0) * i) / 8, fy0 + ((fy1 - fy0) * i) / 8);
        pol.push(aPantalla(q.x, q.y));
      }
    };
    lado(0, 0, 1, 0);
    lado(1, 0, 1, 1);
    lado(1, 1, 0, 1);
    lado(0, 1, 0, 0);
    let dentro = false;
    for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
      const a = pol[i];
      const c = pol[j];
      if (a.y > y !== c.y > y && x < ((c.x - a.x) * (y - a.y)) / (c.y - a.y) + a.x) dentro = !dentro;
    }
    return dentro;
  }

  /** Los bordes del bloque en coordenadas de panel, SIN girar. */
  function caja() {
    const p = P(pagina);
    const cx = PANEL_W * p.u;
    const cy = PANEL_H * p.v;
    return { izq: cx - p.measure / 2, der: cx + p.measure / 2, arr: cy - ultimo.alto / 2, aba: cy + ultimo.alto / 2, cx, cy };
  }

  /**
   * Un punto de la caja en coordenadas de panel, YA GIRADO. `fx`/`fy` van de 0
   * a 1 dentro de la caja; se admiten valores fuera de ese rango, que es como
   * se coloca el tirador de giro por encima del borde de arriba.
   *
   * Todo lo que dibuja o mide la caja pasa por aquí: si el contorno girase y
   * los tiradores no, agarrarlos dejaría de coincidir con lo que se ve.
   */
  function puntoCaja(fx, fy) {
    const b = caja();
    const x = b.izq + (b.der - b.izq) * fx;
    const y = b.arr + (b.aba - b.arr) * fy;
    const a = (P(pagina).giro * Math.PI) / 180;
    if (!a) return { x, y };
    const co = Math.cos(a);
    const si = Math.sin(a);
    return { x: b.cx + (x - b.cx) * co - (y - b.cy) * si, y: b.cy + (x - b.cx) * si + (y - b.cy) * co };
  }

  /**
   * Distancia, en fracción de la altura de la caja, a la que vive el tirador de
   * giro por encima del borde superior. Se calcula en vez de fijarse en píxeles
   * para que en un bloque bajo no se meta dentro del texto ni se despegue en uno
   * alto; el mínimo evita que un bloque muy corto lo deje pegado al borde.
   */
  const brazoGiro = () => {
    const b = caja();
    const alto = Math.max(1, b.aba - b.arr);
    return Math.max(0.1, 46 / alto);
  };

  // --- La caja dibujada encima del canvas ------------------------------------

  // Va en el documento del iframe, en `fixed` sobre el rect del canvas, y con
  // `pointer-events: none`: así no tapa los botones de la app. Los gestos se
  // escuchan en el documento en fase de captura y solo se quedan el evento
  // cuando el puntero cae en un tirador o dentro de la caja.
  const capa = D.createElement('canvas');
  capa.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;left:0;top:0';
  D.body.appendChild(capa);
  const gc = capa.getContext('2d');

  const TIRADORES = [
    ['nw', 0, 0],
    ['n', 0.5, 0],
    ['ne', 1, 0],
    ['e', 1, 0.5],
    ['se', 1, 1],
    ['s', 0.5, 1],
    ['sw', 0, 1],
    ['w', 0, 0.5],
  ];

  /** Punto de un tirador en px CSS del canvas. El de giro va por encima del borde de arriba, como en Word. */
  function puntoTirador(t) {
    const q = t[0] === 'giro' ? puntoCaja(0.5, -brazoGiro()) : puntoCaja(t[1], t[2]);
    return aPantalla(q.x, q.y);
  }

  const TIRADOR_GIRO = ['giro', 0.5, 0];

  let mostrar = true;

  // Posición de los 8 tiradores, en px CSS del canvas. Se expone en la ventana
  // de la app para poder CONDUCIR la herramienta desde una prueba automática:
  // sin esto, un script que quiera agarrar un tirador tiene que adivinar dónde
  // está mirando los píxeles del overlay, y la página está en perspectiva -el
  // punto más a la derecha del contorno es una esquina, no el tirador del lado.
  W.__ctTiradores = () => [...TIRADORES, TIRADOR_GIRO].map((t) => ({ id: t[0], ...puntoTirador(t) }));

  function pintaCaja() {
    const r = cv.getBoundingClientRect();
    const dpr = W.devicePixelRatio || 1;
    capa.style.left = r.left + 'px';
    capa.style.top = r.top + 'px';
    capa.style.width = r.width + 'px';
    capa.style.height = r.height + 'px';
    if (capa.width !== Math.round(r.width * dpr)) capa.width = Math.round(r.width * dpr);
    if (capa.height !== Math.round(r.height * dpr)) capa.height = Math.round(r.height * dpr);
    gc.setTransform(dpr, 0, 0, dpr, 0, 0);
    gc.clearRect(0, 0, r.width, r.height);
    if (!mostrar) return;

    // El contorno se traza con puntos intermedios, no de esquina a esquina: la
    // página está en perspectiva y una recta en el panel no es una recta aquí.
    const lado = (fx0, fy0, fx1, fy1, primero) => {
      for (let i = 0; i <= 12; i++) {
        const q = puntoCaja(fx0 + (fx1 - fx0) * (i / 12), fy0 + (fy1 - fy0) * (i / 12));
        const p = aPantalla(q.x, q.y);
        if (primero && i === 0) gc.moveTo(p.x, p.y);
        else gc.lineTo(p.x, p.y);
      }
    };
    gc.beginPath();
    lado(0, 0, 1, 0, true);
    lado(1, 0, 1, 1, false);
    lado(1, 1, 0, 1, false);
    lado(0, 1, 0, 0, false);
    gc.closePath();
    gc.strokeStyle = 'rgba(255,255,255,.9)';
    gc.lineWidth = 2.5;
    gc.stroke();
    gc.strokeStyle = '#1f6feb';
    gc.lineWidth = 1.2;
    gc.stroke();

    // La varilla del tirador de giro, para que se lea de dónde cuelga.
    const alto = puntoTirador(['n', 0.5, 0]);
    const pg = puntoTirador(TIRADOR_GIRO);
    gc.beginPath();
    gc.moveTo(alto.x, alto.y);
    gc.lineTo(pg.x, pg.y);
    gc.strokeStyle = 'rgba(255,255,255,.9)';
    gc.lineWidth = 2.5;
    gc.stroke();
    gc.strokeStyle = '#1f6feb';
    gc.lineWidth = 1.2;
    gc.stroke();

    for (const t of TIRADORES) {
      const p = puntoTirador(t);
      gc.beginPath();
      gc.rect(p.x - 5, p.y - 5, 10, 10);
      gc.fillStyle = '#fff';
      gc.fill();
      gc.strokeStyle = '#1f6feb';
      gc.lineWidth = 1.5;
      gc.stroke();
    }
    // Redondo, como en Word: la forma distingue "girar" de "redimensionar" sin
    // tener que acertarle con el puntero para ver el cursor.
    gc.beginPath();
    gc.arc(pg.x, pg.y, 6.5, 0, Math.PI * 2);
    gc.fillStyle = '#fff';
    gc.fill();
    gc.strokeStyle = '#1f6feb';
    gc.lineWidth = 1.5;
    gc.stroke();
  }

  // Se repinta en cada cuadro: el canvas de la app cambia de sitio con el
  // scroll y de tamaño con el resize, y la caja tiene que seguirlo.
  const bucle = () => {
    pintaCaja();
    W.requestAnimationFrame(bucle);
  };
  W.requestAnimationFrame(bucle);

  // --- Gestos ----------------------------------------------------------------

  const CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', giro: 'grab' };

  /** Qué hay bajo el puntero: un tirador, el interior de la caja, o nada. */
  function queHay(ev) {
    if (!mostrar) return null;
    const r = cv.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    for (const t of [TIRADOR_GIRO, ...TIRADORES]) {
      const p = puntoTirador(t);
      if (Math.abs(p.x - x) <= 9 && Math.abs(p.y - y) <= 9) return t[0];
    }
    return dentroDeLaCaja(x, y) ? 'mover' : null;
  }

  let gesto = null;

  D.addEventListener(
    'pointerdown',
    (ev) => {
      const modo = queHay(ev);
      if (!modo) return;
      ev.preventDefault();
      ev.stopPropagation();
      const conv = conversorDeArrastre();
      if (!conv) return;
      const r = cv.getBoundingClientRect();
      // `opFijo` se congela AQUI, con la caja tal como estaba al agarrar: si se
      // recalculara durante el arrastre, el borde que debe quedarse quieto
      // perseguiría al que se está moviendo.
      const b0 = caja();
      const g0 = (P(pagina).giro * Math.PI) / 180;
      const opFijo = (fx, fy) => {
        const x = b0.izq + (b0.der - b0.izq) * fx;
        const y = b0.arr + (b0.aba - b0.arr) * fy;
        return { x: b0.cx + (x - b0.cx) * Math.cos(g0) - (y - b0.cy) * Math.sin(g0), y: b0.cy + (x - b0.cx) * Math.sin(g0) + (y - b0.cy) * Math.cos(g0) };
      };
      const agarre = modo === 'giro' ? puntoCaja(0.5, -brazoGiro()) : opFijo(0.5, 0.5);
      gesto = { modo, p0: P(pagina), b0, alto0: ultimo.alto, s0: { x: ev.clientX - r.left, y: ev.clientY - r.top }, conv, opFijo, agarre };
      D.body.style.cursor = modo === 'mover' ? 'move' : CURSOR[modo];
    },
    true,
  );

  D.addEventListener(
    'pointermove',
    (ev) => {
      if (!gesto) {
        const modo = queHay(ev);
        D.body.style.cursor = modo ? (modo === 'mover' ? 'move' : CURSOR[modo]) : '';
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      const r = cv.getBoundingClientRect();
      aplica(gesto, gesto.conv(ev.clientX - r.left - gesto.s0.x, ev.clientY - r.top - gesto.s0.y), ev.shiftKey);
      repinta(pagina);
      sincroniza();
    },
    true,
  );

  const soltar = () => {
    if (!gesto) return;
    gesto = null;
    D.body.style.cursor = '';
    guardar();
  };
  D.addEventListener('pointerup', soltar, true);
  D.addEventListener('pointercancel', soltar, true);

  /**
   * Traduce el arrastre a los parámetros. Cada gesto deja quieto el borde
   * opuesto al que se agarra, que es lo que hace Word y lo que la mano espera:
   * si tiro del lado derecho, el izquierdo no se mueve.
   */
  function aplica(g, d, conShift) {
    const { p0, b0, alto0 } = g;
    const set = (k, val) => fijar(pagina, k, val);
    // `d` es el desplazamiento desde donde se agarró, ya en píxeles del panel.
    // Ir por el desplazamiento y no por la posición absoluta del puntero evita
    // que el borde salte hasta el puntero cuando el tirador se agarra tres
    // píxeles descentrado.
    if (g.modo === 'mover') {
      set('u', p0.u + d.x / PANEL_W);
      set('v', p0.v + d.y / PANEL_H);
      return;
    }

    if (g.modo === 'giro') {
      // El ángulo se mide como el que barre el puntero alrededor del centro del
      // bloque, no como una conversión de píxeles a grados: así el tirador se
      // queda debajo del dedo durante toda la vuelta.
      const ax = g.agarre.x - b0.cx;
      const ay = g.agarre.y - b0.cy;
      const barrido = ((Math.atan2(ay + d.y, ax + d.x) - Math.atan2(ay, ax)) * 180) / Math.PI;
      let ang = p0.giro + barrido;
      // Shift engancha a 15°, como en Word: es la única forma cómoda de dejarlo
      // exactamente recto o en un ángulo redondo.
      if (conShift) ang = Math.round(ang / 15) * 15;
      while (ang > 180) ang -= 360;
      while (ang < -180) ang += 360;
      set('giro', ang);
      return;
    }

    // Con el bloque girado, el arrastre hay que leerlo en los EJES DE LA CAJA,
    // no en los del panel: tirando del lado derecho de un bloque inclinado 20°,
    // parte del movimiento del ratón es "a lo largo" del lado y no debe ensanchar
    // nada. Esta rotación inversa separa las dos componentes.
    const a = (p0.giro * Math.PI) / 180;
    const co = Math.cos(a);
    const si = Math.sin(a);
    const dx = d.x * co + d.y * si;
    const dy = -d.x * si + d.y * co;

    const horizontal = g.modo === 'e' || g.modo === 'w';
    const vertical = g.modo === 'n' || g.modo === 's';
    const esquina = g.modo.length === 2;
    const oeste = g.modo.includes('w');
    const norte = g.modo.includes('n');

    /**
     * Recoloca el centro para que el borde (o la esquina) OPUESTO al que se
     * agarra quede clavado donde estaba. Se hace en el panel y con el giro
     * puesto, porque el punto que el ojo ve quieto es el ya girado: fijarlo en
     * los ejes de la caja y girar después alrededor del centro nuevo lo movería.
     */
    const clava = (fxOp, fyOp, ancho, alto) => {
      const op = g.opFijo(fxOp, fyOp);
      const lx = (fxOp - 0.5) * ancho;
      const ly = (fyOp - 0.5) * alto;
      set('u', (op.x - (lx * co - ly * si)) / PANEL_W);
      set('v', (op.y - (lx * si + ly * co)) / PANEL_H);
    };

    if (esquina) {
      // Escala uniforme: cuerpo, columna y espiga suben o bajan juntos. El
      // factor sale del eje horizontal, que es el que la mano asocia al ancho;
      // el vertical lo decide el texto.
      const base = Math.abs(b0.der - b0.izq);
      const k = Math.max(0.25, Math.min(3, (base + (oeste ? -dx : dx)) / base));
      const f = acota('font', p0.font * k);
      const kReal = f / p0.font;
      set('font', f);
      set('measure', p0.measure * kReal);
      set('divider', p0.divider * kReal);
      // El alto NUEVO solo se conoce tras repartir el texto otra vez.
      const p1 = P(pagina);
      clava(oeste ? 1 : 0, norte ? 1 : 0, p1.measure, construye(pagina, p1).alto);
      return;
    }

    if (horizontal) {
      const ancho = acota('measure', p0.measure + (oeste ? -dx : dx));
      set('measure', ancho);
      clava(oeste ? 1 : 0, 0.5, ancho, construye(pagina, P(pagina)).alto);
      return;
    }

    if (vertical) {
      // Estirar en vertical separa los renglones: el cuerpo no se toca, porque
      // eso ya lo hacen las esquinas.
      const alto = Math.max(20, alto0 + (norte ? -dy : dy));
      set('line', acota('line', p0.line * (alto / Math.max(1, alto0))));
      const p1 = P(pagina);
      clava(0.5, norte ? 1 : 0, p1.measure, construye(pagina, p1).alto);
    }
  }

  // Flechas: 1 px, con Shift 10. Para el ajuste fino que el ratón no da.
  D.addEventListener('keydown', (ev) => {
    const paso = (ev.shiftKey ? 10 : 1) / (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' ? PANEL_W : PANEL_H);
    const p = P(pagina);
    if (ev.key === 'ArrowLeft') fijar(pagina, 'u', p.u - paso);
    else if (ev.key === 'ArrowRight') fijar(pagina, 'u', p.u + paso);
    else if (ev.key === 'ArrowUp') fijar(pagina, 'v', p.v - paso);
    else if (ev.key === 'ArrowDown') fijar(pagina, 'v', p.v + paso);
    else return;
    ev.preventDefault();
    repinta(pagina);
    sincroniza();
    guardar();
  });

  // --- Panel lateral ---------------------------------------------------------

  const CAMPOS = [
    ['font', 'Cuerpo de letra', 'px', 1, 0],
    ['measure', 'Ancho de columna', 'px', 4, 0],
    ['line', 'Interlineado', '×', 0.01, 2],
    ['para', 'Aire entre párrafos', '×', 0.05, 2],
    ['divider', 'Alto de la espiga', 'px', 2, 0],
    ['u', 'Centro horizontal', 'u', 0.002, 4],
    ['v', 'Centro vertical', 'v', 0.002, 4],
    ['giro', 'Giro', '°', 0.5, 2],
  ];

  dondeVaElPanel.innerHTML = `
    <style>
      .ct { height:100%; overflow:auto; padding:14px; box-sizing:border-box; font:13px/1.5 ui-monospace,Consolas,monospace; color:#e8e6e1 }
      .ct h2 { margin:0 0 4px; font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#c8912a }
      .ct p.n { margin:0 0 14px; color:#8a8378; font-size:11.5px; line-height:1.55 }
      .ct .pags { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:12px }
      .ct .pags button { padding:7px 0; background:#1a1713; color:#8a8378; border:1px solid #2a2620; border-radius:4px; cursor:pointer; font:inherit }
      .ct .pags button.on { background:#c8912a; color:#12100c; border-color:#c8912a; font-weight:700 }
      .ct .f { display:grid; grid-template-columns:1fr 76px auto auto; gap:5px; align-items:center; margin-bottom:6px }
      .ct .f label { color:#b8b2a8; font-size:11.5px }
      .ct .f input { background:#12100c; color:#e8e6e1; border:1px solid #2a2620; border-radius:3px; padding:4px 6px; font:inherit; text-align:right; width:100% ; box-sizing:border-box }
      .ct .f button { width:24px; padding:4px 0; background:#1a1713; color:#c8912a; border:1px solid #2a2620; border-radius:3px; cursor:pointer; font:inherit }
      .ct .acc { display:grid; gap:6px; margin:14px 0 }
      .ct .acc button { padding:8px; background:#1a1713; color:#e8e6e1; border:1px solid #2a2620; border-radius:4px; cursor:pointer; font:inherit; text-align:left }
      .ct .acc button:hover { border-color:#c8912a }
      .ct .est { margin:10px 0; padding:8px 10px; background:#12100c; border:1px solid #2a2620; border-radius:4px; color:#8a8378; font-size:11.5px }
      .ct .mal { border-color:#a04a32; color:#e08a6a }
      .ct textarea { width:100%; height:150px; background:#12100c; color:#b8b2a8; border:1px solid #2a2620; border-radius:4px; padding:8px; font:11px/1.5 ui-monospace,Consolas,monospace; box-sizing:border-box; resize:vertical }
      .ct .ayuda { color:#8a8378; font-size:11px; line-height:1.6; margin-top:12px; border-top:1px solid #2a2620; padding-top:10px }
      .ct .ayuda b { color:#b8b2a8; font-weight:600 }
    </style>
    <div class="ct">
      <h2>Calibrador del texto</h2>
      <p class="n">La caja se arrastra sobre la página como una imagen en Word. Cada página guarda sus propios valores.</p>
      <div class="pags" id="ct_pags"></div>
      <div id="ct_campos"></div>
      <div class="acc">
        <button id="ct_todas">Aplicar estos valores a las 7 páginas</button>
        <button id="ct_ver">Ocultar la caja</button>
        <button id="ct_reset">Restablecer esta página</button>
        <button id="ct_resetodo">Restablecer todo</button>
        <button id="ct_copiar">Copiar los valores</button>
      </div>
      <div class="est" id="ct_est"></div>
      <textarea id="ct_exp" readonly></textarea>
      <div class="ayuda">
        <b>Dentro de la caja</b> — mueve el bloque.<br />
        <b>Esquinas</b> — cuerpo de letra y ancho a la vez, con la esquina opuesta quieta.<br />
        <b>Lados izq./der.</b> — ancho de columna; el texto se reparte de nuevo.<br />
        <b>Lados arriba/abajo</b> — interlineado.<br />
        <b>Bolita de arriba</b> — gira el bloque sobre su centro (con Shift, de 15 en 15°).<br />
        <b>Flechas</b> — mueve 1 px (10 con Shift).
      </div>
    </div>`;

  const $ = (id) => dondeVaElPanel.querySelector('#' + id);

  const pags = $('ct_pags');
  for (let n = 1; n <= PAGINAS; n++) {
    const b = D.createElement('button');
    b.textContent = String(n);
    b.onclick = () => irA(n);
    pags.appendChild(b);
  }

  const campos = $('ct_campos');
  const inputs = {};
  for (const [k, rotulo, unidad, paso, dec] of CAMPOS) {
    const fila = D.createElement('div');
    fila.className = 'f';
    fila.innerHTML = `<label>${rotulo} <span style="color:#5a554d">${unidad}</span></label><input type="text" /><button>−</button><button>+</button>`;
    const [inp, menos, mas] = [fila.querySelector('input'), ...fila.querySelectorAll('button')];
    inputs[k] = { inp, dec };
    const set = (val) => {
      fijar(pagina, k, val);
      repinta(pagina);
      sincroniza();
    };
    inp.onchange = () => {
      const x = parseFloat(inp.value.replace(',', '.'));
      if (Number.isFinite(x)) set(x);
      else sincroniza();
    };
    menos.onclick = () => set(P(pagina)[k] - paso);
    mas.onclick = () => set(P(pagina)[k] + paso);
    campos.appendChild(fila);
  }

  function sincroniza() {
    for (const b of pags.children) b.classList.toggle('on', +b.textContent === pagina);
    for (const [k] of CAMPOS) {
      const { inp, dec } = inputs[k];
      if (D.activeElement !== inp) inp.value = P(pagina)[k].toFixed(dec);
    }
    const tocadas = Object.keys(C.paginas).filter((n) => JSON.stringify(C.paginas[n]) !== JSON.stringify(porDefecto(+n)));
    $('ct_est').textContent =
      `Página ${pagina} · ${ultimo.renglones} renglones · bloque de ${Math.round(ultimo.alto)} px` +
      (tocadas.length ? ` · cambiadas: ${tocadas.sort().join(', ')}` : ' · sin cambios');
    const salida = {};
    for (let n = 1; n <= PAGINAS; n++) {
      const p = P(n);
      salida[n] = {};
      for (const [k, , , , dec] of CAMPOS) salida[n][k] = +p[k].toFixed(dec);
    }
    $('ct_exp').value = JSON.stringify(salida, null, 1);
  }

  function irA(n) {
    pagina = n;
    comp.coverOpen.set(true);
    comp.current.set(n);
    comp.physFrame = PAGE_REST;
    repintaTodas();
    comp.draw(PAGE_REST);
    sincroniza();
  }

  $('ct_todas').onclick = () => {
    const p = P(pagina);
    for (let n = 1; n <= PAGINAS; n++) C.paginas[n] = { ...p };
    guardar();
    repintaTodas();
    sincroniza();
  };
  $('ct_reset').onclick = () => {
    delete C.paginas[pagina];
    guardar();
    repinta(pagina);
    sincroniza();
  };
  $('ct_resetodo').onclick = () => {
    C = { paginas: {} };
    guardar();
    repintaTodas();
    sincroniza();
  };
  $('ct_ver').onclick = (e) => {
    mostrar = !mostrar;
    e.target.textContent = mostrar ? 'Ocultar la caja' : 'Mostrar la caja';
  };
  $('ct_copiar').onclick = async (e) => {
    try {
      await navigator.clipboard.writeText($('ct_exp').value);
      e.target.textContent = 'Copiado';
      setTimeout(() => (e.target.textContent = 'Copiar los valores'), 1200);
    } catch {
      $('ct_exp').select();
    }
  };

  // --- Arranque --------------------------------------------------------------

  const fallos = compruebaReplica();
  irA(pagina);
  if (fallos.length) {
    const est = $('ct_est');
    est.className = 'est mal';
    est.textContent = `El calibrador no reproduce el texto de la app en la(s) página(s) ${fallos.join(', ')}. Los textos o las fórmulas del componente cambiaron: actualizá calibrador-texto.js antes de calibrar, o los números que saques de aquí no van a reproducir lo que ves.`;
  }
  // Se expone junto a `__ctTiradores` para poder comprobar desde una prueba que
  // lo que el componente imprime coincide, pixel a pixel, con lo que aqui se
  // calibro: `ORIGINALES` son los paneles tal como los hizo el componente, antes
  // de que esta herramienta sustituyera ninguno.
  W.__ct = { construye, ORIGINALES, P, porDefecto, compruebaReplica };
  return { comp, P, repintaTodas, compruebaReplica };
};
