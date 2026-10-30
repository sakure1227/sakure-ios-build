// mobile/src/qishuiBridge.ts
//
// 汽水音乐（qishui）在手机版上的代理。
//
// ## 为什么要自己实现一份
//
// 桌面上汽水的协议由 `electron/qishui/qishuiApiBridge.cjs` 做：它把请求转给主进程，
// 会话用 Electron 的 safeStorage 加密后存进 electron-store。
//
// 手机版**没有主进程**（不内嵌 Node），但协议的本体在 npm 包 `qishui-music-api`
// 里 —— 它是纯 JS，零 Node 内置依赖，只要给它两个东西就能跑：
//
// 1. `fetch`：发 HTTP 请求 —— 用原生插件 `CsHttp`（WebView 的 fetch 受同源策略管，
//    汽水的接口不是本应用的域）。
// 2. `sessions`：会话仓库（get / set / clear + deviceId）—— 用 Capacitor Preferences
//    （对应桌面的 electron-store）。
//
// 包本身负责协议（签名、设备号、扫码登录、搜索、歌单），这里只做「把桌面的那两个
// 依赖换成手机版的」。
//
// ## 渲染层怎么用它
//
// 渲染层已经写好了约定（`src/services/onlineMusic/qishui/qishuiTransport.ts`）：
//
// - 可用性：`typeof window.electron?.qishuiRequest === 'function'` —— 桥上有这个方法
//   就算可用，界面自动把它列进搜索来源（**渲染层一行都不用改**）。
// - 调用：`qishuiRequest(operation, params)` → `{ ok: true, data }` 或
//   `{ ok: false, error: { code, message, stage?, upstreamCode? } }`。
import { CsHttp, Preferences } from './nativePlugins';
import {
    createQishuiApi,
    createQishuiDeviceId,
    isQishuiDeviceId,
    type QishuiOperation,
    type QishuiParams,
    type QishuiSession,
    type QishuiSessionStore,
} from 'qishui-music-api';

// src/types 与 vite-env.d.ts 里那两个名字对不上（那边叫 JSIntContainer），这里自己声明一份。


const DEVICE_KEY = 'QISHUI_DEVICE_ID';
const SESSION_KEY = 'QISHUI_SESSION_V1';

/**
 * 桌面端用的是 `credentials: 'omit'` —— 请求不带浏览器的 cookie，账号靠包自己的
 * 头携带（`electron/qishui/qishuiApiBridge.cjs` 里的 `withoutCookies`）。
 *
 * 原生 HTTP 本来就没有 cookie jar，所以这里不用特别处理；但**不能**把 CsHttp 返回的
 * `Set-Cookie` 手动塞回去 —— 那等于把平台的会话绑到账号上，而汽水的账号是自己那套
 * 头在带。
 */
