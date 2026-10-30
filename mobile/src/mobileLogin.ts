// mobile/src/mobileLogin.ts
// 手机版的平台扫码登录。
//
// ## 为什么需要它
//
// 桌面上网易云/QQ/酷狗的登录靠内嵌的 Node 后端（`@neteasecloudmusicapienhanced`）。
// 手机版没有 Node —— 但**登录协议本身不需要 Node**：网易云要的是 weapi 加密
// （`mobileCrypto.ts` 里自己实现了），QQ 要的是一段 OAuth 换票链，酷狗要的是一段
// 带签名的轮询。这些都是「发 HTTP 请求」，手机版的原生 HTTP（`CsHttp`）能发。
//
// 所以这里直接对平台发请求，不依赖任何后端进程。
//
// ## 三个平台的流程差别
//
// - **网易云**：取 `unikey` → 生成二维码 → 轮询 `client/login`。轮询回 803（已授权）时，
//   平台在 `Set-Cookie` 里给了 `MUSIC_U` —— 那就是登录凭据，存起来。
// - **酷狗**：`login-user.kugou.com/v2/qrcode` 拿二维码与 key → 长轮询
//   `/v2/get_userinfo_qrcode`，成功后拿 `token`/`userid`/`dfid`。
// - **QQ**：五段换票（ptqrshow → ptqrlogin → check_sig → oauth2.0 authorize → musicu
//   QQLogin）。中间要手动跟着 302 走并收集 `Set-Cookie` —— 浏览器与 `fetch` 都做不到
//   （跨域重定向的 `Location` 读不到），原生 HTTP 可以（`CsHttp` 把响应头带回来）。

import { weapi, kugouSign, kugouCreateMid, qqHash33, qqGetGtk } from './mobileCrypto';
import { renderQrAsDataUrl, toPngDataUrl } from './mobileQr';
import type { LoginState } from '../../src/types/onlineMusic';

// ------------------------------------------------------------------
// 通用：一次原生 HTTP 请求
// ------------------------------------------------------------------


/**
 * 错误的文字。
 */
const errorMessageOf = (error: unknown): string => (
    error instanceof Error ? error.message : String(error)
);

/**
 * 一次登录请求的时限。
 *
 * 为什么要自己加：原生那层也有时限（默认 20 秒），但那个时限是「连不上」的上限，
 * 不是「请求停在那里」的保证。登录窗口会一直轮询，一旦某一次卡住，
 * 界面就一直转圈、不能再点「刷新二维码」。
 *
 * 这里所有登录请求都带时限，超时就报错（而不是永远等。
 */
const LOGIN_REQUEST_TIMEOUT_MS = 15_000;

/**
 * 发一次登录请求，带时限。
 */
const requestWithLimit = async (
    request: MobileRequest,
    options: Parameters<MobileRequest>[0],
): Promise<MobileHttpResponse> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`The request timed out after ${LOGIN_REQUEST_TIMEOUT_MS} ms`)),
            LOGIN_REQUEST_TIMEOUT_MS,
        );
    });
    try {
        return await Promise.race([
            request({ timeout: LOGIN_REQUEST_TIMEOUT_MS, ...options }),
            timeout,
        ]);
    } finally {
        if (timer !== null) clearTimeout(timer);
    }
};

/** 手机版发一次跨域请求（由 `CsHttp` 发出去，同源策略管不着）。 */
export type MobileHttpResponse = {
    status: number;
    /** 文本模式的正文。二进制模式（`responseType: 'arraybuffer'`）下这里是空的。 */
    text: string;
    /** 文本模式的正文 —— 原生插件（`CsHttp.java`）用的字段名。见 `responseText`。 */
    data: string;
    /** 二进制模式的正文（base64）。原生插件交的是 `dataBase64`（见下）。 */
    base64?: string;
    /** 二进制模式的正文（base64）—— 原生插件（`CsHttp.java`）用的字段名。 */
    dataBase64?: string;
    headers: Record<string, string>;
    /** 原生那层带回来的 `Set-Cookie`（原样那一串）。见 `readSetCookie`。 */
    sakureSetCookie?: string;
    /** 同上，但字段名是原生插件那一份（直接调插件时是这个名字）。 */
    setCookie?: string;
};

/**
 * 这一次请求的正文（文本）。
 *
 * ## 为什么不能直接用 `response.text`
 *
 * 请求有两条路，它们的回答形状不同：
 *
 * - **走 `fetch`**（`mobileFetchPatch.ts` 装的那个）：符合浏览器的 `Response`，
 *   正文在 `text()` 里。
 * - **直接调原生插件**（平台的 provider 就是这个，`mobileProviders.ts`）：
 *   插件的返回值里正文在 **`data`** 里，没有 `text`。
 *
 * 登录代码里写 `response.text` 的话，走插件那条路的时候正文全是 `undefined` ——
 * `JSON.parse(undefined)` 报错，就是那个「未知错误」。
 *
 * 这里统一取一下：哪条路都能用。
 */
export const responseText = (response: { text?: string; data?: string }): string => {
    if (typeof response.text === 'string' && response.text.length > 0) return response.text;
    if (typeof response.data === 'string') return response.data;
    return '';
};

