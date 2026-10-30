import { WebSocket } from 'ws';
import { request } from 'node:http';
const PORT = '9225';
const getJson = (path) => new Promise((res, rej) => {
  const req = request({host:'127.0.0.1',port:Number(PORT),path,timeout:8000}, r => {
    let b=''; r.on('data',c=>b+=c); r.on('end',()=>{try{res(JSON.parse(b))}catch(e){rej(e)}});
  });
  req.on('error',rej); req.on('timeout',()=>req.destroy(new Error('t'))); req.end();
});
const list = await getJson('/json/list');
const page = list.find(t=>t.type==='page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id=0; const pend=new Map();
const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}))});
ws.on('message',raw=>{const m=JSON.parse(raw.toString()); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,300);
  return res?.result?.value};

console.log('=== 右上角区域（x > 宽-160, y < 160）的元素 ===');
console.log(await ev(`JSON.stringify((() => {
  const W = window.innerWidth, H = window.innerHeight;
  const out = [];
  for (const el of document.querySelectorAll('button, a, [role="button"], [class*="absolute"], [class*="fixed"]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > W - 170 && r.top < 170) {
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName, cls: String(el.className).slice(0,55),
        label: (el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,28),
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        pos: cs.position, z: cs.zIndex,
      });
    }
  }
  return { viewport: W + 'x' + H, items: out };
})(), null, 1)`));

console.log('\n=== 仍然有毛玻璃的元素 ===');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('*')].filter(el => {
  const c = getComputedStyle(el);
  return c.backdropFilter && c.backdropFilter !== 'none';
}).map(el => {
  const r = el.getBoundingClientRect();
  return { cls: String(el.className).slice(0,60), bd: getComputedStyle(el).backdropFilter,
    x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
}), null, 1)`));
ws.close();
