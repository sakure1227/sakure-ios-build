// 验证汽水代理：直接用 qishui-music-api + 一个真发请求的 fetch，
// 看 search / search_playlists 在真实网络下通不通。
// （手机版里 fetch 走 CsHttp，这里先用 Node 的 fetch 验证协议本身。）
const { createQishuiApi, createQishuiDeviceId } = require('qishui-music-api');

const deviceId = createQishuiDeviceId();
console.log('deviceId:', deviceId);

// 桌面端用 credentials: 'omit' —— 不带 cookie，账号靠包自己的头。
const nativeFetch = async (url, options = {}) => {
    const res = await fetch(url, {
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
        body: options.body,
        credentials: 'omit',
    });
    const text = await res.text();
    return {
        ok: res.ok,
        status: res.status,
        statusText: String(res.status),
        headers: { get: n => res.headers.get(n) },
        text: () => text,
        json: () => JSON.parse(text),
    };
};

const sessions = {
    deviceId,
    get: () => null,
    set: () => {},
    clear: () => {},
};

const api = createQishuiApi({ sessions, deviceId, fetch: nativeFetch, log: () => {}, warn: () => {} });

const run = async () => {
    const tests = [
        ['search', { query: '周杰伦', limit: 5 }],
        ['search_playlists', { query: '轻音乐', limit: 5 }],
        ['feed_modes', {}],
        ['login_status', {}],
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
                if (op === 'search' && d?.data?.songs) {
                    const s = d.data.songs[0];
                    console.log(`   第一首: ${s?.songName || s?.name || '?'} / ${s?.singer || s?.author || '?'}`);
                }
            } else {
                console.log(`❌ ${op}: ${r.error?.code} — ${r.error?.message}`);
            }
        } catch (e) {
            console.log(`💥 ${op}: ${e?.code || ''} ${e?.message || String(e)}`);
        }
    }
};

run().then(() => process.exit(0));
