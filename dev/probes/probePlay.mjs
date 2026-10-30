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
  if(m.method==='Runtime.consoleAPICalled'){const t=m.params.args.map(a=>a.value??a.description??'').join(' ');if(/error|fail|media|cors|mixed/i.test(t))logs.push('['+m.params.type+'] '+t.slice(0,220))}
  if(m.method==='Runtime.exceptionThrown'){logs.push('[EXC] '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,250))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr,to=60000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== 用真实的播放入口放一首歌（走 onlinePlayback 那条路）===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  // 模拟播放器的取址流程：omni.getAudioSource → toPlayableAudioUrl
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const raw = src?.url || '';
  // 手动套上播放链路的归一化（与应用里一致）
  const norm = raw.replace(/^http:///////i, 'https://');
  return JSON.stringify({ raw: raw.slice(0,70), normalized: norm.slice(0,70) });
})()`));

console.log('\n=== 检查页面里已有的 audio 元素（真实播放过的）===');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('audio')].map(a=>({
  src: (a.currentSrc||a.getAttribute('src')||'').slice(0,90),
  proto: (a.currentSrc||'').split(':')[0],
  paused: a.paused, readyState: a.readyState, err: a.error?.code||null,
  errMsg: a.error?.message||null, t: Math.round(a.currentTime), dur: Math.round(a.duration||0)
})), null, 1)`));

console.log('\n=== 用 https 地址试播一首歌 ===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = (src?.url||'').replace(/^http:///////i, 'https://');
  if (!url) return 'no url';
  return await new Promise(resolve => {
    const a = new Audio();
    const t = setTimeout(()=>resolve('TIMEOUT readyState='+a.readyState+' err='+(a.error?.code||'none')+' '+(a.error?.message||'')), 12000);
    a.onloadedmetadata = ()=>{clearTimeout(t); resolve('OK duration='+Math.round(a.duration)+' proto='+url.split(':')[0])};
    a.onerror = ()=>{clearTimeout(t); resolve('ERROR code='+a.error?.code+' msg='+a.error?.message)};
    a.src = url; a.load();
  });
})()`));

console.log('\n=== 控制台 ===');
console.log(logs.slice(-12).join('\n') || '(空)');
ws.close();
