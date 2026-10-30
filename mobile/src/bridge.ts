import { Capacitor, registerPlugin } from '@capacitor/core';
// 原生插件**集中注册**在一处（见 nativePlugins.ts 的说明：
// 重复 registerPlugin 会刷「already registered」的警告，盖掉真正的错误信息）。
import { CsHttp, Preferences } from './nativePlugins';
import type { SongResult } from '../../src/types';
import { buildSourceHostHtml } from './sourceHost';
import { registerMobileProviders } from './mobileProviders';
import { getOnlineMusicProvider } from '../../src/services/onlineMusic/providerRegistry';
// 桥挂上后要告诉渲染层「现在是手机版」（写 <html data-runtime="mobile">）。
import { syncRuntimeAttribute } from '../../src/utils/mobileRuntime';
// 汽水的平台代理（协议在 npm 包里，这里只把桌面的两个依赖换成手机版的）。
import { qishuiRequest } from './qishuiBridge';
// 波点的平台代理（协议在 npm 包里；包的 HTTP 层是 Node 流式，这里做了伪流式适配）。
import { bodianRequest } from './bodianBridge';
import { inflateBytes } from './inflate';

// mobile/src/bridge.ts
// 手机版的「桥」—— 桌面那边是 electron/preload.cjs 暴露的 window.electron，
// 这里暴露**同形状**的一份，所以渲染层（src/）两边共用，不用改。
//
// 桌面与手机真正不同的能力，各自用不同的办法实现：
// - 自定义源（音乐源）：桌面上每个源跑在一个隐藏 BrowserWindow 里；手机上跑在
//   **iframe** 里，脚本用 postMessage 与这里对话。
// - HTTP 请求：桌面上走 Electron 的 net（系统代理与证书链）；手机上走原生插件
//   （CapacitorHttp），绕开 WebView 的跨域限制。
// - 设置与缓存：桌面上是 electron-store 与磁盘；手机上是 Preferences 与
//   Filesystem。


// ---- 自定义源的 iframe 宿主 ------------------------------------------------

type SourceRequest = {
    id: string;
    source: string;
    action: string;
    info: unknown;
};

const running = new Map<string, RunningSource>();
let requestSeq = 0;


/** 落雪协议里 info 的平台（wy/kg/tx/...）—— 不知道平台就没法问。 */
const sourceOfRequestInfo = (info: unknown): string | null => {
    const source = (info as { source?: string })?.source;
    if (typeof source === 'string' && source) return source;
    // 有的调用方把平台放在 musicInfo 里。
    const musicInfo = (info as { musicInfo?: { source?: string } })?.musicInfo;
    if (typeof musicInfo?.source === 'string' && musicInfo.source) return musicInfo.source;
    return null;
};

/** 音质：源声明了哪些就给哪个（按落雪自己的排序）。 */
const QUALITY_ORDER = ['128k', '320k', 'flac', 'flac24bit'];

const resolveAskedQuality = (requested: string | undefined, declared: string[]): string => {
    if (!requested) return requested ?? '';
    if (declared.length === 0) return requested;
    if (declared.includes(requested)) return requested;
    const rank = QUALITY_ORDER.indexOf(requested);
    if (rank < 0) return declared[0];
    // 找它下面第一个源也有的（往下找更差的那一档）。
    for (let i = rank + 1; i < QUALITY_ORDER.length; i++) {
        if (declared.includes(QUALITY_ORDER[i])) return QUALITY_ORDER[i];
    }
    // 源只有比它更好的 —— 给源声明里最接近的那一档。
    for (let i = rank - 1; i >= 0; i--) {
        if (declared.includes(QUALITY_ORDER[i])) return QUALITY_ORDER[i];
    }
    return declared[0];
};


/**
 * 源脚本的正文是**压缩**着存的（`gz_` + base64(deflate)）—— 桌面上由主进程
 * 用 Node 的 zlib 解开。手机上没有 Node，但浏览器有 DecompressionStream
 * （deflate-raw 就是它）。
 *
 * 明文的（不是 gz_ 开头）直接用。
 */
const inflateScript = async (script: string): Promise<string> => {
    if (!script) return '';
    if (!script.startsWith('gz_')) return script;
    const bytes = Uint8Array.from(atob(script.substring(3)), c => c.charCodeAt(0));
    // 两种都试：桌面上写的是 deflate（zlib 头），而 raw deflate 是另一种实现。
    // 顺序有讲究 —— 先试带头的（那是这个格式的来源），再试 raw。
    //
    // 真机上只认 'deflate'：Android 的 WebView 试 'deflate-raw' 会报
    // 「Failed to fetch」，而 'deflate' 直接好。所以这里两个都要试，不能只写一个。
    for (const format of ['deflate', 'deflate-raw'] as const) {
        try {
            // 解压本身在 `inflate.ts`：有原生的 `DecompressionStream` 就用它，没有（老 WebView）
            // 就用 fflate —— 两条路结果一样。
            const text = await inflateBytes(bytes, format);
            if (text) return text;
        } catch (error) {
            // 换一种格式再试。
        }
    }
    console.warn('[Source] the script could not be unpacked');
    return '';
};

