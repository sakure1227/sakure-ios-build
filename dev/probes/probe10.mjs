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
const ev=async(expr)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||'').slice(0,300);
  return res?.result?.value};

console.log('=== 真机上：浏览器 fetch 酷我 https 搜索（CORS 会挡吗）===');
console.log(await ev(`(async () => {
  const url='https://search.kuwo.cn/r.s?all=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&pn=1&rn=3&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1';
  try {
    const r = await fetch(url, {signal: AbortSignal.timeout(12000)});
    const t = await r.text();
    return 'OK status='+r.status+' len='+t.length+' | '+t.slice(0,100);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

console.log('\n=== 真机上：CsHttp 走原生发同样的请求 ===');
console.log(await ev(`(async () => {
  const url='https://search.kuwo.cn/r.s?all=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA&pn=1&rn=3&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1';
  try {
    const CsHttp = (await import('/assets/'+'')) ;
    return 'skip';
  } catch(e){}
  // 直接用 window.electron 的桥没有暴露 CsHttp，改用 omni 的路径
  return 'n/a';
})()`));
ws.close();
