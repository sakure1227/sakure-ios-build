// mobile/src/main.ts
// 手机版的入口。
//
// 与桌面版的差别只有一处：**桥什么时候装**。
// 桌面上桥由 Electron 的 preload 装 —— 页面脚本跑之前它就注入好了（window.electron
// 一开始就在）。手机上没有 preload，所以要由这里装；而渲染层一上来就读 window.electron
// （服务层到处直接读它），所以**必须装在 React 挂载之前**。
//
// 其余完全共用：垫片、bootstrap、样式、组件，都是桌面那一份。

import { CsHttp } from './nativePlugins';
import { startInstalledSources } from './bridge';
import { installMobileFetchPatch } from './mobileFetchPatch';
// 「现在跑在手机版上吗」的判定与 `<html data-runtime="mobile">` 的写入。
//
// **必须静态导入**（不能放进下面那个 `import('../../src/index')` 的动态导入里）：
// 动态导入是异步的，渲染层会先跑起来，于是：
// - CSS 里的 `[data-runtime='mobile']` 降级规则一开始不生效（手机版的毛玻璃与
//   will-change 降级都靠它），首屏就是重的；
// - `isMobileRuntime()` 在渲染层首次读它时可能还没跑过。
// 静态导入保证它在任何渲染层代码之前执行。
import '../../src/utils/mobileRuntime';

// 桥在**模块加载时**就挂好了（import 这一句就够了）—— 渲染层马上要读 window.electron，
// 不能等一个 await。这里要做的只是把用户已装好的源起起来（异步，不挡渲染层）。
void startInstalledSources().catch((error) => {
    console.error('[Mobile] the installed sources could not be started:', error);
});

// 跨域的 fetch 改走原生（同源策略在 https 页面上管得很严，各家平台的接口都在
// 别的源上）。**要在渲染层加载之前装好** —— 渲染层里的平台 transport（酷我、酷狗、
// QQ…）在模块加载时就会用到 fetch。
void installMobileFetchPatch(CsHttp);

// 状态栏：藏起来。
//
// `capacitor.config.ts` 里 `StatusBar.overlaysWebView: true` 让内容铺到系统栏后面，
// 但那只让状态栏**透明**，它还在（用户看到时间、电量一直占着一条，还压着界面）。
// 真的要藏，得调 `StatusBar.hide()`。
//
// 藏了之后，浮在角落的按钮要自己让开那一条 —— 用 `env(safe-area-inset-*)`（见
// `src/index.css` 里的 `--st-safe-*` 与 `.st-safe-top-right`）。
void import('@capacitor/status-bar')
    .then(({ StatusBar }) => StatusBar.hide())
    .catch((error) => {
        console.warn('[Mobile] the status bar could not be hidden:', error);
    });

// 桌面的垫片与启动流程（src/index.tsx 里那几步），一份不少 ——
// 视觉器的帧率限制、日志捕获、调试模块，那些在手机上同样有用。
void import('../../src/index');

// omni 是模块内的东西（渲染层 import 它用）。手机版把它挂到 window 上：
// 调试面板与探针要能直接问它「搜得到吗」「源起来了吗」，不用往界面上加临时入口。
void import('../../src/services/onlineMusic/omni').then(({ omni }) => {
    (window as unknown as { __sakureOmni: unknown }).__sakureOmni = omni;
});

// 平台 provider 也挂上去：登录这条链路上（provider 的 auth → 凭据 → 平台请求）有好几层，
// 出了问题时要能逐层问「哪一层没答话」，不用靠猜。挂的是注册表本身，探针可以自己取。
void import('../../src/services/onlineMusic/providerRegistry').then(({ getOnlineMusicProvider }) => {
    (window as unknown as { __sakureProvider?: unknown }).__sakureProvider = (id: string) => (
        getOnlineMusicProvider(id as never)
    );
});

// 百云登录的实现也挂上去：凭据读取、平台请求、响应解析都在这里，
// 三层里哪一层不答话得能分开看。
void import('./mobileLogin').then((login) => {
    (window as unknown as { __sakureLogin?: unknown }).__sakureLogin = login;
});

// 歌词聚合也挂上去：兜底的顺序与每一段的结果要看清。
void import('./platformLyrics').then((lyrics) => {
    (window as unknown as { __sakureLyrics?: unknown }).__sakureLyrics = lyrics;
});

// 歌词聚合也挂上去：兜底的顺序与每一段的结果要看清。
void import('./platformLyrics').then((lyrics) => {
    (window as unknown as { __sakureLyrics?: unknown }).__sakureLyrics = lyrics;
});
