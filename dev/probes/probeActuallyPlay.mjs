// dev/probes/probeActuallyPlay.mjs
// 真机验证「能不能真的听歌」：让应用自己走播放流程，然后看 audio 元素的状态。
// 这与 probeBulk 不同：那个只查地址取不取得到字节，这个查的是播放器有没有真的播起来。
import { WebSocket } from 'ws';
import { request } from 'node:http';

const PORT = process.env.CDP_PORT || '9225';
const SONGS = (process.env.SONGS || '海阔天空,告白气球,晴天').split(',');

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
        if (/error|fail|media|mixed|play/i.test(t)) logs.push('[' + m.params.type + '] ' + t.slice(0, 200));
    }
});
await new Promise(r => ws.on('open', r));
await send('Runtime.enable');
const ev = async (expr, to = 120000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 400);
    return res?.result?.value;
};

console.log('════ 逐首验证：取地址 → 交给 <audio> → 看有没有真的播起来 ════');
const raw = await ev(`(async () => {
  const songs = ${JSON.stringify(SONGS)};
  const out = [];
  const tryPlay = (url) => new Promise(resolve => {
    if (!url) return resolve({ ok: false, why: 'no-url' });
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    const t = setTimeout(() => resolve({ ok: false, why: 'timeout', readyState: a.readyState, err: a.error?.code || null }), 15000);
    a.onloadedmetadata = () => { clearTimeout(t); resolve({ ok: true, dur: Math.round(a.duration || 0) }); };
    a.onerror = () => { clearTimeout(t); resolve({ ok: false, why: 'error', code: a.error?.code, msg: a.error?.message }); };
    a.src = url; a.load();
  });
  for (const q of songs) {
    const row = { q };
    try {
      const p = await window.__sakureOmni.searchProviderSongs('netease', q, { limit: 1, offset: 0 });
      const song = p.items?.[0];
      if (!song) { row.err = 'no song'; out.push(row); continue; }
      row.name = song.name;
      const src = await window.__sakureOmni.getAudioSource(song, 'standard');
      const url = src?.url || '';
      row.proto = url.split(':')[0];
      row.url = url.slice(0, 90);
      // 走播放链路的归一化（与应用里一致：手机版把 http 升级成 https）
      const playable = url.replace(/^http:/i, 'https:');
      row.play = await tryPlay(playable);
    } catch (e) { row.err = String(e?.message || e).slice(0, 120); }
    out.push(row);
  }
  return JSON.stringify(out);
})()`);

let rows = [];
try { rows = JSON.parse(raw); } catch { console.log('parse fail:', String(raw).slice(0, 400)); process.exit(1); }
for (const r of rows) {
    const mark = r.play?.ok ? 'PLAY' : 'FAIL';
    console.log(`${mark} | ${String(r.q).padEnd(10)} | ${String(r.name || '-').slice(0,12).padEnd(14)} | ${String(r.proto || '-').padEnd(5)} | ${r.play?.ok ? 'ok dur=' + r.play.dur : (r.play?.why + ' code=' + (r.play?.code ?? r.play?.err))} | ${r.err || ''}`);
}

console.log('\n════ 页面里正在播的 audio 元素 ════');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('audio')].map(a => ({
  src: (a.currentSrc || a.getAttribute('src') || '').slice(0, 100),
  proto: (a.currentSrc || '').split(':')[0],
  paused: a.paused, readyState: a.readyState,
  err: a.error?.code || null, errMsg: a.error?.message || null,
  t: Math.round(a.currentTime), dur: Math.round(a.duration || 0)
})), null, 1)`));

console.log('\n════ 控制台 ════');
console.log(logs.slice(-12).join('\n') || '(空)');
ws.close();
