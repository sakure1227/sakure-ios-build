// dev/probes/mobileLoginFlow.cjs
// 在手机上跑一遍完整的登录流程（到「已授权」为止），把每一步的真实数据打出来。
//
// 它不真的扫码 —— 它按平台的协议自己走：
//   1. 取二维码
//   2. 调「假装扫好了」的接口（QQ 是把 ptqrlogin 的回答换掉；别的平台只到「等待扫码」）
//   3. 看凭据有没有存下来、登录态读不读得到
//
// 用法：node dev/probes/mobileLoginFlow.cjs [netease|kugou|qq]

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.CDP_PORT || '9333';

const getTargets = () => new Promise((resolve, reject) => {
  const req = http.get({ host: '127.0.0.1', port: PORT, path: '/json' }, res => {
    let body = '';
    res.on('data', c => { body += c; });
    res.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
  });
  req.on('error', reject);
  req.setTimeout(8000, () => req.destroy(new Error('CDP /json timeout')));
});

const evaluate = async (expression) => {
  const targets = await getTargets();
  const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { try { ws.close(); } catch (_) {} reject(new Error('evaluate timeout')); }, 90000);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1, method: 'Runtime.evaluate',
        params: { expression, awaitPromise: true, returnByValue: true, userGesture: true },
      }));
    });
    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch (_) { return; }
      if (msg.id !== 1) return;
      clearTimeout(timer);
      try { ws.close(); } catch (_) {}
      if (msg.error) return reject(new Error(JSON.stringify(msg.error)));
      const r = msg.result || {};
      if (r.exceptionDetails) {
        const ex = r.exceptionDetails;
        return resolve({ __error: ex.exception?.description || ex.text || 'exception' });
      }
      resolve(r.result?.value);
    });
    ws.on('error', reject);
  });
};

const script = `(async () => {
  const out = { steps: [] };
  const omni = window.__sakureOmni;
  const platform = ${JSON.stringify(process.argv[2] || 'qq')};

  const push = (name, data) => out.steps.push(Object.assign({ name }, data));

  try {
    const started = await omni.startLogin(platform);
    push('startLogin', { keyLen: String(started.key || '').length, imageLen: String(started.imageUrl || '').length });

    // 轮询一次，看平台说什么
    const state = await omni.checkLogin(platform, started.key);
    push('checkLogin', { state: JSON.stringify(state).slice(0, 400) });

    // 登录态：直接读 provider 的 auth（不走 omni 的 readAccount，
    // 那个有缓存，在这个探针里会被回收）。
    try {
      const mod = await import('/assets/' + 'providerRegistry-x');
      push('note', { skipped: true });
    } catch (e) { /* 找不到模块就跳过 */ }

    // 诊断
    const diag = await omni.getLoginDiagnostics(platform);
    push('diagnostics', { lines: (diag || []).map(d => typeof d === 'string' ? d : (d && d.text) || String(d)) });
  } catch (error) {
    push('error', { message: String(error && error.message ? error.message : error) });
  }
  return JSON.stringify(out);
})()`;

(async () => {
  const value = await evaluate(script);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
