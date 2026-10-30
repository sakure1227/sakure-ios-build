import io

p = 'mobile/src/mobileAuthProviders.ts'
s = io.open(p, encoding='utf-8').read()

old = """        async getLoginStatus(): Promise<ProviderUser | null> {
            // 凭据是一串 cookie（见下面的存法）。登录态从它里面读回来。
            const cookie = await readSessionValue(providerId, 'cookie');
            if (!cookie) return null;
            const userid = await readSessionValue(providerId, 'userid');
            if (!userid) return null;
            return {
                id: userid,
                nickname: await readSessionValue(providerId, 'nickname') ?? '',
                avatarUrl: await readSessionValue(providerId, 'avatar') ?? '',
                providerId: 'kugou',
            } as ProviderUser;
        },"""

new = """        async getLoginStatus(): Promise<ProviderUser | null> {
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

assert old in s, 'kugou getLoginStatus 段没找到'
s = s.replace(old, new)

# \u52a0\u4e0a\u51ed\u636e\u89e3\u6790\u7684\u5de5\u5177\u51fd\u6570
helper = """
/**
 * \u4ece\u9177\u72d7\u7684\u51ed\u636e\u4e32\u91cc\u8bfb\u51fa\u8d26\u53f7\u3002
 *
 * ## \u4e3a\u4ec0\u4e48\u8981\u81ea\u5df1\u89e3\u6790\u800c\u4e0d\u662f\u76f4\u63a5\u8bfb\u5b57\u6bb5
 *
 * \u9177\u72d7\u7684\u51ed\u636e\u91cc\u6709\u4e00\u4e2a**\u590d\u5408\u5b57\u6bb5** `KuGoo=KugooID=<id>&t=<token>&userid=<id>&confirm_flag=1`
 * \u2014\u2014 \u91cc\u9762\u53c8\u653e\u4e86\u72ec\u7acb\u7684 `userid=` / `token=` \u7b49\u5b57\u6bb5\u3002\u4f9d\u8d56\u54ea\u4e00\u4e2a\u5c31\u4f1a\u9057\u6f0f\u3002
 *
 * \u53d6\u503c\u53d6\u5f97\u5bbd\uff08`userId` / `user_id` / `id` / `KugooID` \u90fd\u7b97\uff09\u2014\u2014 \u5e73\u53f0\u8fd9\u51e0\u4e2a\u63a5\u53e3\u7ed9\u7684\u5b57\u6bb5\u540d\u5e76\u4e0d\u4e00\u81f4\uff0c
 * \u5361\u5f97\u8fc7\u6b7b\u5c31\u8bfb\u4e0d\u5230\u4eba\u3002\u5bf9\u65b9\u4e5f\u662f\u8fd9\u4e48\u53d6\u7684\uff08`kugou-api.js` \u7684 `extractKugouAuth`\uff09\u3002
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
    // `KuGoo` \u91cc\u7684\u90a3\u4e2a\u590d\u5408\u5b57\u6bb5\u4e5f\u8981\u62c6\u5f00\u770b\u3002
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
        // \u6709\u7528\u6237\u53f7\uff08\u4e0d\u662f 0\uff09\uff0c\u6216\u8005\u51ed\u636e\u91cc\u5e26\u7740 `KuGoo` \u8fd9\u4e2a\u590d\u5408\u5b57\u6bb5\u2014\u2014\u90a3\u5c31\u7b97\u767b\u5f55\u4e86\u3002
        loggedIn: Boolean((userid && userid !== '0') || compound),
    };
};
"""

anchor = """/**
 * \u767b\u5f55\u8bca\u65ad\u3002"""
assert anchor in s
s = s.replace(anchor, helper + "\n" + anchor, 1)

# \u5bfc\u5165 parseCookieHeader
if 'parseCookieHeader' not in s.split('\n')[0:60][0] and "from './mobileLogin'" in s:
    pass
io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
