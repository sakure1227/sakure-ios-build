import io

p = 'mobile/src/platformLyrics.ts'
s = io.open(p, encoding='utf-8').read()

old = """    // 1. \u6b4c\u81ea\u5df1\u90a3\u4e2a\u5e73\u53f0\u7684\u6b4c\u8bcd\u3002
    if (ownPlatformLyrics) {
        try {
            const own = await ownPlatformLyrics(song);
            if (hasRenderableLyrics(own.lyrics)) return own;
        } catch {
            // \u672c\u5e73\u53f0\u95ee\u4e0d\u901a\u4e0d\u7b97\u5931\u8d25\u2014\u2014\u8fd8\u6709\u805a\u5408\u5e95\u5ea7\u3002
        }
    } else {
        // \u6ca1\u6709\u81ea\u5df1\u7684\u5b9e\u73b0\uff08\u54aa\u5499\u8fd9\u7c7b\uff09\uff1a\u82e5\u662f\u7f51\u6613\u4e91\u7684\u6b4c\uff0c\u6309 id \u53d6\u3002
        if (songPlatform(song) === 'netease') {
            const id = neteaseSongId(song);
            if (id) {
                try {
                    const own = await fetchNeteaseLyricsById(request, id);
                    if (hasRenderableLyrics(own.lyrics)) return own;
                } catch {
                    // \u843d\u5230\u805a\u5408\u5e95\u5ea7\u3002
                }
            }
        }
    }

    // 2. \u805a\u5408\u5e95\u5ea7\u3002
    // \u5e95\u5ea7\u7684\u987a\u5e8f\uff1aQQ \u97f3\u4e50\u5728\u524d\u3002
    //
    // \u4e3a\u4ec0\u4e48\uff1aQQ \u7684\u6b4c\u8bcd\u6536\u5f55\u6700\u5168\uff08\u7528\u6237\u8981\u7684\u300c\u6b4c\u5728\u9177\u72d7\u3001\u6b4c\u8bcd\u5728 QQ\u300d\u5c31\u662f\u5b83\uff09\uff0c\u800c\u4e14\u5b83\u7684
    // \u641c\u7d22\u4e0e\u6b4c\u8bcd\u63a5\u53e3\u90fd\u662f\u516c\u5f00\u7684\u3002\u7f51\u6613\u4e91\u4e0e\u9177\u6211\u6392\u540e\u9762\u3002
    const aggregated = await fetchFromAggregateBases(request, song, ['qq', 'netease', 'kuwo']);
    if (aggregated) return aggregated;

    // 3. \u90fd\u6ca1\u6709\uff1a\u5982\u5b9e\u8bf4\u6ca1\u6709\uff08\u4e0d\u662f\u62a5\u9519\uff09\u3002
    return { lyrics: null, isPureMusic: false };
};"""

