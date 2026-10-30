// src/utils/mobileRuntime.ts
// 「现在跑在什么壳上 / 什么屏幕上」的**唯一**判定入口。
//
// 为什么要有它：桌面桥（Electron）与手机桥（Capacitor）形状一致，渲染层分不出自己
// 跑在哪个壳上，只能靠桥自己说。手机桥上有 `isMobile: true`（`mobile/src/bridge.ts`）。
//
// ## 为什么要拆成三个概念
//
// 原来只有一个 `isMobileRuntime()`，它把三件不同的事混在了一起：
//
// 1. **壳的能力**（有没有 Electron 后端）—— 决定某些功能有没有实现。
// 2. **屏幕的大小**（是不是窄屏）—— 决定要不要降级（毛玻璃、will-change）。
// 3. **输入方式**（能不能双指缩放）—— 决定手势行为。
//
// 这三件事在**手机上**恰好一致，但在 **iPad 上就不一致了**：
// iPad 跑的是同一个 Capacitor 壳（没有 Electron 后端 → 功能确实少），
// 但屏幕又宽又大（→ 不该降级毛玻璃），而且是触摸屏（→ 该能双指缩放）。
//
// 原来那一个判定把 iPad 当手机 → iPad 上毛玻璃全关、visualizer 受限、
// 双指缩放被禁，而布局又按宽屏（640px 断点）排 —— 于是「宽屏布局 + 手机降级」
// 叠在一起，元素互相重叠。
//
// 所以这里拆成三个：
// - `isNativeShellRuntime()` —— 在 Capacitor 壳里（手机与 iPad 都是）。
// - `isCompactRuntime()` —— 屏幕窄（真正的手机）。iPad 不算。
// - `isTabletRuntime()` —— 平板（iPad）。走完整版渲染路径。
//
// 判定只在这里做一次，别处直接读 window.electron。

/**
 * 窄屏的宽度上限（CSS px）。低于这个值算「手机」。
 *
 * 用的是**视口的短边**，不是长边 —— 因为手机横过来之后长边就有 852px 了
 * （iPhone 15 Pro 横屏是 852×393），按长边判会把手机误认成平板。
 * 短边才是「这块屏幕最小的那一边」：手机永远是 393 左右，iPad Air 是 820。
 *
 * 阈值取 700：手机（含最大的 Pro Max 横屏 430）都在下面，iPad（含 iPad mini
 * 竖屏 744）都在上面。中间没有常见设备，700 是个安全的分界。
 */
const COMPACT_SHORT_EDGE_PX = 700;

/**
 * 现在跑在原生壳里吗（Capacitor 的手机版 / iPad 版）。
 *
 * 这件事只跟**壳**有关，跟屏幕大小无关：iPad 也是原生壳，它同样没有
 * Electron 后端，所以那些只有 Electron 能做的功能（mods、本机曲库、壁纸模式…）
 * 在 iPad 上也不可用 —— 那是**真的没实现**，不是被降级挡住的。
 */
export const isNativeShellRuntime = (): boolean => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.electron?.isMobile);
};

/**
 * 现在跑在手机版上吗。
 *
 * **注意语义变了**：以前这个函数是「在 Capacitor 壳里」，现在它是
 * 「在 Capacitor 壳里**且屏幕是窄的**」—— 也就是「真正的手机」。
 *
 * iPad 不算手机（它是平板）。要判断「在不在原生壳里」用
 * `isNativeShellRuntime()`。
 */
export const isMobileRuntime = (): boolean => {
    if (!isNativeShellRuntime()) return false;
    return !isTabletRuntime();
};

/**
 * 现在是平板吗（iPad）。
 *
 * 判定的优先级：
 * 1. **桥说的**（`window.electron.isTablet`）—— 原生那边知道自己在什么设备上，
 *    最权威。手机桥在安装时算一次（`mobile/src/bridge.ts` 的 `isTabletDevice`）。
 * 2. **视口短边** —— 桥还没挂上时的兜底。
 *
 * 为什么不用 UA：新版 iPadOS 上 Safari 的 UA 伪装成 Macintosh，嗅探不可靠。
 *
 * 为什么用**短边**而不是长边：手机横过来之后长边有 852px（iPhone 15 Pro 横屏
 * 852×393），按长边判会把手机误认成平板；短边才是「这块屏幕最小的那一边」。
 */
export const isTabletRuntime = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (!isNativeShellRuntime()) return false;

    // ① 桥说的最准（原生那边量的是真屏幕）。
    // `isTabletNow` 是**实时**的 —— 分屏后视口变了，原生那边能立刻知道。
    const askBridge = window.electron?.isTabletNow;
    if (typeof askBridge === 'function') {
        try {
            const answer = askBridge();
            if (typeof answer === 'boolean') return answer;
        } catch {
            // 桥问了但没答上来 —— 落到下面的兜底。
        }
    }
    const bridgeSays = window.electron?.isTablet;
    if (typeof bridgeSays === 'boolean') return bridgeSays;

    // ② 兜底：量视口的短边。
    const width = window.innerWidth;
    const height = window.innerHeight;
    // 视口尺寸拿不到时（SSR、测试）保守当成手机：宁可少一点特效，不要错乱。
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    return Math.min(width, height) >= COMPACT_SHORT_EDGE_PX;
};

