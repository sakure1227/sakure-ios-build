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

console.log('=== 页面协议 & 地址协议对比 ===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = src?.url || '';
  return JSON.stringify({
    pageProtocol: location.protocol,
    pageOrigin: location.origin,
    audioProtocol: url.split(':')[0],
    urlHead: url.slice(0,80),
  }, null, 1);
})()`));

console.log('\n=== 拿多个不同歌，看协议是否都是 http ===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','周杰伦',{limit:5,offset:0});
  const out = [];
  for (const s of p.items) {
    try {
      const src = await window.__sakureOmni.getAudioSource(s, 'standard');
      out.push({name:s.name, proto:(src?.url||'').split(':')[0]});
    } catch(e){ out.push({name:s.name, err:String(e?.message||e).slice(0,60)}); }
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n=== 直接 fetch 一个 http 地址（对照）===');
console.log(await ev(`(async () => {
  try {
    const r = await fetch('http://m804.music.126.net/');
    return 'http fetch OK status='+r.status;
  } catch(e){ return 'http fetch ERR: '+(e?.message||e) }
})()`));
console.log(await ev(`(async () => {
  try {
    const r = await fetch('https://m804.music.126.net/');
    return 'https fetch OK status='+r.status;
  } catch(e){ return 'https fetch ERR: '+(e?.message||e) }
})()`));
ws.close();
