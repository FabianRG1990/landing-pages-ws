const {webkit, devices} = require('playwright');
(async()=>{
  const b=await webkit.launch();
  const ctx=await b.newContext({...devices['iPhone 15']});
  const pg=await ctx.newPage();
  let n=0,bytes=0; const byType={};
  pg.on('response',async r=>{ try{
    const h=r.headers(); const len=parseInt(h['content-length']||'0',10);
    const u=r.url(); const ext=(u.split('?')[0].match(/\.(\w+)$/)||[,'otro'])[1];
    n++; bytes+=len; byType[ext]=(byType[ext]||{c:0,b:0}); byType[ext].c++; byType[ext].b+=len;
  }catch(e){} });
  const t0=Date.now();
  await pg.goto('http://localhost:4399/',{waitUntil:'load'});
  const tLoad=Date.now()-t0;
  // esperar a que el hero se declare listo
  await pg.waitForTimeout(1000);
  const heroReady=await pg.evaluate(()=>{const c=document.querySelector('.bol-hero-canvas'); return c?getComputedStyle(c).opacity:'sin canvas';});
  await pg.waitForTimeout(12000);
  console.log('--- iPhone 15 / WebKit, red local sin límite ---');
  console.log('load event:',tLoad,'ms   peticiones:',n,'   total:',(bytes/1048576).toFixed(1),'MB');
  for(const [k,v] of Object.entries(byType).sort((a,b)=>b[1].b-a[1].b).slice(0,7))
    console.log('   .'+k, v.c+' arch', (v.b/1048576).toFixed(1)+' MB');
  console.log('opacidad canvas al segundo:',heroReady);
  // ¿cuántos frames pidió?
  const fr=await pg.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('hero-frames')).length);
  console.log('frames del hero pedidos a los ~13s:',fr);
  const tot=await pg.evaluate(()=>performance.getEntriesByType('resource').reduce((s,r)=>s+(r.transferSize||0),0));
  console.log('transferSize acumulado:',(tot/1048576).toFixed(1),'MB');
  await b.close();
})();
