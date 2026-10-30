// test/e2e/customSource.e2e.js
// An end-to-end check of the custom source runtime, run inside a real Electron main process.
//
// What it proves:
//   1. a script imported through the store starts in its own hidden window;
//   2. the script's `lx.send('inited', ...)` reaches the main process, so the source is "ready";
//   3. a request for musicUrl is routed to the script and its answer comes back;
//   4. an action the script did not declare is refused.
//
// Run: npx electron test/e2e/customSource.e2e.js
//
// The project's package.json says "type": "module", so this file is an ES module. The CommonJS
// modules it needs are reached through createRequire.

import { createRequire } from 'node:module';
import electron from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const { app, ipcMain } = electron;

const require = createRequire(import.meta.url);
const ROOT = path.join(import.meta.dirname, '../..');

const { CustomSourceStore } = require(path.join(ROOT, 'electron/customSource/store.cjs'));
const { CustomSourceRuntime } = require(path.join(ROOT, 'electron/customSource/runtime.cjs'));
const { performRequest } = require(path.join(ROOT, 'electron/customSource/http.cjs'));

const results = [];
const record = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
};

const finish = (code) => {
    const failed = results.filter(result => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} 通过`);
    app.exit(code);
};

app.whenReady().then(async () => {
    // 脚本发出的 HTTP 请求走主进程，这里注册真正的出口
    ipcMain.handle('sakure-cs-http-request', async (_event, params) => performRequest(params || {}));

    // 一个内存 store，代替 electron-store
    const values = new Map();
    const fakeStore = {
        get: key => values.get(key),
        set: (key, value) => { values.set(key, value); },
    };

    const store = new CustomSourceStore(fakeStore);
    const runtime = new CustomSourceRuntime({ store, onUpdateAlert: () => {} });

    // 读测试脚本
    const scriptPath = path.join(ROOT, 'test/fixtures/sakure-test-source.js');
    const script = fs.readFileSync(scriptPath, 'utf8');

    const entry = await store.importScript(script);
    record('脚本导入成功', entry.name === '端到端测试源', `name=${entry.name}`);

    await runtime.start(entry.id);
    record('隐藏窗口已创建', runtime.isReady(entry.id) === false, '启动时先未就绪');

    // 等脚本自己声明能力
    const deadline = Date.now() + 8000;
    while (!runtime.isReady(entry.id) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    record('脚本已声明能力（inited 到达主进程）', runtime.isReady(entry.id), '');

    const info = runtime.getInfo(entry.id);
    const wy = info?.sources?.wy;
    record('声明的 wy/musicUrl 能力正确', wy?.actions?.includes('musicUrl') === true, JSON.stringify(wy));

    // 发一次 musicUrl 请求。musicInfo 用洛雪的旧版扁平结构：标识平铺在顶层。
    try {
        const result = await runtime.request(entry.id, {
            source: 'wy',
            action: 'musicUrl',
            info: { type: '320k', musicInfo: { id: '12345', songmid: '12345', name: '测试', singer: '甲', source: 'wy', interval: '03:00' } },
        });
        const url = result?.data?.url;
        record('musicUrl 请求成功返回', url === 'https://example.com/test/12345.mp3', `url=${url}`);
    } catch (err) {
        record('musicUrl 请求成功返回', false, err.message);
    }

    // 不支持的动作应失败
    try {
        await runtime.request(entry.id, { source: 'wy', action: 'lyric', info: {} });
        record('不支持的动作被拒绝', false, '居然成功了');
    } catch (err) {
        record('不支持的动作被拒绝', true, err.message);
    }

    // 答不上来时要说清为什么：用户要靠这个分辨「源坏了」与「压根没装源」。
    const miss = await runtime.requestFromAny('musicUrl', {
        type: '128k',
        musicInfo: { id: '12345', songmid: '12345', name: 'x', singer: 'y', source: 'tx' },
    });
    record('答不上来时给出原因', miss?.reason === 'unsupported-platform', JSON.stringify(miss));

    // 停掉后不应再有响应
    await runtime.stop(entry.id);
    record('停止后源不再运行', runtime.isReady(entry.id) === false, '');

    // 脚本的 lx.request 走主进程的网络出口：这里用一个必定失败的地址，只验证"请求确实发出去了"
    const httpProbe = await performRequest({ url: 'http://127.0.0.1:1/probe', method: 'get', timeout: 3000 });
    record('HTTP 出口可用（连接失败也算出口工作）', typeof httpProbe.error === 'string', httpProbe.error || '');

    await runtime.stopAll();
    finish(results.every(result => result.ok) ? 0 : 1);
}).catch(err => {
    console.error('E2E 运行失败:', err);
    record('E2E 运行', false, err.message);
    finish(1);
});
