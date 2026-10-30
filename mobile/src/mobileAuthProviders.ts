// mobile/src/mobileAuthProviders.ts
// 手机版的登录接线：把 `mobileLogin.ts` 里的扫码协议接到 provider 的 `auth` 契约上。
//
// ## 这一层做什么
//
// `mobileLogin.ts` 只管协议（取码、出图、轮询、换票）；这一层管**状态与存储**：
// 一次登录会话的 key 放哪、凭据怎么存、登录态怎么读、退出登录怎么清。
//
// ## 与桌面版的关系
//
// 桌面版的登录由内嵌的 Node 后端做（`@neteasecloudmusicapienhanced`），凭据由
// Electron 的 `safeStorage` 加密后存盘。手机版没有 Node，但**协议可以自己实现**
// （`mobileLogin.ts`），加密由 Android Keystore 做（`mobileCredentials.ts`）。
//
// 所以手机版的登录是与桌面**并排的另一条实现**，不是桌面那条的降级 —— 行为一致
// （扫码 → 存凭据 → 读登录态 → 读歌单），只是底下的实现换了。

import type { LoginDiagnosticLine, LoginFailureDetail, LoginState, OnlineMusicProvider, ProviderUser } from '../../src/types/onlineMusic';
import {
    neteaseStartLogin,
    neteaseCreateQr,
    neteaseCheckLogin,
    neteaseReadAccount,
    kugouStartLogin,
    kugouCreateQr,
    kugouCheckLogin,
    qqStartLogin,
    qqCheckLogin,
    qqExchangeTicket,
    formatCookieHeader,
    parseCookieHeader,
    type MobileLoginSession,
    type MobileRequest,
} from './mobileLogin';
import { saveCredential, loadCredential, removeCredential } from './mobileCredentials';
import { diagnosticLine } from '../../src/services/onlineMusic/login/loginDiagnosticReport';

/**
 * 一次登录会话。
 *
 * key 是「这次登录的凭据」（二维码 key / qrsig）。界面拿着它去问「扫好了吗」，
 * 所以会话要按 key 存着，不能只有一个当前会话 —— 用户可以同时开两个登录窗口。
 */
type Session = MobileLoginSession;

const sessions = new Map<string, Session>();

/** 读一个平台的凭据（可能是 cookie，也可能是一串键值）。 */
const readSessionValue = async (providerId: string, key: string): Promise<string | null> => (
    loadCredential(`${providerId}_${key}`)
);

const writeSessionValue = async (providerId: string, key: string, value: string): Promise<void> => (
    saveCredential(`${providerId}_${key}`, value)
);

const clearSessionValue = async (providerId: string, key: string): Promise<void> => (
    removeCredential(`${providerId}_${key}`)
);


/**
 * 把手机版的错误翻成登录窗口能说的事实。
 *
 * 不这个映射的话，屏幕上就是「未知错误」（登录失败分不出现时的兜底文案）——
 * 用的人看不出原因，只能盲猜。这里把平台说的原话交出来。
 *
 * 分类（哪一种情况）依旧是共用的规则（`loginFailureCase.ts`）——这里只把「事实」交出去，
 * 不自己定一个情况。
 */
const describeMobileLoginFailure = (
    platformLabel: string,
): ((step: string, error: unknown) => LoginFailureDetail | null) => (step, error) => {
    const message = errorMessageOf(error);
    if (!message) return null;
    // 网络层的错（连不上）与平台拒绝的错（有原话）分开：
    // 前者可以立即重试，后者重试也不行。
    const unreachable = /network|unreachable|timeout|timed out|failed to fetch|connection/i.test(message);
    const refused = /参数错误|拒绝|不允许|device-limit|设备满|forbidden|unauthorized/i.test(message);

    return {
        message: `${platformLabel}: ${message}`,
        ...(unreachable ? { case: 'unreachable' as const } : {}),
        ...(refused ? { case: 'refused' as const } : {}),
        // 做不到的事实也说出来（哈希不拿到密钥的那一口）。
        ...(unreachable || refused ? {} : { code: step }),
    };
};


