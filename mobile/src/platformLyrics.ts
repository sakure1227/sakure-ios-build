// mobile/src/platformLyrics.ts
// 手机版的歌词：**全平台聚合**。
//
// ## 用户的诉求
//
// 「我要全平台聚合都能用呀」——不管这首歌是从哪个平台搜到的，歌词都要能显示，
// 而且不能只靠某一个平台（那个平台没版权 / 没收录 / 接口挂了，这歌就没歌词了）。
//
// ## 怎么做到聚合
//
// 桌面上有一整套现成的机制（`src/utils/lyrics/` 下的 `lyricSources.ts`、
// `lyricMatchSources.ts`、`autoMatchBestLyric.ts`）：按歌名+歌手去各个歌词源搜，
// 匹配评分，挑最好的那份。手机版**直接复用它**，不另写一套。
//
// 但桌面的那套要求每个歌词源都是「平台自己的 provider」，而手机版只有两个平台
// 有公开的搜索接口（不需要签名、不需要后端）：
//
// - 网易云：`music.163.com/api/search/get` + `music.163.com/api/song/lyric`
// - 酷我：`search.kuwo.cn/r.s` + `m.kuwo.cn/api/service/search`（洛雪 musicSdk 那一套）
//
// 所以手机版的聚合是这样搭的：
//
// 1. **歌在哪个平台，就先问哪个平台**（`sourceRef.providerId` 说的）。
//    网易云的歌走网易云的歌词接口；酷我的歌走酷我的。
// 2. **本平台取不到，就到「聚合底座」（网易云 / 酷我）按歌名+歌手搜**，
//    搜到对应曲目后取那份歌词。匹配用桌面那份评分（`calculateMatchScoreDetails`），
//    分数不够的不采纳——避免「同名不同歌」的歌词错配。
//
// 这样：任何平台的歌都有机会拿到歌词；拿不到时还有两个底座兜底。
//
// ## 为什么网易云要自己取歌词
//
// 桌面版的 `neteaseProvider.getLyrics` 走**内嵌的 Node 后端**
// （`neteaseApi.getLyric`，那个后端在手机上起不来），所以这里自己取。
// 网易云的歌词接口是公开的（不需要登录也不需要签名）。
//
// 酷我那份可以直接复用桌面版的 `kuwoProvider.lyrics`：它内部用浏览器 fetch，
// 手机版的 fetch 跨域补丁（`mobileFetchPatch.ts`）让那些请求由原生发出去，
// 同源策略管不着。
//
// ## 那音乐源呢
//
// 落雪协议确实有 `lyric` / `pic` 两个动作，但**只有 `local` 平台**声明支持
// （`sourceHost.ts` 的 `SUPPORT_ACTIONS`：kw/kg/tx/wy/mg 都只有 `musicUrl`）。
// 也就是说：网上的社区音乐源**只给播放地址，不给歌词**——桌面版也一样
// （`resolveCustomSourceLyric` 在整个仓库里从未被调用过）。

import { processNeteaseLyrics } from '../../src/utils/lyrics/neteaseProcessing';
// QQ 的搜索与歌词：都是公开接口（桌面上那两份的实现，用浏览器 fetch，
// 手机版的跨域补丁让这些请求由原生发出去）。
import { fetchQQLyrics, searchQQSongs } from '../../src/services/onlineMusic/qq/qqLyricProvider';
import { buildLyricSearchQuery } from '../../src/utils/lyrics/searchQuery';
import { calculateMatchScoreDetails } from '../../src/utils/lyrics/matchScore';
import { hasRenderableLyrics } from '../../src/utils/lyrics/validity';
// 问音乐源要歌词（源也收录歌词，而且是跨平台的）。
import { requestFromCustomSources } from '../../src/services/customSource/customSourceService';
// 落雪协议里那首歌的标识符（问源要用）。
import { buildCustomSourceRequestInfo } from '../../src/services/customSource/songMapping';
import { isPureMusicLyricText } from '../../src/utils/lyrics/pureMusic';
// 歌手名的匹配用归一化（同一份规则两端共用）：见那个文件的说明。
import { normalizeArtistNameForMatch } from '../../src/utils/lyrics/artistNameMatch';
import { parseLyricsByFormat } from '../../src/utils/lyrics/parserCore';
import type { ProviderLyricsResult } from '../../src/types/onlineMusic';
import type { SongResult } from '../../src/types';

