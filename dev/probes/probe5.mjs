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
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||'').slice(0,300);
  return res?.result?.value};

console.log('=== 闪屏修复是否生效 ===');
console.log(await ev(`JSON.stringify({
  dataRuntime: document.documentElement.getAttribute('data-runtime'),
  isMobileFlag: window.electron?.isMobile,
  // will-change 是否已被降级
  willChange: (()=>{const els=[...document.querySelectorAll('.will-change-transform')];
    return {count: els.length, values: els.slice(0,3).map(e=>getComputedStyle(e).willChange)};})(),
  // backdrop-filter 是否已被去掉
  backdrop: (()=>{const els=[...document.querySelectorAll('[class*="lattice"],[class*="bravais"]')].slice(0,400);
    const withBlur = els.filter(e=>{const v=getComputedStyle(e).backdropFilter||getComputedStyle(e).webkitBackdropFilter; return v && v!=='none'});
    return {sampled: els.length, stillBlur: withBlur.length};})(),
}, null, 1)`));

console.log('\n=== 设置弹窗打开时 visualizer 是否卸载 ===');
console.log(await ev(`(async () => {
  // 打开设置
  const mod = await import('/assets/main-' + '' , ).catch(()=>null);
  return 'skip';
})()`).catch?.(()=>''));
ws.close();
