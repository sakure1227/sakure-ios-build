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
  if(m.method==='Runtime.exceptionThrown'){logs.push('[EXC] '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,400))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== Bug 1 验证：setEnabled 返回形状 ===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const list = await api.list();
  const e = list.find(x=>x.running);
  if (!e) return 'no running source';
  // 关掉再打开 —— 渲染层走的就是这条路（setSources(await setCustomSourceEnabled(...))）
  const off = await api.setEnabled(e.id, false);
  const on  = await api.setEnabled(e.id, true);
  const isArray = Array.isArray(off) && Array.isArray(on);
  const shape = isArray ? off.map(x=>({name:x.name, enabled:x.enabled, running:x.running, hasSources: x.sources!==undefined})) : {off, on};
  return JSON.stringify({isArray, shape}, null, 1);
})()`));

console.log('\n=== 渲染层视角：setSources 后能不能渲染 ===');
console.log(await ev(`(async () => {
  const api = window.electron?.customSource;
  const list = await api.list();
  const e = list[0];
  const next = await api.setEnabled(e.id, true);
  // 模拟 CustomSourcePage 的渲染前提
  const canMap = typeof next?.map === 'function';
  const canLen = typeof next?.length === 'number';
  return JSON.stringify({canMap, canLen, length: next?.length, first: next?.[0]?.name});
})()`));

console.log('\n=== 页面是否还活着（黑屏检查）===');
console.log(await ev(`JSON.stringify({
  rootChildren: document.getElementById('root')?.childElementCount ?? -1,
  bodyText: (document.body.innerText||'').slice(0,120),
  hasErrorOverlay: !!document.querySelector('[data-error-boundary], .error-boundary'),
})`));

console.log('\n=== 控制台异常 ===');
console.log(logs.filter(l=>l.includes('EXC')||l.includes('error')).slice(-8).join('\n') || '(无异常)');
ws.close();
