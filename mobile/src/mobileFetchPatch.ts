import type { CsHttpPlugin } from './nativePlugins';
// mobile/src/mobileFetchPatch.ts
// 手机版的跨域 fetch 补丁。
//
// ## 为什么需要它
//
// 手机版的页面是 `https://localhost`（Capacitor 的 androidScheme），而各家平台的
// 接口（酷我的 `search.kuwo.cn`、酷狗的 `complexsearch.kugou.com`、QQ 的
// `u.y.qq.com`…）都不在这个源上。浏览器的同源策略会把这些请求挡掉——
// 实测在真机上 `fetch('https://search.kuwo.cn/…')` 报 `Failed to fetch`。
//
// 渲染层里各平台的 transport（`src/services/onlineMusic/*/…Transport.ts`）都是用
// 浏览器 `fetch` 直连的（那是洛雪 musicSdk 移植过来的写法，桌面上能用是因为
// 桌面版页面是 `file://`，没有同源策略这回事）。所以手机版要让这些请求走得通，
// 就得让 `fetch` 在**跨域**时改走原生（CsHttp 插件）——原生发请求没有同源限制。
//
// ## 为什么只补跨域，同域的仍走原生 fetch
//
// 全局替换 `fetch` 会牵连很多事：Vite 的模块加载、blob URL 的读取、data URL 的
// 解析都要靠原生 fetch 的特殊语义。只在「跨域 + http(s)」时改道，其余原样抛回，
// 影响面就小得多。
//
// 桌面版与网页版不受影响：这个补丁只在手机版装（`mobile/src/main.ts` 调它）。

/** 判一次请求是不是「该改道原生的」：跨域的 http(s)。 */
const needsNativeRoute = (input: RequestInfo | URL, pageOrigin: string): boolean => {
    let url: URL;
    try {
        url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    } catch {
        // 不是能解析的 URL（相对路径之类）：交给原生 fetch 自己处理。
        return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.origin !== pageOrigin;
};

/** 把 CsHttp 的回答变成一个 Response，接口与浏览器的一致。 */
/**
 * 这次回答带回来的 `Set-Cookie`（原样的那一串）。
 *
 * ## 为什么它挂在 Response 上而不是响应头里
 *
 * `Set-Cookie` 是浏览器的**禁止头**：`headers.set('set-cookie', …)` 会被静默丢掉
 *（`Headers` 只让「响应头」名单里的头进来）。自定义头（如
 * `x-sakure-set-cookie`）能不能读，取决于浏览器 —— Chrome 的 `Headers`
 * 对**响应**只暴露名单内的头。
 *
 * 所以最可靠的办法是把它挂在 Response 对象**自己的属性**上：那是普通
 * JS 对象，不受浏览器的头名单管。QQ 登录要靠它拿 `qrsig` 与换票
 * 链上每一跳的 cookie —— 丢了整条链就断（表现是「生成二维码」失败、
 * 界面说「未知错误」）。
 */
export type ResponseWithSetCookie = Response & { sakureSetCookie?: string };

const toResponse = (
    result: { status: number; headers: Record<string, string>; data: string; dataBase64?: string; error?: string; setCookie?: string },
    responseType: 'text' | 'arraybuffer' | 'blob',
): ResponseWithSetCookie => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(result.headers ?? {})) {
        // `Set-Cookie` 走 Response 的属性，不进 headers（进去也会被丢）。
        if (key.toLowerCase() === 'set-cookie') continue;
        try {
            headers.set(key, value);
        } catch {
            // 头名不合法（原生那边照抄过来的）：跳过，不影响正文。
        }
    }
    const body = responseType === 'arraybuffer' || responseType === 'blob'
        ? (result.dataBase64 ? base64ToBytes(result.dataBase64) : new Uint8Array(0))
        : result.data;
    // 原生报失败时给的是 status 0（不是合法的 HTTP 状态），浏览器那套 Response 造不出来。
    // 那就照浏览器遇到网络错误的样子抛出去——调用方看到的是「这次请求失败了」，
    // 而不是「造 Response 失败了」（后者会掩盖真正的原因）。
    const status = Number.isInteger(result.status) && result.status >= 100 && result.status <= 599
        ? result.status
        : 502;
    if (status === 502 && result.error) {
        throw new TypeError(`Network request failed: ${result.error}`);
    }
    const response = new Response(body as BodyInit, { status, headers }) as ResponseWithSetCookie;
    const setCookie = result.setCookie ?? result.headers?.['set-cookie'] ?? '';
    if (setCookie) response.sakureSetCookie = setCookie;
    return response;
};

const base64ToBytes = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

/**
 * 装上这个补丁（只在手机版调）。
 *
 * 装了之后：跨域的 http(s) 请求由原生插件发出去（同源策略管不着），其余请求
 * 仍是浏览器自己的 fetch。
 */
export const installMobileFetchPatch = async (
    // 这里**不再**自己 registerPlugin —— 插件统一在 `nativePlugins.ts` 注册。
    //
    // 之前这里调 `registerPlugin('CsHttp')`，而 `nativePlugins.ts` 也调了一次：
    // Capacitor 的 `registerPlugin` 对同一个名字第二次调用会返回**第一次**的代理，
    // 于是 `nativePlugins.ts` 里带 web 实现的那份被顶掉了 —— 在浏览器里
    // `CsHttp.request` 变成「not implemented on web」，而真机上却正常。
    // 那种「浏览器测不出来、真机却是好的」的差异极难判断，所以统一注册。
    CsHttp: CsHttpPlugin,
): Promise<void> => {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    const originalFetch = window.fetch.bind(window);
    const pageOrigin = window.location.origin;

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (!needsNativeRoute(input, pageOrigin)) {
            return await originalFetch(input, init);
        }
        const request = input instanceof Request ? input : null;
        const url = request ? request.url : String(input);
        const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
        const headers: Record<string, string> = {};
        // 请求自己的头（Request 对象上的）先放进去，再被 init 覆盖 —— 与浏览器的语义一致。
        if (request) {
            request.headers.forEach((value, key) => { headers[key] = value; });
        }
        new Headers(init?.headers).forEach((value, key) => { headers[key] = value; });

        let body: string | undefined;
        if (init?.body != null) {
            body = typeof init.body === 'string' ? init.body : undefined;
        } else if (request?.body) {
            body = await request.clone().text();
        }

        // `responseType` 是 CapacitorHttp 的扩展，浏览器的 RequestInit 里没有这个字段。
        // 这里自己读（用 `in` 判存在），不改动类型。
        const responseType = ((
            init as (RequestInit & { responseType?: 'text' | 'arraybuffer' | 'blob' }) | undefined
        )?.responseType ?? 'text') as 'text' | 'arraybuffer' | 'blob';
        const result = await CsHttp.request({
            url,
            method,
            headers,
            body,
            responseType,
            timeout: 20_000,
        });
        return toResponse(result, responseType);
    }) as typeof window.fetch;
};