/**
 * 这个效果在当前运行时能不能用。
 *
 * 桌面浏览器与桌面应用都能用；**手机**不能（Android WebView 的合成器扛不住）。
 * iPad 能 —— 它的 GPU 与内存都够，跟桌面浏览器没什么差别。
 */
export const supportsBlurEffect = (): boolean => !isMobileRuntime();

/**
 * 把「现在跑在什么运行时上」写到 `<html data-runtime="...">`，供纯 CSS 读取。
 *
 * 取值：
 * - `mobile` —— 手机（窄屏）：降级生效。
 * - `tablet` —— 平板（iPad）：**不降级**，但要按宽屏排版。
 * - 无属性 —— 桌面 / 网页版。
 *
 * 与 `useMotionSettingsStore` 的 `data-reduce-motion` 同一个做法：CSS 里写
 * `[data-runtime="mobile"] .某个元素 { ... }`，而不是在每个组件里读一遍这个判定。
 *
 * 为什么需要它：手机上要关掉的东西在 CSS 里（`will-change` 与 `mix-blend-mode`），
 * 在 TS 里改不方便；而那些属性在桌面上是有用的（`LatticePoster.tsx` 的注释里专门
 * 说过不要动 `will-change`）。
 */
export const syncRuntimeAttribute = (): void => {
    if (typeof document === 'undefined' || !document.documentElement) return;
    if (isMobileRuntime()) {
        document.documentElement.setAttribute('data-runtime', 'mobile');
    } else if (isTabletRuntime()) {
        // 平板：明确标出来，让 CSS 能区分「宽屏但没有 Electron 后端」。
        document.documentElement.setAttribute('data-runtime', 'tablet');
    } else {
        document.documentElement.removeAttribute('data-runtime');
    }
};

// 模块级跑一次：它跟任何一棵子树的生命周期都无关（与 data-reduce-motion 一样）。
syncRuntimeAttribute();

// 再跑一次，等 DOM 出来。
//
// 为什么：模块加载时 <html> 可能还没有（document.documentElement 为 null），那时
// 属性写不进去，就永远写不进去了 —— 手机版的降级规则（毛玻璃、will-change）会
// 全部失效，首屏就是重的。DOM 出现后补一次就好。
if (typeof document !== 'undefined') {
    if (document.documentElement) {
        syncRuntimeAttribute();
    } else {
        document.addEventListener('DOMContentLoaded', syncRuntimeAttribute, { once: true });
    }
}

// 再等一会儿：桥可能比这个模块晚挂上。
//
// 手机版的桥是**页面脚本自己装的**（`mobile/src/bridge.ts` 在模块体里挂
// `window.electron`），而 ES 模块的求值顺序不保证 `bridge` 先于本模块跑完 ——
// 桥晚到的话，上面两次同步读到的 `window.electron` 是 undefined，属性就永远写不上，
// 手机版的降级规则整条都不生效（实测：`data-runtime` 为 null，毛玻璃与 will-change
// 一个没关）。
//
// 只在「已经能看到桥、但它还没说自己是手机版」时轮询 —— 那种情况说明桥正在装，
// 等一下就好。桌面版的桥一开始就在（preload 注入），不会进这个分支；
// 网页版根本没有桥，也不会进。
//
// 用全局的 `setTimeout` 而不是 `window.setTimeout`：测试环境里 window 可能是被换过的
// 桩（`window.setTimeout` 不存在），而全局的那个一定有。
if (typeof window !== 'undefined' && typeof setTimeout === 'function') {
    let attempts = 0;
    const retry = (): void => {
        attempts += 1;
        if (isNativeShellRuntime()) {
            syncRuntimeAttribute();
            return;
        }
        // 桥还没出现：网页版（永远不会有）与桌面版（preload 已经注入）都到这里，
        // 不必再等。
        if (!window.electron || attempts >= 40) {
            syncRuntimeAttribute();
            return;
        }
        setTimeout(retry, 25);
    };
    // 桥已经在（桌面版的 preload）但没有 isMobile 标记 —— 那是桌面，不用等。
    // 只有「桥都没有」的时候才等：手机版的桥正在装。
    if (!window.electron) {
        setTimeout(retry, 25);
    }
}

// ★ iPad：视口尺寸会变（转屏、分屏、Stage Manager），平板/手机的判定跟着变。
//
// 上面那套是「装桥时定一次」的逻辑 —— 对手机成立（转屏后短边不变，判定不变），
// 但 iPad 会转屏：竖屏 820×1180（短边 820 → 平板）→ 分屏后可能只有
// 400×1180（短边 400 → 那就该按手机降级了）。
//
// 所以**尺寸变了要重新判定**。用 `resize` 事件（`orientationchange` 在 iPad 上
// 不一定触发，而 resize 一定触发）。
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    let lastShortEdge = Math.min(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
        const shortEdge = Math.min(window.innerWidth, window.innerHeight);
        if (shortEdge === lastShortEdge) return;
        lastShortEdge = shortEdge;
        // 只有原生壳才需要重新判定（桌面与网页版的属性跟尺寸无关）。
        if (isNativeShellRuntime()) syncRuntimeAttribute();
    });
}

