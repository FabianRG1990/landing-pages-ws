const {webkit, chromium, devices} = require('playwright');
async function medir(engine,dev){
  const b=await engine.launch();
  const ctx=await b.newContext({...devices[dev]});
  const pg=await ctx.newPage();
  await pg.addInitScript(()=>{
    window.__esc={};
    const orig=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(img,...a){
      try{
        if(img && img.src && img.src.includes('hero-frames') && a.length>=4){
          const nw=img.naturalWidth, dw=a[2];
          const dir=(img.src.match(/hero-frames-(v\d)/)||[])[1]||'?';
          const f=dw/nw;
          const e=window.__esc[dir]=window.__esc[dir]||{nw, max:0, min:9, n:0};
          if(f>e.max)e.max=f; if(f<e.min)e.min=f; e.n++;
        }
      }catch(e){}
      return orig.call(this,img,...a);
    };
  });
  const cdp = engine===chromium ? await ctx.newCDPSession(pg) : null;
  await pg.goto('http://localhost:4399/',{waitUntil:'load'});
  await pg.waitForTimeout(6000);
  const H=await pg.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  for(let i=1;i<=40;i++){ await pg.evaluate(y=>window.scrollTo(0,y), Math.round(H*i/40*0.75)); await pg.waitForTimeout(130); }
  const r=await pg.evaluate(()=>({esc:window.__esc, cw:document.querySelector('.bol-hero-canvas').width, ch:document.querySelector('.bol-hero-canvas').height, iw:innerWidth, dpr:devicePixelRatio}));
  console.log('\n### '+dev+'  viewport='+r.iw+'  DPR='+r.dpr+'  canvas='+r.cw+'x'+r.ch);
  for(const [d,e] of Object.entries(r.esc))
    console.log('   '+d+': cuadro nativo '+e.nw+'px  ->  dibujado entre '+(e.nw*e.min).toFixed(0)+' y '+(e.nw*e.max).toFixed(0)+'px  (factor max '+e.max.toFixed(3)+', '+e.n+' dibujos)');
  await b.close();
}
(async()=>{ await medir(webkit,'iPhone 15'); await medir(webkit,'iPhone SE'); await medir(chromium,'Pixel 7'); })();
