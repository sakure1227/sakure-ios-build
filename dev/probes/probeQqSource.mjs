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
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const p = await window.__sakureOmni.searchProviderSongs('qq','海阔天空',{limit:1,offset:0});
  const s = p.items?.[0];
  if (!s) return 'no song';
  const pd = s.sourceRef?.providerData || {};
  const base = { id: String(s.sourceRef?.mediaId), name: s.name,
    singer: (s.artists||[]).map(a=>a.name).join(','), albumName: s.album?.name||'',
    interval: String(Math.round((s.durationMs||0)/1000)) };
  const variants = [
    ['A 完整(lxFields 那套)', { ...base, songmid: pd.songMid, strMediaMid: pd.mediaMid, songId: pd.songId }],
    ['B 只有 songmid', { ...base, songmid: pd.songMid }],
    ['C songmid+strMediaMid', { ...base, songmid: pd.songMid, strMediaMid: pd.mediaMid }],
  ];
  const out = { pd, variants: [] };
  for (const [label, musicInfo] of variants) {
    try {
      const a = await api.requestFromAny('musicUrl', { source: 'tx', type: '128k', musicInfo });
      out.variants.push({ label, answer: JSON.stringify(a).slice(0,200) });
    } catch(e){ out.variants.push({ label, err: String(e?.message||e).slice(0,150) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));
ws.close();
