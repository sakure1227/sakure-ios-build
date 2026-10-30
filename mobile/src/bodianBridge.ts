// mobile/src/bodianBridge.ts
//
// 波点音乐（bodian）在手机版上的代理。
//
// ## 为什么要自己实现一份
//
// 桌面上波点的协议由 `electron/bodian/bodianApiBridge.cjs` 做：请求转给主进程，
// 会话用 safeStorage 加密后存 electron-store。
//
// 手机版没有主进程，但协议本体在 npm 包 `bodian-music-api` 里 —— 纯 JS，零 Node
// 内置依赖的**协议逻辑**。只是它的 HTTP 层（`src/http.cjs` 的 `requestJson`）用的是
// Node 的 `https.request` 流式接口：
//
// - `requestFactory({ url, method }, onResponse)` 返回一个请求对象，要能
//   `setHeader` / `end` / `on('error')` / `destroy`；
// - `onResponse(response)` 收到的对象要能 `on('data')` / `on('error')` / `on('end')`，
//   并带 `statusCode` 与 `headers`。
//
// 原生 HTTP（`CsHttp`）是「一次拿回完整正文」的 Promise，不是流。所以这里做一个
// **伪流式**的适配：拿到完整正文后，一次性把 `data` 与 `end` 抛给它。
//
// ## 两个要小心的点
//
// 1. **gzip**：包里看到 `Content-Encoding: gzip` 且字节以 1f 8b 开头时会自己
//    `zlib.gunzipSync`。但原生 URLSession **已经解压过了**，正文不是 gzip 格式 ——
//    那个判断自然不成立（`bytes[0]` 是 `{` 而不是 0x1f）。所以这里不用管解压。
// 2. **Buffer**：包里用了 `Buffer.from` / `Buffer.concat` / `Buffer.byteLength`。
//    `vite.config.ts` 里把 `buffer` 指到了 npm 的 `buffer` 包（浏览器版实现），
//    所以这里用 `import { Buffer } from 'buffer'`。
import { Buffer } from 'buffer';
import { CsHttp, Preferences } from './nativePlugins';
import { EventEmitter } from 'events';
import {
    createBodianApi,
    type BodianOperation,
    type BodianParams,
    type BodianRequest,
    type BodianRequestFactory,
    type BodianResponse,
    type BodianSession,
    type BodianSessionStore,
} from 'bodian-music-api';



const DEVICE_KEY = 'BODIAN_DEVICE_ID';
const SESSION_KEY = 'BODIAN_SESSION_V1';

/**
 * 设备号：32 位小写十六进制（包会校验：`/^[a-f0-9]{32}$/`）。
 * 桌面上它存在 electron-store 里，这里存 Preferences。
 */