/**
 * 从酷狗的凭据串里读出账号。
 *
 * ## 为什么要自己解析而不直接读字段
 *
 * 酷狗的凭据里有一个**复合字段** `KuGoo=KugooID=<id>&t=<token>&userid=<id>&confirm_flag=1`
 * —— 里面又放了用户号与 token，而外面还放着独立的 `userid=` / `token=` 等字段。
 * 依赖哪一个就会遗漏。
 *
 * 取值取得宽（`userId` / `user_id` / `id` / `KugooID` 都算）—— 平台这几个接口给的字段名
 * 并不一致，卡得过死就读不到人。对方也是这么取的（`kugou-api.js` 的 `extractKugouAuth`）。
 */
type KugouAuth = {
    userid: string;
    token: string;
    mid: string;
    nickname: string;
    avatar: string;
    loggedIn: boolean;
};

const readKugouAuth = (cookie: string): KugouAuth => {
    const pairs = parseCookieHeader(cookie);
    // `KuGoo` 里的那个复合字段也要拆开看。
    const compound = pairs.KuGoo ?? pairs.kugou ?? pairs.Kugou ?? '';
    const inner = parseCookieHeader(compound.replace(/&/g, ';'));

    const userid = String(
        pairs.userid ?? pairs.UserId ?? pairs.KugooID ?? pairs.kugouID
        ?? inner.KugooID ?? inner.kugooID ?? inner.userid ?? inner.uid ?? '',
    ).replace(/\D/g, '');
    const token = String(
        pairs.token ?? pairs.Token ?? pairs.t ?? pairs.T ?? inner.t ?? inner.token ?? '',
    ).trim();
    const nickname = String(
        inner.NickName ?? inner.nickname ?? pairs.NickName ?? pairs.nickname
        ?? pairs.UserName ?? pairs.username ?? '',
    ).replace(/<[^>]+>/g, '');
    const avatar = String(inner.Pic ?? inner.pic ?? pairs.Pic ?? pairs.avatar ?? '').trim();
    const mid = String(pairs.kg_mid ?? pairs.KG_MID ?? pairs.mid ?? userid).trim();

    return {
        userid,
        token,
        mid,
        nickname,
        avatar,
        // 有用户号（不是 0），或者凭据里带着 `KuGoo` 这个复合字段 —— 那就算登录了。
        loggedIn: Boolean((userid && userid !== '0') || compound),
    };
};

/**
 * 从 QQ 的凭据串里读出账号。
 *
 * QQ 换票链拿到的 cookie 里有 `uin=o0123456789`（带 `o` 前缀）与 `access_token`。
 * 用户号在 `uin` 里（可能带 `o` 前缀），昵称与头像是换票时另外拿到的。
 */
type QqAuth = {
    uin: string;
    nickname: string;
    avatar: string;
    loggedIn: boolean;
};

const readQqAuth = (cookie: string): QqAuth => {
    const pairs = parseCookieHeader(cookie);
    // `uin` 可能是 `o0123456789`（带 o 前缀），去掉前缀才是数字用户号。
    const rawUin = String(pairs.uin ?? pairs.Uin ?? pairs.qq_uin ?? '');
    const uin = rawUin.replace(/^o/i, '').replace(/\D/g, '');
    const nickname = String(pairs.nickname ?? pairs.NickName ?? '').trim();
    const avatar = String(pairs.avatar ?? pairs.Avatar ?? '').trim();
    return {
        uin,
        nickname,
        avatar,
        // 有用户号就算登录了（有 access_token 时说明换票成功）。
        loggedIn: Boolean(uin),
    };
};

