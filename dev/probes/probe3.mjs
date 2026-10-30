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
  if(m.method==='Runtime.consoleAPICalled'){logs.push('['+m.params.type+'] '+m.params.args.map(a=>a.value??a.description??'').join(' ').slice(0,200))}
  if(m.method==='Runtime.exceptionThrown'){logs.push('[EXC] '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,300))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== 1. 搜一首歌并看它的 sourceRef ===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const s = p.items[0];
  return JSON.stringify({name:s.name, sourceRef:s.sourceRef, source:s.source, lxFields: (()=>{try{
    const prov = window.__sakureOmni.getProviderSummaries();
    return 'n/a';}catch(e){return 'err'}})()}, null, 1);
})()`));

console.log('\n=== 2. 走完整播放地址链路（omni.getAudioSource）===');
console.log(await ev(`(async () => {
  try {
    const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
    const song = p.items[0];
    const src = await window.__sakureOmni.getAudioSource(song, 'standard');
    return JSON.stringify({url: src?.url?.slice(0,120), quality: src?.quality}, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e)+' | '+(String(e?.stack||'').slice(0,300)) }
})()`));

console.log('\n=== 3. 直接问源（不走 songMapping）===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const list = await api.list();
  const e = list.find(x=>x.running);
  if (!e) return 'no running source';
  const answer = await api.requestFromAny('musicUrl', { source:'wy', type:'128k',
    musicInfo:{ id:347230, songmid:'347230', name:'海阔天空', singer:'Beyond', interval:'4:40', albumName:'The Line of Best Fit' }});
  return JSON.stringify(answer).slice(0,500);
})()`));

console.log('\n=== 4. 控制台尾部 ===');
console.log(logs.slice(-10).join('\n') || '(空)');
ws.close();
