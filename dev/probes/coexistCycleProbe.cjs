// dev/probes/coexistCycleProbe.cjs
// 共存播放的**归因**探针：搞清楚「pause/play 无限循环」到底是谁发起的。
//
// 真机实测（`coexistAudioProbe.cjs`）抓到的现象是焦点被抢后出现高频循环：
//
// ```
// 25358 pause   25359 play   25360 playing
// 25370 pause   25370 play   25370 playing
// ... 15 秒 567 次
// ```
//
// 每次循环都让解码器重启一次 —— 听起来就是「电流声」+「卡卡的」。
//
// 但**光看事件看不出是谁发起的**：`<audio>` 的 `pause` 事件既可能是
// Chromium 的 delegate 收到焦点丢失后从**原生层**暂停的（JS 栈是空的），
// 也可能是**我们自己的 JS 代码**调了 `pause()`（有 JS 栈）。
//
// 这个探针把 `play` / `pause` **包起来**，每次调用都记下 JS 调用栈 —— 于是能分清：
//
// - 栈里有我们的代码 → 是我们自己弄的；
// - 栈是空的 → 原生层（焦点）弄的。
//
// 用法：node dev/probes/coexistCycleProbe.cjs

const http = require('http');
const { execFileSync } = require('child_process');
const { WebSocket } = require('ws');

const PORT = Number(process.env.CDP_PORT || 9222);

const httpGet = (p) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
    }).on('error', reject);
});

const ensureForward = () => {
    const adb = process.env.ADB_PATH || 'C:/workbuddy-tools/android-sdk/platform-tools/adb.exe';
    try {
        const unix = execFileSync(adb, ['shell', 'cat', '/proc/net/unix'], { encoding: 'utf8', timeout: 15000 });
        const match = unix.match(/webview_devtools_remote_(\d+)/);
        if (!match) return;
        execFileSync(adb, ['forward', '--remove-all'], { timeout: 15000 });
        execFileSync(adb, ['forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${match[1]}`], { timeout: 15000 });
        console.log('转发已建立');
    } catch (error) {
        console.warn('建立转发失败:', error.message);
    }
};

const main = async () => {
    ensureForward();
    await new Promise((r) => setTimeout(r, 1200));

    const list = JSON.parse(await httpGet('/json/list'));
    const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page) {
        console.error('找不到可调试的页面');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
    let nextId = 1;
    const pending = new Map();

    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });

    const evaluate = async (expression) => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'eval failed');
        return result.result.value;
    };

    await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
    ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(JSON.stringify(msg.error)));
            else resolve(msg.result);
        }
    });

    await send('Runtime.enable');

    // 把 play/pause 包起来，记下每次调用的 JS 栈。
    const setup = `
        window.__cycle = { calls: [], events: [] };
        (() => {
            const audios = [...document.querySelectorAll('audio')];
            window.__cycle.audios = audios;
            audios.forEach((audio, idx) => {
                ['play', 'pause'].forEach((name) => {
                    const original = audio[name].bind(audio);
                    audio[name] = function (...args) {
                        const stack = (new Error().stack || '')
                            .split('\\n')
                            .slice(1, 6)
                            .map((line) => line.trim())
                            .filter((line) => !line.includes('__cycle'))
                            .join(' | ');
                        window.__cycle.calls.push({
                            idx, name, t: Date.now(),
                            ct: Math.round(audio.currentTime * 1000) / 1000,
                            stack: stack || '(原生层 —— 没有 JS 栈)',
                        });
                        return original(...args);
                    };
                });
                ['pause', 'playing', 'waiting', 'stalled'].forEach((name) => {
                    audio.addEventListener(name, () => {
                        window.__cycle.events.push({
                            idx, name, t: Date.now(),
                            ct: Math.round(audio.currentTime * 1000) / 1000,
                            rs: audio.readyState,
                        });
                    });
                });
            });
        })();
        'ok';
    `;
    console.log('安装:', await evaluate(setup));

    console.log('\n=== 现在去另一个应用让声音响起来 ===');
    console.log('（采样 30 秒）\n');

    for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const s = await evaluate(`
            (() => {
                const c = window.__cycle;
                const a = c?.audios?.[0];
                return JSON.stringify({
                    calls: c?.calls?.length || 0,
                    events: c?.events?.length || 0,
                    paused: a?.paused, ct: a ? Math.round(a.currentTime * 100) / 100 : null,
                });
            })()
        `);
        console.log(`T${i * 2}s ${s}`);
    }

    const calls = JSON.parse(await evaluate('JSON.stringify(window.__cycle?.calls || [])'));
    console.log(`\n=== play/pause 调用共 ${calls.length} 次，按调用栈归类 ===`);
    const bySignature = new Map();
    calls.forEach((c) => {
        const key = `${c.name} :: ${c.stack}`;
        if (!bySignature.has(key)) bySignature.set(key, { count: 0, first: c.t, last: c.t, sample: c });
        const entry = bySignature.get(key);
        entry.count++;
        entry.last = c.t;
    });
    [...bySignature.values()]
        .sort((a, b) => b.count - a.count)
        .forEach((e) => {
            console.log(`\n次数=${e.count}  跨度=${e.last - e.first}ms`);
            console.log(`  ${e.sample.name} @ ct=${e.sample.ct}`);
            console.log(`  栈: ${e.sample.stack}`);
        });

    ws.close();
};

main().catch((error) => {
    console.error('探针失败:', error);
    process.exit(1);
});
