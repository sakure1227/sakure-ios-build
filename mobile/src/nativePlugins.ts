// mobile/src/nativePlugins.ts
//
// 手机版的原生插件，**集中注册**在一处。
//
// ## 为什么集中
//
// 之前 `bridge.ts`、`qishuiBridge.ts`、`bodianBridge.ts` 各自调了一次
// `registerPlugin('CsHttp')`。Capacitor 的 `registerPlugin` 对同一个名字第二次调用
// 会打印一句「already registered. Cannot register plugins twice.」并返回同一个代理
// —— 功能上没错，但那句话会盖掉真正的错误信息（排查时很误导），而且三处各写一份
// 接口声明，改一处忘另一处就会类型不一致。
//
// 现在都在这里注册，各处 import 这个实例。
//
// ## 为什么带 web 实现
//
// 真机上（ios / android 平台）走的是原生桥，`CsHttp` 由 `pluginHeader` 派发到
// `cap.nativePromise`。但**在浏览器里跑**（本地调试、CDP 实测、网页版）时，
// 平台是 `web`，没有原生实现 —— Capacitor 会生成一个调到 `undefined` 的代理，
// 报出来是「xxx is not a function」，看不出是「这个平台没这个插件」。
//
// 所以给 `web` 平台补一份实现：
// - `CsHttp` 用浏览器的 `fetch`（跨域请求在浏览器里会被同源策略挡，但那是浏览器
//   的限制，不是代码的问题；至少调用链能跑通、能验证协议）。
// - `Preferences` 用 `localStorage`。
//
// 这样在浏览器里也能真跑汽水/波点的协议链路（我就是这样验证的）。
import { registerPlugin } from '@capacitor/core';

/** 原生 HTTP 插件：发请求，绕开 WebView 的同源策略。 */
export interface CsHttpPlugin {
    request(options: {
        url: string;
        method: string;
        headers?: Record<string, string>;
        body?: string;
        responseType?: 'text' | 'arraybuffer' | 'blob';
        timeout?: number;
    }): Promise<{
        status: number;
        headers: Record<string, string>;
        data: string;
        /** responseType 为 arraybuffer/blob 时，base64 的正文。 */
        dataBase64?: string;
        /**
         * 这次回答的 `Set-Cookie`（原样那一串）。
         *
         * 为什么单独一个字段：`Set-Cookie` 是浏览器的**禁止头**，从响应头里读不到。
         * QQ 登录要靠它拿 `qrsig` 与换票链上每一跳的 cookie。
         */
        setCookie?: string;
    }>;
}

/** 原生存储插件（桌面上是 electron-store，手机上是 Preferences）。 */
export interface PreferencesPlugin {
    get(options: { key: string }): Promise<{ value: string | null }>;
    set(options: { key: string; value: string }): Promise<void>;
    remove(options: { key: string }): Promise<void>;
}

/** 原生剪贴板。 */
export interface ClipboardPlugin {
    read(): Promise<{ value: string }>;
    write(options: { value: string }): Promise<void>;
}

/**
 * 浏览器里的 `fetch` 实现（给 web 平台兜底）。
 *
 * 真机上不会走这里 —— 原生插件有 `pluginHeader`，Capacitor 会直接派发到原生。
 */
/**
 * 调试时用的代理基址。
 *
 * 浏览器里的 `fetch` 受**同源策略**管 —— 各家音乐平台的接口都不是本应用的域，
 * 直接 fetch 会被 CORS 拦掉。而真机走的是原生 HTTP（`CsHttp`），**没有这个限制**。
 *
 * 于是「浏览器里测不出来、真机上却是好的」这种局面很难判断。所以在调试时可以把
 * web 实现指到一个本地代理（它替我们发请求，就像原生插件那样）：
 *
 *     window.__SAKURE_HTTP_PROXY__ = 'http://127.0.0.1:8970/__proxy?url=';
 *
 * 真机上这个变量不存在 —— 走的还是原生插件，行为完全不变。
 */
const proxyBase = (): string | null => {
    const configured = (globalThis as { __SAKURE_HTTP_PROXY__?: string }).__SAKURE_HTTP_PROXY__;
    return typeof configured === 'string' && configured ? configured : null;
};

const webHttp = async (options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
}): Promise<{
    status: number;
    headers: Record<string, string>;
    data: string;
    dataBase64?: string;
    setCookie?: string;
}> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout ?? 30_000);
    try {
        const proxy = proxyBase();
        const target = proxy ? `${proxy}${encodeURIComponent(options.url)}` : options.url;
        const response = await fetch(target, {
            method: (options.method ?? 'GET').toUpperCase(),
            headers: options.headers ?? {},
            body: options.body,
            signal: controller.signal,
        });
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => { headers[key] = value; });
        if (options.responseType === 'arraybuffer' || options.responseType === 'blob') {
            const buffer = await response.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
            return {
                status: response.status,
                headers,
                data: '',
                dataBase64: btoa(binary),
            };
        }
        return { status: response.status, headers, data: await response.text() };
    } finally {
        clearTimeout(timer);
    }
};

/** 浏览器里的存储实现（给 web 平台兜底）。 */
const webPreferences = {
    get: async ({ key }: { key: string }) => {
        try {
            return { value: window.localStorage.getItem(key) };
        } catch {
            return { value: null };
        }
    },
    set: async ({ key, value }: { key: string; value: string }) => {
        try { window.localStorage.setItem(key, value); } catch { /* 无痕模式等 */ }
    },
    remove: async ({ key }: { key: string }) => {
        try { window.localStorage.removeItem(key); } catch { /* 同上 */ }
    },
};

/**
 * Capacitor 的 `registerPlugin(name, jsImplementations)` 里，`jsImplementations.web`
 * 必须是**一个对象**（按方法名索引），不是函数。
 *
 * Capacitor 拿它做两件事：
 * 1. 整体实现：`typeof jsImplementations.web === 'function'` 时会**调用**它，
 *    拿返回值当「整个 web 平台的实现」；
 * 2. 单个方法的回退：`jsImplementations.web?.[prop]` —— 取方法名对应的那个函数。
 *
 * 传函数的话，第 2 步取到的是 `fn['request']`（undefined）→ 那个方法就变成
 * 「not implemented on web」，而**不报错**（只是调用时抛）。
 *
 * 那个整体实现的调用还会**立刻执行** `webHttp(options)`，参数是 undefined ——
 * 于是多一次无意义的请求。
 */
export const CsHttp = registerPlugin<CsHttpPlugin>('CsHttp', {
    web: {
        request: (options: Parameters<CsHttpPlugin['request']>[0]) => webHttp(options),
    },
});

export const Preferences = registerPlugin<PreferencesPlugin>('Preferences', {
    web: webPreferences,
});
