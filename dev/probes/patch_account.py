import io

p = 'mobile/src/mobileLogin.ts'
s = io.open(p, encoding='utf-8').read()

old = """    const status = await neteaseWeapi(request, 'w/nuser/account/get', {}, cookie);
    // 响应的层次：网易云的账号接口回的是 `{ code, account, profile }`，
    // 上游包会把它再封一层 `data`。两种形状都要能读（直接请求平台时没有那层）。
    const statusBody = status.json?.data ?? status.json ?? {};
    const statusCode = Number(status.json?.code ?? statusBody?.code);
    const loginProfile = statusBody?.profile;
    if (!loginProfile || [301, 401, 403].includes(statusCode)) return null;

    const account = await neteaseWeapi(request, 'nuser/account/get', {}, cookie);
    const accountBody = account.json?.data ?? account.json ?? {};
    const accountCode = Number(account.json?.code ?? accountBody?.code);
    const accountProfile = accountBody?.profile ?? accountBody?.account ?? {};
    if (!accountProfile || [301, 401, 403].includes(accountCode)) return null;

    const id = String(accountProfile?.id ?? accountProfile?.userId ?? loginProfile?.userId ?? loginProfile?.id ?? '');
    const nickname = String(accountProfile?.nickname ?? loginProfile?.nickname ?? '');
    if (!id || !nickname) return null;

    return {
        id,
        nickname,
        avatarUrl: String(accountProfile?.avatarUrl ?? loginProfile?.avatarUrl ?? ''),
        backgroundUrl: String(accountProfile?.backgroundUrl ?? loginProfile?.backgroundUrl ?? ''),
    };
};"""

new = """    // 先问「登录态」，它给的资料最新；问不到再降级问「账号」（与对方一致）。
    // 两个接口各带自己的时限 —— 平台不答时不能一直等着（登录窗口会一直转圈）。
    const status = await neteaseWeapi(request, 'w/nuser/account/get', {}, cookie);
    // 响应的层次：网易云的账号接口回的是 `{ code, account, profile }`，
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
};"""

assert old in s, 'neteaseReadAccount 段没找到'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