export type MobileRequest = (options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
    /**
     * 要不要自己跟重定向。
     *
     * QQ 登录要手动跟：换票链上每一跳的 `Set-Cookie` 都要收着（`p_skey` 就是下一跳给的）。
     * 让原生自动跟的话，只留最后一跳的响应头 —— 前面那些的 cookie 就丢了。
     */
    followRedirects?: boolean;
}) => Promise<MobileHttpResponse>;

const NETEASE_API = 'https://interface.music.163.com';
const NETEASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 从响应头里取出 `Set-Cookie`。
 *
 * ## 为什么不能直接读 `set-cookie`
 *
 * `Set-Cookie` 是浏览器的**禁止头**：用 `Headers` 造出来的响应里放不进它，读它
 * 也读不到。所以原生那层（`CsHttp.java`）把它单独放在 `setCookie` 字段里带出来，
 * 渲染层这边再放进一个普通头 `x-sakure-set-cookie`。
 *
 * 于是读 cookie 的地方一律走这个函数：它在两个地方找（普通头与禁止头），
 * 哪个有就用哪个 —— 这样桌面上（走浏览器 fetch，cookie 根本读不到）与手机版上
 * 行为一致，且以后原生改了字段名这里也不会断。
 */
export const readSetCookie = (response: {
    sakureSetCookie?: string;
    setCookie?: string;
    headers?: Record<string, string>;
}): string => {
    // 两条路都认：
    // - `sakureSetCookie`：走 `fetch` 的那条路（`mobileFetchPatch.ts` 把 cookie 挂在
    //   Response 的属性上 —— `Set-Cookie` 是浏览器的禁止头，进不了响应头）。
    // - `setCookie`：直接调原生插件的那条路（平台的 provider 就是这么发的，
    //   `mobileProviders.ts` 的 `HttpRequest`）。
    if (response.sakureSetCookie) return response.sakureSetCookie;
    if (response.setCookie) return response.setCookie;
    // 老的读法（从响应头里找）：保留一份，原生那边改了字段名时不会断。
    const headers = response.headers ?? {};
    return headers['x-sakure-set-cookie'] ?? headers['set-cookie'] ?? '';
};

/** 把一串 cookie 头解析成键值对（后面的覆盖前面的）。 */
export const parseCookieHeader = (raw: string): Record<string, string> => {
    const out: Record<string, string> = {};
    String(raw ?? '')
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => {
            const eq = part.indexOf('=');
            if (eq <= 0) return;
            out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
        });
    return out;
};

/** 把键值对拼回 cookie 头。 */
export const formatCookieHeader = (cookies: Record<string, string>): string => (
    Object.entries(cookies)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
);

// ------------------------------------------------------------------
// 网易云
// ------------------------------------------------------------------

