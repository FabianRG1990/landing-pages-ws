const {chromium, webkit, devices} = require('playwright');
const URL='http://localhost:4399/';

const PROBE = () => {
  const vw = window.innerWidth;
  const out = {vw, sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, offenders:[], small:[], tiny:[]};
  const els = [...document.querySelectorAll('body *')];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility==='hidden' || cs.display==='none' || cs.opacity==='0') continue;
    // desborde horizontal real
    if (r.right > vw + 1 && cs.position !== 'fixed') {
      out.offenders.push({t:e.tagName, c:(e.className+'').slice(0,60), right:Math.round(r.right), w:Math.round(r.width)});
    }
    // tap targets
    if (['A','BUTTON'].includes(e.tagName) || e.getAttribute('role')==='button') {
      if (cs.pointerEvents !== 'none' && (r.width < 44 || r.height < 44)) {
        out.small.push({t:e.tagName, c:(e.className+'').slice(0,50), txt:(e.textContent||'').trim().slice(0,22), w:Math.round(r.width), h:Math.round(r.height)});
      }
    }
    // texto diminuto
    const fs = parseFloat(cs.fontSize);
    if (fs && fs < 12 && e.children.length === 0 && (e.textContent||'').trim()) {
      out.tiny.push({c:(e.className+'').slice(0,44), fs, txt:(e.textContent||'').trim().slice(0,22)});
    }
  }
  const seen = new Set();
  out.offenders = out.offenders.filter(o=>{const k=o.t+o.c; if(seen.has(k))return false; seen.add(k); return true;}).slice(0,12);
  const s2 = new Set();
  out.small = out.small.filter(o=>{const k=o.c+o.txt; if(s2.has(k))return false; s2.add(k); return true;}).slice(0,14);
  const s3 = new Set();
  out.tiny = out.tiny.filter(o=>{const k=o.c+o.fs; if(s3.has(k))return false; s3.add(k); return true;}).slice(0,10);
  return out;
};

async function run(engine, name, devName) {
  const b = await engine.launch();
  const ctx = await b.newContext({...devices[devName]});
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,120)); });
  pg.on('pageerror', e => errs.push('PAGEERROR '+String(e).slice(0,120)));
  await pg.goto(URL, {waitUntil:'load'});
  await pg.waitForTimeout(3500);
  const res = {};
  res.inicio = await pg.evaluate(PROBE);
  // navegar por el menú hamburguesa
  for (const dest of ['Menú','Contacto']) {
    try {
      await pg.locator('.bol-nav__hamburger').click({timeout:4000});
      await pg.waitForTimeout(700);
      await pg.locator('.bol-mobile-menu__link', {hasText: dest}).click({timeout:4000});
      await pg.waitForTimeout(2200);
      res[dest] = await pg.evaluate(PROBE);
    } catch(e) { res[dest] = {err: String(e).slice(0,90)}; }
  }
  res.errs = [...new Set(errs)].slice(0,6);
  await b.close();
  return {name, devName, res};
}

(async () => {
  const jobs = [
    [webkit,   'WebKit/iPhone 15', 'iPhone 15'],
    [webkit,   'WebKit/iPhone SE', 'iPhone SE'],
    [chromium, 'Chromium/Pixel 7', 'Pixel 7'],
    [chromium, 'Chromium/GalaxyS8','Galaxy S8'],
  ];
  for (const j of jobs) {
    const r = await run(...j);
    console.log('\n================ ' + r.name + ' (' + JSON.stringify(devices[r.devName].viewport) + ')');
    for (const k of ['inicio','Menú','Contacto']) {
      const p = r.res[k]; if (!p) continue;
      if (p.err) { console.log('  [' + k + '] ERROR ' + p.err); continue; }
      const ov = p.sw > p.vw + 1;
      console.log('  [' + k + '] vw=' + p.vw + ' scrollW=' + p.sw + (ov ? '  *** DESBORDE H +' + (p.sw-p.vw) + 'px ***' : '  ok'));
      if (p.offenders.length) p.offenders.forEach(o=>console.log('      desborda: <'+o.t+'> .'+o.c+'  right='+o.right+' w='+o.w));
      if (p.small.length) { console.log('      tap<44: ' + p.small.length); p.small.slice(0,8).forEach(o=>console.log('         '+o.w+'x'+o.h+'  .'+o.c+'  "'+o.txt+'"')); }
      if (p.tiny.length) { console.log('      texto<12px: ' + p.tiny.length); p.tiny.slice(0,5).forEach(o=>console.log('         '+o.fs+'px  .'+o.c+'  "'+o.txt+'"')); }
    }
    if (r.res.errs.length) console.log('  CONSOLA: ' + JSON.stringify(r.res.errs));
  }
})();
