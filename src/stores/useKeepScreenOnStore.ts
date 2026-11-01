// src/stores/useKeepScreenOnStore.ts
// 「不熄屏」这个开关：应用在前台时，屏幕不要自动调暗、锁定。
//
// ## 它管的是哪一边的屏幕
//
// 这是**手机端**的设置（iPad 上看歌词时屏幕自己黑掉，是最常撞上的场景）。
//
// 桌面端另有一条等价的设置：「播放时阻止休眠」
// （`useDesktopSettingsStore.preventDisplaySleepDuringPlayback`，
//  走 Electron 的 `powerSaveBlocker`）—— 那条是**只在播放时**生效，
// 而这条是**整个应用在前台时**都生效，所以两者不是一回事，各自留着。
//
// ## 为什么不直接用原生那层的偏好
//
// 原生那边（Android 的 SharedPreferences / iOS 的 UserDefaults）不存这个 ——
// 一是 iOS 的 `isIdleTimerDisabled` 只在应用**运行期间**有效，
// 应用一重启就回到系统默认（锁屏）；二是开关的状态要在设置界面上显示，
// 那是渲染层的事。渲染层存一份，原生只负责「照着做」。
//
// ## 默认开着
//
// 手机上默认是「灭屏」的：用户看着歌词，几分钟不动屏幕，iPad 就黑了。
// 对一个音乐应用来说这是很糟的默认 —— 歌词正在滚，屏幕却黑了。
// 所以默认打开。

import { create } from 'zustand';
import { getStoredBoolean, setStoredBoolean } from './storagePrimitives';

export const KEEP_SCREEN_ON_STORAGE_KEY = 'folia_keep_screen_on';

/** 默认开着 —— 见上面的说明。 */
export const DEFAULT_KEEP_SCREEN_ON = true;

export type KeepScreenOnState = {
    /** 应用在前台时，屏幕保持常亮。 */
    keepScreenOn: boolean;
    /** 改了开关：存下来，并告诉原生那边。 */
    handleToggleKeepScreenOn: (enabled: boolean) => void;
};

/**
 * 让原生那边照着做。
 *
 * 桌面上没有这个能力（那边有自己那条「播放时阻止休眠」），所以这里直接返回。
 * 手机版的实现见 `mobile/src/useKeepScreenOn.ts` —— 它经由动态导入接进来
 * （桌面上那个文件不存在）。
 *
 * 为什么要动态导入：`src/**` 是桌面与手机**共用**的渲染层，
 * 而 `mobile/**` 只有手机版有。静态 import 会在桌面构建时找不到文件。
 */
const applyToNative = (enabled: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('../../mobile/src/useKeepScreenOn');
        mod.applyKeepScreenOn(enabled);
    } catch {
        // 桌面上没有这个模块 —— 那边不需要（原样忽略即可）。
    }
};

export const useKeepScreenOnStore = create<KeepScreenOnState>((set) => ({
    keepScreenOn: getStoredBoolean(KEEP_SCREEN_ON_STORAGE_KEY, DEFAULT_KEEP_SCREEN_ON),
    handleToggleKeepScreenOn: (enabled) => {
        setStoredBoolean(KEEP_SCREEN_ON_STORAGE_KEY, enabled);
        set({ keepScreenOn: enabled });
        applyToNative(enabled);
    },
}));

/**
 * 启动时把存下来的偏好告诉原生。
 *
 * 为什么要在启动时再说一遍：原生那边（Android 的窗口 flag / iOS 的
 * `isIdleTimerDisabled`）**不跨进程** —— 应用一重启就回到系统默认。
 * 所以每次启动都要把用户存的那一份重新推给原生。
 *
 * 这个函数在 App 起来时被调一次；桌面版是空操作。
 */
export const syncKeepScreenOnToNative = (): void => {
    applyToNative(useKeepScreenOnStore.getState().keepScreenOn);
};
