// dev/probes/verifyAll.mjs
// 真机综合验证：播放、歌词、聚合。
import { WebSocket } from 'ws';
import { request } from 'node:http';

const PORT = process.env.CDP_PORT || '9225';
const getJson = (path) => new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port: Number(PORT), path, timeout: 8000 }, r => {
        let b = ''; r.on('data', c => b += c); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    });
    req.on('error', rej); req.on('timeout', () => req.destroy(new Error('t'))); req.end();
});

const list = await getJson('/json/list');
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const logs = [];
const send = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.on('message', raw => {
    const m = JSON.parse(raw.toString());
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled') {
        const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
        logs.push('[' + m.params.type + '] ' + t.slice(0, 250));
    }
    if (m.method === 'Runtime.exceptionThrown') {
        logs.push('[EXC] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
    }
});
await new Promise(r => ws.on('open', r));
await send('Runtime.enable');
const ev = async (expr, to = 60000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 400);
    return res?.result?.value;
};

console.log('════ 1. 播放：拿地址并确认协议与可播性 ════');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','周杰伦',{limit:6,offset:0});
  const out = [];
  for (const s of p.items) {
    try {
      const src = await window.__sakureOmni.getAudioSource(s, 'standard');
      const url = src?.url || '';
      out.push({ name: s.name, proto: url.split(':')[0], hasUrl: !!url });
    } catch(e){ out.push({ name: s.name, err: String(e?.message||e).slice(0,50) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 2. 歌词：网易云的歌（自己的平台）════');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','海阔天空',{limit:1,offset:0});
  const song = p.items[0];
  try {
    const r = await window.__sakureOmni.getLyrics(song);
    return JSON.stringify({
      ok: true, hasLyrics: !!r.lyrics,
      lineCount: r.lyrics?.lines?.length ?? 0,
      sample: r.lyrics?.lines?.slice(0,2).map(l=>l.fullText) ?? [],
      isPureMusic: r.isPureMusic,
    }, null, 1);
  } catch(e){ return 'ERR: '+(e?.message||e) }
})()`));

console.log('\n════ 3. 歌词：聚合（酷我的歌 → 本平台取不到 → 底座找）════');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('kuwo','海阔天空',{limit:2,offset:0});
  if (!p.items.length) return 'kuwo 搜索无结果';
  const song = p.items[0];
  const info = { name: song.name, provider: song.sourceRef?.providerId, mediaId: song.sourceRef?.mediaId };
  try {
    const r = await window.__sakureOmni.getLyrics(song);
    return JSON.stringify({ ...info, hasLyrics: !!r.lyrics, lineCount: r.lyrics?.lines?.length ?? 0,
      sample: r.lyrics?.lines?.slice(0,2).map(l=>l.fullText) ?? [] }, null, 1);
  } catch(e){ return JSON.stringify({...info, err: String(e?.message||e)}) }
})()`));

console.log('\n════ 4. provider 的能力声明 ════');
console.log(await ev(`(async () => {
  const omni = window.__sakureOmni;
  const out = [];
  for (const id of ['netease','kuwo','kugou','qq','migu']) {
    try {
      const caps = omni.getProviderCapabilities(id);
      out.push({ id, exists: !!caps, search: caps?.search, lyrics: caps?.lyrics });
    } catch(e){ out.push({ id, err: String(e?.message||e).slice(0,40) }); }
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 5. 桥的后端接口是否已移除（假后端会让 transport 走死路）════');
console.log(await ev(`JSON.stringify({
  hasKugouRequest: typeof window.electron?.kugouRequest,
  hasNeteasePort: typeof window.electron?.getNeteasePort,
  hasQqPort: typeof window.electron?.getQqPort,
})`));

console.log('\n════ 6. 音频元素的实际状态 ════');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('audio')].map(a=>({
  src: (a.currentSrc||a.src||'').slice(0,80),
  paused: a.paused, readyState: a.readyState,
  err: a.error?.code||null, errMsg: a.error?.message||null,
  currentTime: Math.round(a.currentTime), duration: Math.round(a.duration||0)
})), null, 1)`));

console.log('\n════ 7. 控制台尾部 ════');
console.log(logs.slice(-14).join('\n') || '(空)');

ws.close();
