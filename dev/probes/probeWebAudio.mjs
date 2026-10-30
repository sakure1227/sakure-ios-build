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
const ev=async(expr,to=60000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,300);
  return res?.result?.value};

console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = (src?.url||'').replace(/^http:/i,'https:');
  const out = { url: url.slice(0,70) };

  // 场景：不设 crossOrigin，但接进 AudioContext（模拟去掉 crossOrigin 后仍建链）
  const a = new Audio();
  a.src = url;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  const srcNode = ctx.createMediaElementSource(a);
  srcNode.connect(analyser);
  analyser.connect(ctx.destination);
  await ctx.resume().catch(()=>{});
  try { await a.play(); } catch(e){ out.playErr = String(e?.message||e).slice(0,60); }
  await new Promise(r => setTimeout(r, 2500));
  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buf);
  let sum = 0; for (const v of buf) sum += v;
  out.analyserSum = sum;
  out.analyserNonZero = sum > 0;
  out.audioPaused = a.paused;
  out.currentTime = Math.round(a.currentTime * 10) / 10;
  out.ctxState = ctx.state;
  // 不接 AudioContext 的对照：另一个元素直接出声
  const b = new Audio();
  b.src = url;
  try { await b.play(); } catch(e){ out.bPlayErr = String(e?.message||e).slice(0,60); }
  await new Promise(r => setTimeout(r, 1500));
  out.directTime = Math.round(b.currentTime * 10) / 10;
  out.directPaused = b.paused;
  return JSON.stringify(out, null, 1);
})()`));
ws.close();
