// dev/probes/probeBulk.mjs
// 批量诊断：拿一批歌，逐个走完「搜 → 问源要地址 → 取字节」，
// 统计有多少能播、不能播的都是什么原因。
import { WebSocket } from 'ws';
import { request } from 'node:http';

const PORT = process.env.CDP_PORT || '9225';
const QUERIES = (process.env.SONGS || '周杰伦,林俊杰,陈奕迅,邓紫棋,薛之谦,周杰伦 告白气球,海阔天空').split(',');

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
    if (m.method === 'Runtime.exceptionThrown') {
        logs.push('[EXC] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 250));
    }
});
await new Promise(r => ws.on('open', r));
await send('Runtime.enable');
const ev = async (expr, to = 180000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXC: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text).slice(0, 500);
    return res?.result?.value;
};

console.log('════ 批量诊断：搜 → 问源要地址 → 取字节 ════');
const raw = await ev(`(async () => {
  const queries = ${JSON.stringify(QUERIES)};
  const rows = [];
  for (const q of queries) {
    let items = [];
    try {
      const p = await window.__sakureOmni.searchProviderSongs('netease', q, { limit: 4, offset: 0 });
      items = p.items || [];
    } catch(e) { rows.push({ q, stage: 'search', err: String(e?.message||e).slice(0,100) }); continue; }
    for (const s of items) {
      const row = { q, name: s.name, artist: (s.artists||[]).map(a=>a.name).join(',') };
      let url = '';
      try { url = (await window.__sakureOmni.getAudioSource(s, 'standard'))?.url || ''; }
      catch(e){ row.stage = 'source'; row.err = String(e?.message||e).slice(0,110); rows.push(row); continue; }
      if (!url) { row.stage = 'no-url'; rows.push(row); continue; }
      row.proto = url.split(':')[0];
      row.host = (url.split('/')[2]||'');
      row.url = url.slice(0, 100);
      const https = url.replace(/^http:/i, 'https:');
      // 试 https 版（手机上真正会用的那个）
      try {
        const r = await fetch(https, { headers: { Range: 'bytes=0-2047' }, signal: AbortSignal.timeout(12000) });
        const buf = new Uint8Array(await r.arrayBuffer());
        row.httpsStatus = r.status;
        row.bytes = buf.length;
        row.ct = (r.headers.get('content-type')||'').slice(0,30);
        row.magic = buf.length > 4 ? [...buf.slice(0,4)].map(b=>b.toString(16).padStart(2,'0')).join('') : '';
      } catch(e){ row.httpsErr = String(e?.message||e).slice(0,80); }
      rows.push(row);
    }
  }
  return JSON.stringify(rows);
})()`);

let rows = [];
try { rows = JSON.parse(raw); } catch { console.log('parse fail:', String(raw).slice(0, 500)); process.exit(1); }

// 统计
const stat = { total: rows.length, noUrl: 0, sourceErr: 0, httpProto: 0, httpsOk: 0, httpsFail: 0, byHost: {} };
const reasons = {};
for (const r of rows) {
    if (r.stage === 'no-url') { stat.noUrl++; reasons['源没给地址'] = (reasons['源没给地址']||0)+1; continue; }
    if (r.stage === 'source') { stat.sourceErr++; reasons['问源出错:' + (r.err||'').slice(0,40)] = (reasons['问源出错:'+(r.err||'').slice(0,40)]||0)+1; continue; }
    if (r.proto === 'http') stat.httpProto++;
    stat.byHost[r.host] = (stat.byHost[r.host]||0)+1;
    if (r.httpsStatus && r.httpsStatus >= 200 && r.httpsStatus < 400 && r.bytes > 100) stat.httpsOk++;
    else { stat.httpsFail++; reasons['取不到:' + (r.httpsErr || ('status='+r.httpsStatus+' bytes='+r.bytes+' ct='+r.ct))] = (reasons['取不到:'+(r.httpsErr||('status='+r.httpsStatus+' bytes='+r.bytes+' ct='+r.ct))]||0)+1; }
}
console.log('\n统计:', JSON.stringify(stat, null, 1));
console.log('\n失败原因:');
for (const [k, v] of Object.entries(reasons).sort((a,b)=>b[1]-a[1])) console.log('  ' + v + '× ' + k);

console.log('\n════ 逐条明细 ════');
for (const r of rows) {
    const mark = (r.httpsStatus && r.httpsStatus < 400 && r.bytes > 100) ? 'OK ' : 'FAIL';
    console.log(`${mark} | ${String(r.q).padEnd(12)} | ${String(r.name).slice(0,14).padEnd(16)} | ${String(r.proto||'-').padEnd(5)} | ${String(r.host||'-').slice(0,28).padEnd(30)} | ${r.httpsStatus||r.httpsErr||r.err||r.stage||''} | ${r.bytes ?? ''} ${r.magic||''} ${r.ct||''}`);
}

console.log('\n════ 页面里的 audio 元素 ════');
console.log(await ev(`JSON.stringify([...document.querySelectorAll('audio')].map(a=>({
  src: (a.currentSrc||a.getAttribute('src')||'').slice(0,100),
  proto: (a.currentSrc||'').split(':')[0],
  paused: a.paused, readyState: a.readyState, err: a.error?.code||null,
  errMsg: a.error?.message||null, t: Math.round(a.currentTime)
})), null, 1)`));

console.log('\n════ 控制台 ════');
console.log(logs.slice(-14).join('\n') || '(空)');
ws.close();
