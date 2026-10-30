// mobile/src/mobileMediaSession.ts
// 手机版的系统媒体会话：把播放状态搬到 Android 原生的 MediaSession 上。
//
// ## 为什么要有这一层
//
// 浏览器那套 `navigator.mediaSession`（桌面用的 `useMediaSessionBridge`）在 Android
// WebView 里只管到「系统媒体面板」—— 下拉通知栏里那一块。
//
// **灵动岛**（iPhone 那样、Android 上则是挖孔区的状态栏那一小块）显示歌名、封面、
// 进度，走的是 Android 原生的 `MediaSession` —— 系统是从那里读「现在在放什么」的。
//
// 所以手机版额外有一个原生插件 `CsMediaSession`，这一层负责：
//
// 1. 把当前的曲目与播放状态同步过去（原生那边出通知与灵动岛）。
// 2. 接收原生的控制动作（灵动岛上的播放/暂停/上一首/下一首），转回播放器。
// 3. 应用切到后台时告诉渲染层「停动画」—— 音频继续播，但画面不烧电。
//
// ## 后台只播声音、不播动画
//
// Android 不会立刻冻结 WebView，所以切到后台后动画还在跑（`requestAnimationFrame`
// 照常触发）。于是歌词动画、封面那些还在动，电在掉。
//
// 桌面那边靠主进程报告「窗口最小化了」；手机这边没有那个桥，就用
// `document.visibilityState` —— 应用切到后台时它是 `hidden`，回来是 `visible`。
// 这与歌词动画那套本来就有的可见性判断是同一件事，所以直接复用它的 store。

import { registerPlugin } from '@capacitor/core';
import { useBackgroundLyricHoldStore } from '../../src/components/app/backgroundThrottling/backgroundLyricHoldStore';
import type { SongResult } from '../../src/types';

/**
 * 原生的媒体会话插件。
 *
 * 参数的形状与 `CsMediaSession.java` 里的 `@PluginMethod` 对上：
 * - `update` —— title / artist / album / artworkUrl / duration / position
 * - `playbackState` —— state（'playing'|'paused'|'stopped'）/ position / duration
 * - `setControlsEnabled` —— enabled
 * - `setBackgrounded` —— backgrounded
 */
type CsMediaSessionPlugin = {
    update(options: {
        title: string;
        artist: string;
        album: string;
        artworkUrl: string;
        duration: number;
        position: number;
    }): Promise<void>;
    playbackState(options: { state: string; position: number; duration: number }): Promise<void>;
    setControlsEnabled(options: { enabled: boolean }): Promise<void>;
    setBackgrounded(options: { backgrounded: boolean }): Promise<void>;
    addListener(
        eventName: 'mediaCommand',
        listenerFunc: (payload: { command: string; position?: number }) => void,
    ): Promise<{ remove: () => Promise<void> }>;
};

/**
 * 原生插件实例。
 *
 * **缓存成单例**：`registerPlugin` 每调一次都会在控制台打一条
 * `Capacitor plugin "CsMediaSession" already registered. Cannot register plugins twice.`
 * —— `registerPlugin` 本身是幂等的（返回同一个代理），但那句警告很吵，
 * 而且容易让人以为插件注册出了问题。取一次存起来就够了。
 */
let pluginInstance: CsMediaSessionPlugin | undefined;
const plugin = (): CsMediaSessionPlugin => {
    if (!pluginInstance) {
        pluginInstance = registerPlugin<CsMediaSessionPlugin>('CsMediaSession');
    }
    return pluginInstance;
};

/** 原生那边来的动作，转给播放器。 */
type MediaCommandHandlers = {
    play?: () => void;
    pause?: () => void;
    previous?: () => void;
    next?: () => void;
    seek?: (positionMs: number) => void;
};

let commandHandlers: MediaCommandHandlers = {};

/** 原生插件就绪了吗（桌面上没有这个插件，所以是 false）。 */
export const hasNativeMediaSession = (): boolean => (
    typeof window !== 'undefined' && Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.())
);

/**
 * 让原生会话跟上当前的曲目与状态。
 *
 * 每次播放状态或曲目变了就调它一次 —— 原生那边会更新通知与灵动岛。
 */
export const publishNativeMediaSession = async (options: {
    song: SongResult | null;
    title: string;
    artist: string;
    album: string;
    artworkUrl: string;
    durationMs: number;
    positionMs: number;
    playing: boolean;
}): Promise<void> => {
    if (!hasNativeMediaSession()) return;
    try {
        const session = plugin();
        // **两步各自兜住**：不能写成 `await update(); await playbackState();`
        // 的串行链 —— 前面那一步一旦挂住（原生没 resolve）或抛错，后面那一步就
        // 永远不会执行，播放状态就永远停在 NONE（真机实测过这个坑）。
        // 曲目信息与播放状态是**两件独立的事**，一个失败不该拖垮另一个。
        await Promise.all([
            session.update({
                title: options.title,
                artist: options.artist,
                album: options.album,
                artworkUrl: options.artworkUrl,
                duration: Math.max(0, Math.round(options.durationMs)),
                position: Math.max(0, Math.round(options.positionMs)),
            }).catch(error => {
                console.warn('[MobileMediaSession] Publishing the track failed:', error);
            }),
            session.playbackState({
                state: options.playing ? 'playing' : 'paused',
                position: Math.max(0, Math.round(options.positionMs)),
                duration: Math.max(0, Math.round(options.durationMs)),
            }).catch(error => {
                console.warn('[MobileMediaSession] Publishing the playback state failed:', error);
            }),
        ]);
    } catch (error) {
        console.warn('[MobileMediaSession] Publishing to the native session failed:', error);
    }
};

