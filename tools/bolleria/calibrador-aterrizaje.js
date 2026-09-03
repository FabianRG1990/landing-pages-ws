/**
 * Calibrador del aterrizaje — libro de "Acerca de nosotros".
 *
 * Motor del calibrador. La interfaz vive en `calibrador-aterrizaje.html`, que
 * carga la app en un iframe del MISMO ORIGEN y llama aquí:
 *
 *     montarCalibradorAterrizaje(ventanaDelIframe, dondeVaElPanel)
 *
 * Corre SOBRE el componente real (no es una réplica): se engancha a
 * `AboutBookComponent` por `ng.getComponent` y envuelve tres métodos en
 * caliente. La app NO se toca: no hay una línea de esto en `index.html` ni en
 * el componente. Se abre en http://localhost:4301/calibrador-aterrizaje.html
 *
 * ---------------------------------------------------------------------------
 * VALORES POR CUADRO, NO GLOBALES
 *
 * Cada cuadro de pantalla (1/60 s) puede llevar sus propios valores. Los que se
 * marcan quedan clavados; entre uno y otro se interpola en línea recta, y el
 * último se MANTIENE (el texto acompaña a la hoja, no vuelve). Así se describe un
 * desplazamiento —dx 1, luego 2, luego 3— y no solo un desfase constante, que
 * es lo único que permitía la versión anterior y por lo que no servía.
 *
 * Las tablas son independientes por sentido: el recorrido de SIGUIENTE (81→139,
 * cruce hacia el 81) y el de ANTERIOR (139→81, cruce hacia el 139) no son el
 * mismo camino y no comparten calibración.
 * ---------------------------------------------------------------------------
 *
 * Guarda en localStorage bajo `calib-aterrizaje-v2`. La v1 era de valores
 * globales y NO se migra: repartir un valor único entre los cuadros exigiría
 * inventar justo la curva que hay que calibrar.
 *
 * ---------------------------------------------------------------------------
 * MEDICIONES QUE MOTIVAN ESTA HERRAMIENTA (sobre el render real, 2026-08-27)
 *
 * 1) Entre el cuadro 133 (último con malla) y el 134 (primero de reposo) el
 *    texto NO se mueve: se queda en las mismas columnas. Lo que cambia es el
 *    peso de la tinta. Perfil de una fila que cruza letras:
 *
 *      columna:   0     1     2     3     4     5
 *      133:      64   128   141   152    99    58   <- ruta de la vuelta
 *      134:      26   117   135   147    82     9   <- ruta de reposo
 *                                          media: 21 niveles
 *
 *    En la zona del texto ese paso vale 3700 px contra 130-280 de sus vecinos.
 *    Causa: en reposo el texto va con `multiply` DIRECTO al canvas y las celdas
 *    del warp se solapan (`bleed` = 0.5/16), así que la banda solapada se
 *    multiplica dos veces; en la vuelta va a una capa con `source-over`, donde
 *    el solape no acumula. No es que la vuelta esté clara: el reposo está
 *    oscuro de más. Descartados midiendo: `clipPaper` (89,9 -> 89,4), la
 *    máscara de oclusión (89,9 -> 90,0) y el texto de la hoja (no se dibuja en
 *    el 133, su `fa` es 0).
 *
 * 2) Los adornos de las esquinas solo se mueven durante el CRUCE, que arranca
 *    DENTRO del aterrizaje y no al final: pararse en el cuadro 139 no lo
 *    enseña. Están impresos en el vídeo en posiciones que difieren 4,02 px
 *    entre los dos cuadros de reposo, así que ahí se desdoblan. No se pueden
 *    mover —son píxeles del vídeo— pero sí se elige cuándo y en cuánto tiempo
 *    se cruzan.
 * ---------------------------------------------------------------------------
 */