/**
 * 登录诊断。
 *
 * 手机版的登录是**自己**发请求实现的，所以失败的原因只有这里知道。诊断报告是
 * 登录失败时用户能看到的那几行 —— 说清楚「是没登录」「是网络不通」「是平台拒了」
 * 「是凭据读不出来」。
 *
 * 报告里不能有凭据、账号、IP（`loginDiagnosticReport.ts` 的规矩）。
 */
const buildDiagnostics = (
    providerId: string,
    platformLabel: string,
    extra: () => Promise<LoginDiagnosticLine[]>,
): (() => Promise<LoginDiagnosticLine[]>) => async () => {
    const lines: LoginDiagnosticLine[] = [];
    let hasCredential = false;
    let credentialNote = 'unreadable';
    try {
        hasCredential = Boolean(await readSessionValue(providerId, 'cookie'))
            || Boolean(await readSessionValue(providerId, 'token'));
        credentialNote = hasCredential ? 'present' : 'none';
    } catch (error) {
        credentialNote = `unreadable (${errorMessageOf(error)})`;
    }
    lines.push(diagnosticLine`platform: ${platformLabel} on mobile`);
    lines.push(diagnosticLine`credential: ${credentialNote}`);
    try {
        lines.push(...await extra());
    } catch (error) {
        lines.push(diagnosticLine`probe: failed: ${errorMessageOf(error)}`);
    }
    return lines;
};

const errorMessageOf = (error: unknown): string => (
    error instanceof Error ? error.message : String(error)
);

/**
 * 网易云的登录接线。
 *
 * 凭据是 cookie（`MUSIC_U` 等）。网易云的接口都要带它，所以每次请求都把它拼在
 * `Cookie` 头上。
 */
export const buildNeteaseAuth = (
    request: MobileRequest,
): NonNullable<OnlineMusicProvider['auth']> => {
    const providerId = 'netease';

    const withCookie = async <T>(fn: (cookie: string) => Promise<T>): Promise<T> => {
        const cookie = (await readSessionValue(providerId, 'cookie')) ?? '';
        return await fn(cookie);
    };

    return {
        getLoginTexts: () => ({ title: 'home.loginTitle', note: 'home.loginNote' }),
        showsKeptAccountAtStart: true,
        async getLoginStatus(): Promise<ProviderUser | null> {
            const cookie = (await readSessionValue(providerId, 'cookie')) ?? '';
            if (!cookie) return null;
            const account = await neteaseReadAccount(request, cookie);
            if (!account) return null;
            return {
                id: account.id,
                nickname: account.nickname,
                avatarUrl: account.avatarUrl,
                backgroundUrl: account.backgroundUrl,
                providerId: 'netease',
            } as ProviderUser;
        },
        async logout(): Promise<void> {
            await clearSessionValue(providerId, 'cookie');
        },
        async startLogin(): Promise<string> {
            const key = await neteaseStartLogin(request);
            sessions.set(key, { platform: 'netease', token: key });
            return key;
        },
        async createQr(key: string): Promise<string> {
            return await neteaseCreateQr(request, key);
        },
        async checkLogin(key: string): Promise<LoginState> {
            const cookie = (await readSessionValue(providerId, 'cookie')) ?? '';
            const result = await neteaseCheckLogin(request, key, cookie);
            if (result.state.state === 'confirmed') {
                // 平台给了新的 cookie（含 MUSIC_U）—— 存起来，那才是登录态。
                await writeSessionValue(providerId, 'cookie', result.cookie);
            }
            return result.state;
        },
        async cancelLogin(key: string): Promise<void> {
            sessions.delete(key);
        },
        describeLoginFailure: describeMobileLoginFailure('NetEase'),
        getLoginDiagnostics: buildDiagnostics(providerId, 'NetEase', async () => {
            // 探一次平台：读登录态。它答 301 就是凭据已经不管用了（过期），
            // 答 200 就是还在。能连上说明网络没问题。
            const cookie = (await readSessionValue(providerId, 'cookie')) ?? '';
            if (!cookie) return [diagnosticLine`probe: no session cookie stored`];
            try {
                const account = await neteaseReadAccount(request, cookie);
                return [diagnosticLine`probe: ${account ? 'session accepted' : 'session rejected by the platform'}`];
            } catch (error) {
                return [diagnosticLine`probe: unreachable (${errorMessageOf(error)})`];
            }
        }),
    };
};