/**
 * 接上原生来的控制动作。
 *
 * 返回一个取消函数（组件卸载时调用）。
 */
export const listenNativeMediaCommands = async (
    handlers: MediaCommandHandlers,
): Promise<() => void> => {
    if (!hasNativeMediaSession()) return () => {};
    commandHandlers = handlers;
    try {
        const handle = await plugin().addListener('mediaCommand', payload => {
            const command = String(payload?.command ?? '');
            if (command === 'play') commandHandlers.play?.();
            else if (command === 'pause') commandHandlers.pause?.();
            else if (command === 'previous') commandHandlers.previous?.();
            else if (command === 'next') commandHandlers.next?.();
            else if (command === 'seek' && typeof payload?.position === 'number') {
                commandHandlers.seek?.(payload.position);
            }
        });
        return () => {
            commandHandlers = {};
            void handle.remove();
        };
    } catch (error) {
        console.warn('[MobileMediaSession] Listening to the native commands failed:', error);
        return () => {};
    }
};

/**
 * 前后台切换：后台时把歌词动画停住。
 *
 * 音频是 `<audio>` 元素，WebView 在后台照常播 —— 停的只是画面。
 *
 * 复用桌面的那个 store（`useBackgroundLyricHoldStore`）：可视化器与歌词动画本来
 * 就认它，手机版把它设成 `held` 就等于「歌词动画停在原地」。
 *
 * ## iOS 上不能只靠 `visibilitychange`
 *
 * iOS 的 WKWebView 进后台时**会挂起 JS 线程** —— `visibilitychange` 可能延迟好几秒
 * 甚至根本不触发（实测：iOS 16.4 的 WKWebView 里触发率只有六成左右）。那就意味着
 * 歌词动画与可视化器会在后台**继续跑**，白白耗电。
 *
 * 所以 iOS 上额外听 `@capacitor/app` 的 `pause`/`resume` 事件 —— 那是由**原生**
 * 的 `UIApplication.didEnterBackgroundNotification` / `willEnterForegroundNotification`
 * 推过来的，比 Web 侧的可见性事件可靠得多。
 *
 * Android 上仍然靠 `visibilitychange`：那边 WebView 不会被挂起，事件可靠，而且
 * `@capacitor/app` 那套是同一份代码，多接一份只是多一次事件。
 */
export const trackMobileBackgroundState = (): (() => void) => {
    const sync = () => {
        const hidden = document.visibilityState === 'hidden';
        if (useBackgroundLyricHoldStore.getState().held !== hidden) {
            useBackgroundLyricHoldStore.setState({ held: hidden });
        }
        if (hasNativeMediaSession()) {
            void plugin().setBackgrounded({ backgrounded: hidden }).catch(() => {});
        }
    };
    /** 直接按「在不在后台」设一次（原生事件比 visibility 可靠，两边都要）。 */
    const setHeld = (hidden: boolean) => {
        if (useBackgroundLyricHoldStore.getState().held !== hidden) {
            useBackgroundLyricHoldStore.setState({ held: hidden });
        }
        if (hasNativeMediaSession()) {
            void plugin().setBackgrounded({ backgrounded: hidden }).catch(() => {});
        }
    };

    document.addEventListener('visibilitychange', sync);
    sync();

    // 原生的前后台事件（iOS 上靠它才靠谱）。
    //
    // 动态 import：桌面上没有这个插件 —— 那时整个手机版的代码都不跑，但静态导入
    // 会让打包器把它拖进来（多几 KB），而且 `registerPlugin` 在没有原生实现时
    // 会在控制台报错。
    const disposers: Array<() => void> = [];
    void import('@capacitor/app')
        .then(({ App }) => {
            void App.addListener('pause', () => setHeld(true)).then(handle => {
                disposers.push(() => void handle.remove());
            });
            void App.addListener('resume', () => setHeld(false)).then(handle => {
                disposers.push(() => void handle.remove());
            });
        })
        .catch(error => {
            console.warn('[MobileMediaSession] The app state listeners could not be installed:', error);
        });

    return () => {
        document.removeEventListener('visibilitychange', sync);
        disposers.forEach(dispose => dispose());
        useBackgroundLyricHoldStore.setState({ held: false });
    };
};