new = """    // 1. \u6b4c\u81ea\u5df1\u90a3\u4e2a\u5e73\u53f0\u7684\u6b4c\u8bcd\u3002
    if (ownPlatformLyrics) {
        try {
            const own = await ownPlatformLyrics(song);
            if (hasRenderableLyrics(own.lyrics)) return own;
        } catch {
            // \u672c\u5e73\u53f0\u95ee\u4e0d\u901a\u4e0d\u7b97\u5931\u8d25\u2014\u2014\u8fd8\u6709\u5176\u4ed6\u5e73\u53f0\u3002
        }
    } else {
        // \u6ca1\u6709\u81ea\u5df1\u7684\u5b9e\u73b0\uff08\u54aa\u5499\u8fd9\u7c7b\uff09\uff1a\u82e5\u662f\u7f51\u6613\u4e91\u7684\u6b4c\uff0c\u6309 id \u53d6\u3002
        if (songPlatform(song) === 'netease') {
            const id = neteaseSongId(song);
            if (id) {
                try {
                    const own = await fetchNeteaseLyricsById(request, id);
                    if (hasRenderableLyrics(own.lyrics)) return own;
                } catch {
                    // \u843d\u5230\u5176\u4ed6\u5e73\u53f0\u3002
                }
            }
        }
    }

    // 2. \u7f51\u6613\u4e91\u6ca1\u6709\uff08\u6216\u8fd9\u9996\u6b4c\u5728\u7f51\u6613\u4e91\u4e0a\u6ca1\u5f55\u6b4c\uff09\u2192 \u53bb QQ \u97f3\u4e50\u627e\u3002
    //
    // ## \u4e3a\u4ec0\u4e48\u7f51\u6613\u4e91\u4e4b\u540e\u7acb\u5373\u8f6c QQ\uff08\u800c\u4e0d\u662f\u5148\u5728\u805a\u5408\u5e95\u5ea7\u91cc\u91cd\u641c\u7f51\u6613\u4e91\uff09
    //
    // \u805a\u5408\u5e95\u5ea7\u7684\u7b2c\u4e00\u4e2a\u5c31\u662f QQ\uff08\u89c1\u4e0b\u9762\uff09\uff0c\u6240\u4ee5\u76f4\u63a5\u8f6c\u8fc7\u53bb\u7b49\u4e8e\u8df3\u8fc7\u4e00\u6b21\u65e0\u6548\u7684\u641c\u7d22\u3002
    // \u800c\u4e14 QQ \u7684\u6b4c\u8bcd\u6536\u5f55\u6700\u5168\u2014\u2014\u300c\u6b4c\u5728\u7f51\u6613\u4e91\u3001\u6b4c\u8bcd\u53ea\u6709 QQ \u6709\u300d\u8fd9\u79cd\u60c5\u51b5\u5f88\u5e38\u89c1\u3002
    if (songPlatform(song) === 'netease') {
        const fromQq = await fetchFromQqBySong(request, song);
        if (fromQq) return fromQq;
    }

    // 3. \u805a\u5408\u5e95\u5ea7\u3002
    // \u5e95\u5ea7\u7684\u987a\u5e8f\uff1aQQ \u97f3\u4e50\u5728\u524d\u3002
    //
    // \u4e3a\u4ec0\u4e48\uff1aQQ \u7684\u6b4c\u8bcd\u6536\u5f55\u6700\u5168\uff08\u7528\u6237\u8981\u7684\u300c\u6b4c\u5728\u9177\u72d7\u3001\u6b4c\u8bcd\u5728 QQ\u300d\u5c31\u662f\u5b83\uff09\uff0c\u800c\u4e14\u5b83\u7684
    // \u641c\u7d22\u4e0e\u6b4c\u8bcd\u63a5\u53e3\u90fd\u662f\u516c\u5f00\u7684\u3002\u7f51\u6613\u4e91\u4e0e\u9177\u6211\u6392\u540e\u9762\u3002
    const aggregated = await fetchFromAggregateBases(request, song, ['qq', 'netease', 'kuwo']);
    if (aggregated) return aggregated;

    // 4. \u90fd\u6ca1\u6709\uff1a\u5982\u5b9e\u8bf4\u6ca1\u6709\uff08\u4e0d\u662f\u62a5\u9519\uff09\u3002
    return { lyrics: null, isPureMusic: false };
};

/**
 * \u6309\u6b4c\u53bb QQ \u97f3\u4e50\u627e\u5b83\u7684\u6b4c\u8bcd\u3002
 *
 * ## \u4e3a\u4ec0\u4e48\u5355\u72ec\u6709\u8fd9\u4e00\u6b65
 *
 * \u7f51\u6613\u4e91\u90a3\u91cc\u53ef\u80fd\u6839\u672c\u6ca1\u6709\u8fd9\u9996\u6b4c\u7684\u6b4c\u8bcd\uff08\u7248\u672c\u3001\u7ffb\u5531\u3001\u88c5\u7248\u90fd\u53ef\u80fd\uff09\u3002\u8fd9\u65f6\u8981\u53bb**QQ**\u627e\u2014\u2014
 * QQ \u7684\u6b4c\u8bcd\u6536\u5f55\u6700\u5168\uff0c\u5e76\u4e14\u5b83\u7684\u63a5\u53e3\u516c\u5f00\u3002
 *
 * \u5b83\u4e0e\u805a\u5408\u5e95\u5ea7\u91cc\u7684 QQ \u90a3\u4e00\u6bb5\u662f\u4e00\u4ef6\u4e8b\uff1a\u533a\u522b\u5728\u4e8e\u8fd9\u91cc\u4e0d\u5148\u641c\u201c\u7f51\u6613\u4e91\u91cc\u7684\u90a3\u9996\u201d\uff0c
 * \u800c\u662f\u76f4\u63a5\u62ff\u8fd9\u9996\u6b4c\u7684\u6807\u9898\u4e0e\u6b4c\u624b\u53bb QQ \u641c\u3002
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
        // \u4e00\u6b21\u6ca1\u641c\u5230\uff1a\u7528\u5149\u6b4c\u540d\u518d\u641c\u4e00\u904d\uff08\u5404\u5bb6\u5bf9\u5e26\u5206\u9694\u7b26\u7684\u641c\u7d22\u5904\u7406\u4e0d\u4e00\u6837\uff09\u3002
        try {
            qqSongs = await searchQqWithRetry(song.name, 10);
        } catch {
            return null;
        }
    }
    if (!qqSongs.length) return null;

    // \u6309\u8bc4\u5206\u6311\u6700\u50cf\u7684\u90a3\u4e00\u9996\uff08\u540d\u4e0e\u6b4c\u624b\u90fd\u5bf9\u4e0a\u624d\u7b97\u3002
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

    // QQ \u7684\u6b4c\u8bcd\u63a5\u53e3\u8981\u90a3\u9996\u6b4c\u81ea\u5df1\u7684 mid \u4e0e id\uff0c\u522b\u4eba\u7684\u62ff\u4e0d\u5230\u3002
    try {
        // \u641c\u7d22\u4e0e\u53d6\u8bcd\u4e4b\u95f4\u6b47\u4e00\u4e0b\uff1aQQ \u8fde\u7740\u53d1\u5c31\u9650\u6d41\uff08\u56de 2001\uff09\uff0c\u6b47\u4e00\u79d2\u5c31\u6b63\u5e38\u3002
        await new Promise(resolve => setTimeout(resolve, 700));
        let lyrics: Awaited<ReturnType<typeof fetchQQLyrics>> = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                lyrics = await fetchQQLyrics(best.song);
                if (lyrics) break;
            } catch {
                // \u9650\u6d41\u4e86\uff1a\u6b47\u4e00\u4e0b\u518d\u95ee\u3002
            }
            if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
            }
        }
        if (lyrics && hasRenderableLyrics(lyrics)) {
            return { lyrics, isPureMusic: false };
        }
    } catch {
        // \u8fd9\u4e00\u5bb6\u95ee\u4e0d\u901a\uff1a\u8fd8\u6709\u805a\u5408\u5e95\u5ea7\u3002
    }
    return null;
};"""

assert old in s, 'fetchAggregatedLyrics \u6bb5\u6ca1\u627e\u5230'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
