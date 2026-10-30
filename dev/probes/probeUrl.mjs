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
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== isMobileRuntime 判定 ===');
console.log(await ev(`JSON.stringify({
  isMobile: window.electron?.isMobile,
  dataRuntime: document.documentElement.getAttribute('data-runtime'),
})`));

console.log('\n=== toPlayableAudioUrl 的实际输出（真实播放链路用���）===');
console.log(await ev(`(async () => {
  const m = await import('/assets/' + [...document.querySelectorAll('script')].map(s=>s.src.split('/').pop()).filter(s=>s.startsWith('main-'))[0]);
  return 'module import ok? ' + Object.keys(m).slice(0,10).join(',');
})()`).catch(e=>String(e)));

console.log('\n=== 用一个 http 地址测试 toPlayableAudioUrl 的行为 ===');
console.log(await ev(`(async () => {
  // 直接模拟：源给的地址是 http，播放链路会经过 toPlayableAudioUrl
  const p = await window.__sakureOmni.searchProviderSongs('netease','周杰伦',{limit:3,offset:0});
  const out = [];
  for (const s of p.items) {
    const src = await window.__sakureOmni.getAudioSource(s, 'standard');
    const raw = src?.url || '';
    out.push({ name: s.name, raw: raw.slice(0,60), proto: raw.split(':')[0] });
  }
  return JSON.stringify(out, null, 1);
})()`));
ws.close();
