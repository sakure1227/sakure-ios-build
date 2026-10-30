// 验证波点协议在真实网络下可用（用 Node 的 https.request 当 requestFactory ——
// 与桌面端同一套，所以这里能验证协议本身，而不只是包能不能跑）。
const { createBodianApi } = require('bodian-music-api');
const https = require('https');

const deviceId = require('crypto').randomBytes(16).toString('hex');

const sessions = {
    revision: 0,
    get: () => null,
    set: () => {},
    clear: () => {},
};

const api = createBodianApi({
    deviceId,
    sessions,
    now: () => Date.now(),
    requestFactory: (options, onResponse) => {
        const url = new URL(options.url);
        const req = https.request(url, { method: options.method }, onResponse);
        return req;
    },
});

const run = async () => {
    const tests = [
        ['search', { query: '周杰伦', limit: 5 }],
        ['login_status', {}],
        ['song_detail', { id: '123456' }],
    ];
    for (const [op, params] of tests) {
        try {
            const r = await api.request(op, params);
            if (r.ok) {
                const d = r.data;
                const summary = d && typeof d === 'object'
                    ? Object.keys(d).slice(0, 6).map(k => `${k}=${Array.isArray(d[k]) ? `[${d[k].length}]` : typeof d[k]}`).join(' ')
                    : typeof d;
                console.log(`✅ ${op}: ${summary}`);
            } else {
                console.log(`❌ ${op}: ${r.error?.code} — ${r.error?.message}`);
            }
        } catch (e) {
            console.log(`💥 ${op}: ${e?.code || ''} ${e?.message || String(e)}`);
        }
    }
};

run().then(() => process.exit(0));
