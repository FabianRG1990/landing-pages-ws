/**
 * Servidor del calibrador de la portada.
 *
 * Hace dos cosas: servir el repositorio como estatico -para que la herramienta
 * encuentre los cuadros del video y el montaje- y aceptar el guardado, que es
 * lo que evita tener que pasar los parametros a mano de una ventana a otra.
 *
 *   node tools/bolleria/servidor-calibrador.mjs [puerto]
 *   http://127.0.0.1:4318/tools/bolleria/calibrador-portada.html
 *
 * Escribe SOLO la clave `izq` de los cuadros del tramo. Lo comprueba aqui,
 * comparando contra el archivo que hay en disco, y rechaza la peticion entera
 * si viniera cualquier otra diferencia: el cliente puede tener un fallo, y este
 * archivo es el unico sitio donde la garantia no depende de que el cliente este
 * bien. Escuchando solo en 127.0.0.1.
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const REL_MONTAJE = 'apps/bolleria-v2/public/assets/libro-2026-montaje.json';
const MONTAJE = path.join(RAIZ, REL_MONTAJE);
// La copia NO va junto al montaje: `apps/bolleria-v2/public` es la carpeta que
// se publica entera, y ahi un .bak acabaria subido al sitio.
const COPIA = path.join(AQUI, 'libro-2026-montaje.bak.json');
const CALIBRACION = path.join(AQUI, 'portada-calibracion.json');
const PUERTO = Number(process.argv[2] || 4318);

/** Limite de cordura para una coordenada, en pixeles del video. */
const LIMITE = 6000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

function json(res, codigo, cuerpo) {
  const t = JSON.stringify(cuerpo);
  res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(t) });
  res.end(t);
}

/** Un cuadrilatero valido: cuatro pares de numeros finitos y con los pies en la tierra. */
function cuadValido(q) {
  if (!Array.isArray(q) || q.length !== 4) return false;
  return q.every((p) => Array.isArray(p) && p.length === 2
    && p.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= LIMITE));
}

/**
 * Lo que cambia respecto al archivo en disco, o un error si cambia algo que no
 * deberia. Devuelve { cambiados } o { error }.
 */
function comprueba(nuevo, actual, desde, hasta) {
  if (!nuevo || typeof nuevo !== 'object' || Array.isArray(nuevo)) return { error: 'el montaje no es un objeto' };
  if (!Number.isInteger(desde) || !Number.isInteger(hasta) || desde > hasta) return { error: 'tramo inválido' };

  const claves = new Set([...Object.keys(actual), ...Object.keys(nuevo)]);
  let cambiados = 0;
  for (const k of claves) {
    const a = actual[k] || {};
    const b = nuevo[k] || {};
    if (typeof b !== 'object' || b === null || Array.isArray(b)) return { error: 'el cuadro ' + k + ' no es un objeto' };
    for (const campo of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (JSON.stringify(a[campo]) === JSON.stringify(b[campo])) continue;
      const f = Number(k);
      if (campo !== 'izq') return { error: 'intenta cambiar «' + campo + '» del cuadro ' + k + ', y solo puede tocar «izq»' };
      if (!Number.isInteger(f) || f < desde || f > hasta) {
        return { error: 'intenta cambiar el cuadro ' + k + ', que está fuera del tramo ' + desde + '–' + hasta };
      }
      if (b.izq !== undefined && !cuadValido(b.izq)) return { error: 'el cuadrilátero del cuadro ' + k + ' no es válido' };
      cambiados++;
    }
  }
  return { cambiados };
}

/** Escritura atomica: primero a un temporal, luego renombrar. */
async function escribe(destino, texto) {
  const tmp = destino + '.tmp' + process.pid;
  await fsp.writeFile(tmp, texto, 'utf8');
  await fsp.rename(tmp, destino);
}

async function guarda(req, res) {
  let crudo = '';
  let cortado = false;
  for await (const trozo of req) {
    crudo += trozo;
    if (crudo.length > 8e6) { cortado = true; break; }
  }
  if (cortado) return json(res, 413, { error: 'el envío es demasiado grande' });

  let cuerpo;
  try { cuerpo = JSON.parse(crudo); } catch (e) { return json(res, 400, { error: 'JSON ilegible' }); }

  let actual;
  try { actual = JSON.parse(await fsp.readFile(MONTAJE, 'utf8')); } catch (e) {
    return json(res, 500, { error: 'no puedo leer ' + REL_MONTAJE });
  }

  const r = comprueba(cuerpo.montaje, actual, cuerpo.desde, cuerpo.hasta);
  if (r.error) return json(res, 400, { error: r.error });

  // Copia de seguridad del estado anterior, una sola vez: la gracia es poder
  // volver a como estaba ANTES de empezar a calibrar, no al guardado anterior.
  let copia = null;
  if (!fs.existsSync(COPIA)) {
    await escribe(COPIA, JSON.stringify(actual));
    copia = path.relative(RAIZ, COPIA).replace(/\\/g, '/');
  }

  try {
    await escribe(MONTAJE, JSON.stringify(cuerpo.montaje));
    if (cuerpo.marcas) {
      await escribe(CALIBRACION, JSON.stringify({ v: 1, desde: cuerpo.desde, hasta: cuerpo.hasta, marcas: cuerpo.marcas }, null, 1));
    }
  } catch (e) {
    return json(res, 500, { error: 'no pude escribir: ' + e.message });
  }

  console.log(new Date().toLocaleTimeString() + '  guardado: ' + r.cambiados + ' cuadros');
  return json(res, 200, { ok: true, cambiados: r.cambiados, copia });
}

function estatico(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const destino = path.resolve(RAIZ, '.' + rel);
  if (destino !== RAIZ && !destino.startsWith(RAIZ + path.sep)) {
    res.writeHead(403).end('fuera del repositorio');
    return;
  }
  fs.stat(destino, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('no está: ' + rel); return; }
    res.writeHead(200, {
      'content-type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'content-length': st.size,
      'cache-control': 'no-store',
    });
    fs.createReadStream(destino).pipe(res);
  });
}

const servidor = http.createServer((req, res) => {
  const ruta = new URL(req.url, 'http://x').pathname;
  if (ruta === '/calibrador/estado' && req.method === 'GET') {
    return json(res, 200, { ok: true, montaje: REL_MONTAJE });
  }
  if (ruta === '/calibrador/guardar' && req.method === 'POST') {
    return guarda(req, res).catch((e) => json(res, 500, { error: String(e && e.message || e) }));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  estatico(req, res);
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('El puerto ' + PUERTO + ' ya está ocupado. Cierra lo que haya ahí o pasa otro puerto: '
      + 'node tools/bolleria/servidor-calibrador.mjs 4319');
    process.exit(1);
  }
  throw e;
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log('Calibrador de la portada');
  console.log('  http://127.0.0.1:' + PUERTO + '/tools/bolleria/calibrador-portada.html');
  console.log('  guarda en ' + REL_MONTAJE);
});
