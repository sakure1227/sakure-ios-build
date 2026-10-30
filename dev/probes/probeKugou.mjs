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
  if(m.method==='Runtime.consoleAPICalled'){const t=m.params.args.map(a=>a.value??a.description??'').join(' '); if(/kugou|酷狗|error|fail/i.test(t))logs.push('['+m.params.type+'] '+t.slice(0,220))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr,to=90000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== 酷狗搜索：直接问接口看回答 ===');
console.log(await ev(`(async () => {
  // 手写一遍签名（与仓库那份一致），看接口怎么说
  const md5 = async (s) => {
    // 借用页面里已有的 md5：没有的话用 WebCrypto 不行（md5 没有）。
    // 这里改用 'blueimp-md5' —— 它打包进了应用，但拿不到模块。
    // 所以退而求其次：调 provider 的 search，看它报什么。
    return null;
  };
  try {
    const p = await window.__sakureOmni.searchProviderSongs('kugou','海阔天空',{limit:3,offset:0});
    return JSON.stringify({ count: p.items?.length ?? 0, total: p.total });
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

console.log('\n=== 酷狗 provider 的 search 存在吗 ===');
console.log(await ev(`JSON.stringify((() => {
  const caps = window.__sakureOmni.getProviderCapabilities?.('kugou');
  return { caps, };
})())`));

console.log('\n=== 直接打酷狗接口（不带签名）看风控说什么 ===');
console.log(await ev(`(async () => {
  const url = 'http://complexsearch.kugou.com/v2/search/song?keyword=' + encodeURIComponent('海阔天空') + '&page=1&pagesize=3&plat=2&clientver=11070&platform=AndroidFilter&x-router=complexsearch.kugou.com';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Android14-1070-11070-201-0-SearchSong-wifi','KG-Rec':'1','KG-RC':'1','x-router':'complexsearch.kugou.com' }, signal: AbortSignal.timeout(12000) });
    const t = await r.text();
    return JSON.stringify({ status: r.status, len: t.length, head: t.slice(0,300) }, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

console.log('\n=== 控制台 ===');
console.log(logs.slice(-10).join('\n') || '(空)');
ws.close();
