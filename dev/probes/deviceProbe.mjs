// 在真机上问几个问题：源起来了吗？搜得到歌吗？拿得到地址吗？
//
// 用 Chrome DevTools 协议连进手机上的 WebView（debug 版才开这个口）。
// 这比截图看得多 —— 能直接问「它到底工作到哪一步了」。
import { WebSocket } from 'ws';

const PORT = process.argv[2] || '9224';

// 用 node 的 http 拿目标列表（fetch 在这台机器上会被代理环境搅乱）。
import { request } from 'node:http';

const getJson = (path) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: Number(PORT), path, timeout: 8000 }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
        });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.end();
});

const list = await getJson('/json/list');
const page = list.find(t => t.type === 'page');
if (!page) { console.log('没有页面目标'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const logs = [];
const send = (method, params = {}) => new Promise(res => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
});
ws.on('message', raw => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled') {
        logs.push(`[${m.params.type}] ` + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
        logs.push('[EXCEPTION] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    }
});
await new Promise(r => ws.onopen = r);
await send('Runtime.enable');

const evaluate = async (expr, timeout = 40000) => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res?.exceptionDetails) return 'EXCEPTION: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    return res?.result?.value;
};

console.log('=== 窗口尺寸（横屏？）===');
console.log(await evaluate(`JSON.stringify({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    screen: screen.width + 'x' + screen.height,
})`));

console.log('\n=== 源的状态 ===');
console.log(await evaluate(`(async () => {
    const api = window.electron?.customSource;
    if (!api) return 'no customSource bridge';
    const list = await api.list();
    return JSON.stringify(list.map(e => ({
        name: e.name,
        version: e.version,
        running: e.running,
        error: e.error ?? null,
        platforms: e.sources ? Object.keys(e.sources) : null,
    })), null, 1);
})()`));

console.log('\n=== 搜索（落雪的聚合搜索）===');
console.log(await evaluate(`(async () => {
    const omni = window.__sakureOmni;
    if (!omni) return 'no omni';
    try {
        const p = await omni.searchSongs('海阔天空', 5, 0);
        return JSON.stringify({
            total: p.total,
            count: p.items?.length,
            first: p.items?.[0] ? {
                name: p.items[0].name,
                artists: p.items[0].artists?.map(a => a.name),
                provider: p.items[0].sourceRef?.providerId,
            } : null,
        }, null, 1);
    } catch (e) {
        return 'ERR: ' + (e?.message || e);
    }
})()`));

console.log('\n=== 问源要一个播放地址 ===');
console.log(await evaluate(`(async () => {
    const api = window.electron?.customSource;
    const list = await api.list();
    const entry = list.find(e => e.running);
    if (!entry) return '没有跑起来的源';
    try {
        const answer = await api.requestFromAny('musicUrl', {
            source: 'wy',
            type: '128k',
            musicInfo: { id: 347230, songmid: '347230', name: '海阔天空', singer: 'Beyond', interval: '4:40', albumName: 'The Line of Best Fit' },
        });
        return JSON.stringify(answer, null, 1).slice(0, 600);
    } catch (e) {
        return 'ERR: ' + (e?.message || e);
    }
})()`));

console.log('\n=== 控制台（最后 12 条）===');
console.log(logs.slice(-12).join('\n') || '(空)');

ws.close();
process.exit(0);
