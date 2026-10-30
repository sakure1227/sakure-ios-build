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
  if(m.method==='Runtime.consoleAPICalled'){const t=m.params.args.map(a=>a.value??a.description??'').join(' ');if(/error|fail|media|cors/i.test(t))logs.push('['+m.params.type+'] '+t.slice(0,300))}
  if(m.method==='Runtime.exceptionThrown'){logs.push('[EXC] '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,300))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||'').slice(0,400);
  return res?.result?.value};

console.log('=== 1. 拿地址（不做别的）===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  return JSON.stringify({url: src?.url?.slice(0,100), quality: src?.quality, songName: song.name});
})()`));

console.log('\n=== 2. 用一个 <audio> 直接试着加载那个地址 ===');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  const src = await window.__sakureOmni.getAudioSource(song, 'standard');
  const url = src?.url;
  if (!url) return 'no url';
  return await new Promise(resolve => {
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    const t = setTimeout(()=>resolve('TIMEOUT 8s; readyState='+a.readyState+' networkState='+a.networkState+' err='+(a.error?.code||'none')+' '+a.error?.message), 8000);
    a.onloadedmetadata = ()=>{clearTimeout(t); resolve('OK duration='+a.duration)};
    a.onerror = ()=>{clearTimeout(t); resolve('ERROR code='+a.error?.code+' msg='+a.error?.message)};
    a.src = url;
    a.load();
  });
})()`));

console.log('\n=== 3. 页面里的 audio 元素状态 ===');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('audio')].map(a=>({
  src: (a.currentSrc||a.src||'').slice(0,90), paused:a.paused, readyState:a.readyState,
  networkState:a.networkState, error:a.error?.code||null, errMsg:a.error?.message||null,
  currentTime:a.currentTime, duration:a.duration
})), null, 1)`));

console.log('\n=== 4. 控制台错误 ===');
console.log(logs.slice(-12).join('\n') || '(无)');
ws.close();