const createDeviceId = (): string => {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/** 把原生 HTTP 的响应包装成包期望的「流式」形状。 */
/** 包的响应类型是 EventEmitter；我们额外挂两个方法（一次性给正文 / 报错）。 */
type BodianResponseExtras = BodianResponse & {
    flush(): void;
    fail(message: string): void;
};

const makeResponse = (result: { status: number; headers: Record<string, string>; data: string }): BodianResponseExtras => {
    // 包的类型要求响应是 EventEmitter（它按 Node 的流式写）。这里用浏览器端的
    // `events` polyfill —— Vite 自带，不用额外装依赖。
    const emitter = new EventEmitter() as BodianResponse;
    emitter.statusCode = result.status;
    emitter.headers = Object.fromEntries(
        Object.entries(result.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    );
    return Object.assign(emitter, {
        /** 一次性把完整正文抛出去 —— 原生 HTTP 不给流。 */
        flush() {
            emitter.emit('data', Buffer.from(result.data ?? '', 'utf8'));
            emitter.emit('end');
        },
        fail(message: string) {
            emitter.emit('error', new Error(message));
        },
    });
};

type BodianResult =
    | { ok: true; data: unknown }
    | { ok: false; error: { code: string; message: string } };

let apiPromise: Promise<ReturnType<typeof createBodianApi>> | null = null;

const getApi = async () => {
    if (!apiPromise) {
        apiPromise = (async () => {
            // 设备号：先读，读不到就生成一个并记住。
            let deviceId = '';
            try {
                const { value } = await Preferences.get({ key: DEVICE_KEY });
                if (value && /^[a-f0-9]{32}$/.test(value)) deviceId = value;
            } catch {
                // 读不到就新建。
            }
            if (!deviceId) {
                deviceId = createDeviceId();
                try {
                    await Preferences.set({ key: DEVICE_KEY, value: deviceId });
                } catch {
                    // 存不下就在这次会话里用着。
                }
            }

            let current: BodianSession | null = null;
            let revision = 0;

            const sessions: BodianSessionStore = {
                get revision() {
                    return revision;
                },
                get: () => current,
                set: (value: BodianSession) => {
                    current = value;
                    revision += 1;
                    void Preferences.set({ key: SESSION_KEY, value: JSON.stringify(value) }).catch(() => {});
                },
                clear: () => {
                    current = null;
                    revision += 1;
                    void Preferences.remove({ key: SESSION_KEY }).catch(() => {});
                },
            };

            // 读回上次存的会话（包会在需要时问 sessions.get()）。
            try {
                const { value } = await Preferences.get({ key: SESSION_KEY });
                if (value) current = JSON.parse(value);
            } catch {
                // 读不出来就当作没登录。
            }

            return createBodianApi({
                deviceId,
                sessions,
                now: () => Date.now(),
                requestFactory: ((options, onResponse) => {
                    // 包会先 setHeader 再 end —— 所以头先攒着，等 end 时才发。
                    const headers: Record<string, string> = {};
                    let body = '';
                    let aborted = false;

                    // 包的请求类型也是 EventEmitter（它监听 'error'）。用浏览器端的
                    // `events` polyfill 建一个真的出来，而不是手搓一个假的。
                    const emitter = new EventEmitter();
                    const request = Object.assign(emitter, {
                        setHeader(key: string, value: string) {
                            headers[key] = value;
                            return request;
                        },
                        end(payload?: string) {
                            if (aborted) return;
                            if (typeof payload === 'string') body = payload;
                            void CsHttp.request({
                                url: options.url,
                                method: options.method,
                                headers,
                                body: body || undefined,
                                responseType: 'text',
                                timeout: 30_000,
                            }).then(result => {
                                if (aborted) return;
                                const response = makeResponse(result);
                                onResponse(response);
                                response.flush();
                            }).catch(error => {
                                if (aborted) return;
                                // 错误要两头都报：响应的 'error' 与请求的 'error'
                                // （包在请求上监听的是后者）。
                                const message = error instanceof Error ? error.message : String(error);
                                const response = makeResponse({ status: 0, headers: {}, data: '' });
                                onResponse(response);
                                response.fail(message);
                                emitter.emit('error', new Error(message));
                            });
                        },
                        destroy() {
                            aborted = true;
                        },
                        abort() {
                            aborted = true;
                        },
                    }) as BodianRequest;
                    return request;
                }) satisfies BodianRequestFactory,
            });
        })();
    }
    return apiPromise;
};

const requestErrorHandlers: ((arg?: unknown) => void)[] = [];

/**
 * 渲染层调用的那个方法。形状与桌面的 `window.electron.bodianRequest` 一致。
 */
export const bodianRequest = async (
    operation: BodianOperation,
    params: BodianParams = {},
): Promise<BodianResult> => {
    try {
        const api = await getApi();
        const result = await api.request(operation, params);
        if (result.ok) return { ok: true, data: result.data };
        return {
            ok: false,
            error: {
                code: result.error?.code ?? 'invalid-response',
                message: result.error?.message ?? 'Bodian operation failed',
            },
        };
    } catch (error) {
        console.warn('[Bodian] request failed', operation, error instanceof Error ? error.message : String(error));
        return { ok: false, error: { code: 'invalid-response', message: 'Bodian operation failed' } };
    }
};
