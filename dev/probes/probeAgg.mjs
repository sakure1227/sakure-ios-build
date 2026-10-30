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

console.log('=== 1. 网易云搜「那天之后 - 左秋_EIKs.」===');
console.log(await ev(`(async () => {
  const q = '那天之后 - 左秋_EIKs.';
  const r = await fetch('https://music.163.com/api/search/get?s=' + encodeURIComponent(q) + '&type=1&limit=5&offset=0', { headers: { Referer: 'https://music.163.com', 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  return JSON.stringify({ count: j.result?.songs?.length ?? 0, total: j.result?.songCount,
    names: (j.result?.songs||[]).map(s => s.name + ' / ' + (s.artists||[]).map(a=>a.name).join(',') + ' / id=' + s.id) }, null, 1);
})()`));

console.log('\n=== 2. 网易云歌词接口（用搜到的 id）===');
console.log(await ev(`(async () => {
  const r = await fetch('https://music.163.com/api/search/get?s=' + encodeURIComponent('那天之后') + '&type=1&limit=1&offset=0', { headers: { Referer: 'https://music.163.com', 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  const id = j.result?.songs?.[0]?.id;
  if (!id) return 'no song';
  const lr = await fetch('https://music.163.com/api/song/lyric?id=' + id + '&lv=1&kv=1&tv=-1', { headers: { Referer: 'https://music.163.com', 'User-Agent': 'Mozilla/5.0' } });
  const lj = await lr.json();
  return JSON.stringify({ id, code: lj.code, lrcLen: (lj.lrc?.lyric||'').length, yrcLen: (lj.yrc?.lyric||'').length,
    head: (lj.lrc?.lyric||'').slice(0,80) }, null, 1);
})()`));

console.log('\n=== 3. QQ 歌词（公开接口）===');
console.log(await ev(`(async () => {
  const payload = { comm: { ct: 11, cv: '1003006', v: '1003006', os_ver: '15', phonetype: '24122RKC7C', rom: 'Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys', tmeAppID: 'qqmusiclight', nettype: 'NETWORK_WIFI', udid: '0', uid: '0' },
    request: { method: 'DoSearchForQQMusicLite', module: 'music.search.SearchCgiService', param: { search_id: String(Math.floor(Math.random()*100000000000000 + Date.now()%86400000)), remoteplace: 'search.android.keyboard', query: '那天之后', search_type: 7, num_per_page: 1, page_num: 1, highlight: 0, nqc_flag: 0, page_id: 1, grp: 1 } } };
  const r = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': 'tmeLoginType=-1;', 'User-Agent': 'okhttp/3.14.9' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
  const j = await r.json();
  const song = j.request?.data?.body?.item_song?.[0];
  if (!song) return 'no song; code=' + j.code + ' req=' + j.request?.code;
  // GetPlayLyricInfo
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const p2 = { comm: payload.comm, request: { method: 'GetPlayLyricInfo', module: 'music.musichallSong.PlayLyricInfo', param: { albumName: b64(song.album?.name||''), crypt: 1, ct: 19, cv: 2111, interval: Math.floor((song.interval||0)), lrc_t: 0, qrc: 1, qrc_t: 0, roma: 1, roma_t: 0, singerName: b64((song.singer||[]).map(x=>x.name).join(', ')), songID: Number(song.id), songName: b64(song.title||''), trans: 1, trans_t: 0, type: 0 } } };
  const r2 = await fetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': 'tmeLoginType=-1;', 'User-Agent': 'okhttp/3.14.9' }, body: JSON.stringify(p2), signal: AbortSignal.timeout(15000) });
  const j2 = await r2.json();
  const data = j2.request?.data;
  return JSON.stringify({ songId: song.id, mid: song.mid, code: j2.code, reqCode: j2.request?.code,
    lyricLen: (data?.lyric||'').length, head: (data?.lyric||'').slice(0,80) }, null, 1);
})()`));
ws.close();
