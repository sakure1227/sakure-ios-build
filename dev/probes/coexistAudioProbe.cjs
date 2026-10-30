// dev/probes/coexistAudioProbe.cjs
// 共存播放的**离线**探针。
//
// 在页面里合成一段 WAV（不联网），挂到 `<audio>` 上放起来，然后盯着这个元素的状态
// 变化 —— 用来回答一个问题：
//
// > **系统把音频焦点抢走时，Chromium 对 `<audio>` 到底做了什么？**
//
// 三种可能，恢复策略各不相同：
//
// | 观察到的 | 含义 | 恢复该怎么做 |
// |---|---|---|
// | 只是 `paused`，`readyState` 还 >= 2 | 源还在，解码器活着 | 直接 `play()`，声音连续 |
// | `readyState` 掉到 0 / `emptied` | 源被丢弃了 | 必须重新 `load()` + `seek()`，否则爆音 |
// | 元素被 `pause` 后再没反应 | Chromium 彻底放手了 | 要重建元素 |
//
// 用法：node dev/probes/coexistAudioProbe.cjs
//
// 需要 CDP 转发：
//   adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>

const http = require('http');
const path = require('path');
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

/**
 * 自己把 adb 的转发建好。
 *
 * 不能假设外面已经建好了 —— adb server 会被别的命令重启（`adb devices` 就会），
 * 转发随之失效，探针连不上。这个脚本自己查 socket 名再转发，就稳了。
 */
const ensureForward = () => {
    const adb = process.env.ADB_PATH
        || 'C:/workbuddy-tools/android-sdk/platform-tools/adb.exe';
    try {
        const unix = execFileSync(adb, ['shell', 'cat', '/proc/net/unix'], {
            encoding: 'utf8',
            timeout: 15000,
        });
        const match = unix.match(/webview_devtools_remote_(\d+)/);
        if (!match) {
            console.warn('没找到 WebView 的 devtools socket（页面加载了吗？）');
            return;
        }
        const socket = `webview_devtools_remote_${match[1]}`;
        execFileSync(adb, ['forward', '--remove-all'], { timeout: 15000 });
        execFileSync(adb, ['forward', `tcp:${PORT}`, `localabstract:${socket}`], { timeout: 15000 });
        console.log(`转发: tcp:${PORT} -> ${socket}`);
    } catch (error) {
        console.warn('建立转发失败（也许外面已经建好了）:', error.message);
    }
};

const main = async () => {
    ensureForward();
    await new Promise((r) => setTimeout(r, 1200));

    const list = JSON.parse(await httpGet('/json/list'));
    const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page) {
        console.error('找不到可调试的页面（CDP 转发建好了吗？）');
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
        const result = await send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
        });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.text || 'eval failed');
        }
        return result.result.value;
    };

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

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

    // 装观察者 + 合成一段 3 秒的 440Hz WAV 挂上去放。
    const setup = `
        (async () => {
            window.__coexist = { events: [] };
            const audios = [...document.querySelectorAll('audio')];
            const audio = audios[0];
            if (!audio) return 'no-audio';
            window.__coexist.audio = audio;
            const NAMES = ['pause','play','playing','waiting','stalled','emptied','suspend','loadstart','canplay','error','seeking','seeked'];
            NAMES.forEach((name) => {
                audio.addEventListener(name, () => {
                    window.__coexist.events.push({
                        name, t: Date.now(),
                        ct: Math.round(audio.currentTime * 1000) / 1000,
                        rs: audio.readyState, ns: audio.networkState,
                        paused: audio.paused, err: audio.error ? audio.error.code : null,
                    });
                });
            });

            // 合成 3 秒 440Hz 的 16bit 单声道 WAV（44.1kHz）—— 不联网。
            const rate = 44100, seconds = 3;
            const samples = rate * seconds;
            const buf = new ArrayBuffer(44 + samples * 2);
            const view = new DataView(buf);
            const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
            writeStr(0, 'RIFF');
            view.setUint32(4, 36 + samples * 2, true);
            writeStr(8, 'WAVE');
            writeStr(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, rate, true);
            view.setUint32(28, rate * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeStr(36, 'data');
            view.setUint32(40, samples * 2, true);
            for (let i = 0; i < samples; i++) {
                const v = Math.sin((2 * Math.PI * 440 * i) / rate) * 0.3;
                view.setInt16(44 + i * 2, v * 32767, true);
            }
            const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
            audio.src = url;
            audio.loop = true;
            await audio.play().catch((e) => 'playerr:' + e.message);
            return 'started paused=' + audio.paused + ' rs=' + audio.readyState;
        })()
    `;
    console.log('准备:', await evaluate(setup));

    const snap = async (label) => {
        const s = await evaluate(`
            (() => {
                const a = window.__coexist?.audio;
                if (!a) return 'gone';
                return JSON.stringify({
                    paused: a.paused, ct: Math.round(a.currentTime * 1000) / 1000,
                    rs: a.readyState, ns: a.networkState,
                    err: a.error ? a.error.code : null, ended: a.ended,
                });
            })()
        `);
        console.log(`[${label}] ${s}`);
        return s;
    };

    await snap('播放中');

    console.log('\n=== 现在去另一个应用让声音响起来（抖音/网易云等）===');
    console.log('（采样 30 秒）\n');

    for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await snap(`T${i * 2}s`);
    }

    const events = await evaluate('JSON.stringify(window.__coexist?.events || [])');
    console.log('\n=== 事件序列 ===');
    JSON.parse(events).forEach((e) => {
        console.log(`${String(e.t).slice(-5)} ${e.name.padEnd(10)} ct=${e.ct} rs=${e.rs} ns=${e.ns} paused=${e.paused} err=${e.err}`);
    });

    ws.close();
};

main().catch((error) => {
    console.error('探针失败:', error);
    process.exit(1);
});
