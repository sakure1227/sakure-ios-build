// 在真机上问：WebView 能解开源脚本的压缩包吗？（三种格式各试一遍）
import { WebSocket } from 'ws';
import { request } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ADB = 'D:/toolchain/android-sdk/platform-tools/adb.exe';
const DEVICE = process.env.SAKURE_DEVICE || 'A4PLUT4B12016644';
const PORT = 9227;

try {
    const pid = execFileSync(ADB, ['-s', DEVICE, 'shell', 'pidof', 'top.izuna.sakure'], { encoding: 'utf8' }).trim().split(/\s+/)[0];
    execFileSync(ADB, ['-s', DEVICE, 'forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`], { stdio: 'ignore' });
} catch (error) {
    console.log('转发失败:', error.message);
}

const getJson = (path) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: Number(PORT), path, timeout: 8000 }, res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
});

const list = await getJson('/json/list');
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise(res => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
});
ws.on('message', raw => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});
await new Promise(r => ws.onopen = r);
await send('Runtime.enable');

const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return res?.exceptionDetails
        ? 'EXCEPTION: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text)
        : res?.result?.value;
};

const config = JSON.parse(readFileSync('D:/Users/Administrator/AppData/Roaming/Sakure/config.json', 'utf8'));
const raw = config.userSources[0].script;

const script = [
    '(async () => {',
    '  const raw = ' + JSON.stringify(raw) + ';',
    '  const bytes = Uint8Array.from(atob(raw.substring(3)), c => c.charCodeAt(0));',
    '  const tries = {};',
    '  for (const f of ["deflate", "deflate-raw", "gzip"]) {',
    '    try {',
    '      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(f));',
    '      const text = await new Response(stream).text();',
    '      tries[f] = "ok " + text.length;',
    '    } catch (e) { tries[f] = "ERR: " + e.message; }',
    '  }',
    '  return JSON.stringify(tries);',
    '})()',
].join('\n');

console.log('=== 解压能力（真机 WebView）===');
console.log(await evaluate(script));

ws.close();
process.exit(0);