/** 平台搜索要发 http —— 走原生插件（WebView 的 fetch 有同源策略）。 */
export type HttpRequest = (options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
}) => Promise<{ status: number; headers: Record<string, string>; data: string }>;

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** 网易云歌词接口的回答（只要用到的几个字段）。 */
interface NeteaseLyricBody {
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
    yrc?: { lyric?: string };
    romalrc?: { lyric?: string };
    code?: number;
    nolyric?: boolean;
}

/**
 * 聚合底座里的平台：一个有公开搜索接口、也有公开歌词接口的平台。
 *
 * 三个：网易云、酷我、QQ 音乐。它们的搜索与歌词都是**公开接口**（不需要登录、
 * 不需要签名），手机版用原生通道问得到。
 *
 * 有了三个底座，一首歌的歌词就有三处可找 —— 歌自己在哪个平台不算数（那个平台的
 * 歌词接口在手机上未必能用），别的平台有收录就能用上。
 */
type LyricBasePlatform = 'netease' | 'kuwo' | 'qq';

/**
 * 这首歌在网易云上的 id。
 *
 * 手机版搜索出来的网易云的歌，`sourceRef.mediaId` 就是它的歌曲 id
 * （见 `platformSearch.ts`）。别的来源的歌（本地曲库匹配出来的等）没有这个 id，
 * 歌词就取不到——那种情况靠聚合底座（按歌名+歌手搜）。
 */
const neteaseSongId = (song: SongResult): string | null => {
    if (song.sourceRef?.kind !== 'online') return null;
    const id = String(song.sourceRef.mediaId ?? '').trim();
    return id || null;
};

/** 这首歌是哪个平台的歌（`sourceRef.providerId` 说的）。 */
const songPlatform = (song: SongResult): string | null => (
    song.sourceRef?.kind === 'online' ? (song.sourceRef.providerId ?? null) : null
);

/**
 * 网易云的歌词（公开接口）。
 *
 * 返回的形状与桌面的 provider 一样（`ProviderLyricsResult`），渲染层那条
 * `omni.getLyrics` 的路因此不用改。
 */
export const fetchNeteaseLyricsById = async (
    request: HttpRequest,
    songId: string,
): Promise<ProviderLyricsResult> => {
    const response = await request({
        url: `https://music.163.com/api/song/lyric?id=${encodeURIComponent(songId)}&lv=1&kv=1&tv=-1`,
        method: 'GET',
        headers: { Referer: 'https://music.163.com', 'User-Agent': DESKTOP_UA },
        responseType: 'text',
        timeout: 15_000,
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`网易云的歌词接口回了 ${response.status}`);
    }
    const body = JSON.parse(response.data) as NeteaseLyricBody;
    const processed = await processNeteaseLyrics({
        lrc: { lyric: body.lrc?.lyric ?? '' },
        tlyric: { lyric: body.tlyric?.lyric ?? '' },
        yrc: { lyric: body.yrc?.lyric ?? '' },
        romalrc: { lyric: body.romalrc?.lyric ?? '' },
    } as never);
    return {
        lyrics: processed.lyrics,
        mainText: processed.mainLrc,
        wordByWordText: processed.yrcLrc,
        translationText: processed.transLrc,
        romanizationText: processed.romanizationLrc,
        isPureMusic: processed.isPureMusic,
        chorusRanges: [],
    };
};

/**
 * 聚合底座的搜索：按歌名+歌手去某个平台找同一首歌。
 *
 * 用的是桌面上那套搜索查询构造（`buildLyricSearchQuery`：歌名 - 歌手 - 专辑），
 * 与桌面一致，所以匹配的行为也一致。
 */
