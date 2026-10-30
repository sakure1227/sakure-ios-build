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

console.log('=== 各平台的歌 → 歌词（聚合后）===');
console.log(await ev(`(async () => {
  const out = [];
  for (const pid of ['netease','kuwo','kugou','qq']) {
    let items = [];
    try { items = (await window.__sakureOmni.searchProviderSongs(pid, '那天之后', { limit: 1, offset: 0 })).items || []; }
    catch(e){ out.push({ pid, err: 'search: '+String(e?.message||e).slice(0,70) }); continue; }
    const song = items[0];
    if (!song) { out.push({ pid, err: 'no song' }); continue; }
    try {
      const r = await window.__sakureOmni.getLyrics(song);
      out.push({ pid, name: song.name, artist: (song.artists||[]).map(a=>a.name).join(','),
        hasLyrics: !!r.lyrics, lines: r.lyrics?.lines?.length ?? 0,
        sample: (r.lyrics?.lines||[]).slice(0,2).map(l=>l.fullText) });
    } catch(e){ out.push({ pid, name: song?.name, err: String(e?.message||e).slice(0,90) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));
ws.close();
