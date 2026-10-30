import io

p = 'mobile/src/mobileLogin.ts'
s = io.open(p, encoding='utf-8').read()

old = """export const neteaseCheckLogin = async (
    request: MobileRequest,
    key: string,
    cookie = '',
): Promise<{ state: MobileLoginState; cookie: string }> => {
    const { json, setCookie } = await neteaseWeapi(
        request,
        'login/qrcode/client/login',
        { key, type: 3 },
        cookie,
    );
    const code = Number(json?.code);
    switch (code) {
        case 800:
            return { state: { state: 'expired' }, cookie };
        case 801:
            return { state: { state: 'waiting' }, cookie };
        case 802:
            return { state: { state: 'scanned' }, cookie };
        case 803: {
            // 已授权。凭据在 Set-Cookie 里（`MUSIC_U=...`），平台也在 body 里给了 cookie 字段。
            const fromBody = String(json?.cookie ?? '');
            const fromHeader = setCookie;
            const merged = formatCookieHeader({
                ...parseCookieHeader(cookie),
                ...parseCookieHeader(fromBody),
                ...parseCookieHeader(fromHeader),
            });
            if (!merged) {
                return { state: { state: 'error', message: 'NetEase confirmed the scan but gave no session cookie' }, cookie };
            }
            return { state: { state: 'confirmed' }, cookie: merged };
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
};"""

new = """export const neteaseCheckLogin = async (
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
};"""

assert old in s, 'neteaseCheckLogin 段没找到'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
