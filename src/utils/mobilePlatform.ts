// src/utils/mobilePlatform.ts
//
// 「现在跑在 Android 上吗 / iOS 上吗」的判定。
//
// ## 为什么单独一个文件
//
// 手机版在两个平台上的**原生机制完全不同**，而渲染层里有一堆逻辑要按平台分岔：
//
// - **Android**：系统媒体会话 + 通知栏 + **音频焦点栈**。别的应用出声时系统会把
//   我们挤下去 —— 所以那边有「共存播放」那个开关（跟系统抢焦点的那套）。
// - **iOS**：**没有焦点栈那回事**。`AVAudioSession` 的 `mixWithOthers` 选项就让
//   别的应用出声时我们的歌**照播** —— 共存是系统级的、天生的，不需要开关，
//   也不会有 Android 那边那种「被抢焦点 → 暂停 → 恢复」的断续。
//
// 所以「共存模式」那套逻辑**只在 Android 上有意义**。iOS 上如果也去走它，渲染层会
// 以为「被系统抢了焦点」而去 `play()` 恢复 —— 那是多余的断续（用户听得见电流声）。
//
// ## 为什么判定在**渲染层**做，而不是原生插件做
//
// 原生那边当然也能说「我在 iOS 上」，但渲染层要判定的时机比原生插件**更早**：
// `mobile/src/main.ts` 装桥、`App.tsx` 挂 hook，这些都在插件被调用之前。
//
// 而 Capacitor 自己就带着平台名（`Capacitor.getPlatform()` 返回 `'ios'` /
// `'android'`）—— 那是权威来源，不用自己维护一份对照表。
import { isNativeShellRuntime } from './mobileRuntime';

/**
 * 现在跑在 **Android** 上吗（手机版里的 Android）。
 *
 * @param platform Capacitor 报的平台名（传进来是为了能单测）。
 */
export const isAndroidPlatform = (platform?: string): boolean => {
    // 「在不在原生壳里」—— 不是「是不是手机」：iPad 也是原生壳里的 iOS，
    // 用手机判定会把 iPad 误判成「不是 iOS」，于是共用播放那套逻辑跑错边。
    if (!isNativeShellRuntime()) return false;
    // 拿不到平台名时保守地当成 Android —— 手机版目前只有 Android 与 iOS，
    // 而 Android 是「有焦点栈」的那一边，误判成它最多是多走一段无害的逻辑。
    return platform !== 'ios';
};

/**
 * 现在跑在 **iOS** 上吗（手机版里的 iOS）。
 */
export const isIosPlatform = (platform?: string): boolean => {
    if (!isNativeShellRuntime()) return false;
    return platform === 'ios';
};

/**
 * 读 Capacitor 报的平台名。
 *
 * 桌面上没有 Capacitor（那是 Electron 的壳）—— 那时返回空串，两个判定都按
 * 「不是手机」处理。
 */
export const currentPlatformName = (): string => {
    if (typeof window === 'undefined') return '';
    const capacitor = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    return capacitor?.getPlatform?.() ?? '';
};

/** 现在跑在 Android 上吗（读真实运行环境）。 */
export const isAndroidRuntime = (): boolean => isAndroidPlatform(currentPlatformName());

/** 现在跑在 iOS 上吗（读真实运行环境）。 */
export const isIosRuntime = (): boolean => isIosPlatform(currentPlatformName());
