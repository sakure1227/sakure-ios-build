// dev/probes/mobileWeapi.cjs
// 在手机上跑一遍应用用的那套 weapi（crypto-js + node-forge），并把它算出来的 body 发给网易云。
// 目的：分清是「算错了」还是「发出去被拒」。
//
// 用法：node dev/probes/mobileWeapi.cjs

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

// 在页面里跑：自己实现一遍 weapi（与应用同一套算法），再发给网易云。
const script = `(async () => {
  const out = {};
  try {
    // 应用打包后 crypto-js 与 node-forge 都在 main chunk 里，拿不到模块导出。
    // 所以这里用 WebCrypto 不行（AES-CBC 可以，RSA 不行），改为：
    // 直接调用应用的 provider 拿它算出来的结果 —— 用 window.__sakureOmni 的 startLogin。
    // 但它失败时不给细节，所以这里抓原生那次请求的正文。
    const CsHttp = window.Capacitor?.Plugins?.CsHttp;

    // 1) 用应用自己那条路（provider 的 request），但我们看不到它的 body。
    // 2) 所以退一步：看网易云对「一个格式正确但内容随机」的 body 回什么。
    //    如果回「参数错误」，说明应用的 body 被判为无效；如果回 code:200，说明是内容问题。
    const bogus = new URLSearchParams({ params: 'x'.repeat(64), encSecKey: 'y'.repeat(256) }).toString();
    const r = await CsHttp.request({
      url: 'https://interface.music.163.com/weapi/login/qrcode/unikey',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bogus,
    });
    out.bogus = { status: r.status, data: (r.data || '').slice(0, 160), len: (r.data || '').length };
  } catch (e) { out.err = String(e); }
  return JSON.stringify(out);
})()`;

(async () => {
  const value = await evaluate(script);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