/** 问源要一个结果的答复。 */
type SourceAnswer = { ok: boolean; result?: unknown; message?: string };

/** 源脚本（宿主里的）通过 postMessage 发来的消息。 */
type SourceMessage = {
    /** 标记这是源宿主的消息（别与应用自己的消息混了）。 */
    __sakureSource?: boolean;
    kind: 'init' | 'init-error' | 'http' | 'response' | 'update-alert';
    payload?: unknown;
};

/** 正在跑的源：iframe 与它的状态。 */
type RunningSource = {
    id: string;
    frame: HTMLIFrameElement;
    /** 源声明完自己的能力了。 */
    ready: boolean;
    /** 源自己声明了什么（界面要显示它支持哪些平台）。 */
    declared: { sources?: Record<string, unknown> } | null;
    /** 脚本在初始化时报的错。 */
    error: string | null;
    /** 正在等着的请求（问源要结果的那些）。 */
    pending: Map<string, { resolve: (value: SourceAnswer) => void }>;
};

/**
 * 源脚本的 HTTP 请求经这里转发给原生（跨域）。
 *
 * 走原生是因为 WebView 的 fetch 受同源策略管 —— 音乐源要问各家平台的接口，
 * 那些都不是本应用的域。
 */
const requestFromSource = async (
    options: { url: string; method: string; headers?: Record<string, string> | null; body?: string | null; timeout?: number },
) => {
    try {
        const result = await CsHttp.request({
            url: options.url,
            method: options.method.toUpperCase(),
            headers: options.headers ?? {},
            body: options.body ?? undefined,
            responseType: 'text',
            timeout: options.timeout ?? 30_000,
        });
        return {
            error: undefined as string | undefined,
            response: {
                statusCode: result.status,
                headers: result.headers ?? {},
                body: result.data ?? '',
            },
            body: result.data ?? '',
        };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : String(error),
            response: { statusCode: 0, headers: {}, body: '' },
            body: '',
        };
    }
};

