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
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== 酷我搜索：第一条记录的字段名 ===');
console.log(await ev(`(async () => {
  const url = 'https://search.kuwo.cn/r.s?all=' + encodeURIComponent('海阔天空') + '&pn=1&rn=2&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1';
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', Referer: 'https://www.kuwo.cn/' }, signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  const row = (j.abslist||[])[0]||{};
  const pick = {};
  for (const k of ['MUSICRID','DC_MUSICRID','RID','NAME','ARTIST','ALBUM','DURATION','MINFO','SONGNAME','ARTISTNAME']) {
    if (row[k] !== undefined) pick[k] = String(row[k]).slice(0,60);
  }
  return JSON.stringify({ topKeys: Object.keys(j).slice(0,25), total: j.TOTAL, row: pick }, null, 1);
})()`));

console.log('\n=== 酷我歌词接口：http 版 ===');
console.log(await ev(`(async () => {
  const url = 'http://m.kuwo.cn/api/service/search?corpus=1&key=all&duration=300&musicId=MUSIC_6735076&pc=1';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', Referer: 'https://www.kuwo.cn/' }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    return JSON.stringify({ status: r.status, len: t.length, head: t.slice(0,260) }, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));
ws.close();
