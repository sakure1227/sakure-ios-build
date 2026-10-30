// dev/probes/mobileNeteaseCheck.cjs
// 在手机上跑网易云的取码 → 轮询，把轮询的原始回答打出来。
//
// 「未知错误」多半出在轮询那一步（凭据在 Set-Cookie 里，而 Set-Cookie 是浏览器的禁止头）。
//
// 用法：node dev/probes/mobileNeteaseCheck.cjs

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

// 在页面里跑：自己做一遍 weapi（用应用打包的 crypto 不可得，所以用 WebCrypto 不行——
// RSA 只能用 node-forge）。改用应用的 provider 通路，但把 fetch 包一层看正文。
const script = `(async () => {
  const out = { steps: [] };
  const CsHttp = window.Capacitor?.Plugins?.CsHttp;

  // 应用里的 weapi 走 fetch（mobileFetchPatch 换过的那个）。我们包一层 window.fetch
  // 就能看到它发的正文与收到的回答 —— 但应用持有的是替换后的引用，包 window.fetch
  // 抓不到。所以这里直接用「应用自己的取码」，再自己发一次轮询（用应用的取码结果）。
  const omni = window.__sakureOmni;

  // 1) 让应用取码（它会用应用自己的 weapi）
  const started = await omni.startLogin('netease');
  out.steps.push({ name: 'startLogin', keyLen: String(started.key || '').length });
  const key = started.key;

  // 2) 用原生插件直接发轮询（绕开应用，这样能看到 set-cookie）
  //    但 weapi body 要自己算 —— 应用里那份算法在 main chunk 里，拿不到。
  //    所以这里改用 provider 的 checkLogin（它会用应用的 weapi），并读它的结果。
  try {
    const state = await omni.checkLogin('netease', key);
    out.steps.push({ name: 'checkLogin', state: JSON.stringify(state).slice(0, 300) });
  } catch (error) {
    out.steps.push({ name: 'checkLoginError', message: String(error && error.message ? error.message : error).slice(0, 300) });
  }

  // 3) 诊断
  try {
    const diag = await omni.getLoginDiagnostics('netease');
    out.steps.push({ name: 'diagnostics', lines: (diag || []).map(d => (d && d.text) || String(d)) });
  } catch (error) {
    out.steps.push({ name: 'diagError', message: String(error).slice(0, 200) });
  }
  return JSON.stringify(out);
})()`;

(async () => {
  const value = await evaluate(script);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
