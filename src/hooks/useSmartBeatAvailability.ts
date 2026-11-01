import { useEffect, useState } from 'react';
import { probeBeatThisGpu } from '../services/analysis/beatThisGpu';
import { isNativeShellRuntime } from '../utils/mobileRuntime';
import { isSyncConfigured } from '../services/sync/syncConfig';
import type { SmartBeatMode } from '../types';

// src/hooks/useSmartBeatAvailability.ts
// Whether beat FX (智能动感模式, in every mode and background that draws them) can do anything on this
// install, for a setting to say so next to its switch. The switch itself stays usable either way - it
// is a preference - but a switch that is on and silently inert is the failure this is here to prevent.
//
// The model (Beat This! final0, shared with automix) ships with the desktop app, so there is no "not downloaded" state: what can be
// missing is the desktop bridge (the web build) or a GPU that hands out an adapter. Under `cached`
// the GPU does not matter - nothing runs, and a list automix stored from a CPU run plays as well - so
// only the bridge is asked, the analyses being the desktop app's.

export type SmartBeatAvailability = 'ready' | 'desktopOnly' | 'noGpu' | 'syncedOnly';

/**
 * 这台机器能不能**当场**分析节拍。
 *
 * 桌面端：有 Electron 主进程（跑模型的 IPC 在那儿）+ 权重在安装目录里 → 能。
 * 手机端：两样都没有 —— iOS 26 之前的 WKWebView 没有 WebGPU
 * （WebGPU 是 Safari 26 才加的），权重也在主进程的安装目录里，渲染层读不到。
 */
const canAnalyseHere = (): boolean => (
    typeof window !== 'undefined'
    && typeof window.electron?.getBeatThisGpuWeights === 'function'
);

/**
 * 这台机器能不能**读到**节拍（自己分析出来的，或者同步过来的）。
 *
 * 手机端能读到同步过来的：桌面端分析过的表推到了同步服务器，手机端拉下来
 * 落到本地缓存（`src/services/sync/beatGridRepository.ts`），节拍效果于是照样动。
 *
 * 但那要**配了同步服务器**才成 —— 同步是可选功能（用户自建服务器）。
 * 没配的话手机端就真的没有节拍，这时该说「不可用」而不是「只能用同步过来的」。
 */
const canUseSyncedBeats = (): boolean => isNativeShellRuntime() && isSyncConfigured();

/**
 * The GPU is probed only under `on`. Off, nothing is probed (no adapter request) and the answer is
 * 'ready', which a caller shows nothing for.
 */
export function useSmartBeatAvailability(mode: SmartBeatMode): SmartBeatAvailability {
    // Optimistic until the probe answers: a hint flashing "no GPU" on every open would be worse.
    const [gpu, setGpu] = useState(true);
    const probe = mode === 'on';

    useEffect(() => {
        if (!probe) return;
        let cancelled = false;
        void probeBeatThisGpu().then((found) => {
            if (!cancelled) setGpu(found);
        });
        return () => {
            cancelled = true;
        };
    }, [probe]);

    if (mode === 'off') return 'ready';
    if (!canAnalyseHere()) {
        // 手机端：当场分析不了，但能读同步过来的 —— 所以不是「不可用」，
        // 是「只能用同步过来的」。
        return canUseSyncedBeats() ? 'syncedOnly' : 'desktopOnly';
    }
    return gpu || !probe ? 'ready' : 'noGpu';
}
