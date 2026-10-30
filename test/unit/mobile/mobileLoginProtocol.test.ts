import { describe, expect, it } from 'vitest';
import {
    parseCookieHeader,
    formatCookieHeader,
    neteaseCheckLogin,
    neteaseReadAccount,
    readQqPollVerdict,
    responseText,
    type MobileRequest,
} from '@/../mobile/src/mobileLogin';
import { weapi, kugouSign, qqHash33 } from '@/../mobile/src/mobileCrypto';

// test/unit/mobile/mobileLoginProtocol.test.ts

// 手机版的登录协议（`mobile/src/mobileLogin.ts`）纯逻辑的测试。
// 平台接口用替身应答 —— 这里测的是「协议怎么读平台的回答」，不是「平台答什么」。

// 走原生插件那条路时正文在 `data`（不是 `text`）——两个都给，
// 路径都能用（见 `responseText`）。
const jsonResponse = (body: unknown, headers: Record<string, string> = {}) => ({
    status: 200,
    text: JSON.stringify(body),
    data: JSON.stringify(body),
    headers,
});

describe('cookie header handling', () => {
    it('parses a cookie header into pairs', () => {
        expect(parseCookieHeader('MUSIC_U=abc123; NMTID=xyz; __csrf=token'))
            .toEqual({ MUSIC_U: 'abc123', NMTID: 'xyz', __csrf: 'token' });
    });

    it('ignores malformed pairs', () => {
        expect(parseCookieHeader('good=1; =bad; ; also=2')).toEqual({ good: '1', also: '2' });
    });

    it('formats pairs back into a header', () => {
        expect(formatCookieHeader({ MUSIC_U: 'abc', NMTID: 'def' })).toBe('MUSIC_U=abc; NMTID=def');
    });

    it('drops empty values when formatting', () => {
        expect(formatCookieHeader({ a: '1', b: '' })).toBe('a=1');
    });
});

describe('NetEase QR check', () => {
    const checkWith = (body: unknown, headers: Record<string, string> = {}) =>
        neteaseCheckLogin(async () => jsonResponse(body, headers), 'key-1', 'MUSIC_U=old');

    it('reads 801 as waiting for the scan', async () => {
        const result = await checkWith({ code: 801, message: '等待扫码' });
        expect(result.state.state).toBe('waiting');
    });

    it('reads 802 as scanned but not confirmed', async () => {
        const result = await checkWith({ code: 802, message: '待确认' });
        expect(result.state.state).toBe('scanned');
    });

    it('reads 800 as expired', async () => {
        const result = await checkWith({ code: 800, message: '二维码过期' });
        expect(result.state.state).toBe('expired');
    });

    it('keeps the old cookie while the scan is not confirmed', async () => {
        const result = await checkWith({ code: 801 });
        expect(result.cookie).toBe('MUSIC_U=old');
    });

    it('takes the session cookie out of Set-Cookie when confirmed', async () => {
        const result = await checkWith(
            { code: 803, message: '授权登录成功' },
            { 'set-cookie': 'MUSIC_U=fresh-token; Max-Age=315360000; Path=/' },
        );
        expect(result.state.state).toBe('confirmed');
        expect(result.cookie).toContain('MUSIC_U=fresh-token');
    });

    it('takes the session cookie out of the body when confirmed', async () => {
        const result = await checkWith({ code: 803, cookie: 'MUSIC_U=from-body' });
        expect(result.state.state).toBe('confirmed');
        expect(result.cookie).toContain('MUSIC_U=from-body');
    });

    it('keeps the previous cookie when the confirmed answer carries none', async () => {
        const result = await checkWith({ code: 803 }, { 'set-cookie': 'NMTID=only-an-id' });
        expect(result.state.state).toBe('confirmed');
        expect(result.cookie).toContain('MUSIC_U=old');
        expect(result.cookie).toContain('NMTID=only-an-id');
    });

    it('reports an error when the platform answers something else', async () => {
        const result = await checkWith({ code: 500, message: '服务器错误' });
        expect(result.state.state).toBe('error');
    });
});

