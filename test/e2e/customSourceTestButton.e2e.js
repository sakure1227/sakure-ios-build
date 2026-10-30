// test/e2e/customSourceTestButton.e2e.js
// 端到端：装在应用里的真源，用设置页「测试」按钮那套参数，问它要一个地址。
//
// 为什么要有这个：设置页的「测试」按钮是给用户判断「我装的源还活着吗」用的。
// 它之前问的是一首不存在的歌（名字就叫 "test"），源照实回答「没这首歌」——
// 于是按钮永远显示失败，而源其实是好的。这个脚本用真源验一遍按钮问的那几首歌，
// 确认源真的答得上来。
//
// 跑法：npx electron test/e2e/customSourceTestButton.e2e.js
//
// 项目的 package.json 说 "type": "module"，所以这个文件是 ES module；
// CommonJS 的模块用 createRequire 拿。

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
const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}\n`);
};

const finish = (code) => {
    const failed = results.filter(r => !r.ok);
    process.stdout.write(`\n${results.length - failed.length}/${results.length} 通过\n`);
    app.exit(code);
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    // 脚本要发 HTTP 请求就得走这个通道：脚本在隐藏窗口里跑，它自己发不出去，
    // 得主进程替它发。没注册这条通道，脚本会一直等着回应——整个测试就卡住。
    ipcMain.handle('sakure-cs-http-request', async (_event, params) => performRequest(params || {}));

    // 读应用真实的配置：源是用户自己装的，不在仓库里。
    const configPath = 'D:/Users/Administrator/AppData/Roaming/Sakure/config.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const values = new Map([['userSources', config.userSources || []]]);
    const fakeStore = { get: key => values.get(key), set: (key, value) => { values.set(key, value); } };

    const store = new CustomSourceStore(fakeStore);
    const runtime = new CustomSourceRuntime({ store, onUpdateAlert: () => {} });

    const entry = store.getAll().find(source => source.name === '星海音乐源');
    if (!entry) {
        record('应用里装着星海源', false, 'userSources 里没有它');
        await runtime.stopAll();
        finish(1);
        return;
    }
    record('应用里装着星海源', true, `${entry.name} v${entry.version}`);

    await runtime.start(entry.id);
    const deadline = Date.now() + 20000;
    while (!runtime.isReady(entry.id) && Date.now() < deadline) {
        await wait(200);
    }
    record('脚本在隐藏窗口里跑起来了并声明了能力', runtime.isReady(entry.id), '');

    // 设置页「测试」按钮问的就是这几首歌（services/customSource/customSourceService.ts 的
    // CUSTOM_SOURCE_TEST_SONGS）。这里手抄一份：那个文件是 TS，ESM 里拿不到。
    const SONGS = [
        { id: '347230', songmid: '347230', name: '海阔天空', singer: 'Beyond', albumName: '海阔天空', interval: '5:26' },
        { id: '209058', songmid: '209058', name: '坐立不安', singer: '蔡健雅', albumName: '双栖动物', interval: '4:14' },
        { id: '33894312', songmid: '33894312', name: '不要说话', singer: '陈奕迅', albumName: '不想放手', interval: '4:10' },
    ];

    // 逐首问：源的服务端会限流（503/500），所以要重试；一首不行就换下一首。
    let url = null;
    let lastError = '';
    const tried = [];
    for (const song of SONGS) {
        if (url) break;
        for (let attempt = 1; attempt <= 3 && !url; attempt++) {
            try {
                const result = await runtime.request(entry.id, {
                    source: 'wy',
                    action: 'musicUrl',
                    info: { type: '128k', musicInfo: { ...song, source: 'wy' } },
                });
                // 落雪协议：脚本返回裸字符串 URL。
                url = typeof result === 'string' ? result : (result?.data?.url ?? null);
                if (!url) lastError = '源没有给出地址';
            } catch (err) {
                lastError = err.message;
            }
            if (!url) await wait(2500);
        }
        tried.push(`${song.name}:${url ? 'OK' : lastError}`);
    }
    record('用测试按钮那几首歌问源，它给出了地址', Boolean(url), url ? url.slice(0, 80) : tried.join(' | '));

    if (url) {
        // 「地址真能播」不在这里断言：网易云的 CDN 地址带时效签名，源那边还会缓存
        // （extraCache），过一会儿再取同一个地址就 403 了。那是源服务端的策略，不是
        // Sakure 的责任；「源给出了地址」才是这个脚本要证明的。地址能不能播，
        // 由 xinghai.e2e.js 在拿到新鲜地址时验。
    }

    await runtime.stopAll();
    finish(results.every(r => r.ok) ? 0 : 1);
});
