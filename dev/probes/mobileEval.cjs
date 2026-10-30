// dev/probes/mobileEval.cjs
// 在手机的 WebView 里执行一段 JS 并把结果拿回来（走 CDP）。
//
// 用法：node dev/probes/mobileEval.cjs "<要执行的 JS 表达式>"
//   表达式在设备上求值，结果用 JSON 打印出来。

const http = require('http');

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

  const WebSocket = require('ws');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { try { ws.close(); } catch (_) {} reject(new Error('evaluate timeout')); }, 40000);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression,
          awaitPromise: true,
          returnByValue: true,
          userGesture: true,
        },
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
        const text = ex.exception?.description || ex.text || 'exception';
        return resolve({ __error: text });
      }
      resolve(r.result?.value);
    });
    ws.on('error', reject);
  });
  return result;
};

(async () => {
  const expression = process.argv[2];
  if (!expression) { console.error('usage: node mobileEval.cjs "<js>"'); process.exit(1); }
  try {
    const value = await evaluate(expression);
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  } catch (error) {
    console.error('EVAL FAILED:', error.message);
    process.exit(1);
  }
})();
