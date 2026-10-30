// dev/probes/mobileForge.cjs
// 在手机上验证 node-forge 的 RSA 与 crypto-js 的 AES 是不是好的。
//
// 应用把它们打包进了 main chunk，没有模块导出可 import。所以这里换个办法：
// 让**应用自己**把算出来的 weapi 交出来 —— 通过一个临时的全局钩子。
//
// 用法：node dev/probes/mobileForge.cjs

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

// 从 main chunk 里抠出 crypto-js 与 forge 的内部引用不太现实。
// 换个角度：**看应用算出来的 body 长什么样**。
// 我们让应用调 provider 的 startLogin，然后在原生层抓它发出去的正文 ——
// 用一个「拦截 fetch 与插件调用」的办法：临时把 CsHttp.request 包一层。
const script = `(async () => {
  const out = {};
  const CsHttp = window.Capacitor?.Plugins?.CsHttp;
  if (!CsHttp) return JSON.stringify({ err: 'no CsHttp' });

  const original = CsHttp.request.bind(CsHttp);
  const seen = [];
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const body = init && init.body ? String(init.body) : '';
    const result = await originalFetch(input, init);
    if (url.includes('music.163.com')) {
      let text = '';
      try { text = await result.clone().text(); } catch (e) {}
      seen.push({ via: 'fetch', url: url.slice(-42), bodyHead: body.slice(0, 90), bodyLen: body.length, status: result.status, text: text.slice(0, 140) });
    }
    return result;
  };
  CsHttp.request = async (options) => {
    const result = await original(options);
    if (String(options.url || '').includes('music.163.com')) {
      seen.push({
        url: String(options.url).slice(-40),
        bodyHead: String(options.body || '').slice(0, 90),
        bodyLen: String(options.body || '').length,
        status: result.status,
        data: String(result.data || '').slice(0, 120),
        dataLen: String(result.data || '').length,
      });
    }
    return result;
  };

  try {
    await window.__sakureOmni.startLogin('netease');
    out.called = true;
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }
  CsHttp.request = original;
  window.fetch = originalFetch;
  out.seen = seen;
  return JSON.stringify(out);
})()`;

(async () => {
  const value = await evaluate(script);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