describe('NetEase account reading', () => {
    it('returns null when the answer has no profile', async () => {
        const request: MobileRequest = async () => jsonResponse({ code: 301 });
        expect(await neteaseReadAccount(request, 'MUSIC_U=expired')).toBeNull();
    });

    it('reads the account out of the two answers', async () => {
        const request: MobileRequest = async ({ url }) => {
            if (url.includes('login/status')) {
                return jsonResponse({ code: 200, profile: { userId: 'u-1', nickname: '阿狸' } });
            }
            return jsonResponse({
                code: 200,
                account: { id: 'u-1', nickname: '阿狸', avatarUrl: 'http://img.test/a.jpg' },
            });
        };
        const account = await neteaseReadAccount(request, 'MUSIC_U=good');
        expect(account?.id).toBe('u-1');
        expect(account?.nickname).toBe('阿狸');
    });
});

describe('crypto helpers', () => {
    it('produces a weapi payload with both parts', () => {
        const payload = weapi({ type: 3 });
        expect(payload.params.length).toBeGreaterThan(0);
        // RSA-1024 加密 16 字节 → 128 字节 → 256 个十六进制字符。
        expect(payload.encSecKey).toHaveLength(256);
    });

    it('gives a different secret key each time', () => {
        const a = weapi({ type: 3 });
        const b = weapi({ type: 3 });
        expect(a.params).not.toBe(b.params);
    });

    it('signs KuGou parameters the same way for the same input', () => {
        const params = { appid: 1005, mid: 'abc', plat: 0 };
        expect(kugouSign(params)).toBe(kugouSign({ plat: 0, mid: 'abc', appid: 1005 }));
    });

    it('gives a different KuGou sign for different parameters', () => {
        expect(kugouSign({ appid: 1005 })).not.toBe(kugouSign({ appid: 1006 }));
    });

    it('hashes QQ qrsig into a ptqrtoken', () => {
        expect(qqHash33('abc')).toBe(qqHash33('abc'));
        expect(qqHash33('abc')).not.toBe(qqHash33('abd'));
        // 32 位以内的非负数。
        expect(qqHash33('abc')).toBeGreaterThanOrEqual(0);
    });
});


describe('response body reading', () => {
    // 走 fetch 的那条路正文在 `text`；直接调原生插件的那条路在 `data`。两条都要能用。
    it('reads the body from either shape', () => {
        expect(responseText({ text: 'from-text' })).toBe('from-text');
        expect(responseText({ data: 'from-data' })).toBe('from-data');
        expect(responseText({ text: 'from-text', data: 'from-data' })).toBe('from-text');
        expect(responseText({})).toBe('');
    });
});

describe('QQ poll verdict', () => {
    // 平台的回答是 `ptuiCB(...)` 文本，不是 JSON。
    it('reads waiting', () => {
        expect(readQqPollVerdict("ptuiCB('0','0','','0','二维码未失效','')").kind).toBe('waiting');
    });

    it('reads expired', () => {
        expect(readQqPollVerdict("ptuiCB('0','0','','0','二维码已失效','')").kind).toBe('expired');
    });

    it('does not mistake 未失效 for expired', () => {
        // 「未失效」里也含「失效」——字面判断要排除它。
        expect(readQqPollVerdict("ptuiCB('0','0','','0','二维码未失效','')").kind).toBe('waiting');
    });

    it('reads scanned', () => {
        expect(readQqPollVerdict("ptuiCB('0','0','','0','二维码认证中','')").kind).toBe('scanned');
    });

    it('reads a parameter error as an error, not as waiting', () => {
        // 少参数时平台这个回答——当成「还在等」就会永远卡住。
        const verdict = readQqPollVerdict("ptuiCB('7','0','','0','提交参数错误，请检查。','')");
        expect(verdict.kind).toBe('error');
    });

    it('reads success and takes the check_sig address', () => {
        const verdict = readQqPollVerdict(
            "ptuiCB('0','0','https://ptlogin2.graph.qq.com/check_sig?ptsig=x','0','登录成功！','nick')",
        );
        expect(verdict.kind).toBe('success');
        if (verdict.kind === 'success') {
            expect(verdict.url).toBe('https://ptlogin2.graph.qq.com/check_sig?ptsig=x');
            expect(verdict.nickname).toBe('nick');
        }
    });
});
