import io

p = 'mobile/src/mobileAuthProviders.ts'
lines = io.open(p, encoding='utf-8').read().split('\n')

# ---- 1) 酷狗的登录态：改成读凭据里的信息（不再单独读 userid 字段） ----
kg_start = None
for i, l in enumerate(lines):
    if 'async getLoginStatus(): Promise<ProviderUser | null> {' in l:
        # 第一个是网易云，第二个是酷狗，第三个是 QQ
        kg_start = i
        break
kg_start = next(i for i in range(kg_start + 1, len(lines))
                if 'async getLoginStatus(): Promise<ProviderUser | null> {' in lines[i])
kg_end = next(i for i in range(kg_start, len(lines)) if lines[i].strip() == '},')

kg_new = """        async getLoginStatus(): Promise<ProviderUser | null> {
            // 凭据是一串 cookie（见下面的存法）。登录态从它里面读回来。
            const cookie = await readSessionValue(providerId, 'cookie');
            if (!cookie) return null;
            const auth = readKugouAuth(cookie);
            if (!auth.loggedIn) return null;
            return {
                id: auth.userid || auth.mid,
                nickname: auth.nickname || (await readSessionValue(providerId, 'nickname')) ?? '',
                avatarUrl: auth.avatar || (await readSessionValue(providerId, 'avatar')) ?? '',
                providerId: 'kugou',
            } as ProviderUser;
        },"""

lines[kg_start:kg_end + 1] = kg_new.split('\n')
print('kugou getLoginStatus 已替换', kg_start + 1, '-', kg_end + 1)

# ---- 2) QQ 的登录态：uin 的取法放宽 ----
qq_start = next(i for i in range(kg_start + 12, len(lines))
                 if 'async getLoginStatus(): Promise<ProviderUser | null> {' in lines[i])
qq_end = next(i for i in range(qq_start, len(lines)) if lines[i].strip() == '},')

qq_new = """        async getLoginStatus(): Promise<ProviderUser | null> {
            const cookie = await readSessionValue(providerId, 'cookie');
            if (!cookie) return null;
            const auth = readQqAuth(cookie);
            if (!auth.loggedIn) return null;
            return {
                id: auth.uin,
                nickname: auth.nickname || (await readSessionValue(providerId, 'nickname')) ?? '',
                avatarUrl: auth.avatar || (await readSessionValue(providerId, 'avatar')) ?? '',
                providerId: 'qq',
            } as ProviderUser;
        },"""

lines[qq_start:qq_end + 1] = qq_new.split('\n')
print('qq getLoginStatus 已替换', qq_start + 1, '-', qq_end + 1)

# ---- 3) 加两个凭据解析工具 ----
helper = """
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
    ).replace(/\\D/g, '');
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
    const uin = rawUin.replace(/^o/i, '').replace(/\\D/g, '');
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
"""

anchor_idx = next(i for i, l in enumerate(lines) if l.startswith('/**') and '登录诊断' in lines[i + 1])
lines[anchor_idx:anchor_idx] = helper.split('\n')

io.open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('ok')
