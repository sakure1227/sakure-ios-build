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

console.log(await ev(`JSON.stringify([...document.querySelectorAll('*')].filter(el => {
  const cs = getComputedStyle(el);
  return (cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.mixBlendMode && cs.mixBlendMode !== 'normal');
}).map(el => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    cls: String(el.className).slice(0,90),
    tag: el.tagName,
    bd: cs.backdropFilter, mb: cs.mixBlendMode,
    size: Math.round(r.width)+'x'+Math.round(r.height),
    parentCls: String(el.parentElement?.className||'').slice(0,60),
    parentTag: el.parentElement?.tagName,
  };
}), null, 1)`));
ws.close();
