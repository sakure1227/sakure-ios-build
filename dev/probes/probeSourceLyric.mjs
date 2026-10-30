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
let id=0; const pend=new Map(); const logs=[];
const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}))});
ws.on('message',raw=>{const m=JSON.parse(raw.toString());
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);return}
  if(m.method==='Runtime.consoleAPICalled'){const t=m.params.args.map(a=>a.value??a.description??'').join(' '); if(/lyric|歌词|source|源|error/i.test(t))logs.push('['+m.params.type+'] '+t.slice(0,200))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr,to=90000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== 源声明的能力（init 时宿主告诉它的）===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const list = await api.list();
  return JSON.stringify((list||[]).map(x => ({ name: x.name, running: x.running, sources: x.sources })), null, 1);
})()`));

console.log('\n=== 直接问源要歌词 ===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const p = await window.__sakureOmni.searchProviderSongs('kugou','那天之后',{limit:1,offset:0});
  const s = p.items?.[0];
  if (!s) return 'no song';
  const pd = s.sourceRef?.providerData || {};
  const out = { song: s.name, artist: (s.artists||[]).map(a=>a.name).join(',') };
  try {
    const a = await api.requestFromAny('lyric', {
      source: 'kg', type: '128k',
      musicInfo: { id: String(s.sourceRef?.mediaId), songmid: String(pd.hash || s.sourceRef?.mediaId),
        hash: String(pd.hash || ''), albumId: String(s.album?.id || ''),
        name: s.name, singer: (s.artists||[]).map(x=>x.name).join(','),
        albumName: s.album?.name || '', interval: String(Math.round((s.durationMs||0)/1000)) }
    });
    out.answer = JSON.stringify(a).slice(0, 400);
  } catch(e){ out.err = String(e?.message||e).slice(0,200); }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n=== 控制台 ===');
console.log(logs.slice(-8).join('\n') || '(空)');
ws.close();
