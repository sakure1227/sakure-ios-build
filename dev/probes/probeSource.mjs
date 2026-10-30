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
const ev=async(expr,to=120000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,500);
  return res?.result?.value};

console.log('=== 直接问源要「默 (Live)」的地址（之前那首 no-url 的）===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const p = await window.__sakureOmni.searchProviderSongs('netease','默 陈奕迅',{limit:3,offset:0});
  const s = p.items?.[0];
  if (!s) return 'no song';
  const info = { name: s.name, artist: (s.artists||[]).map(a=>a.name).join(','), id: s.id, mediaId: s.sourceRef?.mediaId };
  const answer = await api.requestFromAny('musicUrl', {
    source: 'wy', type: '128k',
    musicInfo: { id: Number(s.sourceRef?.mediaId)||s.id, songmid: String(s.sourceRef?.mediaId??s.id),
      name: s.name, singer: info.artist, albumName: s.album?.name||'', interval: String(Math.round((s.durationMs||0)/1000)) }
  });
  return JSON.stringify({ info, answer }, null, 1);
})()`));

console.log('\n=== 源支持哪些 quality（type）===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const list = await api.list();
  const e = list.find(x=>x.running);
  if (!e) return 'no running source';
  return JSON.stringify({ name: e.name, running: e.running, error: e.error,
    qualitys: e.qualitys, supports: e.supports, sources: e.sources }, null, 1);
})()`));

console.log('\n=== 换 quality 再问（128k / 320k / flac）===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const p = await window.__sakureOmni.searchProviderSongs('netease','默 陈奕迅',{limit:3,offset:0});
  const s = p.items?.[0];
  if (!s) return 'no song';
  const out = [];
  for (const q of ['128k','320k','flac','flac24bit']) {
    try {
      const a = await api.requestFromAny('musicUrl', {
        source: 'wy', type: q,
        musicInfo: { id: Number(s.sourceRef?.mediaId)||s.id, songmid: String(s.sourceRef?.mediaId??s.id),
          name: s.name, singer: (s.artists||[]).map(a=>a.name).join(','), albumName: s.album?.name||'', interval: String(Math.round((s.durationMs||0)/1000)) }
      });
      out.push({ q, answer: JSON.stringify(a).slice(0,220) });
    } catch(e){ out.push({ q, err: String(e?.message||e).slice(0,120) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));
ws.close();
