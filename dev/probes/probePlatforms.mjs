// 测各平台的搜索在真机上能不能通
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
  if(m.method==='Runtime.consoleAPICalled'){const t=m.params.args.map(a=>a.value??a.description??'').join(' '); if(/error|fail/i.test(t))logs.push('['+m.params.type+'] '+t.slice(0,200))}
});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr,to=90000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,400);
  return res?.result?.value};

console.log('=== 酷狗匿名搜索（仓库里已有的实现，走 fetch）===');
console.log(await ev(`(async () => {
  // 直接调仓库里的实现（手机版 fetch 补丁会接管跨域请求）
  const mod = await import('/assets/' + [...document.querySelectorAll('script')].map(s=>s.src.split('/').pop()).filter(s=>s.startsWith('main-'))[0]);
  return 'module keys: ' + Object.keys(mod).slice(0,5).join(',');
})()`).catch(e=>String(e).slice(0,200)));

console.log('\n=== 手写一份酷狗匿名搜索，验证接口通不通 ===');
console.log(await ev(`(async () => {
  // md5（从源站脚本里借一个简版实现不够，这里改用 crypto.subtle 不可用）
  // 直接复刻仓库的签名算法需要 md5 —— 先测不带签名，看接口怎么说
  const url = 'http://complexsearch.kugou.com/v2/search/song?keyword=' + encodeURIComponent('海阔天空') + '&page=1&pagesize=3&plat=2&clientver=11070&platform=AndroidFilter&x-router=complexsearch.kugou.com';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Android14-1070-11070-201-0-SearchSong-wifi', 'KG-Rec':'1','KG-RC':'1','x-router':'complexsearch.kugou.com' }, signal: AbortSignal.timeout(12000) });
    const t = await r.text();
    return JSON.stringify({ status: r.status, len: t.length, head: t.slice(0,220) }, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

console.log('\n=== 现有 provider 的搜索能力 ===');
console.log(await ev(`(async () => {
  const out = [];
  for (const pid of ['netease','kuwo','kugou','qq','migu']) {
    try {
      const p = await window.__sakureOmni.searchProviderSongs(pid, '海阔天空', { limit: 3, offset: 0 });
      out.push({ pid, ok: true, count: p.items?.length ?? 0, first: p.items?.[0]?.name,
        providerId: p.items?.[0]?.sourceRef?.providerId,
        hasCover: !!(p.items?.[0]?.album?.coverUrl) });
    } catch(e){ out.push({ pid, ok: false, err: String(e?.message||e).slice(0,80) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n=== QQ 搜索（qqLyricProvider 的公开搜索）===');
console.log(await ev(`(async () => {
  const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
  const payload = { comm: { ct: 11, cv: '1003006', v: '1003006', os_ver: '15', phonetype: '24122RKC7C', rom: 'Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys', tmeAppID: 'qqmusiclight', nettype: 'NETWORK_WIFI', udid: '0', uid: '0' },
    request: { method: 'DoSearchForQQMusicDesktop', module: 'music.search.SearchCgiService', param: { query: '海阔天空', num_per_page: 3, page_num: 1, search_type: 0 } } };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': 'tmeLoginType=-1;', 'User-Agent': 'okhttp/3.14.9' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
    const t = await r.text();
    return JSON.stringify({ status: r.status, len: t.length, head: t.slice(0,260) }, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

console.log('\n=== 控制台 ===');
console.log(logs.slice(-8).join('\n') || '(空)');
ws.close();
