const {webkit, devices} = require('playwright');
const solapa=(a,b)=>!(a.bottom<b.top||a.top>b.bottom||a.right<b.left||a.left>b.right);
(async()=>{
 for(const dev of ['iPhone 15','iPhone SE']){
  const b=await webkit.launch(); const ctx=await b.newContext({...devices[dev]}); const pg=await ctx.newPage();
  await pg.goto('http://localhost:4399/',{waitUntil:'load'}); await pg.waitForTimeout(5000);
  const H=await pg.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  console.log('\n### '+dev);
  const hits={};
  for(let i=0;i<=45;i++){
    await pg.evaluate(y=>window.scrollTo(0,y),Math.round(H*i/100)); await pg.waitForTimeout(120);
    const r=await pg.evaluate(()=>{
      const vis=e=>{if(!e)return null;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.06)return null;const r=e.getBoundingClientRect();return r.width&&r.height?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null;};
      const lis=[...document.querySelectorAll('.bol-hero-motto li')].map(vis).filter(Boolean);
      return {lis, hint:vis(document.querySelector('.bol-hero-hint')), cap:vis(document.querySelector('.bol-hero-caption')), masa:vis(document.querySelector('.bol-hero-masa'))};
    });
    for(const [k,o] of Object.entries({hint:r.hint,caption:r.cap,masa:r.masa})){
      if(!o) continue;
      for(const li of r.lis) if(solapa(li,o)){ hits[k]=(hits[k]||0)+1; break; }
    }
  }
  console.log(' pasos de scroll (de 46) en que el motto se cruza con:', JSON.stringify(hits));
  await b.close();
 }
})();
