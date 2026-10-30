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
  if(m.method==='Runtime.consoleAPICalled'){logs.push('['+m.params.type+'] '+m.params.args.map(a=>a.value??a.description??'').join(' ').slice(0,300))}
  if(m.method==='Runtime.exceptionThrown'){logs.push('[EXC] '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,400))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr,to=45000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

// 1. active provider 是谁
console.log('=== active provider / 注册表 ===');
console.log(await ev(`JSON.stringify({
  active: window.electron ? null : null,
  omniActive: (()=>{try{return window.__sakureOmni.getActiveProviderSummary()?.providerId}catch(e){return 'ERR '+e.message}})(),
  providers: (()=>{try{return window.__sakureOmni.getProviderSummaries().map(s=>s.providerId+' lx='+(window.__sakureOmni.getProviderCapabilities(s.providerId)?'y':'n')+' search='+window.__sakureOmni.getProviderCapabilities(s.providerId).search)}catch(e){return 'ERR '+e.message}})(),
}, null, 1)`));

// 2. 直接调 platformSearch 看看
console.log('\n=== 直接调 platformSearch（绕开 omni）===');
console.log(await ev(`(async () => {
  try {
    const omni = window.__sakureOmni;
    const p = await omni.searchProviderSongs('netease', '海阔天空', { limit: 5, offset: 0 });
    return JSON.stringify({total:p.total, count:p.items?.length, first:p.items?.[0]?.name, provider:p.items?.[0]?.sourceRef?.providerId}, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e)+' | '+String(e?.stack||'').slice(0,300) }
})()`));

// 3. lx 聚合搜索
console.log('\n=== lx 聚合搜索 ===');
console.log(await ev(`(async () => {
  try {
    const p = await window.__sakureOmni.searchProviderSongs('lx', '海阔天空', { limit: 5, offset: 0 });
    return JSON.stringify({total:p.total, count:p.items?.length, first:p.items?.[0]?.name, provider:p.items?.[0]?.sourceRef?.providerId}, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

ws.close();
