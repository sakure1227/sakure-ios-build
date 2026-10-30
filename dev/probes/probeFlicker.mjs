// dev/probes/probeFlicker.mjs
// 闪屏诊断：抓真实的帧数据，看是哪一段渲染把帧掉了。
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
let id = 0; const pend = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.on('message', raw => {
    const m = JSON.parse(raw.toString());
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.on('open', r));
await send('Runtime.enable');
await send('Performance.enable');
const ev = async (expr, to = 60000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 400);
    return res?.result?.value;
};

console.log('════ 当前渲染层的重活来源 ════');
console.log(await ev(`(async () => {
  const out = { dataRuntime: document.documentElement.getAttribute('data-runtime') };
  // 还在跑的合成层提示：哪些元素被提升成独立层
  const heavy = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.willChange && cs.willChange !== 'auto') heavy.push({ cls: String(el.className).slice(0,50), wc: cs.willChange });
    if (cs.backdropFilter && cs.backdropFilter !== 'none') heavy.push({ cls: String(el.className).slice(0,50), bd: cs.backdropFilter });
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') heavy.push({ cls: String(el.className).slice(0,50), mb: cs.mixBlendMode });
  }
  out.heavyCount = heavy.length;
  out.heavy = heavy.slice(0, 20);
  out.canvasCount = document.querySelectorAll('canvas').length;
  out.webglCanvases = [...document.querySelectorAll('canvas')].filter(c => {
    try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch(e){ return false; }
  }).length;
  out.filterCount = [...document.querySelectorAll('*')].filter(el => {
    const f = getComputedStyle(el).filter;
    return f && f !== 'none';
  }).length;
  return JSON.stringify(out, null, 1);
})()`));

console.log('\n════ 帧数据（Performance metrics）════');
const metrics = await send('Performance.getMetrics');
if (metrics?.metrics) {
    const pick = ['Frames', 'JSEventListeners', 'Nodes', 'LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration'];
    const rows = {};
    for (const m of metrics.metrics) if (pick.includes(m.name)) rows[m.name] = m.value;
    console.log(JSON.stringify(rows, null, 1));
} else {
    console.log('no metrics');
}

console.log('\n════ 交互时的掉帧：打开设置弹窗并测帧 ════');
console.log(await ev(`(async () => {
  const frames = [];
  let last = performance.now();
  let running = true;
  const tick = () => {
    const now = performance.now();
    frames.push(now - last);
    last = now;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  await new Promise(r => setTimeout(r, 600));

  // 打开设置
  const btn = [...document.querySelectorAll('button')].find(b => /设置|options/i.test(b.getAttribute('aria-label')||b.textContent||''));
  let opened = false;
  if (btn) { btn.click(); opened = true; }
  await new Promise(r => setTimeout(r, 1500));
  running = false;
  const d = frames.slice(5).sort((a,b)=>a-b);
  const p = (q) => d.length ? Math.round(d[Math.floor(d.length*q)]) : -1;
  return JSON.stringify({
    opened, sampleCount: d.length,
    medianMs: p(0.5), p90Ms: p(0.9), p99Ms: p(0.99), maxMs: Math.round(d[d.length-1]||0),
    over32ms: d.filter(x=>x>32).length, over50ms: d.filter(x=>x>50).length,
    over100ms: d.filter(x=>x>100).length,
    canvasAfter: document.querySelectorAll('canvas').length,
    dialogs: document.querySelectorAll('[role="dialog"]').length,
  }, null, 1);
})()`));

console.log('\n════ 滑动时的掉帧：模拟连续滚动 ════');
console.log(await ev(`(async () => {
  const frames = [];
  let last = performance.now();
  let running = true;
  const tick = () => { const n = performance.now(); frames.push(n-last); last = n; if (running) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise(r => setTimeout(r, 500));
  // 连续滚动
  const scroller = [...document.querySelectorAll('*')].find(el => el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 200);
  if (scroller) {
    for (let i = 0; i < 30; i++) {
      scroller.scrollTop += 40;
      await new Promise(r => requestAnimationFrame(r));
    }
  }
  running = false;
  const d = frames.slice(5).sort((a,b)=>a-b);
  const p = (q) => d.length ? Math.round(d[Math.floor(d.length*q)]) : -1;
  return JSON.stringify({
    hadScroller: !!scroller, sampleCount: d.length,
    medianMs: p(0.5), p90Ms: p(0.9), p99Ms: p(0.99), maxMs: Math.round(d[d.length-1]||0),
    over32ms: d.filter(x=>x>32).length, over50ms: d.filter(x=>x>50).length, over100ms: d.filter(x=>x>100).length,
  }, null, 1);
})()`));

ws.close();
