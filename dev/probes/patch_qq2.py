import io

p = 'mobile/src/mobileLogin.ts'
s = io.open(p, encoding='utf-8').read()

# 1) followRedirects \u9009\u9879\u52a0\u5230 MobileRequest \u7684\u53c2\u6570\u7c7b\u578b\u91cc
old = """    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
}) => Promise<{"""
new = """    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
    /**
     * \u8981\u4e0d\u8981\u81ea\u5df1\u8ddf\u91cd\u5b9a\u5411\u3002
     *
     * QQ \u767b\u5f55\u8981\u624b\u52a8\u8ddf\uff1a\u6362\u7968\u94fe\u4e0a\u6bcf\u4e00\u8df3\u7684 `Set-Cookie` \u90fd\u8981\u6536\u7740\uff08`p_skey` \u5c31\u662f\u4e0b\u4e00\u8df3\u7ed9\u7684\uff09\u3002
     * \u8ba9\u539f\u751f\u81ea\u52a8\u8ddf\u7684\u8bdd\uff0c\u53ea\u7559\u6700\u540e\u4e00\u8df3\u7684\u54cd\u5e94\u5934 \u2014\u2014 \u524d\u9762\u90a3\u4e9b\u7684 cookie \u5c31\u4e22\u4e86\u3002
     */
    followRedirects?: boolean;
}) => Promise<{"""
assert old in s, 'MobileRequest \u53c2\u6570\u6bb5\u6ca1\u627e\u5230'
s = s.replace(old, new)

# 2) QQ_AUTHORIZE_REDIRECT \u5e38\u91cf
old2 = """const QQ_U1 = 'https://graph.qq.com/oauth2.0/login_jump';"""
new2 = """const QQ_U1 = 'https://graph.qq.com/oauth2.0/login_jump';
// \u6388\u6743\u56de\u8c03\u7684\u5730\u5740\uff1a\u5b83\u5e26\u7740 code \u56de\u6765\uff08\u4e0e\u5bf9\u65b9\u4e00\u81f4\uff09\u3002
const QQ_AUTHORIZE_REDIRECT = 'https://y.qq.com/portal/wx_redirect.html?login_type=1&surl=https://y.qq.com/';"""
assert old2 in s, 'QQ_U1 \u5e38\u91cf\u6bb5\u6ca1\u627e\u5230'
s = s.replace(old2, new2)

# 3) errorMessageOf \u5de5\u5177\u51fd\u6570\uff08\u6a21\u5757\u7ea7\uff09
old3 = """/**
 * \u4e00\u6b21\u767b\u5f55\u8bf7\u6c42\u7684\u65f6\u9650\u3002"""
new3 = """/**
 * \u9519\u8bef\u7684\u6587\u5b57\u3002
 */
const errorMessageOf = (error: unknown): string => (
    error instanceof Error ? error.message : String(error)
);

/**
 * \u4e00\u6b21\u767b\u5f55\u8bf7\u6c42\u7684\u65f6\u9650\u3002"""
assert old3 in s, '\u8bf7\u6c42\u65f6\u9650\u6bb5\u6ca1\u627e\u5230'
s = s.replace(old3, new3, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
