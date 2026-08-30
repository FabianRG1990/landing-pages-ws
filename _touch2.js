const {chromium, devices} = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({...devices['Pixel 7']});
  const pg=await ctx.newPage();
  const cdp=await ctx.newCDPSession(pg);
  await pg.goto('http://localhost:4399/',{waitUntil:'load'});
  await pg.waitForTimeout(6000);
  const swipe=async(fromY,toY,steps=14)=>{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:fromY}]});
    for(let i=1;i<=steps;i++){
      const y=fromY+(toY-fromY)*i/steps;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y}]});
      await pg.waitForTimeout(14);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await pg.waitForTimeout(700);
  };
  const y0=await pg.evaluate(()=>window.scrollY);
  for(let k=0;k<4;k++) await swipe(700,150);
  const y1=await pg.evaluate(()=>window.scrollY);
  console.log('=== SWIPE TACTIL REAL (CDP) ===');
  console.log('scrollY:',y0,'->',y1,'  avanzo',y1-y0,'px en 4 swipes');
  const info=await pg.evaluate(()=>({
    op:getComputedStyle(document.querySelector('.bol-hero-canvas')).opacity,
    doc:document.documentElement.scrollHeight, vh:innerHeight,
    ta:getComputedStyle(document.body).touchAction,
    ov:getComputedStyle(document.documentElement).overflow
  }));
  console.log('canvas opacidad:',info.op,' touch-action body:',info.ta,' overflow html:',info.ov);
  console.log('progreso del hero:',((y1/(info.doc-info.vh))*100).toFixed(1),'% del documento');
  await pg.screenshot({path:'_shots/px_swipe.png'});
  // seguir hasta salir del hero
  for(let k=0;k<14;k++) await swipe(750,100);
  const y2=await pg.evaluate(()=>window.scrollY);
  console.log('tras 18 swipes en total: scrollY =',y2,'de',info.doc-info.vh,'->',((y2/(info.doc-info.vh))*100).toFixed(1),'%');
  await pg.screenshot({path:'_shots/px_swipe2.png'});
  await b.close();
})();
