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

console.log('=== 音频地址的 CORS 头（带 Origin 头测）===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = (src?.url||'').replace(/^http:/i,'https:');
  const out = { url: url.slice(0,90) };
  // 带 Origin 的请求（浏览器的 CORS 请求长这样）
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-1023', Origin: 'https://localhost' }, signal: AbortSignal.timeout(12000) });
    out.status = r.status;
    out.acao = r.headers.get('access-control-allow-origin');
    out.acceptRanges = r.headers.get('accept-ranges');
    out.contentType = r.headers.get('content-type');
    out.allHeaders = [...r.headers.keys()].slice(0,18);
  } catch(e){ out.err = String(e?.message||e).slice(0,80); }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n=== 不带 crossOrigin 能不能播 ===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = (src?.url||'').replace(/^http:/i,'https:');
  const test = (useCors) => new Promise(resolve => {
    const a = new Audio();
    if (useCors) a.crossOrigin = 'anonymous';
    const t = setTimeout(()=>resolve({ useCors, ok:false, why:'timeout' }), 12000);
    a.onloadedmetadata = ()=>{clearTimeout(t); resolve({ useCors, ok:true, dur: Math.round(a.duration||0) })};
    a.onerror = ()=>{clearTimeout(t); resolve({ useCors, ok:false, why:'error', code:a.error?.code, msg:a.error?.message })};
    a.src = url; a.load();
  });
  const withCors = await test(true);
  const without = await test(false);
  return JSON.stringify({ withCors, without }, null, 1);
})()`));
ws.close();