const searchBasePlatform = async (
    request: HttpRequest,
    platform: LyricBasePlatform,
    query: string,
    limit: number,
): Promise<Array<{ id: string; name: string; artist: string; durationMs: number }>> => {
    if (platform === 'netease') {
        const response = await request({
            url: `https://music.163.com/api/search/get?s=${encodeURIComponent(query)}&type=1&limit=${limit}&offset=0`,
            method: 'GET',
            headers: { Referer: 'https://music.163.com', 'User-Agent': DESKTOP_UA },
            responseType: 'text',
            timeout: 15_000,
        });
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`网易云的搜索接口回了 ${response.status}`);
        }
        const data = JSON.parse(response.data) as {
            result?: {
                songs?: Array<{
                    id: number;
                    name?: string;
                    artists?: Array<{ name?: string }>;
                    duration?: number;
                }>;
            };
        };
        return (data.result?.songs ?? []).map(row => ({
            id: String(row.id),
            name: row.name ?? '',
            artist: (row.artists ?? []).map(a => a.name ?? '').filter(Boolean).join(', '),
            durationMs: row.duration ?? 0,
        }));
    }
    // 酷我：洛雪 musicSdk 那一套参数（公开接口，不需要签名）。
    const params = new URLSearchParams({
        all: query,
        pn: '1',
        rn: String(limit),
        uid: '794762570',
        ver: 'kwplayer_ar_9.2.2.1',
        vipver: '1',
        show_copyright_off: '1',
        newver: '1',
        ft: 'music',
        cluster: '0',
        strategy: '2012',
        encoding: 'utf8',
        rformat: 'json',
        vermerge: '1',
        mobi: '1',
        issubtitle: '1',
    });
    const response = await request({
        url: `https://search.kuwo.cn/r.s?${params.toString()}`,
        method: 'GET',
        headers: {
            'User-Agent': DESKTOP_UA,
            Referer: 'https://www.kuwo.cn/',
            Cookie: 'kw_token=',
        },
        responseType: 'text',
        timeout: 15_000,
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`酷我的搜索接口回了 ${response.status}`);
    }
    // 酷我的回答有两种形状，都要认（实测 2026-10-27 真机上是顶层 `abslist` + 大写字段名）：
    // - 顶层 `abslist` + `TOTAL`，行里是 `MUSICRID`/`NAME`/`ARTIST`/`DURATION`；
    // - `data.list` + `data.total`，行里是 `musicrid`/`name`/`artist`/`duration`。
    const body = JSON.parse(response.data) as {
        TOTAL?: string | number;
        abslist?: Array<Record<string, string | number>>;
        data?: { total?: number; list?: Array<Record<string, string | number>> };
    };
    const rows = body.abslist ?? body.data?.list ?? [];
    return rows.map(row => {
        const musicRid = String(
            row.musicrid ?? row.dcMusicrid ?? row.rid
            ?? row.MUSICRID ?? row.DC_MUSICRID ?? row.RID ?? '',
        ).replace(/^MUSIC_/i, '');
        return {
            id: musicRid,
            name: String(row.name ?? row.NAME ?? row.SONGNAME ?? ''),
            artist: String(row.artist ?? row.ARTIST ?? row.ARTISTNAME ?? '')
                .split('&').filter(Boolean).map(name => name.trim()).join(', '),
            durationMs: Number(row.duration ?? row.DURATION ?? 0) * 1000,
        };
    });
};

/**
 * 匹配得太不像就不采纳（避免同名不同歌的歌词错配）。
 *
 * 70 而不是桌面的 75：桌面的候选来自它自己的搜索（带账号与历史，命中更准），
 * 手机版的候选来自平台的公开接口，歌名与歌手常常有一处对不上（歌手名带分隔符、
 * 译名不同），75 会把不少本来找得到的歌词挡在门外。歌名必须匹配（下面还查着），
 * 所以错配的风险不大。
 */
const AGGREGATE_MIN_SCORE = 70;

/**
 * 到聚合底座找这首歌的歌词。
 *
 * 流程与桌面的 `autoMatchBestLyric` 一样：按歌名+歌手搜 → 匹配评分 → 挑分数最高的 →
 * 取它的歌词。评分不够就不给（宁可没有，也不要错配的歌词）。
 */
