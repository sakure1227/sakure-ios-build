// 用无头浏览器跑手机版的构建产物，看它到底卡在哪。
//
// 为什么不用模拟器：模拟器（qemu + 软件渲染）会把 CPU 烧到风扇响。而手机版
// 的渲染层就是一堆 Web 代码 —— 在桌面浏览器里跑同一份 dist-mobile/，报的错是同一个。
// 缺的是原生插件（CsHttp），但那只在**发请求**时才用到，挂载阶段用不到。
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../dist-mobile');
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
};

const server = createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    let file = join(ROOT, url === '/' ? 'index.html' : url);
    if (!existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
});
await new Promise(r => server.listen(4599, r));

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}\n${(e.stack || '').split('\n').slice(0, 6).join('\n')}`));
page.on('requestfailed', r => logs.push(`[REQFAIL] ${r.url()} ${r.failure()?.errorText}`));

await page.goto('http://127.0.0.1:4599/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);

console.log('=== 控制台 ===');
console.log(logs.slice(0, 30).join('\n') || '(空)');
console.log('\n=== 预置的源（手机版第一次启动时装上的那个）===');
console.log(await page.evaluate(async () => {
    const res = await fetch('seed/userSources.json');
    const seed = await res.json();
    return JSON.stringify({
        seedExists: res.ok,
        seedSources: (seed.sources || []).map(s => `${s.name} v${s.version}`),
    }, null, 1);
}));

console.log('\n=== 页面状态 ===');
console.log(await page.evaluate(() => JSON.stringify({
    rootChildren: document.getElementById('root')?.children.length ?? -1,
    bootClass: document.getElementById('app-boot')?.className ?? '(没有遮罩)',
    bodyText: (document.body.innerText || '').slice(0, 200),
    hasElectron: typeof window.electron,
    electronKeys: window.electron ? Object.keys(window.electron).length : 0,
}, null, 1)));

await page.screenshot({ path: 'D:/workbuddy/2026-10-26-14-06-07/mobile-headless.png' });
await browser.close();
server.close();
