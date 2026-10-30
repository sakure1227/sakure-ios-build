// 测手机版的源宿主：真的宿主文档（mobile/src/sourceHost.mjs）+ 真的星海源。
//
// 不开模拟器（它太吃 CPU）—— 源宿主就是一段 Web 代码，浏览器里跑出来是一样的。
// 唯一差的是「http 请求」：手机版走原生插件（跨域），这里由探针代劳（同一个 postMessage 协议）。
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { buildSourceHostHtml } from '../../mobile/src/sourceHost.mjs';

const ROOT = resolve(import.meta.dirname, '../../dist-mobile');
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
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
await new Promise(r => server.listen(4603, r));

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

await page.goto('http://127.0.0.1:4603/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// 源脚本在 node 侧取出来、解压、造宿主（浏览器里再取一遍也行，但宿主文档
// 必须在 node 侧造 —— 它要带上真的脚本正文）。
const seed = JSON.parse(readFileSync(join(ROOT, 'seed', 'userSources.json'), 'utf8'));
const raw = seed.sources[0].script;
let script = raw;
if (raw.startsWith('gz_')) {
    const { inflateSync } = await import('node:zlib');
    script = inflateSync(Buffer.from(raw.substring(3), 'base64')).toString('utf8');
}
const hostHtml = buildSourceHostHtml(script, {
    name: seed.sources[0].name,
    version: seed.sources[0].version,
    description: seed.sources[0].description,
    author: seed.sources[0].author,
    homepage: seed.sources[0].homepage,
});

console.log('=== 源宿主 + 真源（星海）===');
const result = await page.evaluate(async ({ hostHtml }) => {
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    document.body.appendChild(frame);

    const messages = [];
    window.addEventListener('message', (event) => {
        if (event.source !== frame.contentWindow) return;
        messages.push(event.data);
        // 探针代替原生插件：源要发 http 时，回一个「探针不联网」的答复 ——
        // 这样能看出**它发得出来**（这才是要验的）。
        if (event.data?.kind === 'http') {
            frame.contentWindow.postMessage({
                __sakureSourceHost: true,
                kind: 'http-result',
                requestKey: event.data.payload.requestKey,
                error: 'probe: no network here',
                response: { statusCode: 0, headers: {}, body: '' },
                body: '',
            }, '*');
        }
    });

    frame.srcdoc = hostHtml;

    await new Promise(r => setTimeout(r, 3500));

    const init = messages.find(m => m?.kind === 'init');
    const err = messages.find(m => m?.kind === 'init-error');
    return JSON.stringify({
        scriptLength: hostHtml.length,
        scriptHead: hostHtml.slice(0, 70).replace(/\n/g, ' '),
        messageKinds: messages.map(m => m?.kind),
        declaredPlatforms: init ? Object.keys(init.payload?.sources ?? {}) : null,
        declaredDetail: init ? JSON.stringify(init.payload).slice(0, 500) : null,
        error: err?.payload ?? null,
    }, null, 1);
}, { hostHtml });

console.log(result);
console.log('\n=== 应用控制台（最后 5 条）===');
console.log(logs.slice(-5).join('\n') || '(空)');

await browser.close();
server.close();