const fetchFromAggregateBases = async (
    request: HttpRequest,
    song: SongResult,
    bases: LyricBasePlatform[],
): Promise<ProviderLyricsResult | null> => {
    const artistNames = (song.artists ?? []).map(a => a.name).filter(Boolean).join(', ');
    const query = buildLyricSearchQuery(song.name, artistNames, song.album?.name);
    if (!query.trim()) return null;
    const target = {
        title: song.name ?? '',
        // 歌手名**去掉分隔符**再比：同一位歌手各处写法不一样（QQ 用逗号
        // `Tiam,吴鉴格`，歌单里是顿号 `Tiam、吴鉴格`），带分隔符比就对不上，
        // 评分掉到门槛以下 —— 本来找得到的歌词被白白丢掉。
        artist: normalizeArtistNameForMatch(artistNames),
        album: song.album?.name,
        durationMs: song.durationMs ?? 0,
    };

    for (const base of bases) {
        let candidates: Array<{ id: string; name: string; artist: string; durationMs: number }>;
        // QQ 的候选要连着**那首歌自己**（歌词接口读的是它的 mid 与 id）。
        // 候选表里放不下整个歌对象，所以另存一份按下标对应。
        let qqSongs: SongResult[] = [];
        try {
            if (base === 'qq') {
                // QQ 的搜索是公开接口（`u.y.qq.com` 的 `DoSearchForQQMusicLite`），
                // 桌面上 `qqLyricProvider.searchQQSongs` 就是它。手机版的 fetch 跨域
                // 补丁让这个请求由原生发出去。
                //
                // 失败多半是**限流**（QQ 连着发就回 2001），等一下再问多半就好 ——
                // 所以这里重试两次，别让一次限流把整个底座跳过去（跳过去就只剩别的
                // 平台，而那家未必收录）。
                qqSongs = await searchQqWithRetry(query, 10);
                candidates = qqSongs.map(s => ({
                    id: String(s.id),
                    name: s.name,
                    artist: (s.artists ?? []).map(a => a.name).join(', '),
                    durationMs: s.durationMs ?? 0,
                }));
            } else {
                candidates = await searchBasePlatform(request, base, query, 10);
            }
            // 上面那个查询是「歌名 - 歌手 - 专辑」（与桌面那份一致）。但各家的搜索对
            // 这种带分隔符的格式处理不一样：有的当关键词匹配（搜得到），有的当整体
            // 字符串（搜不到）。所以**一次都没搜到**时，再用**光歌名**搜一遍 ——
            // 匹配那一步会挑最像的那一个。
            //
            // 只在「完全没搜到」时才补这一下：QQ 的接口限流很紧（连着发几次就回
            // 2001），多发一次就可能把整个底座作废。
            if (!candidates.length && song.name) {
                try {
                    const plainCandidates = base === 'qq'
                        ? (await searchQqWithRetry(song.name, 10)).map(s => ({
                            id: String(s.id),
                            name: s.name,
                            artist: (s.artists ?? []).map(a => a.name).join(', '),
                            durationMs: s.durationMs ?? 0,
                        }))
                        : await searchBasePlatform(request, base, song.name, 10);
                    const known = new Set(candidates.map(c => `${c.name}|${c.artist}`));
                    for (const candidate of plainCandidates) {
                        if (!known.has(`${candidate.name}|${candidate.artist}`)) {
                            candidates.push(candidate);
                            known.add(`${candidate.name}|${candidate.artist}`);
                        }
                    }
                } catch {
                    // 这一遍搜不到就算了，上面的候选还在。
                }
            }
        } catch {
            // 一个底座问不通不算失败——还有下一个。
            continue;
        }
        // 用桌面那份评分（歌名、歌手、专辑、时长一起看）。
        const scored = candidates
            .map(candidate => ({
                candidate,
                details: calculateMatchScoreDetails(target, {
                    id: candidate.id,
                    name: candidate.name,
                    artists: candidate.artist ? [{ id: 0, name: normalizeArtistNameForMatch(candidate.artist) }] : [],
                    album: { id: 0, name: '' },
                    durationMs: candidate.durationMs,
                } as never),
            }))
            .sort((a, b) => b.details.score - a.details.score);
        const best = scored[0];
        if (!best || !best.details.titleMatched) continue;
        // 歌名与歌手都匹配上就已经够了（与桌面那份的规则一致）—— 不同平台标的时长
        // 常常有差，那一项会把分数拉下来，于是本来找得到的歌词被丢掉。
        // 只有歌名对上的，还要过分数门槛（防同名不同歌的错配）。
        const reliable = best.details.artistMatched || best.details.albumMatched === true;
        if (!reliable && best.details.score < AGGREGATE_MIN_SCORE) continue;

        try {
            if (base === 'netease') {
                const result = await fetchNeteaseLyricsById(request, best.candidate.id);
                if (hasRenderableLyrics(result.lyrics)) return result;
                continue;
            }
            if (base === 'qq') {
                // QQ 的歌词是公开接口（`GetPlayLyricInfo`），要那首歌自己的 mid 与 id。
                //
                // 注意是**评分选中的那一首**（`best.candidate` 在候选表里的下标），
                // 不是搜索结果的第一首 —— 第一首未必是同一首歌。
                const picked = qqSongs.find(q => String(q.id) === best.candidate.id);
                const song = picked ?? qqSongs[0];
                if (!song) continue;
                // 搜索与取词之间歇一下：QQ 连着发就限流（回 2001），歇一秒就正常。
                await new Promise(resolve => setTimeout(resolve, 700));
                // 取词也可能撞上限流，重试两次。
                let lyrics: Awaited<ReturnType<typeof fetchQQLyrics>> = null;
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    try {
                        lyrics = await fetchQQLyrics(song);
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
                continue;
            }
            // 酷我：歌词接口要「数字 rid」，搜索给的是 musicrid——两者的换算由桌面那份做。
            const result = await fetchKuwoLyricsByMusicRid(request, best.candidate.id);
            if (hasRenderableLyrics(result.lyrics)) return result;
        } catch {
            continue;
        }
    }
    return null;
};

/**
 * 酷我的歌词（公开接口，桌面那份的实现，用浏览器 fetch）。
 *
 * 手机版不能直接用桌面的 `kuwoProvider.lyrics`：那要从 `sourceRef.providerData.rid`
 * 拿数字 rid，而手机版搜出来的歌只有 musicrid。这里按 musicrid 问歌词接口，
 * 再按接口给的地址取歌词文件。
 */
const fetchKuwoLyricsByMusicRid = async (
    request: HttpRequest,
    musicRid: string,
): Promise<ProviderLyricsResult> => {
    const params = new URLSearchParams({
        corpus: '1',
        key: 'all',
        duration: '300',
        musicId: `MUSIC_${musicRid}`,
        pc: '1',
    });
    // 端点是 **http**：酷我的这个主机没有 https 站点（实测 https 会404）。
    // 原生发请求没有混合内容的限制（那是 WebView 里的页面才有的），所以 http 在这里没问题。
    const response = await request({
        url: `http://m.kuwo.cn/api/service/search?${params.toString()}`,
        method: 'GET',
        headers: { 'User-Agent': DESKTOP_UA, Referer: 'https://www.kuwo.cn/' },
        responseType: 'text',
        timeout: 15_000,
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`酷我的歌词接口回了 ${response.status}`);
    }
    const body = JSON.parse(response.data) as {
        code?: number;
        success?: boolean;
        data?: { lrc?: string; lyric?: string; lrclyric?: string };
    };
    if (body.code !== 200 && body.success !== true) {
        throw new Error('酷我的歌词接口没有成功');
    }
    const lyricUrl = body.data?.lrc ?? body.data?.lyric ?? '';
    if (!lyricUrl) throw new Error('酷我没有这份歌词');
    const textResponse = await request({
        url: lyricUrl,
        method: 'GET',
        headers: { 'User-Agent': DESKTOP_UA, Referer: 'https://www.kuwo.cn/' },
        responseType: 'text',
        timeout: 15_000,
    });
    if (textResponse.status < 200 || textResponse.status >= 300) {
        throw new Error(`酷我的歌词文件回了 ${textResponse.status}`);
    }
    const mainText = textResponse.data ?? '';
    if (!mainText.trim()) throw new Error('酷我的歌词文件是空的');
    // 解析用桌面那份（lrc 格式，逐行时间轴）。
    const parsed = parseKuwoLyricsText(mainText);
    return parsed;
};

/** 酷我的 lrc 解析（用桌面那份通用解析器，行为与桌面一致）。 */
const parseKuwoLyricsText = (mainText: string): ProviderLyricsResult => {
    const lyrics = parseLyricsByFormat('lrc', mainText);
    return {
        lyrics: lyrics.lines.length ? lyrics : null,
        mainText,
        wordByWordText: undefined,
        isPureMusic: isPureMusicLyricText(mainText),
    };
};

/**
 * 问 QQ 音乐搜歌，限流了就等一下再问。
 *
 * QQ 的公开接口**限流**得厉害：连着发几次就回 2001（那不是「没搜到」，是「别发了」）。
 * 等一两秒再问就好了 —— 所以这里重试两次，中间歇一下。
 */
const searchQqWithRetry = async (query: string, limit: number): Promise<SongResult[]> => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const songs = await searchQQSongs(query, 1, limit);
            if (songs.length) return songs;
            lastError = new Error('QQ search gave no songs');
        } catch (error) {
            // 限流了：歇一下再问。
            lastError = error;
        }
        if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 900 * (attempt + 1)));
        }
    }
    // 把失败的原因说出来（原先吞掉了，出问题时只看到「没歌词」，看不出是哪一环坏的）。
    if (lastError) {
        console.warn('[MobileLyrics] QQ search failed:', lastError instanceof Error ? lastError.message : String(lastError));
    }
    return [];
};

