const {chromium, webkit, devices} = require('playwright');
const dir = process.argv[2] || '_base';
(async()=>{
  // ESCRITORIO 1440x900
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1440,height:900}, deviceScaleFactor:1});
  const pg=await ctx.newPage();
  await pg.goto('http://localhost:4399/',{waitUntil:'load'});
  await pg.waitForTimeout(6000);
  const H=await pg.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  for(const [i,f] of [0,0.10,0.22,0.35,0.50,0.65,0.78,0.88,0.95,1].entries()){
    await pg.evaluate(y=>window.scrollTo(0,y),Math.round(H*f)); await pg.waitForTimeout(1000);
    await pg.screenshot({path:`${dir}/desk_inicio_${i}.png`});
  }
  for(const [nom,txt] of [['menu','Menú'],['contacto','Contacto']]){
    await pg.evaluate(()=>window.scrollTo(0,0)); await pg.waitForTimeout(600);
    await pg.locator('.bol-nav__link',{hasText:txt}).click(); await pg.waitForTimeout(2500);
    const H2=await pg.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
    for(const [i,f] of [0,0.45,1].entries()){
      await pg.evaluate(y=>window.scrollTo(0,y),Math.round(H2*f)); await pg.waitForTimeout(900);
      await pg.screenshot({path:`${dir}/desk_${nom}_${i}.png`});
    }
  }
  await b.close();
  // MOVIL iPhone 15
  const w=await webkit.launch();
  const c2=await w.newContext({...devices['iPhone 15']});
  const p2=await c2.newPage();
  await p2.goto('http://localhost:4399/',{waitUntil:'load'});
  await p2.waitForTimeout(6000);
  const H3=await p2.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  for(const [i,f] of [0,0.08,0.20,0.34,0.50,0.66,0.80,0.90,1].entries()){
    await p2.evaluate(y=>window.scrollTo(0,y),Math.round(H3*f)); await p2.waitForTimeout(1000);
    await p2.screenshot({path:`${dir}/mov_inicio_${i}.png`});
  }
  await p2.evaluate(()=>window.scrollTo(0,0)); await p2.waitForTimeout(500);
  await p2.locator('.bol-nav__hamburger').click(); await p2.waitForTimeout(800);
  await p2.locator('.bol-mobile-menu__link',{hasText:'Menú'}).click(); await p2.waitForTimeout(2500);
  const H4=await p2.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  for(const [i,f] of [0,0.5,1].entries()){
    await p2.evaluate(y=>window.scrollTo(0,y),Math.round(H4*f)); await p2.waitForTimeout(900);
    await p2.screenshot({path:`${dir}/mov_menu_${i}.png`});
  }
  await w.close();
  console.log('capturas en',dir,'listas');
})();
