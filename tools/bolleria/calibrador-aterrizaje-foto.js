/**
 * Calibrador del aterrizaje de la FOTO — libro de "Acerca de nosotros".
 *
 * Hermano de `calibrador-aterrizaje.js`, que hace lo mismo con el texto. Misma
 * arquitectura y mismo modo de trabajar: valores CUADRO A CUADRO de pantalla,
 * interpolados en línea recta entre los que se clavan. La interfaz vive en
 * `calibrador-aterrizaje-foto.html`, que carga la app en un iframe del MISMO
 * ORIGEN y llama aquí:
 *
 *     montarCalibradorAterrizajeFoto(ventanaDelIframe, dondeVaElPanel)
 *
 * Corre SOBRE el componente real (no es una réplica): se engancha a
 * `AboutBookComponent` por `ng.getComponent` y envuelve cinco métodos en
 * caliente. La app NO se toca: no hay una línea de esto en `index.html` ni en
 * el componente. Se abre en
 * http://localhost:4301/calibrador-aterrizaje-foto.html
 *
 * Guarda en localStorage bajo `calib-aterrizaje-foto-v1`, tabla aparte de la
 * del texto: son dos calibraciones distintas y compartir clave haría que tocar
 * una moviera la otra.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES "LA FOTO QUE ATERRIZA"
 *
 * Durante la vuelta hay DOS fotos en pantalla: la de la página que se va,
 * quieta sobre la página izquierda y tapándose poco a poco, y la que entra,
 * impresa en el DORSO de la hoja. La que aterriza es la segunda: cuando la
 * hoja se detiene, esa misma foto pasa a dibujarse por la ruta de reposo.
 *
 * Los mandos tocan SOLO esa. La que se va no se mueve, porque no se está
 * yendo a ningún sitio: está quieta y el papel la cubre.
 *
 * La regla vale en los dos sentidos con una sola frase —es la foto de la
 * página en la que TERMINA el recorrido: la 3 en "siguiente", la 2 en
 * "anterior"—, y en los dos casos coincide con la que va impresa en el dorso.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * MEDICIONES QUE MOTIVAN ESTA HERRAMIENTA (sobre el render real, 2026-08-29,
 * lienzo de 1040x844)
 *
 * 1) EL FINAL YA ESTÁ BIEN, y conviene saberlo antes de tocar nada. Entre el
 *    cuadro 133 (último con malla) y el 134 (primero de reposo) la huella de
 *    la foto se mueve UN píxel en el borde izquierdo y cero en los otros tres:
 *
 *      borde:        izq   arr   der   aba
 *      133 -> 134:    +1     0     0     0
 *
 *    y de 129.599 píxeles de la zona solo cambian 5.329 (4%), con una media de
 *    2,77 niveles y un desfase de luminancia de +0,69. Eso es lo que queda del
 *    arreglo que ya lleva `drawRestPhoto` —sombrear la foto en reposo igual que
 *    en la vuelta, que bajó dos escalones del 8% a un 0,6% repartido en 99
 *    cuadros—. No es un sitio donde haga falta pelear.
 *
 * 2) LO QUE SÍ SALTA ES LA ENTRADA. La foto del dorso no aparece con un
 *    desvanecido: aparece de golpe. `ba` —la opacidad con la que entra, medida
 *    en about-book-curl.json— vale 0 hasta el cuadro 116 y 1 desde el 117, sin
 *    nada en medio:
 *
 *      cuadro:  113  114  115  116  117   118    119    120
 *      ba:        0    0    0    0    1     1      1      1
 *      huella:    0    0    0    0    0  5386  13988  21570  <- px de foto visibles
 *
 *    En el 117 `ba` ya vale 1 pero el dorso todavía no enseña nada, así que el
 *    primer trozo de foto que se ve —5.386 px, en el cuadro 118— entra con
 *    opacidad plena en un solo cuadro. De ahí el mando `aparición`: permite
 *    repartir esa entrada por delante del 118 en vez de dejarla en un escalón.
 *
 * 3) La huella crece sola después: 76.387 px en el 128, 79.723 en el 131,
 *    78.971 en el 133 y 79.406 ya en reposo. Ese crecimiento es la hoja
 *    girando y no hay que corregirlo; sirve como control de que un mando no se
 *    llevó la foto por delante.
 * ---------------------------------------------------------------------------
 */
