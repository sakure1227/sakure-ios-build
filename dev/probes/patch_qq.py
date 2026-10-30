import io

p = 'mobile/src/mobileLogin.ts'
lines = io.open(p, encoding='utf-8').read().split('\n')

start = next(i for i, l in enumerate(lines) if 'export const qqExchangeTicket' in l)
end = next(i for i in range(start, len(lines)) if lines[i].rstrip() == '};')
print('replacing', start + 1, '-', end + 1)

new_block = r'''export const qqExchangeTicket = async (
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
const isRedirect = (location: string): boolean => Boolean(location);'''

lines[start:end + 1] = new_block.split('\n')
io.open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('ok')
