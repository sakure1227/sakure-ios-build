// test/e2e/xinghai.e2e.js
// 拿真实的第三方源（星海）在真实的 Electron 主进程里跑一遍，确认整条链是通的：
//   应用配置里的源 → store 读出脚本 → 隐藏窗口跑起来 → 脚本声明能力 →
//   主进程问它要地址 → 脚本自己发请求（带鉴权头）→ 拿到地址 → 地址真能播。
//
// 这是「端到端验收」的真版本：不再用自建的假源，而是用一个真的在服役的社区源。
// 它的服务端会限流，所以要重试；拿不到就如实说，不假装通过。
//
// Run: npx electron test/e2e/xinghai.e2e.js

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

// 这首歌在星海的服务端能取到地址（实测：206 audio/mpeg）。
const SONG = { id: '347230', songmid: '347230', name: '海阔天空', singer: 'Beyond', source: 'wy', interval: '4:40', albumName: 'The Line of Best Fit' };

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
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

    const info = runtime.getInfo(entry.id);
    const wy = info?.sources?.wy;
    record('声明了网易云的 musicUrl', wy?.actions?.includes('musicUrl') === true, JSON.stringify(wy?.qualitys));

    // 问它要地址。它的服务端会限流（503/500），所以要重试——这正是它真实的用法。
    let url = null;
    let lastError = '';
    for (let attempt = 1; attempt <= 5 && !url; attempt++) {
        try {
            const result = await runtime.request(entry.id, {
                source: 'wy',
                action: 'musicUrl',
                info: { type: '128k', musicInfo: SONG },
            });
            // 落雪协议：脚本返回裸字符串 URL。
            url = typeof result === 'string' ? result : (result?.data?.url ?? null);
        } catch (err) {
            lastError = err.message;
        }
        if (!url) await wait(3000);
    }
    record('主进程问脚本要到了播放地址', Boolean(url), url ? url.slice(0, 80) : lastError);

    if (url) {
        // 地址得真能播：真去取一段字节，看是不是音频。
        const probe = await performRequest({
            url,
            method: 'get',
            headers: { Range: 'bytes=0-1023' },
            timeout: 20000,
        });
        const raw = probe.response?.raw;
        const isAudio = raw && raw.length > 0 && (raw.subarray(0, 3).toString('latin1') === 'ID3' || (raw[0] === 0xff && (raw[1] & 0xe0) === 0xe0));
        record('那个地址真能播（取回的是音频字节）', Boolean(isAudio), `status=${probe.response?.statusCode} bytes=${raw?.length ?? 0}`);
    }

    await runtime.stopAll();
    finish(results.every(result => result.ok) ? 0 : 1);
}).catch(err => {
    console.error('E2E 运行失败:', err);
    record('E2E 运行', false, err.message);
    finish(1);
});
