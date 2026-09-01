import { chromium } from 'file:///d:/projects/landing-pages-ws/node_modules/playwright/index.mjs';

const VP = { width: 393, height: 695 };

const instrumenta = () => {
  window.__f = [];            // [t, dibujos, msDentroDelTick]
  const proto = CanvasRenderingContext2D.prototype;
  const orig = proto.drawImage;
  window.__n = 0;
  proto.drawImage = function (...a) { window.__n++; return orig.apply(this, a); };
  const oraf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    oraf((t) => {
      const n0 = window.__n, m0 = performance.now();
      cb(t);
      window.__f.push([t, window.__n - n0, performance.now() - m0]);
    });
};

const resume = (fs) => {
  if (fs.length < 3) return null;
  const dt = [], dib = [], ms = [];
  for (let i = 1; i < fs.length; i++) dt.push(fs[i][0] - fs[i - 1][0]);
  for (const f of fs) { dib.push(f[1]); ms.push(f[2]); }
  const ord = (a) => [...a].sort((x, y) => x - y);
  const q = (a, p) => ord(a)[Math.floor(a.length * p)];
  return {
    cuadros: fs.length,
    fps: +(1000 / q(dt, 0.5)).toFixed(1),
    intervalo_mediana: +q(dt, 0.5).toFixed(1),
    intervalo_p95: +q(dt, 0.95).toFixed(1),
    intervalo_peor: +Math.max(...dt).toFixed(1),
    saltos_sobre_33ms: dt.filter((v) => v > 33).length,
    drawImage_por_cuadro_mediana: q(dib, 0.5),
    drawImage_por_cuadro_max: Math.max(...dib),
    ms_en_el_tick_mediana: +q(ms, 0.5).toFixed(1),
    ms_en_el_tick_p95: +q(ms, 0.95).toFixed(1),
  };
};

const b = await chromium.launch({ headless: false });
const ctx = await b.newContext({ viewport: VP, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await p.addInitScript(instrumenta);
await p.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(4000);
await p.evaluate(() => document.querySelector('.bol-book')?.scrollIntoView({ block: 'center' }));
await p.waitForFunction(() => document.querySelector('.bol-book__canvas')?.className.includes('is-ready'), null, { timeout: 90000 });
await p.waitForTimeout(1500);
console.log('lienzo:', JSON.stringify(await p.evaluate(() => { const c = document.querySelector('.bol-book__canvas'); return { css: c.clientWidth + 'x' + c.clientHeight, buffer: c.width + 'x' + c.height, dpr: devicePixelRatio }; })));

for (const [etq, mult] of [['CPU x1', 1], ['CPU x4 (~telefono)', 4]]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: mult });
  await p.evaluate(() => (window.__f = []));
  await p.evaluate(() => document.querySelector('.bol-book__open')?.click());
  await p.waitForTimeout(3500);
  console.log(`\n[${etq}]  ABRIR    `, JSON.stringify(resume(await p.evaluate(() => window.__f))));
  for (let r = 0; r < 3; r++) {
    await p.evaluate(() => (window.__f = []));
    await p.evaluate(() => document.querySelector('.bol-book__nav--next')?.click());
    await p.waitForTimeout(2600);
    console.log(`[${etq}]  PASAR ${r + 1}  `, JSON.stringify(resume(await p.evaluate(() => window.__f))));
  }
  await p.evaluate(() => document.querySelector('.bol-book__close')?.click());
  await p.waitForTimeout(2500);
}
await b.close();