/**
 * 酷狗的登录接线。
 *
 * 酷狗的凭据是三个值：`token`、`userid`、`dfid`。
 */
export const buildKugouAuth = (
    request: MobileRequest,
): NonNullable<OnlineMusicProvider['auth']> => {
    const providerId = 'kugou';

    return {
        getLoginTexts: () => ({ title: 'home.loginTitleKugou', note: 'home.loginNoteKugou' }),
        showsKeptAccountAtStart: true,
        async getLoginStatus(): Promise<ProviderUser | null> {
            // 凭据是一串 cookie（见下面的存法）。登录态从它里面读回来。
            const cookie = await readSessionValue(providerId, 'cookie');
            if (!cookie) return null;
            const auth = readKugouAuth(cookie);
            if (!auth.loggedIn) return null;
            return {
                id: auth.userid || auth.mid,
                nickname: auth.nickname || (await readSessionValue(providerId, 'nickname')) || '',
                avatarUrl: auth.avatar || (await readSessionValue(providerId, 'avatar')) || '',
                providerId: 'kugou',
            } as ProviderUser;
        },
        async logout(): Promise<void> {
            await clearSessionValue(providerId, 'cookie');
            await clearSessionValue(providerId, 'token');
            await clearSessionValue(providerId, 'userid');
            await clearSessionValue(providerId, 'dfid');
            await clearSessionValue(providerId, 'nickname');
            await clearSessionValue(providerId, 'avatar');
        },
        async startLogin(): Promise<string> {
            const { key, url } = await kugouStartLogin(request);
            sessions.set(key, { platform: 'kugou', token: key });
            // 平台给的是二维码的**地址**，图片要自己画 —— 地址先存着，
            // createQr 时再画（那时才知道画的是什么）。
            kugouQrUrls.set(key, url);
            return key;
        },
        async createQr(key: string): Promise<string> {
            const url = kugouQrUrls.get(key);
            if (!url) throw new Error('KuGou QR address is not available for this session');
            return await kugouCreateQr(url);
        },
        async checkLogin(key: string): Promise<LoginState> {
            const result = await kugouCheckLogin(request, key);
            if (result.state.state === 'confirmed' && result.credential) {
                const { token, userid, dfid, nickname, avatar } = result.credential;
                // 酷狗的会话是一串 cookie（不是单一的 token）：
                //   KuGoo=KugooID=<id>&t=<token>&userid=<id>&confirm_flag=1
                // 后面的请求靠它。格式与对方一致（否则平台不认）。
                const pairs = [
                    `KuGoo=KugooID=${userid}&t=${token}&userid=${userid}&confirm_flag=1`,
                    `userid=${userid}`,
                    `KugooID=${userid}`,
                    `token=${token}`,
                    `t=${token}`,
                ];
                if (dfid) pairs.push(`dfid=${dfid}`);
                // 昵称与头像也放进凭据里 —— 登录态要显示它们，而平台不一定会再给一次。
                if (nickname) pairs.push(`NickName=${encodeURIComponent(nickname)}`);
                if (avatar) pairs.push(`Pic=${avatar}`);
                await writeSessionValue(providerId, 'cookie', pairs.join('; '));
                await writeSessionValue(providerId, 'token', token);
                await writeSessionValue(providerId, 'userid', userid);
                if (nickname) await writeSessionValue(providerId, 'nickname', nickname);
                if (avatar) await writeSessionValue(providerId, 'avatar', avatar);
                if (dfid) {
                    await writeSessionValue(providerId, 'dfid', dfid);
                }
            }
            return result.state;
        },
        async cancelLogin(key: string): Promise<void> {
            sessions.delete(key);
            kugouQrUrls.delete(key);
        },
        describeLoginFailure: describeMobileLoginFailure('KuGou'),
        getLoginDiagnostics: buildDiagnostics(providerId, 'KuGou', async () => {
            const userid = await readSessionValue(providerId, 'userid');
            const token = await readSessionValue(providerId, 'token');
            if (!userid || !token) return [diagnosticLine`probe: no KuGou token stored`];
            return [diagnosticLine`probe: token stored for a known user`];
        }),
    };
};