window.montarCalibradorAterrizajeFoto = async (W, dondeVaElPanel) => {
  'use strict';

  /** El documento de la APP (dentro del iframe). El panel vive fuera, aparte. */
  const D = W.document;
  const DOC = dondeVaElPanel.ownerDocument;

  const CLAVE = 'calib-aterrizaje-foto-v1';
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

  /**
   * Mandos que se calibran CUADRO A CUADRO, con su valor cuando nadie los tocó.
   *
   * `aparicion` a -1 quiere decir "lo que traiga el vídeo": el `ba` medido en
   * about-book-curl.json se respeta tal cual. Cualquier valor de 0 a 1 lo pisa.
   * Es un centinela negativo y no `null` para que la interpolación entre dos
   * cuadros clavados siga siendo una recta entre dos números; los valores que
   * se clavan nunca son negativos, así que el centinela no entra nunca en ella.
   */
  const POR_CUADRO = {
    brilloReposo: 1,
    brilloVuelta: 1,
    dx: 0,
    dy: 0,
    escala: 1,
    area: 0,
    oclusion: 0,
    aparicion: -1,
    sombra: 1,
  };
  /**
   * Mandos que son del recorrido entero y no tienen sentido por cuadro.
   *
   * `fuera` decide qué pasa en los cuadros que quedan ANTES del primer clavado
   * y DESPUÉS del último. 'acompana' —el último valor se queda puesto— es el
   * modo por defecto por lo mismo que en el calibrador del texto: entre el
   * cuadro 139 y el 81 el papel se corre +4,02 px, y lo impreso tiene que
   * quedarse donde el papel lo dejó.
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
  /** Página en la que TERMINA el recorrido: la dueña de la foto que aterriza. */
  const paginaFinal = () => (sentido === 'siguiente' ? 3 : 2);

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
      if (c && lienzo && c.curl && c.frames && c.frames[MESH_HI] && c.photos && c.photos[2]) {
        return { comp: c, cv: lienzo };
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('No apareció bol-about-book con los cuadros y las fotos cargados.');
  };

  const { comp, cv } = await esperar();
  const g = cv.getContext('2d', { willReadFrequently: true });

  /**
   * El `uv` de la foto, tomado del PROPIO componente. No se copia a mano: si
   * mañana se recalibra `SHEET_PHOTO_UV` con `calibrador-foto.html`, una copia
   * aquí quedaría vieja y este calibrador movería una zona que ya no es la de
   * la foto. Se compara por identidad, que es lo que permite reconocerlo
   * cuando llega como argumento.
   */
  const UV_FOTO = (() => {
    const s = comp.restSurface && comp.restSurface.call(comp, 'left', MESH_HI);
    if (!s || !s.uv) throw new Error('No se pudo leer el marco de la foto (SHEET_PHOTO_UV).');
    return s.uv;
  })();

  /**
   * Zona de la página izquierda en píxeles del canvas, en coordenadas de vídeo
   * escaladas al lienzo. Sale de la huella medida de la foto (214..572 x
   * 273..633 en un lienzo de 1040) con margen para el marco blanco y su sombra.
   * SE RECALCULA en cada uso: al montar, el canvas puede medir todavía 300x150
   * —lo de fábrica, antes de que corra `sizeCanvas`— y una caja fijada ahí cae
   * en una esquina vacía y todas las medidas salen cero.
   */
  const cajaFoto = () => {
    const S = cv.width / 860;
    return [Math.round(172 * S), Math.round(221 * S), Math.round(478 * S), Math.round(528 * S)];
  };

  // --- Parches en caliente ---------------------------------------------------

  const origDrawOnMesh = comp.drawOnMesh.bind(comp);
  const origCorners = comp.meshCorners.bind(comp);
  const origSombra = comp.drawPrintShadow.bind(comp);
  const origMask = comp.buildSheetMask.bind(comp);

  /**
   * El componente sigue vivo dentro del iframe y repinta por su cuenta (al
   * hidratar deja el cuadro 1, y `sizeCanvas` redibuja en cada resize). Sin
   * este candado, congelar un instante no dura.
   */
  const origDraw = comp.draw.bind(comp);
  let mando = false;
  comp.draw = (f) => {
    if (mando) return origDraw(f);
  };

  /** Cuadro de vídeo que se está dibujando, redondeado como lo redondea `draw`. */
  let cuadroActual = MESH_HI;

  /** Malla del dorso en un cuadro. Es el objeto REAL: se compara por identidad. */
  const mallaB = (f) => {
    const m = comp.curl && comp.curl.frames && comp.curl.frames[String(Math.round(f))];
    return m ? m.b : null;
  };

  /**
   * Dibuja pisando `ba` si el mando `aparición` está puesto.
   *
   * `ba` no es argumento de ningún método: sale de la malla, dentro de la
   * función que compone la vuelta. La única forma de pisarlo sin tocar el
   * componente es escribirlo en el dato y devolverlo después. Se restaura
   * SIEMPRE, también si el dibujo revienta, o el vídeo quedaría alterado en
   * memoria para el resto de la sesión.
   */
  function dibuja(frame) {
    cuadroActual = Math.round(frame);
    const ap = v('aparicion');
    const m = ap >= 0 ? comp.curl && comp.curl.frames && comp.curl.frames[String(cuadroActual)] : null;
    const tenia = m ? ('ba' in m ? m.ba : undefined) : undefined;
    if (m) m.ba = ap;
    mando = true;
    try {
      origDraw(frame);
    } finally {
      mando = false;
      if (m) {
        if (tenia === undefined) delete m.ba;
        else m.ba = tenia;
      }
    }
  }

  /** true mientras se dibuja por la ruta de la vuelta (hay malla). */
  let rutaVuelta = false;

  /**
   * Reilumina un panel: multiplica el color y deja el alfa quieto.
   *
   * Es, para una foto, lo que `reentintar` es para el texto. Allí lo que
   * separaba las dos rutas era el peso de la tinta; aquí es el brillo: el salto
   * que arregló `drawRestPhoto` era un multiplicador de 1,08 contra 1,12 sin un
   * solo píxel de desplazamiento. Subir el alfa de una foto no serviría de
   * nada —ya es opaca—.
   *
   * La clave se redondea a tres decimales y la caché se poda: los valores
   * interpolados cambian en cada cuadro y sin poda esto crecería sin fin.
   */
  const cacheBrillo = new Map();
  function reiluminar(panel, k) {
    if (k === 1 || !panel) return panel;
    const clave = panel.width + 'x' + panel.height + ':' + k.toFixed(3);
    const hit = cacheBrillo.get(clave);
    if (hit && hit.src === panel) return hit.out;
    const out = D.createElement('canvas');
    out.width = panel.width;
    out.height = panel.height;
    const oc = out.getContext('2d');
    oc.drawImage(panel, 0, 0);
    const im = oc.getImageData(0, 0, out.width, out.height);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = Math.min(255, Math.round(d[i] * k));
      d[i + 1] = Math.min(255, Math.round(d[i + 1] * k));
      d[i + 2] = Math.min(255, Math.round(d[i + 2] * k));
    }
    oc.putImageData(im, 0, 0);
    if (cacheBrillo.size > 48) cacheBrillo.delete(cacheBrillo.keys().next().value);
    cacheBrillo.set(clave, { src: panel, out });
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

  /** La foto que aterriza: la de la página en la que termina el recorrido. */
  const esFotoQueAterriza = (img) => !!img && Array.isArray(comp.photos) && img === comp.photos[paginaFinal() - 1];

  /** Marca privada con la que un cuadrilátero dice "soy el de esta foto". */
  const MARCA = Symbol('marcoDeLaFotoQueAterriza');

  comp.drawOnMesh = function (ctx, img, pts, vis, uv, ox, oy, scale, fillOccluded) {
    if (esFotoQueAterriza(img)) {
      img = reiluminar(img, rutaVuelta ? v('brilloVuelta') : v('brilloReposo'));
      pts = moverPts(pts);
      uv = moverUV(uv);
    }
    return origDrawOnMesh(ctx, img, pts, vis, uv, ox, oy, scale, fillOccluded);
  };

  /**
   * La sombra impresa se dibuja ANTES que la foto y por otro camino
   * (`meshCorners` -> `drawPrintShadow`), así que si no se mueve con ella la
   * foto se despega de su propia sombra en cuanto se toca `centro X`.
   *
   * Durante la vuelta `meshCorners` se llama DOS veces con el mismo `uv` de la
   * foto: una para la que se va, quieta en la izquierda, y otra para la que
   * entra, sobre el dorso. Se distinguen por identidad del array de vértices:
   * el de la que entra es la malla del cuadro que se está pintando. En el 133
   * los dos arrays son el mismo objeto, y ahí da igual: las dos superficies
   * coinciden por construcción (ver `restSurface`). En reposo no hay
   * ambigüedad —solo hay una foto— y se aplica siempre.
   */
  comp.meshCorners = function (pts, uv, ox, oy, scale) {
    if (uv === UV_FOTO && (!rutaVuelta || pts === mallaB(cuadroActual))) {
      const q = origCorners(moverPts(pts), moverUV(uv), ox, oy, scale);
      // Marca para `drawPrintShadow`: ver ahí por qué no vale un interruptor.
      q[MARCA] = true;
      return q;
    }
    return origCorners(pts, uv, ox, oy, scale);
  };

  /**
   * Fuerza de la sombra impresa de la foto que aterriza, y solo de esa.
   *
   * Un interruptor global —"estamos dibujando nosotros, aplica el mando"— no
   * vale: medido, en el cuadro 134 `drawPrintShadow` se llama DOS veces, y con
   * un interruptor el mando escalaba también la sombra que no es de esta foto.
   *
   * La marca la pone el `meshCorners` de arriba, que es el único sitio donde se
   * sabe con certeza de quién es cada cuadrilátero, y viaja con él hasta aquí
   * sin que el componente tenga que enterarse.
   */
  comp.drawPrintShadow = function (ctx, dst, strength = 1) {
    const k = dst && dst[MARCA] ? v('sombra') : 1;
    return origSombra(ctx, dst, strength * k);
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
    for (let a2 = 0; a2 < 8; a2++) {
      dirs.push([Math.round(r * Math.cos((a2 * Math.PI) / 4)), Math.round(r * Math.sin((a2 * Math.PI) / 4))]);
    }
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
  /** Paso de pantalla en el que se está dibujando un cuadro de vídeo dado. */
  const pasoDeCuadro = (f) => {
    const P = plan();
    return Math.max(0, Math.round((((f - P.desde) / (P.hasta - P.desde)) * P.duracion) / PASO_MS));
  };

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
    comp.current.set(paginaFinal());
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
      comp.transition = { leaving: 2, entering: 3, towardHigh: sentido === 'siguiente' };
      rutaVuelta = frame >= MESH_LO;
    } else {
      comp.transition = null;
      comp.current.set(paginaFinal());
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

  function saltoFoto(a, b) {
    const q = cajaFoto();
    pintaCuadro(a);
    const A = leeCaja(q);
    pintaCuadro(b);
    return difer(A, leeCaja(q));
  }

  /** Luminancia media de la zona de la foto en un cuadro. */
  function luz(frame) {
    const q = cajaFoto();
    pintaCuadro(frame);
    const d = leeCaja(q);
    let s = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      n++;
    }
    return n ? s / n : 0;
  }

  /**
   * Cuántos píxeles de foto se ven en el cuadro que ya está dibujado. Se mide
   * quitando la foto y volviendo a dibujar: es la única forma de separarla del
   * papel del vídeo, que en esa zona tiene casi el mismo color. Un umbral de
   * brillo no valdría —el marco blanco de la copia y el papel se confunden—.
   *
   * Va sobre el LIENZO ENTERO y no sobre `cajaFoto`. La caja está hecha a la
   * medida de la foto ya aterrizada, y durante la entrada la foto todavía está
   * sobre la hoja levantada, más arriba: medido, en el cuadro 118 se quedaban
   * 58 de sus 5.386 píxeles por encima del borde de la caja. Como la resta solo
   * puede diferir donde está la foto, ampliarla al lienzo no mete ruido.
   */
  function huellaAhora() {
    const f = comp.lastDrawn;
    const todo = [0, 0, cv.width, cv.height];
    const con = leeCaja(todo);
    const idx = paginaFinal() - 1;
    const guard = comp.photos[idx];
    comp.photos[idx] = null;
    dibuja(f);
    const sin = leeCaja(todo);
    comp.photos[idx] = guard;
    dibuja(f);
    let n = 0;
    for (let i = 0; i < con.length; i += 4) {
      if (Math.abs(con[i] - sin[i]) + Math.abs(con[i + 1] - sin[i + 1]) + Math.abs(con[i + 2] - sin[i + 2]) > 20) n++;
    }
    return n;
  }

  /**
   * La aparición: primer cuadro de vídeo en el que se ve foto, y cuántos
   * píxeles entran ahí de golpe. Sin tocar nada, 118 y 5.386 px.
   *
   * Cada cuadro se pinta con los mandos del paso que le corresponde, no con los
   * del paso que esté seleccionado: la aparición cae lejos del cruce, y
   * medirla con los valores de otro instante daría un número que no es el que
   * se está viendo.
   */
  function medirAparicion() {
    const P = plan();
    const guardaPaso = pasoActual;
    let primero = null;
    let deGolpe = 0;
    const serie = [];
    for (let f = 110; f <= 126; f++) {
      pasoActual = pasoDeCuadro(f);
      pintaCuadro(f);
      const px = huellaAhora();
      serie.push([f, px]);
      if (px > 0 && primero == null) {
        primero = f;
        deGolpe = px;
      }
    }
    pasoActual = guardaPaso;
    return { primero, deGolpe, serie };
  }

  /**
   * Lo que APORTA el cruce, no lo que se mueve en pantalla. Compara el mismo
   * instante con cruce y sin él; ver el calibrador del texto para por qué medir
   * entre cuadros consecutivos no sirve aquí.
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
  #calib-af{height:100%;overflow:auto;background:#16130f;color:#eee;box-sizing:border-box;
    font:12px/1.45 ui-monospace,Consolas,monospace;padding:10px 12px;border-left:2px solid #C8912A}
  #calib-af h1{font-size:13px;margin:0 0 2px;color:#E8B84B;letter-spacing:.04em}
  #calib-af .sub{color:#8a8378;font-size:10.5px;margin:0 0 10px}
  #calib-af fieldset{border:1px solid #3a332a;border-radius:5px;margin:0 0 9px;padding:7px 8px 8px}
  #calib-af legend{color:#C8912A;font-size:10.5px;padding:0 4px;letter-spacing:.05em}
  #calib-af .fila{display:grid;grid-template-columns:1fr 92px 50px 14px;gap:5px;align-items:center;margin:4px 0}
  #calib-af label{color:#cfc7ba;font-size:11px}
  #calib-af input[type=range]{width:100%;accent-color:#C8912A}
  #calib-af input[type=number]{width:100%;background:#0e0c09;color:#eee;border:1px solid #3a332a;
    border-radius:3px;padding:2px 3px;font:11px ui-monospace,monospace}
  #calib-af .pin{font-size:12px;text-align:center;color:#3a332a}
  #calib-af .pin.si{color:#E8B84B}
  #calib-af .btns{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
  #calib-af button{background:#2a2419;color:#e8dcc4;border:1px solid #4a4030;border-radius:4px;
    padding:4px 8px;cursor:pointer;font:11px ui-monospace,monospace}
  #calib-af button:hover{background:#3a3222;border-color:#C8912A}
  #calib-af button.on{background:#C8912A;color:#16130f;font-weight:700}
  #calib-af button.peligro{border-color:#7a3030;color:#e8a0a0}
  #calib-af .med{background:#0e0c09;border:1px solid #3a332a;border-radius:4px;padding:6px 7px;margin-top:5px}
  #calib-af .med b{color:#E8B84B}
  #calib-af .grande{font-size:17px;color:#E8B84B;font-weight:700}
  #calib-af .bien{color:#7ac77a}#calib-af .mal{color:#e08a6a}
  #calib-af textarea{width:100%;height:86px;background:#0e0c09;color:#bdb4a4;border:1px solid #3a332a;
    border-radius:3px;font:10px ui-monospace,monospace;margin-top:5px}
  #calib-af .nota{color:#8a8378;font-size:10px;margin:5px 0 0;line-height:1.4}
  #calib-af .cuadro{display:flex;align-items:center;gap:6px;margin:3px 0}
  #calib-af .cuadro .n{font-size:14px;color:#E8B84B;font-weight:700;min-width:78px;text-align:center}
  #calib-af .stat{color:#9aa0a8;font-size:10.5px;margin:5px 0 0}
  #calib-af .marcas{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px}
  #calib-af .marcas span{background:#2a2419;border:1px solid #4a4030;border-radius:3px;
    padding:1px 5px;font-size:10px;color:#E8B84B;cursor:pointer}
  #calib-af .marcas span:hover{background:#C8912A;color:#16130f}`;
  const st = DOC.createElement('style');
  st.textContent = css;
  DOC.head.appendChild(st);

  const MANDOS = [
    {
      k: 'aparicion',
      et: 'aparición (opacidad)',
      min: -1,
      max: 1,
      paso: 0.02,
      ay: 'Con cuánta opacidad entra la foto impresa en el dorso. −1 = lo que trae el vídeo (0 hasta el 116, 1 desde el 117). Es el mando del escalón de la entrada.',
    },
    { k: 'brilloReposo', et: 'brillo · reposo', min: 0.7, max: 1.3, paso: 0.005, ay: 'Ganancia de color de la foto cuando el cuadro se dibuja por la ruta de reposo.' },
    { k: 'brilloVuelta', et: 'brillo · vuelta', min: 0.7, max: 1.3, paso: 0.005, ay: 'Ganancia de color de la foto cuando el cuadro se dibuja por la ruta de la vuelta (malla, 83-133).' },
    { k: 'dx', et: 'centro X', min: -20, max: 20, paso: 0.5, ay: 'Corre la foto en horizontal, en px de vídeo. Su sombra impresa la acompaña.' },
    { k: 'dy', et: 'centro Y', min: -20, max: 20, paso: 0.5, ay: 'Corre la foto en vertical, en px de vídeo. Su sombra impresa la acompaña.' },
    { k: 'escala', et: 'alejamiento', min: 0.9, max: 1.1, paso: 0.002, ay: 'Escala de la foto respecto a su centro.' },
    { k: 'area', et: 'borde: área impresa', min: -0.05, max: 0.05, paso: 0.002, ay: 'Margen de la foto dentro de la hoja.' },
    { k: 'sombra', et: 'sombra impresa', min: 0, max: 2, paso: 0.02, ay: 'Fuerza de la sombra que la copia proyecta sobre el papel. 1 = la del código.' },
    { k: 'oclusion', et: 'borde: tapado hoja', min: -8, max: 16, paso: 1, ay: 'Píxeles extra con que la hoja esconde lo de abajo. 0 = los 8 del código.' },
  ];
  const DEL_CRUCE = [
    { k: 'colaLead', et: 'cruce: arranca a −N ms', min: 0, max: 400, paso: 1 },
    { k: 'colaMs', et: 'cruce: dura N ms', min: 17, max: 400, paso: 1 },
  ];

  const panel = DOC.createElement('div');
  panel.id = 'calib-af';
  panel.innerHTML =
    `<h1>Calibrador del aterrizaje · FOTO</h1><p class="sub">valores por cuadro · sobre el componente real</p>` +
    `<fieldset><legend>momento</legend>
       <div class="btns" style="margin:0 0 6px">
         <button id="af_sig" class="on">siguiente ▶</button><button id="af_ant">◀ anterior</button>
       </div>
       <div class="cuadro"><button id="af_prev">◀</button><span class="n" id="af_n">0</span><button id="af_next">▶</button>
       <input type="range" id="af_i" min="0" max="72" step="1" value="0" style="flex:1"></div>
       <p class="stat" id="af_donde">—</p>
       <div class="btns"><button id="af_entrada">Ir a la entrada</button><button id="af_cruce">Ir al cruce</button><button id="af_play">▶ lenta</button></div>
     </fieldset>` +
    `<fieldset><legend>este cuadro</legend>
       <div id="af_mandos"></div>
       <p class="stat" id="af_estado">—</p>
       <div class="btns">
         <button id="af_copiar">Copiar del anterior</button>
         <button id="af_borrar" class="peligro">Borrar este cuadro</button>
       </div>
       <p class="nota">El punto ● se enciende en los valores clavados en ESTE cuadro. Mover un deslizador lo clava acá. Entre dos cuadros clavados se interpola solo. Los mandos tocan la foto que ATERRIZA; la que se va no se mueve.</p>
       <div class="marcas" id="af_marcas"></div>
     </fieldset>` +
    `<fieldset><legend>del recorrido entero</legend><div id="af_cruceman"></div>
       <div class="btns"><button id="af_fuera">Al terminar: acompaña a la hoja</button></div>
       <p class="nota">«Acompaña a la hoja»: el último valor se queda puesto, porque el papel se quedó ahí. «Vuelve a su sitio»: la foto regresa al terminar el tramo, como un gesto de ida y vuelta.</p>
     </fieldset>` +
    `<fieldset><legend>medida en vivo</legend>
       <div class="med">
         entra de golpe: <span class="grande" id="af_golpe">—</span> px en el cuadro <b id="af_primero">—</b><br>
         <span class="nota" id="af_serie">—</span><br>
         <span class="nota">sin tocar nada: 5386 px de golpe en el cuadro 118</span>
       </div>
       <div class="med">
         salto 133→134 en la foto: <b id="af_salto">—</b> px · luz <b id="af_l133">—</b>/<b id="af_l134">—</b> desf. <b id="af_ld">—</b><br>
         <span class="nota">sin tocar nada: 5329 px · 158,1 / 157,4 · +0,7 — este extremo YA está bien</span>
       </div>
       <div class="med">
         desdoblamiento del cruce: <b id="af_brusco">—</b> px<br>
         <span class="nota" id="af_bruscoD">—</span>
       </div>
       <div class="btns"><button id="af_medir" class="on">Medir ahora</button><button id="af_auto">Medir al soltar: no</button></div>
       <p class="nota">Las cuentas de píxeles van con el tamaño del lienzo: los números de referencia son de uno de 1040 px de ancho.</p>
     </fieldset>` +
    `<fieldset><legend>guardar</legend>
       <div class="btns"><button id="af_exp">Exportar JSON</button><button id="af_reset" class="peligro">Borrar TODO</button></div>
       <textarea id="af_out" placeholder="El JSON aparece acá al exportar"></textarea>
     </fieldset>`;
  dondeVaElPanel.appendChild(panel);

  const $ = (id) => panel.querySelector('#' + id);
  /**
   * Arranca en NO, al revés que en el calibrador del texto: aquí una medida
   * completa incluye la de la aparición, que redibuja 17 cuadros dos veces cada
   * uno. Medir en cada soltar de deslizador dejaría la herramienta pegajosa.
   */
  let auto = false;
  let iActual = 0;

  // Mandos POR CUADRO. Mover un deslizador clava el valor en el cuadro actual:
  // es lo que hace falta para describir una rampa, y no solo un desfase.
  const cont = $('af_mandos');
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
  const cont2 = $('af_cruceman');
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
    rotuloFuera();
  };

  /** Chips con los cuadros que tienen algo clavado; se salta a ellos con un clic. */
  function pintaMarcas() {
    const T = tabla();
    const ks = Object.keys(T)
      .map(Number)
      .sort((a, b) => a - b);
    $('af_marcas').innerHTML = ks.length
      ? ks.map((k) => `<span data-i="${k}">${k} · ${Math.round(msDe(k))} ms</span>`).join('')
      : '<span style="background:none;border:0;color:#8a8378;cursor:default">ningún cuadro clavado todavía</span>';
    for (const el of $('af_marcas').querySelectorAll('span[data-i]')) el.onclick = () => irA(+el.dataset.i);
  }

  function irA(i) {
    const max = totalPasos();
    iActual = Math.max(0, Math.min(max, Math.round(i)));
    $('af_i').max = max;
    $('af_i').value = iActual;
    const r = pintaPaso(iActual);
    const P = plan();
    $('af_n').textContent = iActual + ' · ' + Math.round(msDe(iActual)) + 'ms';
    $('af_donde').innerHTML = r.enCola
      ? `cuadro ${iActual} de ${max} · <b style="color:#E8B84B">EN EL CRUCE</b> ${Math.round(r.ct * 100)}% · vídeo ${r.f.toFixed(1)} → ${P.destino}`
      : `cuadro ${iActual} de ${max} · vídeo ${r.f.toFixed(1)} · el cruce arranca en el cuadro ${Math.round(P.colaEn / PASO_MS)}`;
    const propio = tabla()[iActual];
    $('af_estado').textContent = propio
      ? 'clavado acá: ' +
        Object.entries(propio)
          .map(([k, val]) => k + '=' + String(+(+val).toFixed(3)))
          .join('  ')
      : 'sin valores propios — hereda de los cuadros clavados vecinos';
    sincroniza();
  }

  function medirTodo() {
    const ap = medirAparicion();
    $('af_golpe').textContent = ap.primero == null ? '—' : ap.deGolpe;
    $('af_golpe').className = 'grande ' + (ap.primero == null ? '' : ap.deGolpe < 1500 ? 'bien' : ap.deGolpe < 4000 ? '' : 'mal');
    $('af_primero').textContent = ap.primero == null ? '—' : ap.primero;
    $('af_serie').textContent = 'px de foto por cuadro: ' + ap.serie.map(([f, px]) => f + ':' + px).join(' ');

    $('af_salto').textContent = saltoFoto(133, 134);
    const a = luz(133);
    const b = luz(134);
    $('af_l133').textContent = a.toFixed(1);
    $('af_l134').textContent = b.toFixed(1);
    const d = a - b;
    $('af_ld').textContent = (d > 0 ? '+' : '') + d.toFixed(1);
    $('af_ld').className = Math.abs(d) < 1 ? 'bien' : Math.abs(d) < 4 ? '' : 'mal';

    const cr = medirCruce();
    $('af_brusco').textContent = cr.peor;
    $('af_bruscoD').textContent = `peor instante en el cuadro ${cr.peorPaso} (${Math.round(msDe(cr.peorPaso))} ms), repartido en ${cr.cuantos} cuadros`;
    irA(iActual);
  }

  $('af_i').oninput = () => irA(+$('af_i').value);
  $('af_prev').onclick = () => irA(iActual - 1);
  $('af_next').onclick = () => irA(iActual + 1);
  $('af_cruce').onclick = () => irA(Math.round(plan().colaEn / PASO_MS));
  // 116 y no 118: hay que poder pararse ANTES del escalón para clavar ahí el
  // principio de la rampa.
  $('af_entrada').onclick = () => irA(pasoDeCuadro(sentido === 'siguiente' ? 116 : 120));

  const cambiaSentido = (s2) => {
    sentido = s2;
    olvidaCache();
    $('af_sig').classList.toggle('on', s2 === 'siguiente');
    $('af_ant').classList.toggle('on', s2 === 'anterior');
    pintaMarcas();
    irA(Math.round(plan().colaEn / PASO_MS));
    if (auto) medirTodo();
  };
  $('af_sig').onclick = () => cambiaSentido('siguiente');
  $('af_ant').onclick = () => cambiaSentido('anterior');

  $('af_copiar').onclick = () => {
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
  $('af_borrar').onclick = () => {
    delete tabla()[iActual];
    olvidaCache();
    guardar();
    irA(iActual);
    pintaMarcas();
    if (auto) medirTodo();
  };

  $('af_play').onclick = async (e) => {
    e.target.classList.add('on');
    const max = totalPasos();
    // Desde el 45%: la entrada de la foto (cuadro 118 de vídeo) cae antes que
    // el cruce, y arrancando más tarde no se vería.
    for (let i = Math.round(max * 0.45); i <= max; i++) {
      irA(i);
      await new Promise((r) => setTimeout(r, 60));
    }
    e.target.classList.remove('on');
  };

  const rotuloFuera = () => {
    $('af_fuera').textContent = 'Al terminar: ' + (glob().fuera === 'vuelve' ? 'vuelve a su sitio' : 'acompaña a la hoja');
  };
  $('af_fuera').onclick = () => {
    const G = glob();
    G.fuera = G.fuera === 'vuelve' ? 'acompana' : 'vuelve';
    guardar();
    rotuloFuera();
    irA(iActual);
    if (auto) medirTodo();
  };

  $('af_medir').onclick = () => medirTodo();
  $('af_auto').onclick = (e) => {
    auto = !auto;
    e.target.textContent = 'Medir al soltar: ' + (auto ? 'sí' : 'no');
  };
  $('af_exp').onclick = () => {
    // Se exporta el ms y el CUADRO DE VÍDEO de cada paso junto a sus valores.
    // El cuadro hace falta de verdad: `aparición` se aplica sobre `ba`, que
    // vive indexado por cuadro de vídeo en about-book-curl.json, y sin él
    // habría que recalcular a mano a qué cuadro pertenece cada paso.
    const salida = {};
    const guarda = sentido;
    for (const s2 of ['siguiente', 'anterior']) {
      sentido = s2;
      const P = plan();
      salida[s2] = { global: C.global[s2], cuadros: {} };
      for (const [k, val] of Object.entries(C.pasos[s2])) {
        const t = Math.min(1, (k * PASO_MS) / P.duracion);
        salida[s2].cuadros[k] = { ms: Math.round(k * PASO_MS), video: Math.round(P.desde + (P.hasta - P.desde) * t), ...val };
      }
    }
    sentido = guarda;
    $('af_out').value = JSON.stringify(salida, null, 1);
    $('af_out').select();
  };
  $('af_reset').onclick = () => {
    C = vacio();
    olvidaCache();
    cacheBrillo.clear();
    guardar();
    pintaMarcas();
    irA(iActual);
  };

  // Puerta para conducirlo desde fuera (verificación con Playwright).
  W.__af = {
    C: () => C,
    V,
    plan,
    irA,
    iActual: () => iActual,
    medirTodo,
    medirAparicion,
    huellaAhora,
    pintaCuadro,
    pintaPaso,
    pasoDeCuadro,
    cajaFoto,
    UV_FOTO,
    paginaFinal,
    sentido: () => sentido,
    fijar: (k, val, i) => {
      fijar(k, val, i);
      irA(iActual);
      pintaMarcas();
    },
    limpia: () => {
      C = vacio();
      olvidaCache();
      cacheBrillo.clear();
      guardar();
      pintaMarcas();
      irA(iActual);
    },
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
  // Se abre en la entrada, no en el cruce: es donde está el defecto medido.
  irA(pasoDeCuadro(116));
  console.log('[calibrador-aterrizaje-foto] activo, valores por cuadro. Estado:', C);
};
