const {webkit, chromium, devices} = require('playwright');
const fs=require('fs');
const URL='http://localhost:4399/';
(async()=>{
  const b=await webkit.launch();
  const ctx=await b.newContext({...devices['iPhone 15']});
  const pg=await ctx.newPage();
  await pg.goto(URL,{waitUntil:'load'});
  await pg.waitForTimeout(4000);
  const H=await pg.evaluate(()=>document.documentElement.scrollHeight);
  const vh=await pg.evaluate(()=>window.innerHeight);
  console.log('altura doc inicio =',H,' vh=',vh,' pantallas=',(H/vh).toFixed(1));
  // recorrido del hero + resto
  const stops=[0,0.06,0.12,0.20,0.30,0.42,0.55,0.68,0.78,0.86,0.92,0.97,1.0];
  for(let i=0;i<stops.length;i++){
    await pg.evaluate(y=>window.scrollTo(0,y),Math.round(stops[i]*(H-vh)));
    await pg.waitForTimeout(1100);
    await pg.screenshot({path:`_shots/ip_inicio_${String(i).padStart(2,'0')}.png`});
  }
  // menu
  await pg.evaluate(()=>window.scrollTo(0,0)); await pg.waitForTimeout(500);
  await pg.locator('.bol-nav__hamburger').click(); await pg.waitForTimeout(800);
  await pg.screenshot({path:'_shots/ip_menu_movil.png'});
  await pg.locator('.bol-mobile-menu__link',{hasText:'Menú'}).click(); await pg.waitForTimeout(2500);
  const H2=await pg.evaluate(()=>document.documentElement.scrollHeight);
  for(const [i,f] of [0,0.25,0.5,0.75,1].entries()){
    await pg.evaluate(y=>window.scrollTo(0,y),Math.round(f*(H2-vh)));
    await pg.waitForTimeout(900);
    await pg.screenshot({path:`_shots/ip_menu_${i}.png`});
  }
  // agregar producto y abrir carrito
  try{ await pg.locator('.bol-menu__row-add').first().click({timeout:5000}); await pg.waitForTimeout(1200);
       await pg.screenshot({path:'_shots/ip_menu_add.png'}); }catch(e){console.log('add fail',String(e).slice(0,60));}
  // contacto
  await pg.evaluate(()=>window.scrollTo(0,0)); await pg.waitForTimeout(600);
  await pg.locator('.bol-nav__hamburger').click(); await pg.waitForTimeout(800);
  await pg.locator('.bol-mobile-menu__link',{hasText:'Contacto'}).click(); await pg.waitForTimeout(2500);
  const H3=await pg.evaluate(()=>document.documentElement.scrollHeight);
  for(const [i,f] of [0,0.4,0.75,1].entries()){
    await pg.evaluate(y=>window.scrollTo(0,y),Math.round(f*(H3-vh)));
    await pg.waitForTimeout(900);
    await pg.screenshot({path:`_shots/ip_contacto_${i}.png`});
  }
  await b.close();
  console.log('capturas:',fs.readdirSync('_shots').length);
})();
