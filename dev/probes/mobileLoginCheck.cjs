// dev/probes/mobileLoginCheck.cjs
// 真机上的登录自检：走应用自己的代码路径，检查每个平台的登录第一步能不能走通。
//
// 用法：
//   1. 应用已启动，且已用 adb forward 把 CDP 连到 9333
//   2. node dev/probes/mobileLoginCheck.cjs
//
// 它做的是「起一次登录、拿到二维码、然后把会话丢掉」—— 不会登录任何账号，
// 只是确认协议的第一段在真机上通。

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
    const timer = setTimeout(() => { try { ws.close(); } catch (_) {} reject(new Error('evaluate timeout')); }, 60000);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
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

const SCRIPT = `(async () => {
  const out = {};
  const omni = window.__sakureOmni;
  if (!omni) return JSON.stringify({ fatal: 'window.__sakureOmni is not there' });

  const platforms = [
    { id: 'netease', label: 'NetEase' },
    { id: 'kugou', label: 'KuGou' },
    { id: 'qq', label: 'QQMusic' },
  ];

  for (const p of platforms) {
    const one = { platform: p.label };
    try {
      // omni.startLogin 一步就给了 key 与二维码（见 omni.ts 的 startLogin）。
      const result = await omni.startLogin(p.id);
      const key = result && result.key;
      const image = result && result.imageUrl;
      one.keyLen = String(key || '').length;
      one.qrImage = typeof image === 'string' && image.startsWith('data:image/')
        ? { ok: true, kind: image.slice(5, image.indexOf(';')), bytes: image.length }
        : { ok: false, head: String(image || '').slice(0, 60) };
    } catch (error) {
      one.error = String(error && error.message ? error.message : error);
    }
    out[p.id] = one;
  }
  return JSON.stringify(out);
})()`;

(async () => {
  try {
    const value = await evaluate(SCRIPT);
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    console.log(JSON.stringify(parsed, null, 2));
    const failures = Object.entries(parsed).filter(([, v]) => v && (v.error || (v.qrImage && !v.qrImage.ok) || v.qrError));
    if (failures.length) {
      console.log('\n有失败的平台：');
      for (const [id, v] of failures) console.log(' -', id, JSON.stringify(v));
      process.exit(1);
    }
    console.log('\n三个平台的登录第一步都通了。');
  } catch (error) {
    console.error('CHECK FAILED:', error.message);
    process.exit(1);
  }
})();
