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
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||'').slice(0,400);
  return res?.result?.value};

console.log('=== 用 fetch 直接取那个 URL 的前几个字节（看是不是音频）===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = src?.url;
  try {
    const r = await fetch(url, {method:'GET', headers:{Range:'bytes=0-63'}});
    const buf = new Uint8Array(await r.arrayBuffer());
    return JSON.stringify({
      status: r.status,
      contentType: r.headers.get('content-type'),
      contentLength: r.headers.get('content-length'),
      bytes: buf.length,
      first16: [...buf.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join(' '),
      ascii: [...buf.slice(0,8)].map(b=>String.fromCharCode(b)).join(''),
    }, null, 1);
  } catch(e){ return 'FETCH ERR: '+(e?.message||e) }
})()`));

console.log('\n=== 连续两次拿地址，URL 是否相同（签名是否一次性）===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const a = await window.__sakureOmni.getAudioSource(song, 'standard');
  const b = await window.__sakureOmni.getAudioSource(song, 'standard');
  return JSON.stringify({same: a?.url===b?.url, a: a?.url?.slice(-60), b: b?.url?.slice(-60)}, null, 1);
})()`));
ws.close();
