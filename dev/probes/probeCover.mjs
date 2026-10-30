// dev/probes/probeCover.mjs
// 封面诊断：页面里哪些 <img> 是封面，加载成功没有，地址什么协议。
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
        if (/cover|img|image|mixed|content|blocked|net::/i.test(t)) logs.push('[' + m.params.type + '] ' + t.slice(0, 240));
    }
});
await new Promise(r => ws.on('open', r));
await send('Runtime.enable');
const ev = async (expr, to = 90000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 400);
    return res?.result?.value;
};

console.log('════ 页面里的 <img>（封面）════');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('img')].slice(0, 25).map(img => ({
  src: (img.currentSrc || img.src || '').slice(0, 120),
  proto: (img.currentSrc || img.src || '').split(':')[0],
  complete: img.complete,
  naturalW: img.naturalWidth, naturalH: img.naturalHeight,
  boxW: Math.round(img.getBoundingClientRect().width),
  boxH: Math.round(img.getBoundingClientRect().height),
  cls: String(img.className).slice(0, 40),
})), null, 1)`));

console.log('\n════ 搜索结果里的封面（真实来源）════');
console.log(await ev(`(async () => {
  const p = await window.__sakureOmni.searchProviderSongs('netease','周杰伦',{limit:4,offset:0});
  return JSON.stringify((p.items||[]).map(s => ({
    name: s.name, provider: s.sourceRef?.providerId,
    cover: s.album?.coverUrl || s.coverUrl || s.album?.picUrl || null,
    album: s.album ? Object.keys(s.album) : null,
  })), null, 1);
})()`));

console.log('\n════ 直接测几个封面地址能否加载 ════');
console.log(await ev(`(async () => {
  const urls = [
    'http://p1.music.126.net/xxx/10995116630000000.jpg',
    'https://p1.music.126.net/xxx/10995116630000000.jpg',
    'http://y.gtimg.cn/musicphoto/xxx/300y300.jpg',
    'https://y.gtimg.cn/musicphoto/xxx/300y300.jpg',
  ];
  const out = [];
  for (const u of urls) {
    const r = await new Promise(resolve => {
      const img = new Image();
      const t = setTimeout(() => resolve('timeout'), 8000);
      img.onload = () => { clearTimeout(t); resolve('OK ' + img.naturalWidth + 'x' + img.naturalHeight); };
      img.onerror = () => { clearTimeout(t); resolve('ERROR'); };
      img.src = u;
    });
    out.push({ url: u.slice(0,70), result: r });
  }
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 控制台 ════');
console.log(logs.slice(-12).join('\n') || '(空)');
ws.close();