/** 源宿主发来的消息进来了。 */
const onSourceMessage = async (event: MessageEvent) => {
    const data = event.data as SourceMessage | undefined;
    if (!data || data.__sakureSource !== true) return;

    // 找出是哪个源发的（宿主在同源里，用 event.source 认人最准）。
    let state: RunningSource | undefined;
    for (const candidate of running.values()) {
        if (candidate.frame.contentWindow === event.source) {
            state = candidate;
            break;
        }
    }
    if (!state) return;

    if (data.kind === 'init') {
        state.ready = true;
        state.declared = (data.payload as { sources?: Record<string, unknown> }) ?? null;
        return;
    }
    if (data.kind === 'init-error') {
        state.error = String((data.payload as { message?: string })?.message ?? data.payload ?? 'unknown error');
        console.warn(`[Source] ${state.id} failed to start:`, state.error);
        return;
    }
    if (data.kind === 'http') {
        // 源要发一个 http 请求：原生发出去，回包给宿主。
        const payload = data.payload as {
            requestKey: string;
            url: string;
            method: string;
            headers?: Record<string, string> | null;
            body?: string | null;
            timeout?: number;
        };
        const result = await requestFromSource({
            url: payload.url,
            method: payload.method || 'get',
            headers: payload.headers,
            body: payload.body,
            timeout: payload.timeout,
        });
        state.frame.contentWindow?.postMessage({
            __sakureSourceHost: true,
            kind: 'http-result',
            requestKey: payload.requestKey,
            error: result.error,
            response: result.response,
            body: result.body,
        }, '*');
        return;
    }
    if (data.kind === 'response') {
        // 源处理完一个请求（外层发起的那个，比如要一个播放地址）。
        // 宿主回的是 { requestKey, ok, result | message }。
        const payload = data.payload as { requestKey?: string; ok?: boolean; result?: unknown; message?: string };
        const waiter = payload.requestKey ? state.pending.get(payload.requestKey) : undefined;
        if (waiter && payload.requestKey) {
            state.pending.delete(payload.requestKey);
            waiter.resolve({
                ok: payload.ok === true,
                result: payload.result,
                message: payload.message,
            });
        }
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('message', onSourceMessage);
}

/**
 * 起一个源：造一个宿主文档（里面有 lx 与源脚本），塞进一个隐藏的 iframe。
 *
 * 为什么要宿主文档而不是把脚本直接当 blob 载入：脚本的顶层代码要调
 * `lx.on('request', ...)`，而 lx 是宿主提供的 —— 没有宿主，脚本连自己的能力
 * 都声明不了，一个请求也发不出去（那正是「连不上源」的原因）。
 */
const startSource = async (id: string, script: string, entry: Record<string, unknown>) => {
    stopSource(id);

    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.dataset.sakureSource = id;
    // 宿主文档里要跟外层说话（postMessage），同源即可。
    document.body.appendChild(frame);

    const state: RunningSource = {
        id,
        frame,
        ready: false,
        declared: null,
        error: null,
        pending: new Map(),
    };
    running.set(id, state);

    // 用 srcdoc 而不是 blob URL：srcdoc 是**同步**的（内容直接给它，不用来回
    // 取一次 blob），所以不会出现「先空一下再显示」的那一闪 —— 那一闪在深色
    // 界面上就是黑屏。
    //
    // sandbox 要 allow-same-origin：宿主文档要与外层同源（它要 postMessage 回来，
    // 而且 srcdoc 的来源就是当前页）。allow-scripts 是脚本自己要的。
    // 脚本正文是压缩存的，先解开（桌面上是主进程解的，这里浏览器解）。
    const plain = await inflateScript(script);
    if (!plain) {
        state.error = 'the script could not be unpacked';
        return;
    }
    const html = buildSourceHostHtml(plain, entry);
    frame.srcdoc = html;

    // 等源声明完自己的能力（它声明完才算「就绪」）。
    await new Promise<void>(resolve => {
        const deadline = Date.now() + 8000;
        const check = () => {
            if (state.ready || state.error || Date.now() > deadline) {
                resolve();
                return;
            }
            setTimeout(check, 60);
        };
        check();
    });
};

/** 停一个源：把 iframe 拿掉，它里面的一切随之消失。 */
const stopSource = (id: string) => {
    const state = running.get(id);
    if (!state) return;
    for (const waiter of state.pending.values()) {
        waiter.resolve({ ok: false, message: 'the source was stopped' });
    }
    state.pending.clear();
    // 先把 src 清掉再拿掉 iframe：不清的话那个文档还在跑它的定时器。
    try {
        state.frame.src = 'about:blank';
    } catch {
        // 已经没了就算了。
    }
    state.frame.remove();
    running.delete(id);
};

/**
 * 向一个源要一个结果（要播放地址、要歌词……）。
 *
 * 走的是落雪协议：外层发 {source, action, info}，源用它的 request 处理器回答。
 */
const askSource = async (
    id: string,
    source: string,
    action: string,
    info: unknown,
): Promise<SourceAnswer> => {
    const state = running.get(id);
    if (!state) return { ok: false, message: 'the source is not running' };
    if (!state.ready) return { ok: false, message: state.error || 'the source is not ready' };

    const requestKey = `q${Date.now().toString(36)}`;
    const answer = new Promise<SourceAnswer>(resolve => {
        state.pending.set(requestKey, { resolve });
        // 兜底：源不回答也不能一直等着。
        setTimeout(() => {
            if (state.pending.has(requestKey)) {
                state.pending.delete(requestKey);
                resolve({ ok: false, message: 'the source did not answer' });
            }
        }, 20_000);
    });

    state.frame.contentWindow?.postMessage({
        __sakureSourceHost: true,
        kind: 'request',
        payload: { requestKey, source, action, info },
    }, '*');

    return answer;
};

// ---- 桥 --------------------------------------------------------------------

/**
 * 这块屏幕是平板还是手机。
 *
 * 桥自己判断，而不是让渲染层去猜 —— 渲染层拿得到 `window.innerWidth`，但它
 * 不知道「当前这个壳跑在什么设备上」，而原生那边知道。
 *
 * 用**视口短边**判断：手机横过来之后长边有 852px（iPhone 15 Pro 横屏
 * 852×393），按长边判会把手机误认成平板；短边才是「这块屏幕最小的那一边」，
 * 横竖屏都不变。
 *
 * 阈值 700：手机（连最大的 Pro Max 横屏 430）都在下面，iPad（含 iPad mini
 * 竖屏 744）都在上面。
 */
const isTabletDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    return Math.min(width, height) >= 700;
};

/**
 * 手机版的 window.electron。形状与桌面那边一样。
 *
 * `platform` 用 Capacitor 报的真实平台名 —— 原来写死 `'android'`，于是 iOS 上
 * 也报 android，渲染层那些「按平台分流」的逻辑全跑错了边。
 */
