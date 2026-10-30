// mobile/src/mobileAudioFocus.ts
// 手机版的「共存播放」开关。
//
// ## 这是什么
//
// 一个开关，决定「别的应用出声时，我们会不会被暂停」：
//
// - **关**（默认）：Android 的默认行为。抖音、视频号、网易云…… 一出声，系统把
//   音频焦点抢走，我们的歌自动暂停。**这跟桌面上开一个音乐 App 的行为一样。**
// - **开**：我们**照播**，两边的声音混着出。刷抖音的时候歌不中断。
//
// ## 为什么不能只在渲染层做
//
// 系统的音频焦点是**一个栈**，谁申请谁在最上面。Chromium 的 WebView 内部有个
// `AudioFocusDelegate` 替 `<audio>` 元素自动申请**永久焦点** —— 别人一来抢，
// WebView 就被通知「焦点没了」，`<audio>` 随之暂停。
//
// 那个 delegate 是 **WebView 的内部行为，没有开关**，渲染层关不掉。所以只能
// **在它暂停之后把歌接回来**（见 `useCoexistPlayback.ts`）。
//
// ## 为什么不让原生去抢焦点
//
// 试过 —— 会形成 ping-pong 死循环：原生抢焦点 → 挤掉 Chromium 那份 → Chromium
// 暂停 `<audio>` → 渲染层接回来 → Chromium 又去抢 → 挤掉原生那份 → 原生再抢 →
// 来回暂停，最后停在暂停（真机实测过）。
//
// **只让一边动**：焦点归 Chromium（它是天然的主人），我们只在它暂停之后接回来。
// 系统里的焦点栈始终只有一份，不会打架。
//
// ## 顺带说明：为什么共存时音量要自己调
//
// 两个应用同时出声时，**音量是各自独立的** —— 系统不会自动把我们压低（那是
// 「duck」，只有别的应用显式请求时才会发生）。所以共存模式下两边的音量都得
// 自己调好，这是 Android 音频混音的固有行为，任何应用都这样。

import { registerPlugin } from '@capacitor/core';
import { isAndroidRuntime } from '../../src/utils/mobilePlatform';

/**
 * 原生的媒体会话插件。
 *
 * 「共存播放」的开关状态放在**这个**插件里（`CsMediaSession.java`）—— 没有
 * 单独开一个插件，因为 Capacitor 的插件是**懒加载**的：只有 JS 真正调过它，
 * 它的实例才会被创建。通知栏上那个按钮是原生直接翻的，压根不经过 JS ——
 * 放在独立插件里，那个插件就永远不会被创建，按钮点了没反应（真机踩过）。
 *
 * `CsMediaSession` 则一定会被渲染层调用（发布播放状态），所以实例必然存在。
 */
type CsMediaSessionPlugin = {
    getCoexistMode(): Promise<{ coexistMode: boolean }>;
    setCoexistMode(options: { enabled: boolean }): Promise<{ coexistMode: boolean }>;
    reclaimFocus(): Promise<void>;
    addListener(
        eventName: 'coexistModeChanged',
        listenerFunc: (payload: { coexistMode?: boolean }) => void,
    ): Promise<{ remove: () => Promise<void> }>;
    addListener(
        eventName: 'resumeRequested',
        listenerFunc: (payload: { reason?: string }) => void,
    ): Promise<{ remove: () => Promise<void> }>;
};

let pluginInstance: CsMediaSessionPlugin | undefined;

/**
 * 原生插件实例。
 *
 * 缓存成单例：`registerPlugin` 每调一次都会在控制台打一条
 * `already registered. Cannot register plugins twice.` 的警告（它本身幂等，
 * 但那句噪声容易让人误判插件注册出了问题）。
 */
const plugin = (): CsMediaSessionPlugin => {
    if (!pluginInstance) {
        pluginInstance = registerPlugin<CsMediaSessionPlugin>('CsMediaSession');
    }
    return pluginInstance;
};

/**
 * 原生那边有吗？（桌面上没有这个插件。）
 *
 * **只认 Android** —— iOS 上没有音频焦点那套机制，「共存播放」是系统级的
 * （`AVAudioSession` 的 `mixWithOthers`），不需要开关。iOS 上走这套逻辑只会
 * 让渲染层误以为「被系统抢了焦点」而去 `play()` 恢复 —— 那是多余的断续。
 */
