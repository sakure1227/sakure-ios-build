// dev/probes/mobileLoginMock.cjs
// 在手机上「假装」平台说「已授权」，看凭据有没有存下来、登录态读不读得到。
//
// 它把原生插件的返回拦下来，换成平台在「已授权」时会给的那份回答 ——
// 于是整条链路（拿到凭据 → 加密存盘 → 读回来 → 读登录态）都能在没人扫码的情况下验一遍。
//
// 用法：node dev/probes/mobileLoginMock.cjs [netease|kugou|qq]

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.CDP_PORT || '9333';
const PLATFORM = process.argv[2] || 'netease';

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

/** 在页面里跑一段代码。`awaitResult: false` 时不等 promise（CDP 会回收未引用的 promise）。 */
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

const MOCKS = {
    netease: {
        matchUrl: 'login/qrcode/client/login',
        body: JSON.stringify({ code: 803, message: '授权登录成功', cookie: 'MUSIC_U=mock-music-u-123; __csrf=mock-csrf' }),
        setCookie: 'MUSIC_U=mock-music-u-123; Max-Age=315360000; Path=/',
    },
    kugou: {
        matchUrl: 'get_userinfo_qrcode',
        body: JSON.stringify({
            data: { status: 4, token: 'mock-kg-token', userid: 'mock-kg-user', dfid: 'mock-kg-dfid', nickname: '测试用户' },
            status: 1, error_code: 0,
        }),
        setCookie: '',
    },
    qq: {
        matchUrl: 'ptqrlogin',
        body: "ptuiCB('0','0','https://ptlogin2.graph.qq.com/check_sig?uin=0&ptsig=mock','0','登录成功！','测试用户')",
        setCookie: 'skey=mock-skey; p_uin=o0123456789; p_skey=mock-pskey; p_ticket=mock-ticket',
    },
};

const mock = MOCKS[PLATFORM];
if (!mock) {
    console.error('unknown platform:', PLATFORM);
    process.exit(1);
}

// 1) 把原生插件的返回换掉
const hook = `(() => {
  const CsHttp = window.Capacitor?.Plugins?.CsHttp;
  if (!CsHttp) return 'no CsHttp';
  if (!CsHttp.__origRequest) CsHttp.__origRequest = CsHttp.request.bind(CsHttp);
  CsHttp.request = async (options) => {
    const url = String(options.url || '');
    if (url.includes(${JSON.stringify(mock.matchUrl)})) {
      return { status: 200, data: ${JSON.stringify(mock.body)}, headers: {}, setCookie: ${JSON.stringify(mock.setCookie)} };
    }
    return CsHttp.__origRequest(options);
  };
  return 'hooked';
})()`;

// 2) 跑完整流程，结果放全局
const run = `(() => {
  window.__mockResult = null;
  const omni = window.__sakureOmni;
  const platform = ${JSON.stringify(PLATFORM)};
  const Prefs = window.Capacitor?.Plugins?.Preferences;
  const out = { steps: [] };

  (async () => {
    try {
      const started = await omni.startLogin(platform);
      out.steps.push({ name: 'startLogin', keyLen: String(started.key || '').length });

      const state = await omni.checkLogin(platform, started.key);
      out.steps.push({ name: 'checkLogin', state: JSON.stringify(state).slice(0, 220) });

      const got = await Prefs.get({ key: 'sakure_cred_' + platform + '_cookie' });
      out.steps.push({ name: 'credentialStored', present: !!got.value, head: String(got.value || '').slice(0, 44) });

      try {
        const diag = await omni.getLoginDiagnostics(platform);
        out.steps.push({ name: 'diagnostics', lines: (diag || []).map(d => (d && d.text) || String(d)) });
      } catch (e) {
        out.steps.push({ name: 'diagError', message: String(e).slice(0, 120) });
      }
    } catch (error) {
      out.steps.push({ name: 'error', message: String(error && error.message ? error.message : error).slice(0, 260) });
    }
    window.__mockResult = JSON.stringify(out);
  })();
  return 'started';
})()`;

(async () => {
    await evaluate(hook);
    await evaluate(run, false);
    for (let i = 0; i < 25; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const value = await evaluate('window.__mockResult || ""');
        if (value && value !== '""') {
            console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
            return;
        }
    }
    console.log('(超时，没拿到结果)');
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