const bridge = {
    platform: Capacitor.getPlatform() as 'android' | 'ios',
    isMobile: true,
    /**
     * 这块屏是平板（iPad）吗。
     *
     * 平板走**完整版**路径：不关毛玻璃、不关 will-change、视觉器不受限 ——
     * 那些降级是为 Android WebView 的合成器准备的，iPad 的 GPU 与内存都够。
     */
    isTablet: isTabletDevice(),
    /**
     * 现在这块屏还是平板吗（转屏 / 分屏后可能变）。
     *
     * `isTablet` 是**安装时**算的一次快照 —— 转屏不影响它（短边不变），但
     * iPad 的分屏会：分屏后视口可能只剩 400×1180（短边 400 → 该按手机降级）。
     * 渲染层在 resize 时调这个重新问一次。
     */
    isTabletNow: () => isTabletDevice(),

    // --- 平台代理（汽水）---
    //
    // 桌面上汽水由主进程代理（`electron/qishui/qishuiApiBridge.cjs`），手机版没有主进程，
    // 但协议在 npm 包 `qishui-music-api` 里 —— 用原生 HTTP（CsHttp）+ Preferences
    // 就能跑。渲染层靠「这个方法在不在」判断平台可用（`qishuiTransport.ts`），
    // 所以挂上它，汽水就自动出现在搜索来源里，**渲染层一行都不用改**。
    qishuiRequest,

    // --- 平台代理（波点）---
    //
    // 与汽水同理：协议在 npm 包 `bodian-music-api` 里，手机版用原生 HTTP + Preferences
    // 跑。渲染层靠「这个方法在不在」判断可用（`bodianTransport.ts`），挂上即可。
    bodianRequest,

    // --- 自定义源（音乐源）---
    customSource: {
        list: async () => listSourcesWithState(),
        importScript: async (script: string) => importScript(script),
        importScriptFromUrl: async (url: string) => importScriptFromUrl(url),
        remove: async (ids: string[]) => {
            await removeSources(ids);
            return listSourcesWithState();
        },
        // 这两个与桌面的 `runtime.list()` **同形**：返回整个列表（每条带 running/sources/error），
        // 不是布尔。
        //
        // 形状必须一致：渲染层（CustomSourcePage）把返回值直接塞进 state 再当作数组渲染
        // （`setSources(await setCustomSourceEnabled(...))`），拿到布尔就会在下一个渲染周期
        // 里报 `sources.map is not a function` —— React 崩掉，用户看到的就是「打开/关闭源
        // 时整页黑屏」。桌面的 IPC 那边返回的正是 `runtime.list()`，所以这里也返回列表。
        setEnabled: async (id: string, enabled: boolean) => {
            await setSourceEnabled(id, enabled);
            return listSourcesWithState();
        },
        setAllowUpdateAlert: async (id: string, allow: boolean) => {
            await setSourceAllowUpdateAlert(id, allow);
            return listSourcesWithState();
        },
        openDevTools: async () => false,
        request: async (id: string, source: string, action: string, info: unknown) => (
            askSource(id, source, action, info)
        ),
        // 与桌面那份同形：{ sourceId, result } 或 { sourceId: null, result: null, reason }。
        // reason 让界面能说出**为什么**没有地址（没装源 / 源没起来 / 不接这个平台 /
        // 被限流 / 源没答出地址）—— 这几种用户要做的事不一样。
        requestFromAny: async (action: string, info: unknown) => {
            const platform = sourceOfRequestInfo(info);
            if (!platform) return { sourceId: null, result: null, reason: 'unknown-platform' };

            const entries = (await listSources()).filter(entry => entry.enabled !== false);
            if (entries.length === 0) return { sourceId: null, result: null, reason: 'no-source' };

            let notReady = 0;
            let supporting = 0;
            for (const entry of entries) {
                const state = running.get(entry.id);
                if (!state || !state.ready) {
                    notReady++;
                    continue;
                }
                const declared = (state.declared?.sources as Record<string, { actions?: string[]; qualitys?: string[] }> | undefined)?.[platform];
                if (!declared || !declared.actions?.includes(action)) continue;
                supporting++;

                // 要的音质按这个源声明的来（info.type 就是音质）。
                const asked = {
                    ...(info as Record<string, unknown>),
                    type: resolveAskedQuality((info as { type?: string })?.type, declared.qualitys ?? []),
                };
                const answer = await askSource(entry.id, platform, action, asked);
                if (answer.ok && answer.result != null) {
                    return { sourceId: entry.id, result: answer.result };
                }
            }
            if (supporting === 0) {
                // 装着的源都还没起来：是「还没准备好」，不是「不接这个平台」。
                return notReady > 0
                    ? { sourceId: null, result: null, reason: 'not-ready' }
                    : { sourceId: null, result: null, reason: 'unsupported-platform' };
            }
            // 源被问了却没答出地址 —— 这才是「源坏了」那一种。
            return { sourceId: null, result: null, reason: 'no-answer' };
        },
        openHomepage: async (url: string) => {
            if (/^https?:\/\//.test(url)) window.open(url, '_blank');
            return true;
        },
        readClipboardText: async () => readClipboard(),
        readScriptFile: async () => '',
    },

    // --- 存储与设置 ---
    getSettings: async () => getSettings(),
    saveSettings: async (settings: unknown) => saveSettings(settings),
    setNativeTheme: async () => true,
    setAppLocale: async () => true,

    // --- 窗口（手机上没有，就地返回）---
    minimizeWindow: async () => false,
    toggleFullscreenWindow: async () => false,
    toggleMaximizeWindow: async () => false,
    isWindowMaximized: async () => false,
    isWindowFullscreen: async () => false,
    closeWindow: async () => false,
    quitApp: async () => false,
    openDevTools: async () => false,
    setMainWindowAlwaysOnTop: async () => false,
    getMainWindowAlwaysOnTop: async () => false,
    setWindowTransparentMode: async () => false,
    getWindowTransparentMode: async () => false,
    setMainWindowClickThroughEnabled: async () => false,
    getMainWindowClickThroughEnabled: async () => false,
    onMainWindowClickThroughChanged: () => () => {},
    onWindowFullscreenChanged: () => () => {},

    // --- 外部链接 ---
    openExternalUrl: async (url: string) => {
        if (/^https?:\/\//.test(url)) window.open(url, '_blank');
        return true;
    },
    openHomepage: async (url: string) => {
        if (/^https?:\/\//.test(url)) window.open(url, '_blank');
        return true;
    },

    // --- 剪贴板 ---
    readClipboardText: async () => readClipboard(),

    // --- 缓存（手机上不做磁盘缓存）---
    getAudioCache: async () => null,
    hasAudioCache: async () => false,
    saveAudioCache: async () => false,
    removeAudioCache: async () => false,
    clearAudioCache: async () => false,
    getCoverCache: async () => null,
    hasLocalCoverAsset: async () => false,
    getCacheDirectory: async () => '',
    setCacheDirectory: async () => false,
    resetCacheDirectory: async () => false,

    // --- 更新（手机上不查）---
    checkForUpdates: async () => ({ available: false, current: '0.1.0' }),
    getUpdateStatus: async () => ({ state: 'idle' }),
    onUpdateStatusChanged: () => () => {},
    markUpdateSeen: async () => true,

    // --- 其它桌面专有的（就地返回）---
    getGpuPreferenceState: async () => ({ preference: 'auto' }),
    getBackgroundThrottlingState: async () => ({ disabled: false }),
    onBackgroundThrottlingChanged: () => () => {},
    getFfmpegStatus: async () => ({ available: false }),
    getAutomixModelsPresent: async () => false,
    getBeatThisGpuWeights: async () => false,
    getHtdemucsGpuWeights: async () => false,
    separateStems: async () => false,
    runBeatThis: async () => false,
    getLyricApiStatus: async () => ({ enabled: false }),
    setLyricApiEnabled: async () => false,
    onLyricApiStatusChanged: () => () => {},
    getNeteaseApiStatus: async () => ({ running: false }),
    onNeteaseApiStatusChanged: () => () => {},
    getKugouApiStatus: async () => ({ running: false }),
    getQqApiStatus: async () => ({ running: false }),
    onKugouApiStatusChanged: () => () => {},
    onQqApiStatusChanged: () => () => {},
    getDiscordPresenceStatus: async () => ({ available: false }),
    onDiscordPresenceStatusChanged: () => () => {},
    publishDiscordPresenceSnapshot: async () => false,
    getObsBrowserSourceStatus: async () => ({ available: false }),
    onObsBrowserSourceStatusChanged: () => () => {},
    publishObsBrowserSourceAudio: async () => false,
    publishObsBrowserSourceClock: async () => false,
    publishObsBrowserSourceConfig: async () => false,
    regenerateObsBrowserSourceToken: async () => '',
    getGlobalShortcutBackend: async () => '',
    setGlobalShortcuts: async () => false,
    onGlobalShortcut: () => () => {},
    getWallpaperDisplays: async () => [],
    onWallpaperDisplaysChanged: () => () => {},
    setWallpaperDisplay: async () => false,
    onWallpaperModeChanged: () => () => {},
    onWallpaperEntryRequested: () => () => {},
    onWallpaperInputMonitorRequested: () => () => {},
    onWallpaperAccessibilitySuggested: () => () => {},
    onWallpaperTransparentRefused: () => () => {},
    setWallpaperHitRegions: async () => false,
    updateTaskbarControls: async () => false,
    getTaskbarControl: async () => null,
    onTaskbarControl: () => () => {},
    openRemoteControl: async () => false,
    closeRemoteControl: async () => false,
    toggleRemoteControl: async () => false,
    getRemoteControlSnapshot: async () => null,
    onRemoteControlSnapshot: () => () => {},
    sendRemoteControlCommand: async () => false,
    getRemoteControlWindowSettings: async () => null,
    onRemoteControlWindowSettingsChanged: () => () => {},
    getRemoteControlAlwaysOnTop: async () => false,
    setRemoteControlAlwaysOnTop: async () => false,
    onRemoteControlPointerInside: () => () => {},
    onRemoteControlCommand: () => () => {},
    getRemoteControlPointerInside: async () => false,
    getVoiceInputPauseStatus: async () => ({ paused: false }),
    onVoiceInputStateChanged: () => () => {},
    getPlaybackSyncBridgeStatus: async () => ({ available: false }),
    onPlaybackSyncBridgeStatusChanged: () => () => {},
    consumeWindowPlaybackHandoff: async () => null,
    submitWindowPlaybackHandoff: async () => false,
    onWindowPlaybackHandoffRequested: () => () => {},
    onStageSessionUpdated: () => () => {},
    onStageSessionCleared: () => () => {},
    onStageExternalPlayRequest: () => () => {},
    completeStageExternalPlayRequest: async () => false,
    onStagePlayerControlRequest: () => () => {},
    completeStagePlayerControlRequest: async () => false,
    onStagePlayerQueueRequest: () => () => {},
    completeStagePlayerQueueRequest: async () => false,
    publishStagePlayerSnapshot: async () => false,
    getStageStatus: async () => ({ active: false }),
    setStageEnabled: async () => false,
    clearStageState: async () => false,
    setEnabled: async () => false,
    // --- 平台 API（桌面上是 Node 后端；手机版没有，所以**不提供**这些接口）---
    //
    // 落雪本身 playback: false，地址全靠音乐源给；那几个平台后端在手机上没有对应实现。
    //
    // 为什么是「不提供」而不是「给一个假实现」：各平台的 transport 用
    // `window.electron?.<平台>Request` 来判断「有没有后端可用」。给了假实现，它们会以为
    // 后端在，于是把请求发给那个假实现——拿回来的是 `{status: 0, error: 'not available'}`，
    // 一片假数据，比干脆找不到更坏（歌词会以为「取到了」，其实是空的）。
    //
    // 不提供之后：
    // - 桌面专属的平台（波点、汽水、YouTube Music、Spotify）正确地报「需要桌面版」；
    // - 酷狗的 transport 改走它自己的 HTTP 通道（浏览器 fetch，被手机版的跨域补丁接管，
    //   见 `mobileFetchPatch.ts`）；
    // - 网易云的 transport 发现没有内嵌后端，改问平台自己的公开接口。
    //
    // 平台搜索与歌词在手机版另有实现（`platformSearch.ts` / `platformLyrics.ts`），
    // 不依赖这些接口。
    runLoginSelfCheck: async () => ({ ok: false }),
    getLoginDiagnostics: async () => null,

    // --- 歌词代理（手机版直连即可）---
    fetchLyricProxy: async (url: string) => {
        const result = await CsHttp.request({ url, method: 'GET', responseType: 'text', timeout: 15_000 });
        return result.data ?? '';
    },
    publishLyricApiData: async () => false,

    // --- AI（手机版这一版不做）---
    listAiModels: async () => [],
    testAiConnection: async () => ({ ok: false }),

    // --- 更新（手机版不查自己）---
    downloadUpdate: async () => false,
    quitAndInstallUpdate: async () => false,
    openUpdateReleasePage: async () => false,

    // --- 覆盖缓存与模型（手机版不做）---
    getAudioCacheStats: async () => null,
    getAudioCacheUsage: async () => ({ bytes: 0 }),
    getCoverCacheUsage: async () => ({ bytes: 0 }),
    clearCoverCache: async () => false,
    removeCoverCache: async () => false,
    saveCoverCache: async () => false,
    saveLocalCoverAsset: async () => false,
    removeLocalCoverAsset: async () => false,
    setAutomixEnabled: async () => false,
    checkLegacyModels: async () => false,
    openLegacyModelsFolder: async () => false,
    resolveLegacyModels: async () => null,
    cancelTranscodeFallback: async () => false,
    requestTranscodeFallback: async () => false,
    setPlaybackDisplaySleepBlockingActive: async () => false,
    reportDevicePixelRatio: async () => false,
    onDebugMemorySample: () => () => {},
    setMainWindowClickThroughUnlockHover: async () => false,
    setObsBrowserSourceEnabled: async () => false,
    regenerateStageToken: async () => '',
    openExternalUrlAsync: async () => false,
};

// ---- 存储与源的实现（放在这里是为了让桥保持一个形状）------------------------

type SourceEntry = {
    id: string;
    name: string;
    description?: string;
    author?: string;
    homepage?: string;
    version?: string;
    enabled?: boolean;
    allowShowUpdateAlert?: boolean;
    script: string;
};

/** 源存哪：Capacitor Preferences（手机版的 electron-store）。 */
const SOURCES_KEY = 'sakure.userSources';
const SETTINGS_KEY = 'sakure.settings';


const readJson = async <T>(key: string, fallback: T): Promise<T> => {
    try {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) as T : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = async (key: string, value: unknown): Promise<void> => {
    try {
        await Preferences.set({ key, value: JSON.stringify(value) });
    } catch {
        // 存不下就算了（与桌面上一样：存不下就在这次会话里留着）。
    }
};

/** 列出全部源及其运行状态（与桌面那份同形：running 与 sources 是渲染层要用的）。 */
const listSourcesWithState = async () => {
    const entries = await listSources();
    return entries.map(entry => {
        const state = running.get(entry.id);
        return {
            ...entry,
            running: Boolean(state?.ready),
            sources: state?.declared?.sources ?? null,
            error: state?.error ?? null,
        };
    });
};

/**
 * 把存着的源条目整理成**两边一致**的样子。
 *
 * 桌面那边（`electron/customSource/store.cjs` 的 `getAll`）读出来时会把两个开关补齐：
 * `enabled` 缺省为 true、`allowShowUpdateAlert` 缺省为 false。手机这边原来没做，
 * 于是种子里的源（它的 JSON 里**没有** `enabled` 字段）读出来 `enabled` 是 undefined：
 * - 界面的开关显示成「关」，而源其实在跑（`startInstalledSources` 判的是 `=== false`，
 *   undefined 不等于 false，所以照跑）；
 * - 用户点一下开关，行为又对不上——它以为源是关的。
 *
 * 补齐之后，界面显示的和实际状态一致，两边的数据也能互换。
 */
const normalizeSourceEntry = (entry: SourceEntry): SourceEntry => ({
    ...entry,
    enabled: entry.enabled !== false,
    allowShowUpdateAlert: entry.allowShowUpdateAlert === true,
});

const listSources = async (): Promise<SourceEntry[]> => {
    // 读出来就归一化（两个开关补齐），与桌面 `store.cjs` 的 `getAll` 一样。
    const stored = await readJson<SourceEntry[]>(SOURCES_KEY, []);
    return stored.map(normalizeSourceEntry);
};

const saveSources = async (sources: SourceEntry[]): Promise<void> => {
    await writeJson(SOURCES_KEY, sources);
};

/**
 * 把源脚本压成 `gz_` + base64(zlib) —— 与桌面**同一份格式**。
 *
 * 桌面上是 `zlib.deflate`（`store.cjs` 的 `deflateScript`），手机上没有 Node，但浏览器有
 * `CompressionStream('deflate')`：它的 'deflate' 就是 zlib 包装（带 2 字节头），
 * 与 `zlib.deflate` 一致；`'deflate-raw'` 才是裸 deflate。
 *
 * 为什么要压：桌面的源是以这个格式存的（从落雪导出的源也是这个格式），手机存明文的话，
 * 同一份配置在两边不能互换；而且明文存着加密算法的脚本，密钥直接躺在存储里。
 */
const deflateScript = async (script: string): Promise<string> => {
    const bytes = new TextEncoder().encode(script);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    // base64：分块转，避免大字符串调 btoa 爆栈。
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < compressed.length; i += CHUNK) {
        binary += String.fromCharCode(...compressed.subarray(i, i + CHUNK));
    }
    return `gz_${btoa(binary)}`;
};

const importScript = async (script: string) => {
    const sources = await listSources();
    const info = parseScriptInfo(script);
    // 压成与桌面同格式再存（`startSource` 那边的 `inflateScript` 会解开它）。
    const stored = await deflateScript(script);
    const id = `cs-${Date.now().toString(36)}`;
    const entry: SourceEntry = {
        ...info,
        name: info.name || 'user_api',
        id,
        script: stored,
        enabled: true,
        allowShowUpdateAlert: true,
    };
    sources.push(entry);
    await saveSources(sources);
    // 起源时给**明文**（`startSource` 内部会再解一次，存的与给的都解得开）。
    await startSource(id, stored, entry as unknown as Record<string, unknown>);
    return info;
};

const importScriptFromUrl = async (url: string) => {
    const result = await CsHttp.request({ url, method: 'GET', responseType: 'text', timeout: 20_000 });
    if (result.status < 200 || result.status >= 300) {
        throw new Error(`could not fetch the script (status ${result.status})`);
    }
    return importScript(result.data);
};

const removeSources = async (ids: string[]) => {
    const sources = await listSources();
    for (const id of ids) stopSource(id);
    await saveSources(sources.filter(entry => !ids.includes(entry.id)));
    return true;
};

const setSourceEnabled = async (id: string, enabled: boolean) => {
    const sources = await listSources();
    const entry = sources.find(one => one.id === id);
    if (!entry) return false;
    entry.enabled = enabled;
    await saveSources(sources);
    if (enabled) await startSource(id, entry.script, entry as unknown as Record<string, unknown>);
    else stopSource(id);
    return true;
};

const setSourceAllowUpdateAlert = async (id: string, allow: boolean) => {
    const sources = await listSources();
    const entry = sources.find(one => one.id === id);
    if (!entry) return false;
    entry.allowShowUpdateAlert = allow;
    await saveSources(sources);
    return true;
};

const getSettings = async (): Promise<Record<string, unknown>> => (
    readJson<Record<string, unknown>>(SETTINGS_KEY, {})
);

const saveSettings = async (settings: unknown): Promise<void> => {
    await writeJson(SETTINGS_KEY, settings);
};

const Clipboard = registerPlugin<{ read(): Promise<{ value: string }> }>('Clipboard');
const readClipboard = async (): Promise<string> => {
    try {
        const { value } = await Clipboard.read();
        return value ?? '';
    } catch {
        return '';
    }
};

/** 源脚本的头部注释（落雪协议的元信息）。 */
const parseScriptInfo = (script: string): Partial<SourceEntry> => {
    const matched = /^\/\*[\S|\s]+?\*\//.exec(script);
    if (!matched) throw new Error('这不是一个有效的自定义源脚本');
    const info: Partial<SourceEntry> = {};
    for (const line of matched[0].split('\n')) {
        const found = /@(\w+)\s+(.+)/.exec(line);
        if (found) info[found[1] as 'name' | 'description' | 'author' | 'homepage' | 'version'] = found[2].trim();
    }
    return info;
};

/**
 * 桥**同步**挂上：渲染层一上来就读 window.electron（服务层到处直接读它），
 * 不能等一个 await —— 所以这一句在**模块加载时**就跑了，而不是在某个函数里。
 */
if (typeof window !== 'undefined') {
    (window as unknown as { electron: unknown }).electron = bridge;
    // 桥挂上了，就告诉渲染层「现在是手机版」—— `<html data-runtime="mobile">` 靠它，
    // CSS 里 `[data-runtime='mobile']` 的降级规则（关掉毛玻璃与 will-change）才生效。
    //
    // 为什么在这里主动调一次：`mobileRuntime.ts` 的模块体跑的时候，桥**未必**已经挂上
    // （ES 模块的求值顺序不保证 `bridge` 先跑完），那时它读到 undefined，属性就写不上，
    // 手机版的降级整条都不生效（实测 `data-runtime` 为 null，毛玻璃一个没关）。
    syncRuntimeAttribute();
}

// 手机版的平台 provider（搜索走平台公开接口，播放地址问音乐源）。
// 桌面上不注册 —— 那里有真的平台 provider（带 Node 后端）。
if (typeof window !== 'undefined') {
    try {
        registerMobileProviders(options => CsHttp.request(options));
        // 请求函数也挂上去（调试用）：平台 provider 的所有请求都走它，
        // 登录这条链路出问题时就能单独试它，不用拆到调试出口的外层。
        (window as unknown as { __sakureRequest?: unknown }).__sakureRequest = (options: Parameters<typeof CsHttp.request>[0]) => CsHttp.request(options);
    } catch (error) {
        console.warn('[Mobile] the platform providers could not be registered:', error);
    }

    // 手机版的默认平台是**落雪**（lx），不是网易云。
    //
    // 落雪是聚合入口：它的搜索 fan out 到下面那几个平台 provider（每个平台一个公开
    // 接口），而播放地址它自己给不出（`playback: false`），由音乐源补上 —— 源支持
    // 五个平台。网易云那家在桌面上有 Node 后端，手机上起不来，所以不作默认。
    try {
        void import('../../src/stores/useOnlineProviderAccountStore').then(({ useOnlineProviderAccountStore }) => {
            if (getOnlineMusicProvider('lx')) {
                useOnlineProviderAccountStore.getState().setActiveProviderId('lx' as never);
            }
        });
    } catch (error) {
        console.warn('[Mobile] the active provider could not be set:', error);
    }
}

/**
 * 装好桥之后要做的异步那部分：
 * 1. 用户一个源都没有 → 装上预置的那个（星海音乐源），别人装了就能用。
 * 2. 把已装上的源起起来（用户打开应用就该能用，不用先去设置里点一下）。
 *
 * 与桌面版同一套规则：已经有源的用户**不动**（他装过别的、或删过这个源，
 * 那是他的意思）。
 */
export const startInstalledSources = async () => {
    await seedDefaultSources();

    for (const entry of await listSources()) {
        if (entry.enabled === false) continue;
        await startSource(entry.id, entry.script, entry as unknown as Record<string, unknown>);
    }
};

/** 预置的源：打包时放在 assets/public/seed/ 下（与桌面版的 extraResources 同一份）。 */
const SEED_URL = 'seed/userSources.json';

const seedDefaultSources = async () => {
    const existing = await listSources();
    if (existing.length > 0) return false;

    try {
        const response = await fetch(SEED_URL);
        if (!response.ok) return false;
        const seed = await response.json() as { sources?: SourceEntry[] };
        const sources = Array.isArray(seed?.sources) ? seed.sources : [];
        if (sources.length === 0) return false;
        await saveSources(sources);
        console.log(`[Seed] installed ${sources[0]?.name}`);
        return true;
    } catch (error) {
        console.warn('[Seed] could not read the seed file:', error);
        return false;
    }
};

export const isMobilePlatform = Capacitor.isNativePlatform();
