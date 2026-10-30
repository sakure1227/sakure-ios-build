// 验证四个平台的搜索 + 封面 + 沉浸式
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

console.log('════ 四个平台的搜索 + 封面 ════');
console.log(await ev(`(async () => {
  const out = [];
  for (const pid of ['netease','kuwo','kugou','qq']) {
    try {
      const p = await window.__sakureOmni.searchProviderSongs(pid, '海阔天空', { limit: 3, offset: 0 });
      out.push({
        pid, count: p.items?.length ?? 0,
        first: p.items?.[0]?.name,
        artist: (p.items?.[0]?.artists||[]).map(a=>a.name).join(','),
        providerId: p.items?.[0]?.sourceRef?.providerId,
        mediaId: String(p.items?.[0]?.sourceRef?.mediaId ?? '').slice(0,20),
        coverUrl: (p.items?.[0]?.album?.coverUrl || '').slice(0,70),
        hasCover: !!p.items?.[0]?.album?.coverUrl,
        dur: Math.round((p.items?.[0]?.durationMs||0)/1000),
      });
    } catch(e){ out.push({ pid, err: String(e?.message||e).slice(0,100) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 封面能否真的加载 ════');
console.log(await ev(`(async () => {
  const out = [];
  for (const pid of ['netease','kuwo','kugou','qq']) {
    try {
      const p = await window.__sakureOmni.searchProviderSongs(pid, '海阔天空', { limit: 1, offset: 0 });
      const url = p.items?.[0]?.album?.coverUrl;
      if (!url) { out.push({ pid, no: 'no coverUrl' }); continue; }
      const r = await new Promise(resolve => {
        const img = new Image();
        const t = setTimeout(()=>resolve({ ok:false, why:'timeout' }), 10000);
        img.onload = ()=>{clearTimeout(t); resolve({ ok:true, w: img.naturalWidth, h: img.naturalHeight })};
        img.onerror = ()=>{clearTimeout(t); resolve({ ok:false, why:'error' })};
        img.src = url;
      });
      out.push({ pid, url: url.slice(0,60), ...r });
    } catch(e){ out.push({ pid, err: String(e?.message||e).slice(0,80) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 沉浸式与安全区 ════');
console.log(await ev(`JSON.stringify({
  dataRuntime: document.documentElement.getAttribute('data-runtime'),
  safeTop: getComputedStyle(document.documentElement).getPropertyValue('--st-safe-top').trim(),
  safeLeft: getComputedStyle(document.documentElement).getPropertyValue('--st-safe-left').trim(),
  safeRight: getComputedStyle(document.documentElement).getPropertyValue('--st-safe-right').trim(),
  safeBottom: getComputedStyle(document.documentElement).getPropertyValue('--st-safe-bottom').trim(),
  lampTop: (()=>{ const el=[...document.querySelectorAll('button')].find(b=>/ponder|灯泡|guide/i.test(b.getAttribute('aria-label')||'')); if(!el) return 'not found'; const cs=getComputedStyle(el); return cs.top + ' / right ' + cs.right; })(),
  canvasCount: document.querySelectorAll('canvas').length,
  blurLeft: [...document.querySelectorAll('*')].filter(el=>{const c=getComputedStyle(el); return c.backdropFilter && c.backdropFilter!=='none';}).length,
}, null, 1)`));
ws.close();
