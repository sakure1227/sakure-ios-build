import io

p = 'mobile/src/mobileLogin.ts'
s = io.open(p, encoding='utf-8').read()

old = """    if (status === 4 || data.token) {
        const credential = {
            token: String(data.token ?? ''),
            userid: String(data.userid ?? data.user_id ?? ''),
            dfid: String(data.dfid ?? ''),"""

new = """    if (status === 4 || data.token) {
        const credential = {
            token: String(data.token ?? data.t ?? ''),
            userid: String(data.userid ?? data.user_id ?? data.KugooID ?? ''),
            dfid: String(data.dfid ?? ''),
            // 昵称与头像平台也给了（昵称里可能带 HTML 标签，去掉）。
            nickname: String(data.nickname ?? data.nick_name ?? data.username ?? '').replace(/<[^>]+>/g, ''),
            avatar: String(data.pic ?? data.Pic ?? data.avatar ?? '').trim(),"""

assert old in s, 'kugou credential 段没找到'
s = s.replace(old, new)

# \u51ed\u636e\u7684\u7c7b\u578b\u52a0\u4e0a\u65b0\u5b57\u6bb5
old2 = """): Promise<{ state: MobileLoginState; credential: { token: string; userid: string; dfid: string } | null }> => {"""
new2 = """): Promise<{
    state: MobileLoginState;
    credential: { token: string; userid: string; dfid: string; nickname: string; avatar: string } | null;
}> => {"""
assert old2 in s, 'kugou \u8fd4\u56de\u7c7b\u578b\u6bb5\u6ca1\u627e\u5230'
s = s.replace(old2, new2)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