/** 酷狗的二维码地址（平台给地址，图片自己画）。 */
const kugouQrUrls = new Map<string, string>();

/**
 * QQ 的登录接线。
 *
 * QQ 的凭据是一串 cookie（含 `access_token`、`p_skey`、`uin`）。存成 cookie 串。
 */
export const buildQqAuth = (
    request: MobileRequest,
): NonNullable<OnlineMusicProvider['auth']> => {
    const providerId = 'qq';

    return {
        getLoginTexts: () => ({ title: 'home.loginTitleQq', note: 'home.loginNoteQq' }),
        showsKeptAccountAtStart: true,
        async getLoginStatus(): Promise<ProviderUser | null> {
            const cookie = await readSessionValue(providerId, 'cookie');
            if (!cookie) return null;
            const auth = readQqAuth(cookie);
            if (!auth.loggedIn) return null;
            return {
                id: auth.uin,
                nickname: auth.nickname || (await readSessionValue(providerId, 'nickname')) || '',
                avatarUrl: auth.avatar || (await readSessionValue(providerId, 'avatar')) || '',
                providerId: 'qq',
            } as ProviderUser;
        },
        async logout(): Promise<void> {
            await clearSessionValue(providerId, 'cookie');
            await clearSessionValue(providerId, 'nickname');
            await clearSessionValue(providerId, 'avatar');
        },
        async startLogin(): Promise<string> {
            const { key, image, ptqrtoken, cookies } = await qqStartLogin(request);
            sessions.set(key, { platform: 'qq', token: key, ptqrtoken, cookies });
            // 二维码图在开始登录时就拿到了（QQ 的接口直接给 png），先存着，
            // createQr 就不用再问一次平台了。
            qqImages.set(key, image);
            return key;
        },
        async createQr(key: string): Promise<string> {
            const image = qqImages.get(key);
            if (image) return image;
            throw new Error('QQ QR image is not available for this session');
        },
        async checkLogin(key: string): Promise<LoginState> {
            const session = sessions.get(key);
            if (!session) return { state: 'expired' };

            const check = await qqCheckLogin(request, session);
            if (check.state.state !== 'scanned') {
                return check.state;
            }

            // 扫好了 —— 走换票链（ptqrlogin → check_sig → oauth2.0 → token）。
            const exchanged = await qqExchangeTicket(request, session);
            if (exchanged.state.state !== 'confirmed') {
                return exchanged.state;
            }

            const cookie = formatCookieHeader(exchanged.cookies);
            await writeSessionValue(providerId, 'cookie', cookie);
            return { state: 'confirmed' };
        },
        async cancelLogin(key: string): Promise<void> {
            sessions.delete(key);
            qqImages.delete(key);
        },
        describeLoginFailure: describeMobileLoginFailure('QQMusic'),
        getLoginDiagnostics: buildDiagnostics(providerId, 'QQMusic', async () => {
            const cookie = await readSessionValue(providerId, 'cookie');
            if (!cookie) return [diagnosticLine`probe: no QQ session stored`];
            const hasToken = cookie.includes('access_token=');
            return [diagnosticLine`probe: session stored (${hasToken ? 'with access token' : 'without access token'})`];
        }),
    };
};

/** QQ 的二维码图（开始登录时就拿到了，单独放着）。 */
const qqImages = new Map<string, string>();