window.montarCalibradorAterrizaje = async (W, dondeVaElPanel) => {
  'use strict';

  /** El documento de la APP (dentro del iframe). El panel vive fuera, aparte. */
  const D = W.document;
  const DOC = dondeVaElPanel.ownerDocument;

  const CLAVE = 'calib-aterrizaje-v2';
  const MESH_LO = 83;
  const MESH_HI = 133;
  const GIRO_LO = 81;
  const GIRO_HI = 139;
  const MS_PER_FRAME = 22;
  const TAIL_MS = 65;
  const TAIL_LEAD_NEXT = (GIRO_HI - MESH_HI) * MS_PER_FRAME; // 132
  const TAIL_LEAD_PREV = (MESH_LO - 1 - GIRO_LO) * MS_PER_FRAME; // 22
  const COLA_SIN_SOLAPE = (t) => 1 - (1 - t) * (1 - t);
  const PASO_MS = 1000 / 60; // un cuadro de pantalla

  /** Mandos que se calibran CUADRO A CUADRO, con su valor cuando nadie los tocó. */
  const POR_CUADRO = { pesoReposo: 1, pesoVuelta: 1, dx: 0, dy: 0, escala: 1, area: 0, oclusion: 0 };
  /**
   * Mandos que son del recorrido entero y no tienen sentido por cuadro.
   *
   * `fuera` decide qué pasa en los cuadros que quedan ANTES del primer clavado
   * y DESPUÉS del último:
   *
   *   'acompana' — el último valor SE QUEDA. Es lo correcto cuando lo que se
   *                calibra es el texto siguiendo a la hoja: entre el cuadro
   *                139 y el 81 el papel se corre +4,02 px a la derecha, y el
   *                texto tiene que quedarse donde el papel lo dejó. Por eso es
   *                el modo por defecto.
   *   'vuelve'   — fuera del tramo clavado se regresa al valor del componente.
   *                Sirve para un gesto de ida y vuelta, no para acompañar:
   *                deshace el desplazamiento en cuanto termina el tramo.
   */
  const GLOBALES = { colaLead: null, colaMs: null, fuera: 'acompana' };

  const vacio = () => ({
    global: { siguiente: { ...GLOBALES }, anterior: { ...GLOBALES } },
    pasos: { siguiente: {}, anterior: {} },
  });

  let C = (() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (guardado && guardado.pasos && guardado.global) {
        for (const s2 of ['siguiente', 'anterior']) (guardado.global[s2] ??= { ...GLOBALES }).fuera ??= 'acompana';
        return guardado;
      }
    } catch {
      /* nada guardado o ilegible */
    }
    return vacio();
  })();

  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(C));
    } catch {
      /* modo privado: se sigue calibrando en memoria */
    }
  };

  let sentido = 'siguiente';
  const tabla = () => C.pasos[sentido];
  const glob = () => C.global[sentido];

  // --- Valor efectivo en un paso --------------------------------------------

  /** Índices con valor propio para `k`, ordenados. Se cachea: se lee en cada dibujo. */
  let cache = {};
  const olvidaCache = () => {
    cache = {};
  };
  function marcados(k) {
    if (cache[k]) return cache[k];
    const T = tabla();
    const ks = Object.keys(T)
      .map(Number)
      .filter((n) => T[n] && T[n][k] != null)
      .sort((a, b) => a - b);
    cache[k] = ks;
    return ks;
  }

  /**
   * Valor de `k` en el paso `i`: el clavado si lo hay, la recta entre los dos
   * clavados que lo rodean si está en medio, y el de la punta más cercana si
   * cae fuera. Sin ningún clavado, el valor de fábrica —que es el
   * comportamiento actual del componente, exactamente.
   */
  function V(k, i) {
    const ks = marcados(k);
    if (!ks.length) return POR_CUADRO[k];
    const T = tabla();
    const alPunto = glob().fuera !== 'vuelve';
    if (i < ks[0]) return alPunto ? T[ks[0]][k] : POR_CUADRO[k];
    if (i > ks[ks.length - 1]) return alPunto ? T[ks[ks.length - 1]][k] : POR_CUADRO[k];
    if (i === ks[0]) return T[ks[0]][k];
    if (i === ks[ks.length - 1]) return T[ks[ks.length - 1]][k];
    for (let j = 0; j < ks.length - 1; j++) {
      if (i >= ks[j] && i <= ks[j + 1]) {
        const a = ks[j];
        const b = ks[j + 1];
        return T[a][k] + (T[b][k] - T[a][k]) * ((i - a) / (b - a));
      }
    }
    return POR_CUADRO[k];
  }

  /** Paso que se está dibujando. Lo fija `pintaPaso`. */
  let pasoActual = 0;
  const v = (k) => V(k, pasoActual);

  function fijar(k, valor, i) {
    const T = tabla();
    (T[i] ??= {})[k] = valor;
    olvidaCache();
    guardar();
  }

  // --- Enganche al componente -----------------------------------------------

  const esperar = async () => {
    for (let i = 0; i < 300; i++) {
      const host = D.querySelector('bol-about-book');
      const c = host && W.ng && W.ng.getComponent(host);
      const lienzo = D.querySelector('canvas.bol-book__canvas');
      if (c && lienzo && c.curl && c.frames && c.frames[MESH_HI]) return { comp: c, cv: lienzo };
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('No apareció bol-about-book con los cuadros cargados.');
  };

  const { comp, cv } = await esperar();
  const g = cv.getContext('2d', { willReadFrequently: true });

  /**
   * Zona de la página derecha en píxeles del canvas. SE RECALCULA en cada uso:
   * al montar, el canvas puede medir todavía 300x150 (lo de fábrica, antes de
   * que corra `sizeCanvas`), y una caja fijada ahí cae en una esquina vacía y
   * todas las medidas salen cero.
   */
  const cajaTexto = () => {
    const S = cv.width / 860;
    return [Math.round(445 * S), Math.round(215 * S), Math.round(720 * S), Math.round(458 * S)];
  };

  // --- Parches en caliente ---------------------------------------------------

  const origDrawOnMesh = comp.drawOnMesh.bind(comp);
  const origMask = comp.buildSheetMask.bind(comp);

  /**
   * El componente sigue vivo dentro del iframe y repinta por su cuenta (al
   * hidratar deja el cuadro 1, y `sizeCanvas` redibuja en cada resize). Sin
   * esto, congelar un instante no dura: medido, `lastDrawn` volvía a 1 justo
   * después de montar y todas las medidas salían cero.
   */
  const origDraw = comp.draw.bind(comp);
  let mando = false;
  comp.draw = (f) => {
    if (mando) return origDraw(f);
  };
  function dibuja(frame) {
    mando = true;
    try {
      origDraw(frame);
    } finally {
      mando = false;
    }
  }

  /** true mientras se dibuja por la ruta de la vuelta (hay malla). */
  let rutaVuelta = false;

  /**
   * Reentinta un panel: por encima de 1, "más pasadas de tinta"
   * (a' = 1-(1-a)^k, satura sin desbordar); por debajo, atenuación
   * proporcional. Son dos ramas porque el núcleo del trazo ya viene con alfa 1
   * y la fórmula de pasadas no lo toca — y el núcleo es justo lo que separa al
   * 133 del 134 (64 contra 26 niveles).
   */
  const cachePeso = new Map();
  function reentintar(panel, k) {
    if (k === 1) return panel;
    const clave = panel.width + 'x' + panel.height + ':' + k.toFixed(4);
    const hit = cachePeso.get(clave);
    if (hit && hit.src === panel) return hit.out;
    const out = D.createElement('canvas');
    out.width = panel.width;
    out.height = panel.height;
    const oc = out.getContext('2d');
    oc.drawImage(panel, 0, 0);
    const im = oc.getImageData(0, 0, out.width, out.height);
    const d = im.data;
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i] / 255;
      if (a <= 0) continue;
      d[i] = Math.round(255 * (k >= 1 ? 1 - Math.pow(1 - a, k) : a * k));
    }
    oc.putImageData(im, 0, 0);
    cachePeso.set(clave, { src: panel, out });
    return out;
  }

  /** Centro + alejamiento sobre los vértices de la superficie (coords de vídeo). */
  function moverPts(pts) {
    const dx = v('dx');
    const dy = v('dy');
    const es = v('escala');
    if (dx === 0 && dy === 0 && es === 1) return pts;
    let cx = 0;
    let cy = 0;
    for (const p of pts) {
      cx += p[0];
      cy += p[1];
    }
    cx /= pts.length;
    cy /= pts.length;
    return pts.map((p) => [cx + (p[0] - cx) * es + dx, cy + (p[1] - cy) * es + dy]);
  }

  /** Encoge o expande el rectángulo (u,v) del área impresa respecto a su centro. */
  function moverUV(uv) {
    const a = v('area');
    if (a === 0) return uv;
    let cu = 0;
    let cvv = 0;
    for (const q of uv) {
      cu += q.u;
      cvv += q.v;
    }
    cu /= uv.length;
    cvv /= uv.length;
    const k = 1 - a * 2;
    return uv.map((q) => ({ u: cu + (q.u - cu) * k, v: cvv + (q.v - cvv) * k }));
  }

  const esTexto = (img) => Array.isArray(comp.textPanels) && comp.textPanels.indexOf(img) >= 0;

  comp.drawOnMesh = function (ctx, img, pts, vis, uv, ox, oy, scale, fillOccluded) {
    if (esTexto(img)) {
      img = reentintar(img, rutaVuelta ? v('pesoVuelta') : v('pesoReposo'));
      pts = moverPts(pts);
      uv = moverUV(uv);
    }
    return origDrawOnMesh(ctx, img, pts, vis, uv, ox, oy, scale, fillOccluded);
  };

  /** Margen de oclusión: dilata (+) o erosiona (−) la silueta de la hoja. */
  comp.buildSheetMask = function (...a) {
    const m = origMask(...a);
    const extra = v('oclusion');
    if (!m || extra === 0) return m;
    const r = Math.round(Math.abs(extra));
    if (r === 0) return m;
    const out = D.createElement('canvas');
    out.width = m.width;
    out.height = m.height;
    const oc = out.getContext('2d');
    const dirs = [];
    for (let a2 = 0; a2 < 8; a2++) dirs.push([Math.round(r * Math.cos((a2 * Math.PI) / 4)), Math.round(r * Math.sin((a2 * Math.PI) / 4))]);
    oc.drawImage(m, 0, 0);
    if (extra > 0) {
      for (const [ux, uy] of dirs) oc.drawImage(m, ux, uy); // dilatar
    } else {
      oc.globalCompositeOperation = 'destination-in';
      for (const [ux, uy] of dirs) oc.drawImage(m, ux, uy); // erosionar
      oc.globalCompositeOperation = 'source-over';
    }
    return out;
  };

  // --- La línea de tiempo real ----------------------------------------------
  // Réplica de lo que hace `playChain` en cada instante, cola incluida.

  function plan() {
    const haciaAlto = sentido === 'siguiente';
    const desde = haciaAlto ? GIRO_LO : GIRO_HI;
    const hasta = haciaAlto ? GIRO_HI : GIRO_LO;
    const duracion = Math.abs(hasta - desde) * MS_PER_FRAME; // 1276
    const G = glob();
    const lead = G.colaLead != null ? G.colaLead : haciaAlto ? TAIL_LEAD_NEXT : TAIL_LEAD_PREV;
    const ms = G.colaMs != null ? G.colaMs : TAIL_MS;
    const colaEn = Math.max(0, duracion - lead);
    return { haciaAlto, desde, hasta, duracion, colaEn, fin: colaEn + ms, colaMs: ms, destino: desde };
  }

  const totalPasos = () => Math.round(plan().fin / PASO_MS);
  const msDe = (i) => i * PASO_MS;

  /** Dibuja el paso `i` tal como lo dibujaría la animación real. */
  function pintaPaso(i, sinCruce) {
    const P = plan();
    const t = msDe(i);
    const tt = Math.min(1, t / P.duracion);
    const f = P.desde + (P.hasta - P.desde) * tt;
    const enCola = t >= P.colaEn && !sinCruce;
    pasoActual = i;

    if (!enCola) {
      comp.fundido = null;
      comp.transition = { leaving: 2, entering: 3, towardHigh: P.haciaAlto };
      rutaVuelta = f >= MESH_LO && f <= MESH_HI;
      dibuja(f);
      return { f, enCola: false, ct: 0 };
    }
    // `alEmpezar`: la página ya cambió cuando arranca el cruce.
    comp.transition = null;
    comp.current.set(P.haciaAlto ? 3 : 2);
    const ct = Math.min(1, (t - P.colaEn) / P.colaMs);
    comp.fundido = ct < 1 ? { desde: f, hacia: P.destino, t: COLA_SIN_SOLAPE(ct) } : null;
    rutaVuelta = false;
    dibuja(P.destino);
    return { f, enCola: true, ct };
  }

  /** Pintar un cuadro suelto, sin cola (para las medidas de 133 contra 134). */
  function pintaCuadro(frame) {
    comp.fundido = null;
    if (frame <= MESH_HI) {
      comp.transition = { leaving: 2, entering: 3, towardHigh: true };
      rutaVuelta = frame >= MESH_LO;
    } else {
      comp.transition = null;
      comp.current.set(3);
      rutaVuelta = false;
    }
    dibuja(frame);
  }

  // --- Medidas ---------------------------------------------------------------

  const leeCaja = (q) => g.getImageData(q[0], q[1], q[2] - q[0], q[3] - q[1]).data;
  function difer(A, B) {
    let n = 0;
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
      if (d > 8) n++;
    }
    return n;
  }

  function saltoTexto(a, b) {
    const q = cajaTexto();
    pintaCuadro(a);
    const A = leeCaja(q);
    pintaCuadro(b);
    return difer(A, leeCaja(q));
  }

  function tinta(frame) {
    const q = cajaTexto();
    pintaCuadro(frame);
    const d = leeCaja(q);
    let n = 0;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) {
      const L = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      if (L < 150) {
        n++;
        s += L;
      }
    }
    return n ? s / n : 0;
  }

  /**
   * Lo que APORTA el cruce, no lo que se mueve en pantalla. Medir el cambio
   * entre cuadros consecutivos no sirve: ahí el aterrizaje se está frenando y
   * mueve él solo decenas de miles de píxeles, así que el número salía igual
   * (41510 px, en un instante ANTERIOR al cruce) se pusieran los mandos como se
   * pusieran. Esto compara el mismo instante con cruce y sin él.
   */
  function medirCruce() {
    const P = plan();
    let peor = 0;
    let peorPaso = 0;
    let cuantos = 0;
    const desde = Math.floor(P.colaEn / PASO_MS);
    const hasta = Math.ceil(P.fin / PASO_MS);
    for (let i = desde; i <= hasta; i++) {
      pintaPaso(i);
      const A = g.getImageData(0, 0, cv.width, cv.height).data;
      pintaPaso(i, true);
      const n = difer(A, g.getImageData(0, 0, cv.width, cv.height).data);
      if (n > 300) cuantos++;
      if (n > peor) {
        peor = n;
        peorPaso = i;
      }
    }
    return { peor, peorPaso, cuantos };
  }

  // --- Interfaz --------------------------------------------------------------

  const css = `
  #calib-at{height:100%;overflow:auto;background:#16130f;color:#eee;box-sizing:border-box;
    font:12px/1.45 ui-monospace,Consolas,monospace;padding:10px 12px;border-left:2px solid #C8912A}
  #calib-at h1{font-size:13px;margin:0 0 2px;color:#E8B84B;letter-spacing:.04em}
  #calib-at .sub{color:#8a8378;font-size:10.5px;margin:0 0 10px}
  #calib-at fieldset{border:1px solid #3a332a;border-radius:5px;margin:0 0 9px;padding:7px 8px 8px}
  #calib-at legend{color:#C8912A;font-size:10.5px;padding:0 4px;letter-spacing:.05em}
  #calib-at .fila{display:grid;grid-template-columns:1fr 92px 50px 14px;gap:5px;align-items:center;margin:4px 0}
  #calib-at label{color:#cfc7ba;font-size:11px}
  #calib-at input[type=range]{width:100%;accent-color:#C8912A}
  #calib-at input[type=number]{width:100%;background:#0e0c09;color:#eee;border:1px solid #3a332a;
    border-radius:3px;padding:2px 3px;font:11px ui-monospace,monospace}
  #calib-at .pin{font-size:12px;text-align:center;color:#3a332a}
  #calib-at .pin.si{color:#E8B84B}
  #calib-at .btns{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
  #calib-at button{background:#2a2419;color:#e8dcc4;border:1px solid #4a4030;border-radius:4px;
    padding:4px 8px;cursor:pointer;font:11px ui-monospace,monospace}
  #calib-at button:hover{background:#3a3222;border-color:#C8912A}
  #calib-at button.on{background:#C8912A;color:#16130f;font-weight:700}
  #calib-at button.peligro{border-color:#7a3030;color:#e8a0a0}
  #calib-at .med{background:#0e0c09;border:1px solid #3a332a;border-radius:4px;padding:6px 7px;margin-top:5px}
  #calib-at .med b{color:#E8B84B}
  #calib-at .grande{font-size:17px;color:#E8B84B;font-weight:700}
  #calib-at .bien{color:#7ac77a}#calib-at .mal{color:#e08a6a}
  #calib-at textarea{width:100%;height:86px;background:#0e0c09;color:#bdb4a4;border:1px solid #3a332a;
    border-radius:3px;font:10px ui-monospace,monospace;margin-top:5px}
  #calib-at .nota{color:#8a8378;font-size:10px;margin:5px 0 0;line-height:1.4}
  #calib-at .cuadro{display:flex;align-items:center;gap:6px;margin:3px 0}
  #calib-at .cuadro .n{font-size:14px;color:#E8B84B;font-weight:700;min-width:78px;text-align:center}
  #calib-at .stat{color:#9aa0a8;font-size:10.5px;margin:5px 0 0}
  #calib-at .marcas{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px}
  #calib-at .marcas span{background:#2a2419;border:1px solid #4a4030;border-radius:3px;
    padding:1px 5px;font-size:10px;color:#E8B84B;cursor:pointer}
  #calib-at .marcas span:hover{background:#C8912A;color:#16130f}`;
  const st = DOC.createElement('style');
  st.textContent = css;
  DOC.head.appendChild(st);

  const MANDOS = [
    { k: 'pesoReposo', et: 'peso tinta · reposo', min: 0.3, max: 1.5, paso: 0.01, ay: 'Ganancia del texto cuando el cuadro se dibuja por la ruta de reposo. Es el mando del salto 133→134.' },
    { k: 'pesoVuelta', et: 'peso tinta · vuelta', min: 0.3, max: 2.5, paso: 0.01, ay: 'Ganancia del texto cuando el cuadro se dibuja por la ruta de la vuelta (malla, 83-133).' },
    { k: 'dx', et: 'centro X', min: -20, max: 20, paso: 0.5, ay: 'Corre el texto en horizontal, en px de vídeo.' },
    { k: 'dy', et: 'centro Y', min: -20, max: 20, paso: 0.5, ay: 'Corre el texto en vertical, en px de vídeo.' },
    { k: 'escala', et: 'alejamiento', min: 0.9, max: 1.1, paso: 0.002, ay: 'Escala del texto respecto a su centro.' },
    { k: 'area', et: 'borde: área impresa', min: -0.05, max: 0.05, paso: 0.002, ay: 'Margen del bloque de texto dentro de la página.' },
    { k: 'oclusion', et: 'borde: tapado hoja', min: -8, max: 16, paso: 1, ay: 'Píxeles extra con que la hoja esconde lo de abajo. 0 = los 8 del código.' },
  ];
  const DEL_CRUCE = [
    { k: 'colaLead', et: 'cruce: arranca a −N ms', min: 0, max: 400, paso: 1 },
    { k: 'colaMs', et: 'cruce: dura N ms', min: 17, max: 400, paso: 1 },
  ];

  const panel = DOC.createElement('div');
  panel.id = 'calib-at';
  panel.innerHTML =
    `<h1>Calibrador del aterrizaje</h1><p class="sub">valores por cuadro · sobre el componente real</p>` +
    `<fieldset><legend>momento</legend>
       <div class="btns" style="margin:0 0 6px">
         <button id="ca_sig" class="on">siguiente ▶</button><button id="ca_ant">◀ anterior</button>
       </div>
       <div class="cuadro"><button id="ca_prev">◀</button><span class="n" id="ca_n">0</span><button id="ca_next">▶</button>
       <input type="range" id="ca_i" min="0" max="72" step="1" value="0" style="flex:1"></div>
       <p class="stat" id="ca_donde">—</p>
       <div class="btns"><button id="ca_cruce">Ir al cruce</button><button id="ca_play">▶ lenta</button></div>
     </fieldset>` +
    `<fieldset><legend>este cuadro</legend>
       <div id="ca_mandos"></div>
       <p class="stat" id="ca_estado">—</p>
       <div class="btns">
         <button id="ca_copiar">Copiar del anterior</button>
         <button id="ca_borrar" class="peligro">Borrar este cuadro</button>
       </div>
       <p class="nota">El punto ● se enciende en los valores clavados en ESTE cuadro. Mover un deslizador lo clava acá. Entre dos cuadros clavados se interpola solo.</p>
       <div class="marcas" id="ca_marcas"></div>
     </fieldset>` +
    `<fieldset><legend>del recorrido entero</legend><div id="ca_cruceman"></div>
       <div class="btns"><button id="ca_fuera">Al terminar: acompaña a la hoja</button></div>
       <p class="nota">«Acompaña a la hoja»: el último valor se queda puesto, porque el papel se quedó ahí. «Vuelve a su sitio»: el texto regresa al terminar el tramo, como un gesto de ida y vuelta.</p>
     </fieldset>` +
    `<fieldset><legend>medida en vivo</legend>
       <div class="med">
         desdoblamiento del cruce: <span class="grande" id="ca_brusco">—</span> px<br>
         <span class="nota" id="ca_bruscoD">—</span>
       </div>
       <div class="med">
         salto 133→134 en el texto: <b id="ca_salto">—</b> px · tinta <b id="ca_t133">—</b>/<b id="ca_t134">—</b> desf. <b id="ca_td">—</b><br>
         <span class="nota">sin tocar nada: 3700 px · 89,9 / 73,1 · +16,8</span>
       </div>
       <div class="btns"><button id="ca_medir" class="on">Medir ahora</button><button id="ca_auto">Medir al soltar: sí</button></div>
     </fieldset>` +
    `<fieldset><legend>guardar</legend>
       <div class="btns"><button id="ca_exp">Exportar JSON</button><button id="ca_reset" class="peligro">Borrar TODO</button></div>
       <textarea id="ca_out" placeholder="El JSON aparece acá al exportar"></textarea>
     </fieldset>`;
  dondeVaElPanel.appendChild(panel);

  const $ = (id) => panel.querySelector('#' + id);
  let auto = true;
  let iActual = 0;

  // Mandos POR CUADRO. Mover un deslizador clava el valor en el cuadro actual:
  // es lo que hace falta para describir un desplazamiento, y lo que no permitía
  // la versión de valores globales.
  const cont = $('ca_mandos');
  for (const m of MANDOS) {
    const row = DOC.createElement('div');
    row.className = 'fila';
    row.innerHTML =
      `<label title="${m.ay}">${m.et}</label>` +
      `<input type="range" id="s_${m.k}" min="${m.min}" max="${m.max}" step="${m.paso}">` +
      `<input type="number" id="n_${m.k}" step="${m.paso}">` +
      `<span class="pin" id="p_${m.k}">●</span>`;
    cont.appendChild(row);
    const s = row.querySelector('#s_' + m.k);
    const n = row.querySelector('#n_' + m.k);
    const set = (val, medir) => {
      fijar(m.k, +val, iActual);
      irA(iActual);
      pintaMarcas();
      if (medir && auto) medirTodo();
    };
    s.oninput = () => set(s.value, false);
    s.onchange = () => set(s.value, true);
    n.onchange = () => set(n.value, true);
    m._sync = () => {
      const val = V(m.k, iActual);
      s.value = val;
      n.value = val;
      const T = tabla();
      $('p_' + m.k).className = 'pin' + (T[iActual] && T[iActual][m.k] != null ? ' si' : '');
    };
  }

  // Mandos del recorrido entero.
  const cont2 = $('ca_cruceman');
  for (const m of DEL_CRUCE) {
    const row = DOC.createElement('div');
    row.className = 'fila';
    row.innerHTML =
      `<label>${m.et}</label>` +
      `<input type="range" id="s_${m.k}" min="${m.min}" max="${m.max}" step="${m.paso}">` +
      `<input type="number" id="n_${m.k}" step="${m.paso}"><span></span>`;
    cont2.appendChild(row);
    const s = row.querySelector('#s_' + m.k);
    const n = row.querySelector('#n_' + m.k);
    const set = (val, medir) => {
      glob()[m.k] = +val;
      guardar();
      irA(iActual);
      if (medir && auto) medirTodo();
    };
    s.oninput = () => set(s.value, false);
    s.onchange = () => set(s.value, true);
    n.onchange = () => set(n.value, true);
    m._sync = () => {
      const G = glob();
      const val = G[m.k] != null ? G[m.k] : m.k === 'colaMs' ? TAIL_MS : sentido === 'siguiente' ? TAIL_LEAD_NEXT : TAIL_LEAD_PREV;
      s.value = val;
      n.value = val;
    };
  }
  const sincroniza = () => {
    for (const m of MANDOS) m._sync();
    for (const m of DEL_CRUCE) m._sync();
    if (panel.querySelector('#ca_fuera')) rotuloFuera();
  };

  /** Chips con los cuadros que tienen algo clavado; se salta a ellos con un clic. */
  function pintaMarcas() {
    const T = tabla();
    const ks = Object.keys(T)
      .map(Number)
      .sort((a, b) => a - b);
    $('ca_marcas').innerHTML = ks.length
      ? ks.map((k) => `<span data-i="${k}">${k} · ${Math.round(msDe(k))} ms</span>`).join('')
      : '<span style="background:none;border:0;color:#8a8378;cursor:default">ningún cuadro clavado todavía</span>';
    for (const el of $('ca_marcas').querySelectorAll('span[data-i]')) el.onclick = () => irA(+el.dataset.i);
  }

  function irA(i) {
    const max = totalPasos();
    iActual = Math.max(0, Math.min(max, Math.round(i)));
    $('ca_i').max = max;
    $('ca_i').value = iActual;
    const r = pintaPaso(iActual);
    const P = plan();
    $('ca_n').textContent = iActual + ' · ' + Math.round(msDe(iActual)) + 'ms';
    $('ca_donde').innerHTML = r.enCola
      ? `cuadro ${iActual} de ${max} · <b style="color:#E8B84B">EN EL CRUCE</b> ${Math.round(r.ct * 100)}% · vídeo ${r.f.toFixed(1)} → ${P.destino}`
      : `cuadro ${iActual} de ${max} · vídeo ${r.f.toFixed(1)} · el cruce arranca en el cuadro ${Math.round(P.colaEn / PASO_MS)}`;
    const propio = tabla()[iActual];
    $('ca_estado').textContent = propio
      ? 'clavado acá: ' +
        Object.entries(propio)
          .map(([k, val]) => k + '=' + String(+(+val).toFixed(3)))
          .join('  ')
      : 'sin valores propios — hereda de los cuadros clavados vecinos';
    sincroniza();
  }

  function medirTodo() {
    const cr = medirCruce();
    $('ca_brusco').textContent = cr.peor;
    $('ca_brusco').className = 'grande ' + (cr.peor < 12000 ? 'bien' : cr.peor < 28000 ? '' : 'mal');
    $('ca_bruscoD').textContent = `peor instante en el cuadro ${cr.peorPaso} (${Math.round(msDe(cr.peorPaso))} ms), repartido en ${cr.cuantos} cuadros`;
    $('ca_salto').textContent = saltoTexto(133, 134);
    const a = tinta(133);
    const b = tinta(134);
    $('ca_t133').textContent = a.toFixed(1);
    $('ca_t134').textContent = b.toFixed(1);
    const d = a - b;
    $('ca_td').textContent = (d > 0 ? '+' : '') + d.toFixed(1);
    $('ca_td').className = Math.abs(d) < 2 ? 'bien' : Math.abs(d) < 8 ? '' : 'mal';
    irA(iActual);
  }

  $('ca_i').oninput = () => irA(+$('ca_i').value);
  $('ca_prev').onclick = () => irA(iActual - 1);
  $('ca_next').onclick = () => irA(iActual + 1);
  $('ca_cruce').onclick = () => irA(Math.round(plan().colaEn / PASO_MS));
  const cambiaSentido = (s2) => {
    sentido = s2;
    olvidaCache();
    $('ca_sig').classList.toggle('on', s2 === 'siguiente');
    $('ca_ant').classList.toggle('on', s2 === 'anterior');
    pintaMarcas();
    irA(Math.round(plan().colaEn / PASO_MS));
    if (auto) medirTodo();
  };
  $('ca_sig').onclick = () => cambiaSentido('siguiente');
  $('ca_ant').onclick = () => cambiaSentido('anterior');

  $('ca_copiar').onclick = () => {
    const T = tabla();
    let orig = null;
    for (let j = iActual - 1; j >= 0 && !orig; j--) if (T[j]) orig = T[j];
    T[iActual] = { ...(orig ?? Object.fromEntries(MANDOS.map((m) => [m.k, V(m.k, Math.max(0, iActual - 1))]))) };
    olvidaCache();
    guardar();
    irA(iActual);
    pintaMarcas();
    if (auto) medirTodo();
  };
  $('ca_borrar').onclick = () => {
    delete tabla()[iActual];
    olvidaCache();
    guardar();
    irA(iActual);
    pintaMarcas();
    if (auto) medirTodo();
  };

  $('ca_play').onclick = async (e) => {
    e.target.classList.add('on');
    const max = totalPasos();
    for (let i = Math.round(max * 0.6); i <= max; i++) {
      irA(i);
      await new Promise((r) => setTimeout(r, 60));
    }
    e.target.classList.remove('on');
  };

  const rotuloFuera = () => {
    $('ca_fuera').textContent = 'Al terminar: ' + (glob().fuera === 'vuelve' ? 'vuelve a su sitio' : 'acompaña a la hoja');
  };
  $('ca_fuera').onclick = () => {
    const G = glob();
    G.fuera = G.fuera === 'vuelve' ? 'acompana' : 'vuelve';
    guardar();
    rotuloFuera();
    irA(iActual);
    if (auto) medirTodo();
  };

  $('ca_medir').onclick = () => medirTodo();
  $('ca_auto').onclick = (e) => {
    auto = !auto;
    e.target.textContent = 'Medir al soltar: ' + (auto ? 'sí' : 'no');
  };
  $('ca_exp').onclick = () => {
    // Se exporta el ms de cada cuadro junto a sus valores, para poder leerlo sin
    // tener que recalcular el índice.
    const salida = {};
    for (const s2 of ['siguiente', 'anterior']) {
      salida[s2] = { global: C.global[s2], cuadros: {} };
      for (const [k, val] of Object.entries(C.pasos[s2])) salida[s2].cuadros[k] = { ms: Math.round(k * PASO_MS), ...val };
    }
    $('ca_out').value = JSON.stringify(salida, null, 1);
    $('ca_out').select();
  };
  $('ca_reset').onclick = () => {
    C = vacio();
    olvidaCache();
    guardar();
    pintaMarcas();
    irA(iActual);
    medirTodo();
  };

  // Arranque. `draw` se rinde sin pintar si aún no tiene contexto o bitmap, y al
  // montar desde la página del calibrador eso pasa de verdad: medido, el primer
  // intento se perdía y el canvas se quedaba en el cuadro 1 con todo en cero.
  comp.busy && comp.busy.set && comp.busy.set(true);
  for (let k = 0; k < 100 && comp.lastDrawn !== MESH_HI; k++) {
    pintaCuadro(MESH_HI);
    if (comp.lastDrawn === MESH_HI) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (comp.lastDrawn !== MESH_HI) throw new Error('El componente no llegó a dibujar el cuadro 133.');
  pintaMarcas();
  irA(Math.round(plan().colaEn / PASO_MS));
  medirTodo();
  console.log('[calibrador-aterrizaje] activo, valores por cuadro. Estado:', C);
};
