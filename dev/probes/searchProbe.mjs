// 测手机版的平台搜索：直接问网易云的公开接口（与手机版同一份代码路径）。
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('D:/sakure/dist-mobile');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    let file = join(ROOT, url === '/' ? 'index.html' : url);
    if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
});
await new Promise(r => server.listen(4604, r));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4604/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// 用应用自己的 omni 搜（这才是真的那条路）
const result = await page.evaluate(async () => {
    const omni = window.__sakureOmni;
    if (!omni) return JSON.stringify({ error: 'no omni on window' });
    try {
        const page = await omni.searchSongs('海阔天空', 5, 0);
        return JSON.stringify({
            total: page.total,
            count: page.items?.length,
            first: page.items?.[0] ? {
                name: page.items[0].name,
                artists: page.items[0].artists?.map(a => a.name),
                source: page.items[0].sourceRef?.providerId,
            } : null,
        }, null, 1);
    } catch (error) {
        return JSON.stringify({ error: String(error?.message || error) }, null, 1);
    }
});
console.log(result);
await browser.close();
server.close();
