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
const ev=async(expr,to=90000)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||res.exceptionDetails.text).slice(0,300);
  return res?.result?.value};

console.log(await ev(`(async () => {
  const payload = { comm: { ct: 11, cv: '1003006', v: '1003006', os_ver: '15', phonetype: '24122RKC7C', rom: 'Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys', tmeAppID: 'qqmusiclight', nettype: 'NETWORK_WIFI', udid: '0', uid: '0' },
    request: { method: 'DoSearchForQQMusicLite', module: 'music.search.SearchCgiService', param: { search_id: String(Math.floor(Math.random()*100000000000000 + Date.now()%86400000)), remoteplace: 'search.android.keyboard', query: '海阔天空', search_type: 7, num_per_page: 1, page_num: 1, highlight: 0, nqc_flag: 0, page_id: 1, grp: 1 } } };
  const r = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': 'tmeLoginType=-1;', 'User-Agent': 'okhttp/3.14.9' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  const song = j.request?.data?.body?.item_song?.[0];
  if (!song) return 'no song; code=' + j.code + ' reqCode=' + j.request?.code;
  const one = { code: j.code, reqCode: j.request?.code, reqDataCode: j.request?.data?.code, reqDataHeader: j.request?.data?.header };
  return JSON.stringify({
    one,
    mediaMid: song.file?.media_mid,
    songKeys: Object.keys(song).length,
    fileKeys: Object.keys(song.file || {}),
    file: song.file,
    mid: song.mid, id: song.id, title: song.title,
  }, null, 1);
})()`));
ws.close();
