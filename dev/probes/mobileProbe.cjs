// dev/probes/mobileProbe.cjs
// 在手机上跑一段 JS 并把结果拿回来（走 CDP）。
//
// 它自己负责把 adb 的端口转接接好 —— 中途 adb daemon 重启会让转接失效，
// 分成两条命令跑常常就连不上了。
//
// 用法：node dev/probes/mobileProbe.cjs "<要执行的 JS 表达式>"

const http = require('http');
const { execSync } = require('child_process');

const PORT = process.env.CDP_PORT || '9333';
const ADB = process.env.ADB || 'C:/workbuddy-tools/android-sdk/platform-tools/adb.exe';
const DEVICE = process.env.ADB_DEVICE || 'A4PLUT4B12016644';

const sh = (cmd) => {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
};

/** 把 CDP 接到手机的 WebView 上（daemon 重启过就重连一次）。 */
const connectCdp = () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const pid = sh(`"${ADB}" -s ${DEVICE} shell pidof top.izuna.sakure`);
        if (pid) {
            sh(`"${ADB}" -s ${DEVICE} forward --remove-all`);
            sh(`"${ADB}" -s ${DEVICE} forward tcp:${PORT} localabstract:webview_devtools_remote_${pid}`);
            const version = sh(`curl -s --max-time 6 http://127.0.0.1:${PORT}/json/version`);
            if (version) return true;
        }
        sh(`"${ADB}" start-server`);
    }
    return false;
};

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
    const WebSocket = require('ws');
    const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
    return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { try { ws.close(); } catch (_) {} reject(new Error('evaluate timeout')); }, 120000);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 1, method: 'Runtime.evaluate',
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

/**
 * 在页面里跑一段代码。
 *
 * `awaitResult: false` 时不等它的 promise —— CDP 会回收没被引用的 promise，
 * 于是那些 promise 里的结果就丢了。异步的活儿要靠它自己把结果放进全局变量。
 */
const run = async (expression, awaitResult = true) => {
    if (!connectCdp()) throw new Error('could not connect to the device');
    return await evaluate(expression);
};

(async () => {
    const expression = process.argv[2];
    if (!expression) {
        console.error('usage: node mobileProbe.cjs "<js>"');
        process.exit(1);
    }
    try {
        const value = await run(expression);
        console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    } catch (error) {
        console.error('EVAL FAILED:', error.message);
        process.exit(1);
    }
})();