/**
 * 问音乐源要歌词。
 *
 * 源（社区源）除了播放地址，也收录歌词与封面 —— 它初始化时声明的动作里就有
 * `lyric` 与 `pic`（见 `sourceHost.ts` 的 `SUPPORT_ACTIONS`）。它那份是**跨平台**的
 * （按歌名找），所以歌在酷狗、歌词收录在 QQ 这种情形它能给出歌词。
 *
 * 拿回来的是落雪协议的结构：`data.lyric` 是 lrc 文本，`data.tlyric` 是翻译。
 */
const fetchLyricFromSource = async (song: SongResult): Promise<ProviderLyricsResult | null> => {
    const info = buildCustomSourceRequestInfo(song);
    if (!info) return null;
    try {
        const answer = await requestFromCustomSources('lyric', info as unknown as Record<string, unknown>);
        const result = answer?.result;
        if (!result || result.action !== 'lyric') return null;
        const data = result.data as { lyric?: string; tlyric?: string | null } | undefined;
        const mainText = data?.lyric ?? '';
        if (!mainText.trim()) return null;
        const lyrics = parseLyricsByFormat('lrc', mainText, data?.tlyric ?? '');
        if (!lyrics.lines.length) return null;
        return {
            lyrics,
            mainText,
            wordByWordText: undefined,
            translationText: data?.tlyric ?? undefined,
            isPureMusic: isPureMusicLyricText(mainText),
        };
    } catch {
        return null;
    }
};

