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

console.log(await ev(`(async () => {
  const out = {};
  const b64 = (s) => btoa(unescape(encodeURIComponent(s || '')));
  const comm = { ct: 11, cv: '1003006', v: '1003006', os_ver: '15', phonetype: '24122RKC7C', rom: 'Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys', tmeAppID: 'qqmusiclight', nettype: 'NETWORK_WIFI', udid: '0', uid: '0' };

  // 1. QQ 搜「那天之后」
  const sp = { comm, request: { method: 'DoSearchForQQMusicLite', module: 'music.search.SearchCgiService', param: { search_id: String(Math.floor(Math.random()*1e14 + Date.now()%86400000)), remoteplace: 'search.android.keyboard', query: '那天之后', search_type: 7, num_per_page: 10, page_num: 1, highlight: 0, nqc_flag: 0, page_id: 1, grp: 1 } } };
  const r1 = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': 'tmeLoginType=-1;', 'User-Agent': 'okhttp/3.14.9' }, body: JSON.stringify(sp), signal: AbortSignal.timeout(15000) });
  const j1 = await r1.json();
  const songs = j1.request?.data?.body?.item_song || [];
  out.search = { code: j1.code, reqCode: j1.request?.code, count: songs.length,
    first: songs[0] ? (songs[0].title + ' / ' + (songs[0].singer||[]).map(x=>x.name).join(',') + ' / id=' + songs[0].id + ' / mid=' + songs[0].mid) : null };

  // 2. 取它的歌词
  if (songs[0]) {
    const s = songs[0];
    const p2 = { comm, request: { method: 'GetPlayLyricInfo', module: 'music.musichallSong.PlayLyricInfo', param: { albumName: b64(s.album?.name), crypt: 1, ct: 19, cv: 2111, interval: Math.floor(s.interval||0), lrc_t: 0, qrc: 1, qrc_t: 0, roma: 1, roma_t: 0, singerName: b64((s.singer||[]).map(x=>x.name).join(', ')), songID: Number(s.id), songName: b64(s.title), trans: 1, trans_t: 0, type: 0 } } };
    const r2 = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': 'tmeLoginType=-1;', 'User-Agent': 'okhttp/3.14.9' }, body: JSON.stringify(p2), signal: AbortSignal.timeout(15000) });
    const j2 = await r2.json();
    out.lyric = { code: j2.code, reqCode: j2.request?.code, len: (j2.request?.data?.lyric||'').length,
      qrcLen: (j2.request?.data?.qrc||'').length };
  }
  return JSON.stringify(out, null, 1);
})()`));
ws.close();