/** 网易云的 weapi 请求。 */
const neteaseWeapi = async (
    request: MobileRequest,
    endpoint: string,
    data: unknown,
    cookie = '',
): Promise<{ status: number; json: any; setCookie: string }> => {
    const payload = weapi(data);
    const body = new URLSearchParams({
        params: payload.params,
        encSecKey: payload.encSecKey,
    }).toString();

    const response = await requestWithLimit(request, {
        url: `${NETEASE_API}/weapi/${endpoint}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': NETEASE_UA,
            Referer: 'https://music.163.com/',
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body,
    });

    let json: any = null;
    try {
        json = JSON.parse(responseText(response));
    } catch {
        json = null;
    }
    return { status: response.status, json, setCookie: readSetCookie(response) };
};

// 登录的状态就是契约里那一份（`LoginState`）—— 不另立一套，免得两边说法不同。
export type MobileLoginState = LoginState;

export type MobileLoginSession = {
    platform: 'netease' | 'kugou' | 'qq';
    /** 平台内部用的凭据（二维码 key / token / qrsig）。 */
    token: string;
    /** QQ 专用：ptqrtoken（轮询时要一起带）。 */
    ptqrtoken?: string;
    /** QQ 专用：换票链里那一步拿到的临时 cookie。 */
    cookies?: Record<string, string>;
};

/**
 * 网易云：取二维码的 key。
 */
export const neteaseStartLogin = async (request: MobileRequest): Promise<string> => {
    const { json } = await neteaseWeapi(request, 'login/qrcode/unikey', { type: 3 });
    const key = json?.unikey ?? json?.data?.unikey;
    if (!key) {
        throw new Error(`NetEase gave no QR key (code=${json?.code ?? '?'}, msg=${json?.msg ?? json?.message ?? '?'})`);
    }
    return String(key);
};

/**
 * 网易云：把 key 变成二维码图片（base64 的 data URL）。
 *
 * ## 二维码是**本地画**的，不是平台给的
 *
 * 平台**没有**这个接口 —— 去问 `/weapi/login/qrcode/create` 会回 404
 * （`接口未找到！`）。网易云的做法是：二维码里装的就是那个登录地址
 * `https://music.163.com/login?codekey=<key>`，图片由客户端自己画
 * （上游 `login_qr_create.js` 就是这么做的：把地址交给 `qrcode` 库）。
 *
 * 扫这个码，网易云音乐 App 会打开那个地址并把 codekey 带上 —— 于是平台知道
 * 「这一扫对应哪一次登录」。
 */
export const neteaseCreateQr = async (_request: MobileRequest, key: string): Promise<string> => {
    const url = `https://music.163.com/login?codekey=${encodeURIComponent(key)}`;
    const image = await renderQrAsDataUrl(url);
    if (!image) {
        throw new Error('Could not draw the NetEase QR code');
    }
    return image;
};

/**
 * 网易云：查一次扫码结果。
 *
 * 平台的码：800 过期、801 等扫码、802 待确认、803 已授权。
 * 已授权时平台在 `Set-Cookie` 里给了 `MUSIC_U` —— 那就是登录凭据。
 */
export const neteaseCheckLogin = async (
    request: MobileRequest,
    key: string,
    cookie = '',
): Promise<{ state: MobileLoginState; cookie: string }> => {
    const ask = async () => await neteaseWeapi(
        request,
        'login/qrcode/client/login',
        { key, type: 3 },
        cookie,
    );

    let { json, setCookie } = await ask();
    let code = Number(json?.code);

    // 凭据可能在这几个地方的任何一个（见 `pickNeteaseCookie`）。
    let merged = pickNeteaseCookie(json, setCookie);

    // 平台有时候 803 里不带凭据（凭据在下一问才给）——那就再问一次。
    // 对方的做法一样（`server.js` 的 `/api/login/qr/check`）。
    if (code === 803 && !merged) {
        const retry = await ask();
        const retryCookie = pickNeteaseCookie(retry.json, retry.setCookie);
        if (retryCookie) {
            json = retry.json;
            setCookie = retry.setCookie;
            code = Number(json?.code);
            merged = retryCookie;
        }
    }

    switch (code) {
        case 800:
            return { state: { state: 'expired' }, cookie };
        case 801:
            return { state: { state: 'waiting' }, cookie };
        case 802:
            return { state: { state: 'scanned' }, cookie };
        case 803: {
            // 已授权。凭据在这几处的任何一个里（`MUSIC_U=...`）。
            const full = formatCookieHeader({
                ...parseCookieHeader(cookie),
                ...parseCookieHeader(merged),
            });
            if (!full) {
                return { state: { state: 'error', message: 'NetEase confirmed the scan but gave no session cookie' }, cookie };
            }
            return { state: { state: 'confirmed' }, cookie: full };
        }
        default:
            return {
                state: {
                    state: 'error',
                    message: String(json?.message ?? json?.msg ?? `NetEase answered code ${code}`),
                },
                cookie,
            };
    }
};

/**
 * 从网易云的回答里挑凭据（返回一个能用的 cookie 串）。
 *
 * ## 为什么要挑几个地方
 *
 * 平台把登录凭据放在哪里**不固定**，随请求的不同而不同：
 *
 * - `Set-Cookie` 头（`MUSIC_U=...`）
 * - 回答顶层的 `cookie` 字段
 * - `body.cookie`
 * - `body.data.cookie` / `body.data.cookies`
 *
 * 只看一个就会遗漏凭据 —— 符号不对就变成「登录成功但状态未登录」。
 * 对方的做法就是几个都看（`server.js` 的 `readCookieFromResponse`），这里对齐。
 */
const pickNeteaseCookie = (json: any, setCookie: string): string => {
    const candidates = [
        setCookie,
        json?.cookie,
        json?.data?.cookie,
        json?.data?.cookies,
        json?.body?.cookie,
        json?.body?.data?.cookie,
    ];
    for (const candidate of candidates) {
        const text = Array.isArray(candidate)
            ? candidate.filter(item => typeof item === 'string').join('; ')
            : String(candidate ?? '');
        if (text.trim()) return text.trim();
    }
    return '';
};

/**
 * 网易云：读登录态与账号。
 *
 * 两个都要问：登录态的回答里带 profile，账号的回答里带账户信息（userId 等）。
 * 平台在登录态失效时回 301/401/403。
 */
export const neteaseReadAccount = async (
    request: MobileRequest,
    cookie: string,
): Promise<{ id: string; nickname: string; avatarUrl: string; backgroundUrl: string } | null> => {
    // 路径要对：百云的「登录态」不是 `/login/status`，而是 `/w/nuser/account/get`
    // （中间那个 `w/` —— 少了它平台回「接口未找到」）。
    //
    // 先问「登录态」，它给的资料最新；问不到再降级问「账号」（与对方一致）。
    const status = await neteaseWeapi(request, 'w/nuser/account/get', {}, cookie);
    // 响应的层次：百云的账号接口回的是 `{ code, account, profile }`，
    // 上游包会把它再封一层 `data`。两种形状都要能读（直接请求平台时没有那层）。
    const statusBody = status.json?.data ?? status.json ?? {};
    const statusCode = Number(status.json?.code ?? statusBody?.code);
    const loginProfile = statusBody?.profile ?? statusBody?.account ?? {};
    if ([301, 401, 403].includes(statusCode)) return null;

    if (loginProfile && (loginProfile.userId || loginProfile.user_id || loginProfile.id)) {
        return toNeteaseUser(loginProfile);
    }

    const account = await neteaseWeapi(request, 'nuser/account/get', {}, cookie);
    const accountBody = account.json?.data ?? account.json ?? {};
    const accountCode = Number(account.json?.code ?? accountBody?.code);
    if ([301, 401, 403].includes(accountCode)) return null;

    const accountProfile = accountBody?.profile ?? accountBody?.account ?? {};
    if (!accountProfile || !(accountProfile.userId || accountProfile.user_id || accountProfile.id)) return null;

    return toNeteaseUser({ ...loginProfile, ...accountProfile });
};

/**
 * 把平台给的资料变成应用要的账号。
 *
 * 字段的取法很宽（`userId` / `user_id` / `id` 都算）—— 平台这几个接口给的字段名
 * 并不一致，卡得越死越容易读不到人。对方也是这么取的（`server.js` 的
 * `normalizeLoginInfo`）。
 */
const toNeteaseUser = (profile: any): {
    id: string;
    nickname: string;
    avatarUrl: string;
    backgroundUrl: string;
} => {
    const id = String(profile?.userId ?? profile?.user_id ?? profile?.id ?? '');
    return {
        id,
        nickname: String(profile?.nickname ?? profile?.userName ?? '网易云用户'),
        avatarUrl: String(profile?.avatarUrl ?? profile?.avatar ?? ''),
        backgroundUrl: String(profile?.backgroundUrl ?? ''),
    };
};

// ------------------------------------------------------------------
// 酷狗
// ------------------------------------------------------------------

const KUGOU_QR_HOST = 'https://login-user.kugou.com';
const KUGOU_QR_KEY_APPID = 1001;
const KUGOU_ANDROID_APPID = 3116;
const KUGOU_SRC_APPID = 2919;
const KUGOU_LITE_CLIENTVER = 11440;

/**
 * 酷狗的签名 GET。
 *
 * 签名放在 `signature` 字段里（不是 `sign`）—— 字段名错了平台不认。
 * 参数集是固定的那些：底座（dfid/mid/uuid/clientver/clienttime）+ 这一步要的几个。
 */
const kugouSignedGet = async (
    request: MobileRequest,
    path: string,
    extraParams: Record<string, string | number>,
): Promise<any> => {
    const mid = kugouCreateMid();
    const clienttime = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
        dfid: '-',
        mid,
        uuid: mid,
        clientver: KUGOU_LITE_CLIENTVER,
        clienttime,
        ...extraParams,
    };
    params.signature = kugouSign(params);

    const query = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
        .join('&');

    const response = await requestWithLimit(request, {
        url: `${KUGOU_QR_HOST}${path}?${query}`,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://www.kugou.com/',
        },
    });

    try {
        return JSON.parse(responseText(response));
    } catch {
        throw new Error(`KuGou answered with HTTP ${response.status} and no JSON`);
    }
};

/**
 * 酷狗：取二维码。
 *
 * `login-user.kugou.com/v2/qrcode` 给一个 `data`（含 `qrcode` 这个 base64 的图）与
 * `key`。签名的盐与参数要跟 Web 接口对得上。
 */
export const kugouStartLogin = async (request: MobileRequest): Promise<{ key: string; image: string; url: string }> => {
    const json = await kugouSignedGet(request, '/v2/qrcode', {
        appid: KUGOU_QR_KEY_APPID,
        type: 1,
        plat: 4,
        qrcode_txt: `https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=${KUGOU_ANDROID_APPID}&`,
        srcappid: KUGOU_SRC_APPID,
    });

    const data = json?.data ?? {};
    const key = String(data.qrcode ?? data.qrcode_key ?? data.key ?? json?.qrcode ?? json?.key ?? '').trim();
    if (!key) {
        throw new Error(`KuGou gave no QR key (error_code=${json?.error_code ?? '?'}, msg=${json?.msg ?? json?.message ?? '?'})`);
    }
    // 平台给的是二维码的**地址**，不是图片 —— 要自己把地址画成图。
    const url = `https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=${encodeURIComponent(key)}`;
    const image = String(data.qrcode_base64 ?? data.base64 ?? '');
    return {
        key,
        url,
        image: image.startsWith('data:') ? image : image ? `data:image/png;base64,${image}` : '',
    };
};

/**
 * 酷狗：把二维码地址画成图。
 *
 * 平台给的是地址（`h5.kugou.com/apps/loginQRCode/...`），要扫的是那个地址本身
 * —— 所以画的就是这个地址的二维码，扫它会打开酷狗的扫码页。
 */
export const kugouCreateQr = async (url: string): Promise<string> => {
    const rendered = await renderQrAsDataUrl(url);
    if (!rendered) throw new Error('Could not draw the KuGou QR code');
    return rendered;
};

/**
 * 酷狗：查一次扫码结果（长轮询）。
 *
 * 平台的状态码：0 过期、1 等扫码、2/3 待确认、4 已授权。
 * 已授权时回答里带 `token`、`userid`、`dfid` —— 那是登录凭据。
 */
export const kugouCheckLogin = async (
    request: MobileRequest,
    key: string,
): Promise<{
    state: MobileLoginState;
    credential: { token: string; userid: string; dfid: string; nickname: string; avatar: string } | null;
}> => {
    const json = await kugouSignedGet(request, '/v2/get_userinfo_qrcode', {
        plat: 4,
        appid: KUGOU_ANDROID_APPID,
        srcappid: KUGOU_SRC_APPID,
        qrcode: key,
    });

    const data = json?.data ?? {};
    const status = Number(data.status ?? json?.status ?? 0);
    const message = String(data.msg ?? data.message ?? json?.msg ?? '');

    if (status === 0) return { state: { state: 'expired' }, credential: null };
    if (status === 1) return { state: { state: 'waiting' }, credential: null };
    if (status === 2 || status === 3) return { state: { state: 'scanned' }, credential: null };
    if (status === 4 || data.token) {
        const credential = {
            token: String(data.token ?? data.t ?? ''),
            userid: String(data.userid ?? data.user_id ?? data.KugooID ?? ''),
            dfid: String(data.dfid ?? ''),
            // 昵称与头像平台也给了（昵称里可能带 HTML 标签，去掉）。
            nickname: String(data.nickname ?? data.nick_name ?? data.username ?? '').replace(/<[^>]+>/g, ''),
            avatar: String(data.pic ?? data.Pic ?? data.avatar ?? '').trim(),
        };
        if (!credential.token || !credential.userid) {
            return { state: { state: 'error', message: 'KuGou confirmed the scan but gave no token' }, credential: null };
        }
        return { state: { state: 'confirmed' }, credential };
    }
    return { state: { state: 'error', message: message || `KuGou answered status ${status}` }, credential: null };
};

// ------------------------------------------------------------------
// QQ
// ------------------------------------------------------------------

const QQ_PT_APPID = '716027609';
const QQ_PT_DAID = '383';
const QQ_PT_AID = '100497308';
const QQ_U1 = 'https://graph.qq.com/oauth2.0/login_jump';
// 授权回调的地址：它带着 code 回来（与对方一致）。
const QQ_AUTHORIZE_REDIRECT = 'https://y.qq.com/portal/wx_redirect.html?login_type=1&surl=https://y.qq.com/';
const QQ_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 读 QQ 轮询的回答，判出是哪一种状态。
 *
 * 平台的回答是 `ptuiCB(...)` 这种格式（不是 JSON）：
 *
 * - `ptuiCB('0','0','https://ptlogin2.graph.qq.com/check_sig?...','0','登录成功！','nick')`
 * - `ptuiCB('0','0','','0','二维码未失效','')` —— 还在等扫
 * - `ptuiCB('0','0','','0','二维码已失效','')` —— 过期了
 * - `ptuiCB('0','0','','0','二维码认证中','')` —— 扫了，等确认
 * - `ptuiCB('7','0','','0','提交参数错误，请检查。','')` —— 我们的参数有问题
 *
 * 字面重要：「未失效」里也含「失效」两个字，所以判「过期」要排除「未失效」。
 */
type QqPollVerdict =
    | { kind: 'waiting' }
    | { kind: 'scanned' }
    | { kind: 'expired' }
    | { kind: 'success'; url: string; nickname: string }
    | { kind: 'error'; message: string };

export const readQqPollVerdict = (body: string): QqPollVerdict => {
    const text = String(body ?? '');
    const message = text.match(/'([^']*)'/g)?.map(part => part.slice(1, -1)).find(part => part.length > 4) ?? '';

    // 已经登录成功：回答里带了 check_sig 的地址。
    const successUrl = text.match(/'(https?:\/\/[^']+)'/)?.[1] ?? '';
    if (/登录成功|登陆成功/.test(text)) {
        const nickname = text.match(/ptuiCB\((?:'[^']*',){5}'([^']*)'/)?.[1] ?? '';
        return { kind: 'success', url: successUrl, nickname };
    }
    // 参数错了（或别的错）：不能当成「还在等」。
    if (/参数错误|提交失败|系统错误|请求失败/.test(text)) {
        return { kind: 'error', message: message || '平台拒绝了这一次请求' };
    }
    // 过期：「未失效」里也有「失效」，要把它排除。
    if (/已失效|已过期/.test(text) && !/未失效|未过期/.test(text)) {
        return { kind: 'expired' };
    }
    if (/认证中|扫描成功|已扫描|扫码成功/.test(text)) {
        return { kind: 'scanned' };
    }
    return { kind: 'waiting' };
};

/**
 * 构造 QQ 的轮询地址（`ptqrlogin`）。
 *
 * ## 参数集不能省
 *
 * 这一堆参数是平台要的：少一个（或版本不对）平台就回
 * `ptuiCB('7','0','','0','提交参数错误，请检查。', '')` —— 而不是「等待扫码」。
 * 那个回答不能区分「还没扫」与「参数错了」，会被当成后者。
 *
 * 参数的版本也影响平台的回答：`js_ver` 用新版。
 */
const buildQqPollUrl = (qrsig: string, ptqrtoken: string): URL => {
    const url = new URL('https://ssl.ptlogin2.qq.com/ptqrlogin');
    url.searchParams.set('u1', QQ_U1);
    url.searchParams.set('ptqrtoken', ptqrtoken);
    url.searchParams.set('ptredirect', '0');
    url.searchParams.set('h', '1');
    url.searchParams.set('t', '1');
    url.searchParams.set('g', '1');
    url.searchParams.set('from_ui', '1');
    url.searchParams.set('ptlang', '2052');
    url.searchParams.set('action', `0-0-${Date.now()}`);
    url.searchParams.set('js_ver', '23111510');
    url.searchParams.set('js_type', '1');
    url.searchParams.set('login_sig', '');
    url.searchParams.set('pt_uistyle', '40');
    url.searchParams.set('aid', QQ_PT_APPID);
    url.searchParams.set('daid', QQ_PT_DAID);
    url.searchParams.set('pt_3rd_aid', QQ_PT_AID);
    return url;
};

/**
 * QQ：取二维码与 qrsig。
 *
 * `ssl.ptlogin2.qq.com/ptqrshow` 回一张 png，并把 `qrsig` 放在 `Set-Cookie` 里。
 * 那个 qrsig 是后面每一步都要带的东西（换票与轮询都要它）。
 */
export const qqStartLogin = async (
    request: MobileRequest,
): Promise<{ key: string; image: string; ptqrtoken: string; cookies: Record<string, string> }> => {
    const url = new URL('https://ssl.ptlogin2.qq.com/ptqrshow');
    url.searchParams.set('appid', QQ_PT_APPID);
    url.searchParams.set('e', '2');
    url.searchParams.set('l', 'M');
    url.searchParams.set('s', '3');
    url.searchParams.set('d', '72');
    url.searchParams.set('v', '4');
    url.searchParams.set('t', String(Math.random()));
    url.searchParams.set('daid', QQ_PT_DAID);
    url.searchParams.set('pt_3rd_aid', QQ_PT_AID);
    url.searchParams.set('u1', QQ_U1);

    const response = await requestWithLimit(request, {
        url: url.toString(),
        method: 'GET',
        headers: {
            'User-Agent': QQ_UA,
            Referer: 'https://xui.ptlogin2.qq.com/',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        // 二维码是 png 的**二进制**，按文本拿会乱码（会变成乱码字符拼成的假 base64）。
        responseType: 'arraybuffer',
    });

    if (response.status !== 200) {
        throw new Error(`QQ QR request failed (HTTP ${response.status})`);
    }

    // 平台把 qrsig 放在 Set-Cookie 里。它可能是多个 cookie 中间的一个，
    // 所以要把整串 cookie 都解析出来找 qrsig（响应头可能被原生存成了一整串）。
    const cookies = parseCookieHeader(readSetCookie(response));
    const qrsig = cookies.qrsig;
    if (!qrsig) {
        throw new Error('QQ QR request gave no qrsig');
    }

    // 二维码图片是二进制的：原生那层用 arraybuffer 模式拿，正文在 `dataBase64` 里。
    //
    // 字段名要说清：原生插件（`CsHttp.java`）交的是 `dataBase64`；而走 `fetch` 的那条路
    // （`mobileFetchPatch.ts`）交的是 `base64`。两个都认 —— 少认一个，二维码就是空的，
    // 报「QQ QR request gave no image」。
    const image = toPngDataUrl(response.dataBase64 ?? response.base64 ?? '');
    if (!image) {
        throw new Error('QQ QR request gave no image');
    }
    return {
        key: qrsig,
        image,
        ptqrtoken: String(qqHash33(qrsig)),
        cookies,
    };
};

/**
 * QQ：换票（ptqrlogin → check_sig → oauth2.0 authorize）。
 *
 * 这一步手动跟着重定向走：QQ 的登录要跨域带 cookie 换票，浏览器与 `fetch` 做不到
 * （跨域重定向的 `Location` 读不到，`Set-Cookie` 也收不到）。原生 HTTP 能把
 * 响应头带回来，所以这里自己跟。
 */
export const qqExchangeTicket = async (
    request: MobileRequest,
    session: MobileLoginSession,
): Promise<{ state: MobileLoginState; cookies: Record<string, string> }> => {
    const qrsig = session.token;
    const ptqrtoken = session.ptqrtoken ?? String(qqHash33(qrsig));
    let cookies: Record<string, string> = { ...(session.cookies ?? {}) };

    // --- 第一步：ptqrlogin ---
    const loginUrl = buildQqPollUrl(qrsig, ptqrtoken);

    const loginResponse = await requestWithLimit(request, {
        url: loginUrl.toString(),
        method: 'GET',
        headers: {
            'User-Agent': QQ_UA,
            Referer: 'https://xui.ptlogin2.qq.com/',
            Cookie: formatCookieHeader(cookies),
        },
    });

    // 回答里带着新的 cookie（skey / p_skey / p_uin / p_ticket）。
    cookies = { ...cookies, ...parseCookieHeader(readSetCookie(loginResponse)) };

    // 平台的回答是 `ptuiCB(...)` 文本（不是 JSON），状态要从它里面判。
    const body = responseText(loginResponse);
    const verdict = readQqPollVerdict(body);

    if (verdict.kind === 'error') {
        return { state: { state: 'error', message: verdict.message }, cookies };
    }
    if (verdict.kind === 'expired') {
        return { state: { state: 'expired' }, cookies };
    }
    if (verdict.kind !== 'success') {
        // 还在等扫（或扫了等确认）。
        return { state: { state: verdict.kind === 'scanned' ? 'scanned' : 'waiting' }, cookies };
    }

    // --- 第二步：check_sig ---
    //
    // 这一步的地址是**平台给的**（在上一步那个回答的第三个引号字段里），
    // 不是自己组的。自己组的那个带着过时的参数（平台不再认）。
    //
    // 它回 302，要**手动跟一跳**才能拿到 `p_skey`（下一跳的 Set-Cookie 里才有）。
    // 让原生自动跟重定向的话，只留最后一跳的响应头，前面那跳的 cookie 就丢了 ——
    // 而 `p_skey` 正是下一跳给的。
    const checkSigUrl = verdict.url;
    if (!checkSigUrl) {
        return { state: { state: 'error', message: 'QQ gave no check_sig address' }, cookies };
    }
    const checkSigUin = (() => {
        try {
            return (new URL(checkSigUrl).searchParams.get('uin') || '').replace(/\D/g, '');
        } catch {
            return '';
        }
    })();

    const sigResponse = await requestWithLimit(request, {
        url: checkSigUrl,
        method: 'GET',
        followRedirects: false,
        headers: {
            'User-Agent': QQ_UA,
            Referer: 'https://xui.ptlogin2.qq.com/',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Cookie: formatCookieHeader(cookies),
        },
    });
    cookies = { ...cookies, ...parseCookieHeader(readSetCookie(sigResponse)) };

    // 跟一跳（如果有）：那一跳的 Set-Cookie 里才有 p_skey。
    const sigLocation = responseHeader(sigResponse, 'location');
    if (sigLocation) {
        try {
            const target = new URL(sigLocation, checkSigUrl).toString();
            const followed = await requestWithLimit(request, {
                url: target,
                method: 'GET',
                headers: {
                    'User-Agent': QQ_UA,
                    Referer: checkSigUrl,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    Cookie: formatCookieHeader(cookies),
                },
            });
            cookies = { ...cookies, ...parseCookieHeader(readSetCookie(followed)) };
        } catch {
            // 这一跳失败不致命 —— 下面还要看有没有 p_skey。
        }
    }

    const pSkey = cookies.p_skey ?? '';
    if (!pSkey) {
        return { state: { state: 'error', message: 'QQ gave no p_skey' }, cookies };
    }
    const gtk = qqGetGtk(pSkey);

    // --- 第三步：oauth2.0 authorize ---
    //
    // 它是 **POST**（表单），回 302，Location 里带 code。
    // 要手动跟跳（最多四跳）直到 Location 里有 code —— 每一跳的 Set-Cookie 都要收。
    const form = new URLSearchParams();
    form.append('response_type', 'code');
    form.append('client_id', QQ_PT_APPID);
    form.append('redirect_uri', QQ_AUTHORIZE_REDIRECT);
    form.append('scope', 'get_user_info,get_app_friends');
    form.append('state', 'state');
    form.append('switch', '');
    form.append('from_ptlogin', '1');
    form.append('src', '1');
    form.append('update_auth', '1');
    form.append('openapi', '1010_1030');
    form.append('g_tk', String(gtk));
    form.append('auth_time', String(Date.now()));

    let location = '';
    try {
        const authorizeResponse = await requestWithLimit(request, {
            url: 'https://graph.qq.com/oauth2.0/authorize',
            method: 'POST',
            followRedirects: false,
            headers: {
                'User-Agent': QQ_UA,
                Referer: 'https://graph.qq.com/',
                Origin: 'https://graph.qq.com',
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: formatCookieHeader(cookies),
            },
            body: form.toString(),
        });
        cookies = { ...cookies, ...parseCookieHeader(readSetCookie(authorizeResponse)) };
        location = responseHeader(authorizeResponse, 'location');

        let hops = 0;
        while (
            hops < 4
            && location
            && !/[?&]code=/.test(location)
            && isRedirect(responseHeader(authorizeResponse, 'location'))
        ) {
            hops += 1;
            const nextUrl = new URL(location, 'https://graph.qq.com/').toString();
            const hop = await requestWithLimit(request, {
                url: nextUrl,
                method: 'GET',
                followRedirects: false,
                headers: {
                    'User-Agent': QQ_UA,
                    Referer: 'https://graph.qq.com/',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    Cookie: formatCookieHeader(cookies),
                },
            });
            cookies = { ...cookies, ...parseCookieHeader(readSetCookie(hop)) };
            location = responseHeader(hop, 'location');
            if (!location || !/[?&]code=/.test(location)) {
                // 有些跳把 code 放在正文里。
                const bodyText = responseText(hop);
                const bodyCode = bodyText.match(/[?&]code=([^&"'\s]+)/);
                if (bodyCode?.[1]) location = `x?code=${bodyCode[1]}`;
            }
        }
    } catch (error) {
        return { state: { state: 'error', message: `QQ authorize failed: ${errorMessageOf(error)}` }, cookies };
    }

    const codeMatch = location.match(/[?&]code=([^&]+)/);
    if (!codeMatch) {
        return { state: { state: 'error', message: 'QQ authorization gave no code' }, cookies };
    }
    const code = decodeURIComponent(codeMatch[1]);

    // --- 第四步：musicu 的 QQLogin 换 qm_keyst ---
    //
    // **这一步才是真正拿到凭据的地方**。前面那几步只拿到 code；
    // `qm_keyst` / `qqmusic_key` 才是 QQ 音乐接口认的东西（没有它，登录了也取不到数据）。
    const fcgBody = JSON.stringify({
        comm: { g_tk: gtk, platform: 'yqq', ct: 24, cv: 0 },
        req: { module: 'QQConnectLogin.LoginServer', method: 'QQLogin', param: { code } },
    });

    try {
        const loginResponse = await requestWithLimit(request, {
            url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
            method: 'POST',
            headers: {
                'User-Agent': QQ_UA,
                Referer: 'https://y.qq.com/',
                'Content-Type': 'application/x-www-form-urlencoded',
                Origin: 'https://y.qq.com',
                Cookie: formatCookieHeader(cookies),
            },
            body: fcgBody,
        });
        cookies = { ...cookies, ...parseCookieHeader(readSetCookie(loginResponse)) };

        let fcgJson: any = null;
        try {
            fcgJson = JSON.parse(responseText(loginResponse));
        } catch {
            fcgJson = null;
        }
        const dataNode = fcgJson?.req?.data;
        if (dataNode && typeof dataNode === 'object') {
            if (dataNode.musickey) cookies.qm_keyst = String(dataNode.musickey);
            if (dataNode.qqmusic_key) cookies.qqmusic_key = String(dataNode.qqmusic_key);
            const musicId = String(dataNode.musicid ?? dataNode.uin ?? '').replace(/\D/g, '');
            if (musicId && !cookies.uin && !cookies.p_uin) cookies.uin = `o${musicId}`;
            if (musicId && !cookies.str_musicid) cookies.str_musicid = musicId;
        }
    } catch (error) {
        return { state: { state: 'error', message: `QQ QQLogin failed: ${errorMessageOf(error)}` }, cookies };
    }

    cookies.login_type = '1';
    if (checkSigUin) {
        cookies.uin = `o${checkSigUin}`;
        if (!cookies.qqmusic_uin) cookies.qqmusic_uin = `o${checkSigUin}`;
    }

    if (!cookies.qm_keyst && !cookies.qqmusic_key) {
        return { state: { state: 'error', message: 'QQ signed in but gave no qm_keyst' }, cookies };
    }

    return { state: { state: 'confirmed' }, cookies };
};

/**
 * 读一个响应头（名字大小写不敏感）。
 *
 * 原生那层把响应头放在 `headers` 里（一个普通对象），头名按平台给的样子来 ——
 * `Location` 有时是大写有时是小写。
 */
const responseHeader = (response: { headers?: Record<string, string> }, name: string): string => {
    const headers = response.headers ?? {};
    const wanted = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === wanted) return String(value ?? '');
    }
    return '';
};

/** 这一跳是不是个重定向（3xx 且有 Location）。 */
const isRedirect = (location: string): boolean => Boolean(location);

/**
 * QQ：查一次扫码结果（只查状态，不换票）。
 *
 * `ptqrlogin` 回 0 就是扫好了（可以换票了），非 0 是还在等。
 */
export const qqCheckLogin = async (
    request: MobileRequest,
    session: MobileLoginSession,
): Promise<{ state: MobileLoginState; cookies: Record<string, string> }> => {
    const qrsig = session.token;
    const ptqrtoken = session.ptqrtoken ?? String(qqHash33(qrsig));
    let cookies: Record<string, string> = { ...(session.cookies ?? {}) };

    const loginUrl = buildQqPollUrl(qrsig, ptqrtoken);

    const response = await requestWithLimit(request, {
        url: loginUrl.toString(),
        method: 'GET',
        headers: {
            'User-Agent': QQ_UA,
            Referer: 'https://xui.ptlogin2.qq.com/',
            Cookie: formatCookieHeader(cookies),
        },
    });

    cookies = { ...cookies, ...parseCookieHeader(readSetCookie(response)) };

    // 平台的回答不是 JSON，而是 `ptuiCB(...)` 这种格式：
    //   ptuiCB('0','0','https://ptlogin2.graph.qq.com/check_sig?...','0','登录成功！','nick')
    //   ptuiCB('0','0','','0','二维码未失效','')
    //   ptuiCB('7','0','','0','提交参数错误，请检查。','')
    // 所以状态要从文本里判（按字面），不能解 JSON。
    const body = responseText(response);
    const verdict = readQqPollVerdict(body);

    // 参数错了（或是别的错）：不能当成「还在等」，得说出来。
    if (verdict.kind === 'error') {
        return { state: { state: 'error', message: verdict.message }, cookies };
    }
    if (verdict.kind === 'expired') {
        return { state: { state: 'expired' }, cookies };
    }
    if (verdict.kind === 'scanned') {
        return { state: { state: 'scanned' }, cookies };
    }
    return { state: { state: 'waiting' }, cookies };
};