/**
 * 取一首歌的歌词（**全平台聚合**）。
 *
 * 顺序：
 * 1. 歌在哪个平台，就先问哪个平台（网易云的走公开歌词接口；酷我的走桌面那份实现）。
 * 2. 本平台没有 → 到聚合底座（网易云 / 酷我）按歌名+歌手搜，找到对应曲目再取。
 *
 * 底座里已经包含歌自己那个平台，所以「本平台的歌词」与「聚合」是同一条路上的一步，
 * 不冲突。
 */
export const fetchAggregatedLyrics = async (
    request: HttpRequest,
    song: SongResult,
    ownPlatformLyrics?: (song: SongResult) => Promise<ProviderLyricsResult>,
): Promise<ProviderLyricsResult> => {
    // 0. 先问**音乐源**。
    //
    // 源有自己的一份收录（它按歌名找，跨平台），覆盖面比单个平台宽 —— 歌在酷狗、歌词
    // 收录在 QQ 这种情形，源能给出歌词，而那个平台的接口未必给得出。
    const fromSource = await fetchLyricFromSource(song);
    if (fromSource) return fromSource;

    // 1. 歌自己那个平台的歌词。
    if (ownPlatformLyrics) {
        try {
            const own = await ownPlatformLyrics(song);
            if (hasRenderableLyrics(own.lyrics)) return own;
        } catch {
            // 本平台问不通不算失败——还有聚合底座。
        }
    } else {
        // 没有自己的实现（咪咕这类）：若是网易云的歌，按 id 取。
        if (songPlatform(song) === 'netease') {
            const id = neteaseSongId(song);
            if (id) {
                try {
                    const own = await fetchNeteaseLyricsById(request, id);
                    if (hasRenderableLyrics(own.lyrics)) return own;
                } catch {
                    // 落到聚合底座。
                }
            }
        }
    }

    // 2. 网易云没有（或这首歌在网易云上没录歌）→ 去 QQ 音乐找。
    //
    // ## 为什么网易云之后立刻转 QQ（而不是先在聚合底座里重搜网易云）
    //
    // 聚合底座的第一个就是 QQ（见下面），所以直接转过去等于跳过一次无效的搜索。
    // 而且 QQ 的歌词收录最全 —— 「歌在网易云、歌词只有 QQ 有」这种情况很常见。
    if (songPlatform(song) === 'netease') {
        const fromQq = await fetchFromQqBySong(request, song);
        if (fromQq) return fromQq;
    }

    // 3. 聚合底座。
    // 底座的顺序：QQ 音乐在前。
    //
    // 为什么：QQ 的歌词收录最全（用户要的「歌在酷狗、歌词在 QQ」就是它），而且它的
    // 搜索与歌词接口都是公开的。网易云与酷我排后面。
    const aggregated = await fetchFromAggregateBases(request, song, ['qq', 'netease', 'kuwo']);
    if (aggregated) return aggregated;

    // 4. 都没有：如实说没有（不是报错）。
    return { lyrics: null, isPureMusic: false };
};

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

