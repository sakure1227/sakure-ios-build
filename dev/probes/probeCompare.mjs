// dev/probes/probeCompare.mjs
// 对照实验：同一首歌，三条路各走一遍，分清「我们的 bug」还是「源的问题」。
//
//  A. 绕过我们所有代码，直接问源要地址（requestFromAny）→ 手动塞给 <audio> 试播
//  B. 走 omni.getAudioSource（我们的完整取址链）→ 手动塞给 <audio> 试播
//  C. 检查 A 的地址与 B 的地址是否一致
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
        logs.push('[' + m.params.type + '] ' + t.slice(0, 200));
    }
});
await new Promise(r => ws.on('open', r));
await send('Runtime.enable');
const ev = async (expr, to = 180000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 500);
    return res?.result?.value;
};

// 页面里试播一个地址：能不能真的解出音频
const PLAY = `
  const tryPlay = (url) => new Promise(resolve => {
    if (!url) return resolve({ ok:false, why:'no-url' });
    const a = new Audio();
    const t = setTimeout(() => resolve({ ok:false, why:'timeout', readyState:a.readyState, err:a.error?.code||null }), 12000);
    a.onloadedmetadata = () => { clearTimeout(t); resolve({ ok:true, dur: Math.round(a.duration||0) }); };
    a.onerror = () => { clearTimeout(t); resolve({ ok:false, why:'error', code:a.error?.code, msg:a.error?.message }); };
    a.src = url; a.load();
  });
`;

console.log('════ 对照实验 ════');
console.log(await ev(`(async () => {
  ${PLAY}
  const q = ${JSON.stringify(process.env.SONG || '默 陈奕迅')};
  const out = { song: q, cases: [] };

  // 找几首搜索到的歌
  const p = await window.__sakureOmni.searchProviderSongs('netease', q, { limit: 3, offset: 0 });
  for (const s of (p.items||[])) {
    const row = { name: s.name, artist: (s.artists||[]).map(a=>a.name).join(','), mediaId: s.sourceRef?.mediaId };

    // --- A. 绕过我们的代码，直接问源 ---
    const api = window.electron?.customSource;
    let directUrl = null, directErr = null;
    try {
      const answer = await api.requestFromAny('musicUrl', {
        source: 'wy', type: '128k',
        musicInfo: { id: Number(s.sourceRef?.mediaId)||s.id, songmid: String(s.sourceRef?.mediaId??s.id),
          name: s.name, singer: (s.artists||[]).map(a=>a.name).join(','),
          albumName: s.album?.name||'', interval: String(Math.round((s.durationMs||0)/1000)) }
      });
      directUrl = answer?.result?.data?.url || null;
      if (!directUrl) directErr = JSON.stringify(answer).slice(0,200);
    } catch(e){ directErr = String(e?.message||e).slice(0,150); }
    row.directFromSource = directUrl ? 'got-url' : ('NO-URL ' + (directErr||''));
    row.directProto = directUrl ? directUrl.split(':')[0] : null;

    // --- B. 走我们自己的取址链 ---
    let omniUrl = null, omniErr = null;
    try {
      const src = await window.__sakureOmni.getAudioSource(s, 'standard');
      omniUrl = src?.url || null;
    } catch(e){ omniErr = String(e?.message||e).slice(0,150); }
    row.viaOmni = omniUrl ? 'got-url' : ('NO-URL ' + (omniErr||''));
    row.omniProto = omniUrl ? omniUrl.split(':')[0] : null;
    row.sameUrl = directUrl && omniUrl ? (directUrl === omniUrl) : null;

    // --- 试播：直连源的地址（http 与 https 各一次）---
    if (directUrl) {
      row.playHttp = await tryPlay(directUrl);
      row.playHttps = await tryPlay(directUrl.replace(/^http:/i,'https:'));
    }
    // --- 试播：我们链路的地址 ---
    if (omniUrl) {
      row.playOmni = await tryPlay(omniUrl);
    }
    out.cases.push(row);
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 我们链路的取址细节（active provider / 顺序）════');
console.log(await ev(`(async () => {
  const omni = window.__sakureOmni;
  const out = {};
  try { out.activeProvider = omni.getActiveProviderSummary?.() ?? null; } catch(e){ out.activeErr = String(e?.message||e); }
  try {
    const caps = omni.getProviderCapabilities?.('lx');
    out.lxCaps = caps;
  } catch(e){ out.lxErr = String(e?.message||e); }
  try {
    const list = await window.electron?.customSource?.list();
    out.sources = (list||[]).map(x => ({ name:x.name, running:x.running, error:x.error }));
  } catch(e){ out.srcErr = String(e?.message||e); }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 控制台尾部 ════');
console.log(logs.slice(-12).join('\n') || '(空)');
ws.close();
