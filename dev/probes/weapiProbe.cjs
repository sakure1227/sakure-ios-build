// dev/probes/weapiProbe.cjs
// 在手机上测网易云 weapi：同一个 body 分别走「原生插件」与「fetch」两条路，看哪条能拿到回答。
//
// 用法：node dev/probes/weapiProbe.cjs

const http = require('http');
const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const forge = require('node-forge');

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

const IV = '0102030405060708';
const PRESET_KEY = '0CoJUm6Qyw8W8jud';
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;

const aesEncrypt = (text, key) => CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(text),
    CryptoJS.enc.Utf8.parse(key),
    { iv: CryptoJS.enc.Utf8.parse(IV), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
).toString();

const weapi = (data) => {
    let secretKey = '';
    for (let i = 0; i < 16; i += 1) secretKey += BASE62.charAt(Math.round(Math.random() * 61));
    return {
        params: aesEncrypt(aesEncrypt(JSON.stringify(data), PRESET_KEY), secretKey),
        encSecKey: forge.util.bytesToHex(
            forge.pki.publicKeyFromPem(PUBLIC_KEY).encrypt(secretKey.split('').reverse().join(''), 'NONE'),
        ),
    };
};

const payload = weapi({ type: 3 });
const body = new URLSearchParams({ params: payload.params, encSecKey: payload.encSecKey }).toString();

const script = `(async () => {
  const CsHttp = window.Capacitor?.Plugins?.CsHttp;
  const body = ${JSON.stringify(body)};
  const url = 'https://interface.music.163.com/weapi/login/qrcode/unikey';
  const out = {};
  try {
    const r = await CsHttp.request({
      url, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
      body,
    });
    out.plugin = { status: r.status, len: (r.data || '').length, data: (r.data || '').slice(0, 120), keys: Object.keys(r) };
  } catch (e) { out.pluginErr = String(e); }
  try {
    const r2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const t = await r2.text();
    out.fetch = { status: r2.status, len: t.length, text: t.slice(0, 120) };
  } catch (e) { out.fetchErr = String(e); }
  return JSON.stringify(out);
})()`;

(async () => {
  const value = await evaluate(script);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
})().catch(error => { console.error('FAILED:', error.message); process.exit(1); });
