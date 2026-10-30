import io

p = 'mobile/src/platformSearch.ts'
s = io.open(p, encoding='utf-8').read()

old = """            album: {
            id: String(row.albumid ?? row.ALBUMID ?? ''),
            name: String(row.album ?? row.ALBUM ?? ''),
            // 酷我的封面由专辑 id 拼出来（`img.kwcdn.cn` 那个图床）。
            // 有些行没有专辑 id（0 或空）——那样拼出来的地址是 `…/0.jpg`，取不到图。
            coverUrl: (() => {
                const albumId = String(row.albumid ?? row.ALBUMID ?? '');
                return albumId && albumId !== '0' ? `https://img.kwcdn.cn/data/album/${albumId}.jpg` : undefined;
            })(),
        },"""

new = """            album: {
            id: String(row.albumid ?? row.ALBUMID ?? ''),
            name: String(row.album ?? row.ALBUM ?? ''),
            // 酷我的封面有两条路，第一条走不通时走第二条。
            //
            // **第一条：平台直接给的地址**（`hts_MVPIC` / `pic` / `album_pic` 那些字段）。
            // 它是完整 URL，最靠得住 —— 用它不用猜图床的路径规则。
            //
            // **第二条：自己用专辑 id 拼**（`https://img2.kuwo.cn/wmvpic/<albumId>.jpg`）。
            //
            // 为什么不是以前那个 `img.kwcdn.cn`：那个域名现在**解析不了**
            // （`Unable to resolve host`），拼出来的地址全是死的。
            // 而 `img2.kuwo.cn` 的 `/wmvpic/` 路径实测能取到图。
            coverUrl: kuwoCoverUrl(row),
        },"""

assert old in s, 'kuwo album \u6bb5\u6ca1\u627e\u5230'
s = s.replace(old, new)

helper = """
/**
 * \u9177\u6211\u7684\u5c01\u9762\u5730\u5740\u3002
 *
 * \u4f18\u5148\u7528\u5e73\u53f0\u81ea\u5df1\u7ed9\u7684\uff08`hts_MVPIC` / `pic` / `album_pic` \u90a3\u4e9b\u5b57\u6bb5\uff09\u2014\u2014 \u90a3\u662f\u5b8c\u6574 URL\uff0c\u4e0d\u7528\u731c\u56fe\u5e8a\u8def\u5f84\u3002
 * \u6ca1\u6709\u7684\u8bdd\u5c31\u7528\u4e13\u8f91 id \u62fc\u3002
 *
 * ## \u56fe\u5e8a\u7684\u9009\u62e9\u662f\u8005\u91cc\u5fc3\u7684
 *
 * \u4ee5\u524d\u7528\u7684 `img.kwcdn.cn` \u73b0\u5728\u89e3\u6790\u4e0d\u4e86\uff08`Unable to resolve host`\uff09\uff0c\u62fc\u51fa\u6765\u7684\u5730\u5740\u5168\u662f\u6b7b\u7684\u3002
 * `img2.kuwo.cn` \u80fd\u89e3\u6790\uff0c\u4f46\u5b83\u7684\u8def\u5f84\u4e0d\u662f `/data/album/<id>.jpg`\uff08\u90a3\u4e2a\u8fd4\u56de 404\uff09\u3002
 */
const kuwoCoverUrl = (row: Record<string, string | number | undefined>): string | undefined => {
    // 1) \u5e73\u53f0\u76f4\u63a5\u7ed9\u7684\u5b8c\u6574\u5730\u5740\u3002
    for (const key of ['hts_MVPIC', 'Mvpic', 'mvp ic', 'pic', 'PIC', 'album_pic', 'ALBUMPIC', 'web_albumpic_short']) {
        const value = String(row[key] ?? '').trim();
        if (!value) continue;
        if (/^https?:\\/\\//i.test(value)) return value;
    }
    // 2) \u5e73\u53f0\u7ed9\u7684\u76f8\u5bf9\u8def\u5f84\uff08\u50cf `120/s4s11/89/774616642.jpg`\uff09\u2014\u2014\u8865\u4e0a\u56fe\u5e8a\u4e3b\u673a\u3002
    const relative = String(row.web_albumpic_short ?? row.web_albumpic ?? row.album_pic_short ?? '').trim();
    if (relative && !/^https?:\\/\\//i.test(relative)) {
        return `https://img2.kuwo.cn/wmvpic/${relative.replace(/^\\//, '')}`;
    }
    // 3) \u7528\u4e13\u8f91 id \u62fc\u3002
    const albumId = String(row.albumid ?? row.ALBUMID ?? '').trim();
    if (albumId && albumId !== '0') {
        return `https://img2.kuwo.cn/wmvpic/${albumId}.jpg`;
    }
    return undefined;
};
"""

anchor = """/**
 * \u4e00\u4e2a\u5e73\u53f0\u7684\u641c\u7d22\u3002"""
if anchor in s:
    s = s.replace(anchor, helper + "\n" + anchor, 1)
else:
    # \u653e\u5728 searchKuwo \u4e4b\u524d
    anchor2 = "const searchKuwo = async ("
    s = s.replace(anchor2, helper + "\n" + anchor2, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
