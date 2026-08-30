const {webkit, chromium, devices} = require('playwright');
(async()=>{
  // --- 1. gesto tactil real sobre el hero ---
  const b=await chromium.launch();
  const ctx=await b.newContext({...devices['Pixel 7'], hasTouch:true});
  const pg=await ctx.newPage();
  await pg.goto('http://localhost:4399/',{waitUntil:'load'});
  await pg.waitForTimeout(5000);
  const y0=await pg.evaluate(()=>window.scrollY);
  // swipe hacia arriba (dedo sube = pagina baja)
  for(let k=0;k<3;k++){
    await pg.touchscreen.tap(200,400);
    await pg.mouse.move(200,600); await pg.mouse.down();
    for(let i=0;i<10;i++){ await pg.mouse.move(200,600-i*45); await pg.waitForTimeout(16); }
    await pg.mouse.up(); await pg.waitForTimeout(600);
  }
  const y1=await pg.evaluate(()=>window.scrollY);
  console.log('=== GESTO TACTIL ===');
  console.log('scrollY antes:',y0,' despues de 3 swipes:',y1,' avanzo:',y1-y0,'px');
  const st=await pg.evaluate(()=>{
    const c=document.querySelector('.bol-hero-canvas');
    return {opacidad:c?getComputedStyle(c).opacity:'n/a', docH:document.documentElement.scrollHeight, vh:window.innerHeight};
  });
  console.log('canvas opacidad:',st.opacidad,' docH:',st.docH,' vh:',st.vh,' -> el hero mide',(st.docH/st.vh).toFixed(1),'pantallas');

  // --- 2. simulacion de barra de URL: cuanto contenido se pierde ---
  console.log('\n=== BARRA DE URL (100vh vs area visible) ===');
  const res=await pg.evaluate(()=>{
    const out=[];
    for (const sel of ['.bol-hero-stage','.bol-hero-hint','.bol-hero-caption','.bol-nav']) {
      const e=document.querySelector(sel); if(!e) {out.push([sel,'no existe']); continue;}
      const r=e.getBoundingClientRect();
      out.push([sel, 'top='+Math.round(r.top)+' bottom='+Math.round(r.bottom)+' h='+Math.round(r.height)]);
    }
    return {out, vh:window.innerHeight, vv: window.visualViewport?Math.round(window.visualViewport.height):null};
  });
  console.log('innerHeight =',res.vh,' visualViewport =',res.vv);
  res.out.forEach(([s,v])=>console.log('  ',s,v));
  // Chrome Android: barra ~56px CSS; iOS Safari: ~ 60 arriba + 44 abajo cuando esta expandida
  console.log('  -> con la barra de Chrome Android (~56px) visible, todo lo que este por debajo de y='+(res.vh-56)+' queda fuera de pantalla');
  console.log('  -> con la barra de Safari iOS (~104px de cromo) visible, el corte esta en y='+(res.vh-104));
  await b.close();
})();
