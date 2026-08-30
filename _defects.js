const {webkit, devices} = require('playwright');
(async()=>{
  const b=await webkit.launch();
  const ctx=await b.newContext({...devices['iPhone 15']});
  const pg=await ctx.newPage();
  await pg.goto('http://localhost:4399/',{waitUntil:'load'});
  await pg.waitForTimeout(5000);
  const H=await pg.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  // bajar hasta las tarjetas
  await pg.evaluate(y=>window.scrollTo(0,y),Math.round(H*0.86)); await pg.waitForTimeout(1500);
  const r=await pg.evaluate(()=>{
    const j=e=>{const r=e.getBoundingClientRect();return{t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),r:Math.round(r.right),h:Math.round(r.height),w:Math.round(r.width)};};
    const out={};
    const card=document.querySelector('.bol-cats__card');
    if(card){ out.card=j(card); out.info=j(card.querySelector('.bol-cats__info'));
      out.count=j(card.querySelector('.bol-cats__count')); out.name=j(card.querySelector('.bol-cats__name'));
      out.count_se_sale = out.count.b > out.card.b; }
    const badge=document.querySelector('.bol-intro__cta-badge'), wa=document.querySelector('.bol-intro__cta-secondary'), prim=document.querySelector('.bol-intro__cta-primary');
    if(badge){ out.badge=j(badge); out.wa=j(wa); out.primario=j(prim);
      out.badge_pisa_primario = !(out.badge.b < out.primario.t || out.badge.t > out.primario.b || out.badge.r < out.primario.l || out.badge.l > out.primario.r); }
    return out;
  });
  console.log('=== TARJETA DE CATEGORIA (iPhone 15) ===');
  console.log(' card ',JSON.stringify(r.card)); console.log(' info ',JSON.stringify(r.info));
  console.log(' name ',JSON.stringify(r.name)); console.log(' count',JSON.stringify(r.count));
  console.log(' -> "VARIEDADES" se sale de la tarjeta?', r.count_se_sale, r.count_se_sale?('  sobresale '+(r.count.b-r.card.b)+'px'):'');
  console.log('\n=== BADGE ENVIO EXPRESS ===');
  console.log(' badge    ',JSON.stringify(r.badge)); console.log(' whatsapp ',JSON.stringify(r.wa)); console.log(' primario ',JSON.stringify(r.primario));
  console.log(' -> el badge se superpone al boton "Ver el menu"?', r.badge_pisa_primario);
  // masa madre: recorrer el tramo y ver si el texto se sale del viewport
  console.log('\n=== TEXTO MASA MADRE ===');
  let peor=null;
  for(let i=40;i<=68;i++){
    await pg.evaluate(y=>window.scrollTo(0,y),Math.round(H*i/100)); await pg.waitForTimeout(160);
    const m=await pg.evaluate(()=>{const e=document.querySelector('.bol-hero-masa'); if(!e)return null;
      const s=getComputedStyle(e); if(parseFloat(s.opacity)<0.05)return null;
      const r=e.getBoundingClientRect(); return {t:Math.round(r.top),b:Math.round(r.bottom),h:Math.round(r.height),vh:innerHeight,op:s.opacity};});
    if(m && (m.t<0||m.b>m.vh)){ const fuera=Math.max(0,-m.t)+Math.max(0,m.b-m.vh); if(!peor||fuera>peor.fuera) peor={...m,fuera,pct:i}; }
  }
  console.log(peor? ` -> PEOR CASO a ${peor.pct}% del scroll: top=${peor.t} bottom=${peor.b} (viewport 0..${peor.vh}), altura=${peor.h}px, se sale ${peor.fuera}px`
                  : ' -> nunca se sale del viewport');
  await b.close();
})();
