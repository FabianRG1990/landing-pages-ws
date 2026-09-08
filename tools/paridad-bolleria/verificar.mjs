#!/usr/bin/env node
/**
 * Guardia de paridad entre `bolleria` (v1) y `bolleria-v2`.
 *
 * Las pantallas de Menú y Contacto deben ser idénticas en las dos versiones:
 * el cliente las va a comparar lado a lado y cualquier deriva se lee como
 * descuido. Como las dos versiones tienen copias físicas separadas -para que
 * la v2 pueda rediseñar el hero, el nav o el footer sin tocar la v1-, nada
 * impide estructuralmente que diverjan. Este script es lo que lo impide: se
 * engancha a `build` de la v2 y rompe la compilación si alguna divergió.
 *
 * La única diferencia legítima es el prefijo de las rutas de importación
 * (`@bolleria-ui-*` en la v1, `@bolleria-v2-ui-*` en la v2), que se normaliza
 * antes de comparar. También se normalizan los finales de línea, porque el
 * repositorio los tiene mezclados y no son una diferencia real.
 *
 * FUERA DE LA PARIDAD, a propósito: `bolleria.store.ts` y el resto de `shared`
 * (nav, footer, carrito, preloader, cortina). Son la infraestructura común de
 * toda la aplicación y atarlos dejaría a la v2 sin margen para rediseñar. Si
 * cambiás el store de una sola versión, el menú puede comportarse distinto sin
 * que este guardia lo note.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const V1 = 'libs/bolleria/frontend';
const V2 = 'libs/bolleria-v2/frontend';

/** Carpetas que se comparan enteras, archivo por archivo. */
const CARPETAS = ['menu/src', 'contacto/src'];

/**
 * Archivos sueltos de `shared` que alimentan esas dos pantallas. Sin ellos la
 * garantía sería hueca: el mismo componente puede enseñar otros precios, otras
 * categorías o mandar a otro WhatsApp.
 */
const ARCHIVOS = [
  'shared/src/lib/data/menu-data.ts', // productos, precios, categorías, formatColones
  'shared/src/lib/data/contact-data.ts', // WhatsApp, correo, horario, mapa
  'shared/src/lib/core/models.ts', // MenuItem y tipos del dominio
  'shared/src/lib/core/whatsapp.ts', // enlaces de contacto y mailto
];

const norm = (texto) =>
  texto.replace(/@bolleria-v2-ui-/g, '@bolleria-ui-').replace(/\r\n/g, '\n');

function listar(dir) {
  const salida = [];
  const caminar = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) caminar(p);
      else salida.push(p);
    }
  };
  if (existsSync(dir)) caminar(dir);
  return salida;
}

/** Primeras líneas donde dos textos ya normalizados dejan de coincidir. */
function primerasDiferencias(a, b, cuantas = 3) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const dif = [];
  for (let i = 0; i < Math.max(la.length, lb.length) && dif.length < cuantas; i++) {
    if (la[i] !== lb[i]) {
      dif.push({ linea: i + 1, v1: la[i] ?? '(no existe)', v2: lb[i] ?? '(no existe)' });
    }
  }
  return dif;
}

const problemas = [];

// Pares de rutas relativas a comparar: [ruta en v1, ruta en v2, etiqueta]
const pares = [];

for (const carpeta of CARPETAS) {
  const dir1 = join(RAIZ, V1, carpeta);
  const dir2 = join(RAIZ, V2, carpeta);
  const rel = (base, p) => relative(base, p).split(sep).join('/');
  const en1 = new Set(listar(dir1).map((p) => rel(dir1, p)));
  const en2 = new Set(listar(dir2).map((p) => rel(dir2, p)));

  for (const f of en1) {
    if (!en2.has(f)) problemas.push({ archivo: `${carpeta}/${f}`, motivo: 'falta en la v2' });
    else pares.push([join(dir1, f), join(dir2, f), `${carpeta}/${f}`]);
  }
  for (const f of en2) {
    if (!en1.has(f)) problemas.push({ archivo: `${carpeta}/${f}`, motivo: 'sobra en la v2 (no existe en la v1)' });
  }
}

for (const f of ARCHIVOS) {
  const p1 = join(RAIZ, V1, f);
  const p2 = join(RAIZ, V2, f);
  if (!existsSync(p1)) problemas.push({ archivo: f, motivo: 'falta en la v1' });
  else if (!existsSync(p2)) problemas.push({ archivo: f, motivo: 'falta en la v2' });
  else pares.push([p1, p2, f]);
}

for (const [p1, p2, etiqueta] of pares) {
  const a = norm(readFileSync(p1, 'utf8'));
  const b = norm(readFileSync(p2, 'utf8'));
  if (a !== b) problemas.push({ archivo: etiqueta, motivo: 'contenido distinto', dif: primerasDiferencias(a, b) });
}

const total = pares.length;

if (problemas.length === 0) {
  console.log(`Paridad bolleria ↔ bolleria-v2: ${total} archivos idénticos.`);
  console.log('  Menú y Contacto coinciden en las dos versiones, con sus datos.');
  process.exit(0);
}

console.error('');
console.error('PARIDAD ROTA entre bolleria y bolleria-v2');
console.error('');
console.error('Menú y Contacto tienen que ser idénticos en las dos versiones.');
console.error(`Divergieron ${problemas.length} de ${total + problemas.length} archivos:`);
console.error('');

for (const p of problemas) {
  console.error(`  ✗ ${p.archivo}  —  ${p.motivo}`);
  for (const d of p.dif ?? []) {
    console.error(`      línea ${d.linea}`);
    console.error(`        v1: ${String(d.v1).trim().slice(0, 100)}`);
    console.error(`        v2: ${String(d.v2).trim().slice(0, 100)}`);
  }
}

console.error('');
console.error('Cómo arreglarlo: aplicá el mismo cambio en la otra versión.');
console.error('  v1: libs/bolleria/frontend/...');
console.error('  v2: libs/bolleria-v2/frontend/...');
console.error('Recordá que en la v2 los imports son @bolleria-v2-ui-* (eso no cuenta como diferencia).');
console.error('');
process.exit(1);