export const hasNativeAudioFocus = (): boolean => (
    isAndroidRuntime()
);

/**
 * 当前的共存模式。
 *
 * 读不到（桌面上、或插件还没就绪）时一律当成「关」—— 共存是手机版特有的功能，
 * 桌面那边没有这个概念。
 */
export const getCoexistMode = async (): Promise<boolean> => {
    if (!hasNativeAudioFocus()) return false;
    try {
        const result = await plugin().getCoexistMode();
        return Boolean(result?.coexistMode);
    } catch (error) {
        console.warn('[MobileAudioFocus] Reading the coexist mode failed:', error);
        return false;
    }
};

/** 打开/关闭共存播放（界面上那个开关用；通知栏的按钮是原生直接翻的）。 */
export const setCoexistMode = async (enabled: boolean): Promise<boolean> => {
    if (!hasNativeAudioFocus()) return false;
    try {
        const result = await plugin().setCoexistMode({ enabled });
        return Boolean(result?.coexistMode);
    } catch (error) {
        console.warn('[MobileAudioFocus] Setting the coexist mode failed:', error);
        return false;
    }
};

/**
 * 把焦点抢回栈顶。
 *
 * ## 为什么每次播歌都要调
 *
 * 焦点栈是**后进先出**。Chromium 的 WebView 内部有个 `AudioFocusDelegate`
 * 替 `<audio>` 元素自动申请**永久焦点** —— 抖音、网易云这些应用一来申请，
 * 就把它挤下去；Chromium 收到 `AUDIOFOCUS_LOSS` 就**把 `<audio>` 暂停掉**，
 * 这就是「打开有声音的东西，我们的歌自己就停了」。
 *
 * 那个 delegate 是 WebView 内部行为，没有开关，关不掉。但我们可以**晚一步
 * 申请**：原生每次发播放状态（换歌、播放、暂停）都调这个，正好是在 Chromium
 * 申请完之后 —— 于是我们排在它**上面**，别人来抢时被挤掉的是我们，
 * Chromium 那份收不到 LOSS，不会去暂停 `<audio>`。
 *
 * 关掉共存模式时这是空操作（焦点还给 Chromium，一切照系统默认）。
 */
export const reclaimAudioFocus = async (): Promise<void> => {
    if (!hasNativeAudioFocus()) return;
    try {
        await plugin().reclaimFocus();
    } catch (error) {
        console.warn('[MobileAudioFocus] Reclaiming the audio focus failed:', error);
    }
};

/**
 * 听「共存模式变了」的通知。
 *
 * 通知栏上的按钮是**原生直接翻**的（应用可能在后台，渲染层不一定醒着），翻完
 * 原生会发这个事件，渲染层据此更新界面上的显示。
 */
export const listenCoexistModeChanges = async (
    onChange: (coexistMode: boolean) => void,
): Promise<() => void> => {
    if (!hasNativeAudioFocus()) return () => {};
    try {
        const handle = await plugin().addListener('coexistModeChanged', payload => {
            onChange(Boolean(payload?.coexistMode));
        });
        return () => {
            void handle.remove();
        };
    } catch (error) {
        console.warn('[MobileAudioFocus] Listening to the coexist mode changes failed:', error);
        return () => {};
    }
};

/**
 * 听原生说的「焦点被抢走了，可以接一下了」。
 *
 * 原生那边持有焦点，被抢时会立刻抢回来；但**有些设备上 Chromium 那份也收到了
 * LOSS**，元素已经停了 —— 那就得渲染层把它接回来。
 *
 * 接回来的动作由 `useCoexistPlayback` 负责（它有延迟 + 限频，避免自激循环），
 * 这里只负责把事件传过去。
 */
export const listenResumeRequests = async (
    onResume: () => void,
): Promise<() => void> => {
    if (!hasNativeAudioFocus()) return () => {};
    try {
        const handle = await plugin().addListener('resumeRequested', () => {
            onResume();
        });
        return () => {
            void handle.remove();
        };
    } catch (error) {
        console.warn('[MobileAudioFocus] Listening to the resume requests failed:', error);
        return () => {};
    }
};
