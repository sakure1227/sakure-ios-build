// dev/probes/mobileNeteaseSim.cjs
// 在手机上给网易云的「检查扫码结果」喂一份假的平台回答（模拟 803 已授权），
// 看凭据有没有被存下来 —— 这一段是「登录成功但状态未登录」的那一环。
//
// 它不碰插件（插件对象是只读代理，包一层会坏），而是让应用自己的 provider 走一遍：
// 只把**平台那一侧**的回答换掉。
//
// 用法：node dev/probes/mobileNeteaseSim.cjs

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

const evaluate = async (expression, awaitResult = true) => {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page) throw new Error('no page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
    return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { try { ws.close(); } catch (_) {} reject(new Error('evaluate timeout')); }, 30000);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 1, method: 'Runtime.evaluate',
                params: { expression, awaitPromise: awaitResult, returnByValue: true, userGesture: true },
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

// \u628a\u539f\u751f\u63d2\u4ef6\u7684\u201c\u8bf7\u6c42\u201d\u6362\u6210\u8fd9\u4e2a\uff1a\u5b83\u53ea\u56de\u7b54\u300c\u5df2\u6388\u6743\u300d\u90a3\u4e00\u6b21\u3002
// \u6ce8\u610f\uff1a\u63d2\u4ef6\u5bf9\u8c61\u662f\u53ea\u8bfb\u4ee3\u7406\uff0c\u76f4\u63a5\u6539\u5b83\u7684\u65b9\u6cd5\u4f1a\u628a\u8bf7\u6c42\u53d1\u4e0d\u51fa\u53bb\u3002
// \u6240\u4ee5\u6539\u4e3a\u5f15\u64ce\u5c42\uff1a\u5148\u628a\u539f\u751f\u7684\u65b9\u6cd5\u53d6\u51fa\u6765\u5b58\u8fdb\u4e00\u4e2a\u53d8\u91cf\uff0c\u518d\u628a\u5b83\u8c03\u56de\u53bb\u3002
const script = `(() => {
  const CsHttp = window.Capacitor?.Plugins?.CsHttp;
  if (!CsHttp) return 'no CsHttp';
  const real = CsHttp.request;
  CsHttp.request = function (options) {
    const url = String(options.url || '');
    if (url.includes('login/qrcode/client/login')) {
      return Promise.resolve({
        status: 200,
        data: JSON.stringify({ code: 803, message: '授权登录成功', cookie: 'MUSIC_U=sim-music-u; __csrf=sim-csrf' }),
        headers: {},
        setCookie: 'MUSIC_U=sim-music-u; Max-Age=315360000; Path=/',
      });
    }
    return real(options);
  };
  return 'patched';
})()`;

const run = `(() => {
  window.__simResult = null;
  const omni = window.__sakureOmni;
  const Prefs = window.Capacitor?.Plugins?.Preferences;
  const out = { steps: [] };
  (async () => {
    try {
      const started = await omni.startLogin('netease');
      out.steps.push({ name: 'startLogin', keyLen: String(started.key || '').length });
      const state = await omni.checkLogin('netease', started.key);
      out.steps.push({ name: 'checkLogin', state: JSON.stringify(state).slice(0, 200) });
      const got = await Prefs.get({ key: 'sakure_cred_netease_cookie' });
      out.steps.push({ name: 'credentialStored', present: !!got.value, head: String(got.value || '').slice(0, 50) });
    } catch (error) {
      out.steps.push({ name: 'error', message: String(error && error.message ? error.message : error).slice(0, 240) });
    }
    window.__simResult = JSON.stringify(out);
  })();
  return 'started';
})()`;

(async () => {
    const patched = await evaluate(script);
    console.log('patch:', patched);
    await evaluate(run, false);
    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const value = await evaluate('window.__simResult || ""');
        if (value && value !== '""') {
            console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
            return;
        }
    }
    console.log('(超时，没拿到结果)');
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
