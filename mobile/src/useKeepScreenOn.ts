// mobile/src/useKeepScreenOn.ts
//
// 「不熄屏」在手机版的落地：把开关的状态推给原生。
//
// ## 为什么要有这一层
//
// 「屏幕别自动熄灭」是**操作系统级**的能力，WebView 里没有任何 API 能做到：
//
// - **iOS**：`UIApplication.shared.isIdleTimerDisabled = true` —— 唯一的开关。
// - **Android**：窗口上的 `FLAG_KEEP_SCREEN_ON`。
//
// 两者都在原生那边，所以我们得通过 Capacitor 插件去设。
// 那个插件是 `CsMediaSession`（方法 `setKeepScreenOn`）。
//
// ## 为什么放在 mobile/ 而不是 src/
//
// `src/**` 是桌面与手机**共用**的渲染层，桌面上没有「不熄屏」这条设置
// （桌面用的是 Electron 的 `powerSaveBlocker`，走另一条路）。
// 静态 import 一个只存在于 `mobile/**` 的文件，桌面构建会直接失败 ——
// 所以那边用**动态导入**（见 `src/stores/useKeepScreenOnStore.ts`）。
//
// ## 什么时候调用
//
// 1. **启动时** —— 应用一重启，原生那边就回到系统默认了（iOS 尤其如此：
//    `isIdleTimerDisabled` 只在本次运行内有效）。所以要把用户存的那一份再推一遍。
// 2. **用户改了开关时** —— 立刻生效，不用重启。

import { registerPlugin } from '@capacitor/core';

/**
 * 原生插件（只用到 `setKeepScreenOn` 这一个方法）。
 *
 * 形状与 `CsMediaSession.java` / `CsMediaSession.swift` 里的
 * `@objc func setKeepScreenOn` / `@PluginMethod setKeepScreenOn` 对上。
 */
type CsMediaSessionPlugin = {
    setKeepScreenOn(options: { enabled: boolean }): Promise<void>;
};

/**
 * 原生插件实例。
 *
 * **缓存成单例**：`registerPlugin` 每调一次都会在控制台打一条
 * 「already registered. Cannot register plugins twice.」——
 * 幂等没错，但那句话吵，而且容易让人以为插件注册出了问题。
 */
let pluginInstance: CsMediaSessionPlugin | undefined;
const plugin = (): CsMediaSessionPlugin => {
    if (!pluginInstance) {
        pluginInstance = registerPlugin<CsMediaSessionPlugin>('CsMediaSession');
    }
    return pluginInstance;
};

/**
 * 现在跑在原生壳里吗。
 *
 * 桌面版没有这个插件（那边用 Electron 的 powerSaveBlocker），
 * 所以在桌面上一开始就该停下 —— 别去注册一个不存在的插件，
 * 也别在控制台刷无谓的警告。
 *
 * 判据用 `Capacitor.isNativePlatform()`（跟 `mobileMediaSession.ts` 一样）：
 * 桌面上根本没有 Capacitor，网页版上 Capacitor 在但 `isNativePlatform()` 是 false。
 */
const isNativePlatform = (): boolean => {
    if (typeof window === 'undefined') return false;
    const capacitor = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return capacitor?.isNativePlatform?.() === true;
};

/**
 * 让原生那边照着做。
 *
 * 失败不抛 —— 「屏幕常亮」是个锦上添花的功能，
 * 调不成也不该影响别的（界面上的开关状态照样是对的）。
 */
export const applyKeepScreenOn = (enabled: boolean): void => {
    if (typeof window === 'undefined') return;
    if (!isNativePlatform()) return;
    try {
        void plugin().setKeepScreenOn({ enabled }).catch((error) => {
            console.warn('[KeepScreenOn] The native screen-on request failed:', error);
        });
    } catch (error) {
        console.warn('[KeepScreenOn] The native screen-on request could not be made:', error);
    }
};
