import io

p = 'mobile/src/platformLyrics.ts'
lines = io.open(p, encoding='utf-8').read().split('\n')

# 找到 fetchAggregatedLyrics \u7684\u51fd\u6570\u8fb9\u754c
start = next(i for i, l in enumerate(lines) if 'export const fetchAggregatedLyrics' in l)
end = next(i for i in range(start, len(lines)) if lines[i].rstrip() == '};')
print('replacing', start + 1, '-', end + 1)

body = lines[start:end + 1]
text = '\n'.join(body)

# 1) \u628a\u300c\u805a\u5408\u5e95\u5ea7\u300d\u90a3\u4e00\u6bb5\u524d\u9762\u63d2\u5165\u300c\u8f6c QQ\u300d\u7684\u4e00\u6b65
old_block = """    // 2. 聚合底座。"""
new_block = """    // 2. 网易云没有（或这首歌在网易云上没录歌）→ 去 QQ 音乐找。
    //
    // ## 为什么网易云之后立刻转 QQ（而不是先在聚合底座里重搜网易云）
    //
    // 聚合底座的第一个就是 QQ（见下面），所以直接转过去等于跳过一次无效的搜索。
    // 而且 QQ 的歌词收录最全 —— 「歌在网易云、歌词只有 QQ 有」这种情况很常见。
    if (songPlatform(song) === 'netease') {
        const fromQq = await fetchFromQqBySong(request, song);
        if (fromQq) return fromQq;
    }

    // 3. 聚合底座。"""
assert old_block in text, '聚合底座段没找到'
text = text.replace(old_block, new_block, 1)

# 2) \u628a\u6700\u540e\u7684\u300c\u90fd\u6ca1\u6709\u300d\u7684\u7f16\u53f7\u6539\u4e00\u4e0b
text = text.replace("    // 3. 都没有：如实说没有（不是报错）。", "    // 4. 都没有：如实说没有（不是报错）。")

# 3) \u5728\u51fd\u6570\u540e\u9762\u52a0 fetchFromQqBySong
helper = r'''

/**
 * 按歌去 QQ 音乐找它的歌词。
 *
 * ## 为什么单独有这一步
 *
 * 网易云里可能根本没有这首歌的歌词（版本、翻唱、装版都可能）。这时要去 **QQ** 找 ——
 * QQ 的歌词收录最全，而且它的接口是公开的。
 *
 * 它与聚合底座里的 QQ 那一段是一件事：区别在于这里不先搜「网易云里的那首」，
 * 而是直接拿这首歌的标题与歌手去 QQ 搜。
 */
const fetchFromQqBySong = async (
    request: HttpRequest,
    song: SongResult,
): Promise<ProviderLyricsResult | null> => {
    const artistNames = (song.artists ?? []).map(a => a.name).filter(Boolean).join(', ');
    const query = buildLyricSearchQuery(song.name, artistNames, song.album?.name);
    if (!query.trim() || !song.name) return null;

    let qqSongs: SongResult[] = [];
    try {
        qqSongs = await searchQqWithRetry(query, 10);
    } catch {
        return null;
    }
    if (!qqSongs.length) {
        // 一次没搜到：用光歌名再搜一遍（各家对带分隔符的搜索处理不一样）。
        try {
            qqSongs = await searchQqWithRetry(song.name, 10);
        } catch {
            return null;
        }
    }
    if (!qqSongs.length) return null;

    // 按评分挑最像的那一个（名与歌手都对上才算）。
    const target = {
        title: song.name ?? '',
        artist: normalizeArtistNameForMatch(artistNames),
        album: song.album?.name,
        durationMs: song.durationMs ?? 0,
    };
    const scored = qqSongs
        .map(candidate => ({
            song: candidate,
            details: calculateMatchScoreDetails(target, {
                id: String(candidate.id),
                name: candidate.name,
                artists: candidate.artists?.length
                    ? candidate.artists.map(a => ({ id: 0, name: normalizeArtistNameForMatch(a.name) }))
                    : [],
                album: { id: 0, name: '' },
                durationMs: candidate.durationMs ?? 0,
            } as never),
        }))
        .sort((a, b) => b.details.score - a.details.score);
    const best = scored[0];
    if (!best || !best.details.titleMatched) return null;
    const reliable = best.details.artistMatched || best.details.albumMatched === true;
    if (!reliable && best.details.score < AGGREGATE_MIN_SCORE) return null;

    // QQ 的歌词接口要那首歌自己的 mid 与 id，别人的拿不到。
    try {
        // 搜索与取词之间歇一下：QQ 连着发就限流（回 2001），歇一秒就正常。
        await new Promise(resolve => setTimeout(resolve, 700));
        let lyrics: Awaited<ReturnType<typeof fetchQQLyrics>> = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                lyrics = await fetchQQLyrics(best.song);
                if (lyrics) break;
            } catch {
                // 限流了：歇一下再问。
            }
            if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
            }
        }
        if (lyrics && hasRenderableLyrics(lyrics)) {
            return { lyrics, isPureMusic: false };
        }
    } catch {
        // 这一家问不通：还有聚合底座。
    }
    return null;
};
'''

lines[start:end + 1] = (text + helper).split('\n')
io.open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('ok')