const nativeFetch = async (
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<unknown> => {
    try {
        return await nativeFetchInner(url, options);
    } catch (error) {
        // 包会把非 QishuiError 的异常吞成「invalid-response / Qishui operation failed」，
        // 真实原因就丢了。这里先记下来（URL 的 host 与错误类型，不带凭据）。
        console.warn(
            '[Qishui] HTTP request threw:',
            error instanceof Error ? error.message : String(error),
            '| url:', url.split('?')[0],
        );
        throw error;
    }
};

const nativeFetchInner = async (
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<unknown> => {
    const result = await CsHttp.request({
        url,
        method: (options.method ?? 'GET').toUpperCase(),
        headers: options.headers ?? {},
        body: options.body,
        responseType: 'text',
        timeout: 30_000,
    });
    const body = result.data ?? '';
    // 尽量还原成 fetch 的形状：包按 `response.ok` / `response.json()` 判断。
    const text = () => body;
    return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        statusText: String(result.status),
        headers: {
            get: (name: string) => {
                const key = Object.keys(result.headers ?? {}).find(
                    h => h.toLowerCase() === name.toLowerCase(),
                );
                return key ? result.headers[key] : null;
            },
        },
        text,
        json: () => JSON.parse(body),
    };
};

/**
 * 会话仓库（对应桌面的 `electron/qishui/session.cjs`）。
 *
 * 桌面用 safeStorage 加密后存 electron-store；手机版没有 safeStorage，但
 * Capacitor Preferences 存的是 **iOS Keychain / Android 加密存储**（我们自己的
 * `CsCrypto` 插件接的就是钥匙串）—— 安全等级是一样的。
 */
const createSessions = () => {
    let current: QishuiSession | null = null;
    let loaded = false;
    let revision = 0;
    let deviceId = '';

    const load = async (): Promise<void> => {
        if (loaded) return;
        loaded = true;
        try {
            const { value } = await Preferences.get({ key: DEVICE_KEY });
            if (value && isQishuiDeviceId(value)) {
                deviceId = value;
                return;
            }
        } catch {
            // 读不到就重新生成一个（下面）。
        }
        deviceId = createQishuiDeviceId();
        try {
            await Preferences.set({ key: DEVICE_KEY, value: deviceId });
        } catch {
            // 存不下就在这次会话里用着（跟桌面一样：存不下就只在内存里）。
        }
    };

    const loadSession = async (): Promise<QishuiSession | null> => {
        if (loaded) return current;
        loaded = true;
        try {
            const { value } = await Preferences.get({ key: SESSION_KEY });
            if (value) current = JSON.parse(value);
        } catch {
            // 读不出来（旧的格式或被清了）—— 当作没登录。
        }
        return current;
    };

    return {
        get deviceId(): string {
            return deviceId;
        },
        get revision(): number {
            return revision;
        },
        async get(): Promise<QishuiSession | null> {
            return loadSession();
        },
        async set(value: QishuiSession): Promise<void> {
            loaded = true;
            current = value;
            revision += 1;
            try {
                await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(value) });
            } catch {
                // 存不下就在这次会话里留着。
            }
        },
        async clear(): Promise<void> {
            loaded = true;
            current = null;
            revision += 1;
            try {
                await Preferences.remove({ key: SESSION_KEY });
            } catch {
                // 存不下就算了。
            }
        },
        /** 初始化：把 deviceId 准备好（包的工厂在构造时就要校验它）。 */
        async ready(): Promise<void> {
            await load();
        },
    };
};

type QishuiResult =
    | { ok: true; data: unknown }
    | { ok: false; error: { code: string; message: string; stage?: string; upstreamCode?: string } };

let apiPromise: Promise<ReturnType<typeof createQishuiApi>> | null = null;

const getApi = async () => {
    if (!apiPromise) {
        apiPromise = (async () => {
            const sessions = createSessions();
            await sessions.ready();
            // 包的 store 接口是**同步**的（它不 await），而 Preferences 是异步的 ——
            // 所以这里在内存里留一份当前的会话，写盘在后台做。
            // 代价：进程刚起来、还没读完盘上的会话时，`get()` 短暂返回 null。
            // 汽水的登录态是扫码拿到的，用户不会在应用刚起的半秒内查歌单。
            let cached: QishuiSession | null = null;
            let cachedLoaded = false;
            const ensureLoaded = (): QishuiSession | null => {
                if (!cachedLoaded) {
                    cachedLoaded = true;
                    void sessions.get().then(value => {
                        if (value) cached = value;
                    });
                }
                return cached;
            };
            const store: QishuiSessionStore = {
                deviceId: sessions.deviceId,
                get revision() {
                    return sessions.revision;
                },
                get: () => ensureLoaded(),
                set: (value: QishuiSession) => {
                    cached = value;
                    cachedLoaded = true;
                    void sessions.set(value);
                },
                clear: () => {
                    cached = null;
                    cachedLoaded = true;
                    void sessions.clear();
                },
            };
            return createQishuiApi({
                sessions: store,
                deviceId: sessions.deviceId,
                fetch: nativeFetch as never,
                // 账号信息不进日志（桌面上也是这么要求的）。
                log: () => {},
                warn: () => {},
            });
        })();
    }
    return apiPromise;
};

/**
 * 渲染层调用的那个方法。形状与桌面的 `window.electron.qishuiRequest` 一致。
 */
export const qishuiRequest = async (
    operation: QishuiOperation,
    params: QishuiParams = {},
): Promise<QishuiResult> => {
    try {
        const api = await getApi();
        const result = await api.request(operation, params);
        if (result.ok) return { ok: true, data: result.data };
        return {
            ok: false,
            error: {
                code: result.error?.code ?? 'invalid-response',
                message: result.error?.message ?? 'Qishui operation failed',
            },
        };
    } catch (error) {
        // 错误只留在本地日志里；渲染层拿到的是一句固定的话（账号信息不进日志）。
        console.warn('[Qishui] request failed', operation, error instanceof Error ? error.message : String(error));
        return { ok: false, error: { code: 'invalid-response', message: 'Qishui operation failed' } };
    }
};
