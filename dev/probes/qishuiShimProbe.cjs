// 在 Node 里精确模拟「浏览器环境」：把 `node:crypto` 换成手机版的 shim，
// 然后调汽水的搜索 —— 看真实异常是什么。
//
// 浏览器里 shim 会被 Vite 的 alias 顶掉；这里用 Module._load 拦截同样的效果。
const Module = require('module');
const md5 = require('blueimp-md5');
const { Buffer } = require('buffer');

// ── 手机版的 node:crypto shim（与 mobile/src/nodeCryptoShim.ts 同一套逻辑）────
const createHash = (algorithm) => {
    const name = String(algorithm).toLowerCase();
    if (name !== 'md5') {
        throw new Error(`nodeCryptoShim: unsupported hash algorithm "${algorithm}" (only md5 is implemented)`);
    }
    let buffer = '';
    const hash = {
        update(data) { buffer += typeof data === 'string' ? data : String(data); return hash; },
        digest() { return md5(buffer); },
    };
    return hash;
};
const randomBytes = (size) => {
    const bytes = Buffer.alloc(size);
    require('crypto').webcrypto.getRandomValues(bytes);
    return bytes;
};
const unavailable = (api) => {
    throw new Error(`nodeCryptoShim: crypto.${api} is not available in the renderer.`);
};
const shim = {
    createHash,
    randomBytes,
    createPrivateKey: () => unavailable('createPrivateKey'),
    generateKeyPairSync: () => unavailable('generateKeyPairSync'),
    sign: () => unavailable('sign'),
    randomUUID: () => require('crypto').randomUUID(),
};

// ── 拦截 node:crypto ──
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'node:crypto') return shim;
    return originalLoad.apply(this, arguments);
};

const { createQishuiApi, createQishuiDeviceId } = require('qishui-music-api');

const deviceId = createQishuiDeviceId();
console.log('deviceId:', deviceId);

// 「浏览器版」的 fetch 行为：忽略 redirect 与 credentials（浏览器里 cross-origin
// 请求本来就带不了 cookie，而 redirect 被包设成 'error'）。
// 与 Node 的 fetch 的差别就这两处 —— 如果这一版也成功，那浏览器里的失败就是 CORS。
const nativeFetch = async (url, options = {}) => {
    const res = await fetch(url, {
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
        body: options.body,
    });
    const text = await res.text();
    return {
        ok: res.ok, status: res.status, statusText: String(res.status),
        headers: { get: n => res.headers.get(n) },
        text: () => text,
        json: () => JSON.parse(text),
    };
};

const sessions = {
    deviceId,
    revision: 0,
    get: () => null,
    set: () => {},
    clear: () => {},
};

const api = createQishuiApi({ sessions, deviceId, fetch: nativeFetch, log: () => {}, warn: () => {} });

const run = async () => {
    for (const [op, params] of [['search', { query: '周杰伦', limit: 5 }], ['login_status', {}]]) {
        try {
            const r = await api.request(op, params);
            if (r.ok) console.log(`✅ ${op}:`, JSON.stringify(r.data).slice(0, 160));
            else console.log(`❌ ${op}: code=${r.error?.code} message=${r.error?.message}`);
        } catch (e) {
            console.log(`💥 ${op}:`, e?.message || String(e));
            console.log('   stack:', (e?.stack || '').split('\n').slice(1, 4).join('\n        '));
        }
    }
};

run().then(() => process.exit(0));
