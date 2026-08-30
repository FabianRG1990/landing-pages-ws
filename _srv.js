const http=require('http'),fs=require('fs'),p=require('path');
const ROOT=p.join(__dirname,'dist/apps/bolleria/browser');
const MT={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'};
http.createServer((rq,rs)=>{
  let u=decodeURIComponent(rq.url.split('?')[0]);
  let f=p.join(ROOT,u);
  try{ if(fs.statSync(f).isDirectory()) f=p.join(f,'index.html'); }catch(e){ f=p.join(ROOT,'index.html'); }
  if(!fs.existsSync(f)) f=p.join(ROOT,'index.html');
  const b=fs.readFileSync(f);
  rs.writeHead(200,{'Content-Type':MT[p.extname(f)]||'application/octet-stream','Content-Length':b.length});
  rs.end(b);
}).listen(4399,()=>console.log('srv :4399'));
