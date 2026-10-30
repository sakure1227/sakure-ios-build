// mobile/build-mobile.mjs
// 手机版的构建：与桌面共用渲染层（src/），只是入口不同 ——
// 桌面从 index.html 进，手机从 mobile/index.html 进（那里先装桥，再挂载 React）。
//
// 为什么要单独的入口：桌面的桥由 Electron 的 preload 装（页面脚本跑之前它就注入好了）。
// 手机这边没有 preload，所以要由应用代码自己装 —— 而那必须在 React 挂载**之前**
// （渲染层一上来就读 window.electron）。
//
// vite 的一个别扭处：输入是 mobile/index.html 时，输出会落在 dist-mobile/mobile/
// （它按输入的目录名决定）。Capacitor 要的是 webDir **根**下的 index.html，
// 所以构建完把入口挪到根，并把它里面的资源路径从 /mobile/ 改成 /。
import { build } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'dist-mobile');

process.env.SAKURE_NO_SERVICE_WORKER = '1';

await build({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    // 手机版**不要 service worker**：它把导航劫持到预缓存的壳上，而它的预缓存清单
    // 里没有 index.html（那是 vite 那边按网页的路径算的），于是它一接管导航就抛
    // 「non-precached-url」，把整个应用卡在启动画面。Capacitor 的资源就在本机，
    // 不需要离线缓存。vite.config.ts 里按这个环境变量分（网页版要那个 worker）。
    build: {
        outDir,
        // `.ts` 排在 `.mjs` 前面。
        //
        // 为什么：Vite 默认的 `resolve.extensions` 是 `['.mjs', '.js', '.mts', '.ts', …]`，
        // **`.mjs` 在 `.ts` 前面**。于是 `import … from './sourceHost'` 解析到的是
        // `sourceHost.mjs` —— 那是给探针（Node 直接跑）准备的手抄副本。手抄的那份
        // 一旦没同步，手机版跑的就是**旧代码**，而改动看起来「已经改了」（源文件是对的）。
        //
        // 这个坑踩过一次：`SUPPORT_ACTIONS` 加了 `lyric`/`pic`，源却还是说「我不支持
        // 歌词」—— 因为跑的是没同步的 `.mjs`。
        //
        // 这里让 `.ts` 优先，源码就是唯一的真相。探针那份副本由
        // `dev/probes/syncSourceHost.mjs` 从 `.ts` 生成。
        resolve: {
            extensions: ['.ts', '.tsx', '.mjs', '.js', '.mts', '.jsx', '.json'],
        },
        rollupOptions: {
            input: {
                main: 'mobile/index.html',
            },
        },
    },
});

// 入口挪到根（Capacitor 的 webDir 根要有 index.html）。
const nested = resolve(outDir, 'mobile', 'index.html');
const top = resolve(outDir, 'index.html');
if (existsSync(nested)) {
    let html = readFileSync(nested, 'utf8');
    // 资源路径从 /mobile/xxx 改成 /xxx（挪到根之后它们在根下）。
    html = html.replace(/(["'])\/mobile\//g, '$1/');
    writeFileSync(top, html, 'utf8');
    console.log('入口挪到 dist-mobile/index.html');
}

// 预置的源放进 dist-mobile/seed/ —— Capacitor 会把整个 dist-mobile/ 拷到
// assets/public/，所以种子就跟着进去了。
//
// （不能直接放 android/app/src/main/assets/public/：cap sync 每次都会把那个目录
// 整个换掉，手放的东西会被覆盖掉。）
const seedFrom = resolve(root, 'build', 'seed', 'userSources.json');
const seedTo = resolve(outDir, 'seed', 'userSources.json');
try {
    mkdirSync(resolve(outDir, 'seed'), { recursive: true });
    copyFileSync(seedFrom, seedTo);
    console.log('预置的源已放进 dist-mobile/seed/');
} catch (error) {
    console.warn('[Seed] 没有找到预置的源（构建还在继续）:', error?.message || error);
}


console.log('手机版的渲染层构建完成 -> dist-mobile/');
