// mobile/src/platformSearch.ts
// 手机版的平台搜索。
//
// 为什么要有这一份：桌面上搜歌走**内嵌的 Node 后端**（`@neteasecloudmusicapienhanced/api`
// 跑在本地端口上），手机上没有 Node —— 那个后端起不来。
//
// 但各平台其实都有**公开的搜索接口**（不需要登录、不需要后端）：
// 网易云的 `music.163.com/api/search/get` 就是。而落雪音乐（lx）本身
// `playback: false`（地址全靠音乐源给），它的搜索走的就是下面这些平台。
//
// 所以手机版的分工是：
// - **搜索**：直接问平台的公开接口（这里）。
// - **播放地址**：问音乐源（源给地址，源也支持五个平台）。
//
// 平台与落雪的代号：kw=酷我 kg=酷狗 tx=QQ wy=网易云 mg=咪咕。
//
// 每个平台有**两个**id，这里都要记着：
// - `providerId`：这个平台在 provider 注册表里的 id（桌面版也是这几个：`netease`/`kugou`/
//   `qq`/`kuwo`/`migu`）。渲染层多处按这个 id 硬编码（歌词匹配、本地歌曲匹配…），
//   所以手机版的平台 provider 必须**用桌面同 id 注册**——注册表按 id 存，同 id 就是覆盖，
//   桌面那个依赖 Node 后端的 provider 于是被换掉，不会两个并存。
// - `lxSourceId`：落雪协议里的平台代号（`wy`/`kg`/…）。音乐源只认这套代号，
//   `songMapping` 靠它把一首歌翻译成「该问哪个平台的源」。
//
// 两个 id 各管一件事，混用就出事：把歌的 providerId 写成 `'lx'` 会让 `songMapping`
// 查不到 lxSourceId（落雪聚合器自己不参与落雪协议），于是这歌永远问不到源要地址。

import type { ProviderPage } from '../../src/types/onlineMusic';
import type { UnifiedSong } from '../../src/types';
import md5 from 'blueimp-md5';

/**
 * 各平台：注册表 id（providerId）与落雪代号（lxSourceId）一一对应。
 *
 * 这四个是**能搜的**（各自都有公开的搜索接口，桌面版也是靠它们）。
 *
 * 另外四个（波点、汽水、YouTube Music、Spotify）在桌面上靠**登录态 + 内嵌后端**
 * 才能搜，手机版没有那些后端、也拿不到登录态 —— 所以它们在手机版上不声明 search
 * 能力（界面的来源列表按能力过滤，不会列出搜不了的平台）。
 *
 * 落雪协议只覆盖这四个（`lxSourceId` 是音乐源认识的平台代号），所以歌的播放地址
 * 也只有这四个能从源拿到。
 */
const PLATFORM = {
    wy: { providerId: 'netease', lxSourceId: 'wy', name: '网易云', mark: { letter: '云', color: '#dc2626' }, searchable: true },
    kg: { providerId: 'kugou', lxSourceId: 'kg', name: '酷狗', mark: { letter: '狗', color: '#2563eb' }, searchable: true },
    tx: { providerId: 'qq', lxSourceId: 'tx', name: 'QQ 音乐', mark: { letter: 'Q', color: '#12b7f5' }, searchable: true },
    kw: { providerId: 'kuwo', lxSourceId: 'kw', name: '酷我', mark: { letter: '酷', color: '#22c55e' }, searchable: true },
} as const;

export type MobilePlatformId = keyof typeof PLATFORM;

/** 平台在 provider 注册表里的 id（= 歌的 sourceRef.providerId）。 */
export const mobileProviderId = (platform: MobilePlatformId): string => PLATFORM[platform].providerId;

/** 平台在落雪协议里的代号（= 该问哪个平台的音乐源）。 */
export const mobileLxSourceId = (platform: MobilePlatformId): string => PLATFORM[platform].lxSourceId;

/** 平台的名字与记号（界面上的来源徽标读它们）。 */
export const mobilePlatformMark = (platform: MobilePlatformId): { letter: string; color: string } => PLATFORM[platform].mark;

/**
 * 这个平台在手机上能不能搜。
 *
 * 能搜的是两个：
 * - 网易云：`music.163.com/api/search/get`，公开接口，不需要签名；
 * - 酷我：`search.kuwo.cn/r.s`，公开接口，不需要签名（参数是洛雪 musicSdk 那一套）。
 *
 * 剩下的（酷狗、QQ、咪咕）接口都要签名，公开接口拿不到东西。所以它们**不声明
 * search 能力**：
 * - 界面的搜索来源列表按能力过滤，不会列出搜不了的平台（`SearchWorkspace`）；
 * - 落雪聚合搜索按 `source.search` 过滤（`lxProvider.searchSongs`），不会去问一个
 *   必然抛错的平台。
 *
 * 它们仍然注册着：音乐源支持这五个平台，源给的地址按平台代号走，与注册表无关。
 */
export const mobilePlatformSearchable = (platform: MobilePlatformId): boolean => PLATFORM[platform].searchable;

export const mobilePlatforms = (): { id: MobilePlatformId; name: string }[] => (
    (Object.keys(PLATFORM) as MobilePlatformId[]).map(id => ({ id, name: PLATFORM[id].name }))
);

/** 平台搜索要发 http —— 走原生插件（WebView 的 fetch 有同源策略）。 */
type HttpRequest = (options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
}) => Promise<{ status: number; headers: Record<string, string>; data: string }>;

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** 网易云的搜索。 */
const searchNetease = async (
    request: HttpRequest,
    platform: MobilePlatformId,
    query: string,
    limit: number,
    offset: number,
) => {
    const url = `https://music.163.com/api/search/get?s=${encodeURIComponent(query)}&type=1&limit=${limit}&offset=${offset}`;
    const response = await request({
        url,
        method: 'GET',
        headers: { Referer: 'https://music.163.com', 'User-Agent': DESKTOP_UA },
        responseType: 'text',
        timeout: 20_000,
    });
    const data = JSON.parse(response.data) as {
        result?: {
            songs?: Array<{
                id: number;
                name: string;
                artists?: Array<{ id?: number; name: string }>;
                album?: {
                    id?: number;
                    name?: string;
                    /** 歌手头像（专辑封面拿不到时的兜底）。 */
                    artist?: { img1v1Url?: string; picUrl?: string };
                };
                duration?: number;
            }>;
            songCount?: number;
        };
    };
    const rows = data.result?.songs ?? [];
    const items: UnifiedSong[] = rows.map(row => ({
        id: String(row.id),
        name: row.name ?? '',
        artists: (row.artists ?? []).map(a => ({ id: String(a.id ?? ''), name: a.name })),
        album: {
            id: String(row.album?.id ?? ''),
            name: row.album?.name ?? '',
            // 兜底：专辑封面要另一次请求才拿得到（见 fetchNeteaseCovers），那一次被风控
            // 挡了的话，这一行就是破图。先放上歌手头像 —— 至少有张图。
            coverUrl: row.album?.artist?.img1v1Url ?? row.album?.artist?.picUrl ?? undefined,
        },
        durationMs: row.duration ?? 0,
        // providerId 必须是**这个平台自己的** id（这里是 `netease`），不是 `lx`。
        //
        // 原因在 `songMapping.getCustomSourcePlatform`：它拿 `sourceRef.providerId` 去注册表
        // 查这个 provider 的 `lxSourceId`，才知道该问哪个平台的音乐源。写成 `lx` 就查不到
        // ——落雪聚合器自己不参与落雪协议（`lxProvider.ts` 里没有 lxSourceId），于是这歌
        // 永远问不到源要地址。
        //
        // 底下的 `source` 只是给人看的标记，渲染层不读它（`PlaybackSourceRef` 里也没有这个
        // 字段），留着是为了调试时一眼看出这歌来自哪个落雪平台。
        sourceRef: {
            kind: 'online',
            providerId: mobileProviderId(platform),
            mediaId: String(row.id),
            source: mobileLxSourceId(platform),
        } as unknown as UnifiedSong['sourceRef'],
    } as unknown as UnifiedSong));
    const total = Number(data.result?.songCount ?? items.length);
    return { items, total, hasMore: offset + items.length < total, nextOffset: offset + items.length };
};

/**
 * 酷我（酷狗音乐）的搜索。
 *
 * 这一套参数是从洛雪 musicSdk 移植的（与仓库里桌面的 `kuwoTransport.ts` 同一份
 * 来源）：`search.kuwo.cn/r.s` 是公开接口，**不需要签名**，给上播放器 UA 就能搜。
 * 实测（2026-10-27）：https 可用，返回体是 `{ code, data: { total, list } }`。
 *
 * 为什么手机版要自己写一份而不用桌面那个 `searchKuwo`：那个函数用浏览器的
 * `fetch` 发请求，而手机版的页面是 `https://localhost`，跨域的请求会被同源策略
 * 挡掉（实测报 `Failed to fetch`）。这里改走原生插件（CsHttp），原生发请求没有
 * 这个限制。
 */

/**
 * 酷我的封面地址。
 *
 * 优先用平台自己给的（`hts_MVPIC` / `pic` / `album_pic` 那些字段）—— 那是完整 URL，不用猜图床路径。
 * 没有的话就用专辑 id 拼。
 *
 * ## 图床的选择是者里心的
 *
 * 以前用的 `img.kwcdn.cn` 现在解析不了（`Unable to resolve host`），拼出来的地址全是死的。
 * `img2.kuwo.cn` 能解析，但它的路径不是 `/data/album/<id>.jpg`（那个返回 404）。
 */
const kuwoCoverUrl = (row: Record<string, string | number | undefined>): string | undefined => {
    // 1) 平台直接给的完整地址。
    for (const key of ['hts_MVPIC', 'Mvpic', 'mvp ic', 'pic', 'PIC', 'album_pic', 'ALBUMPIC', 'web_albumpic_short']) {
        const value = String(row[key] ?? '').trim();
        if (!value) continue;
        if (/^https?:\/\//i.test(value)) return value;
    }
    // 2) 平台给的相对路径（像 `120/s4s11/89/774616642.jpg`）——补上图床主机。
    const relative = String(row.web_albumpic_short ?? row.web_albumpic ?? row.album_pic_short ?? '').trim();
    if (relative && !/^https?:\/\//i.test(relative)) {
        return `https://img2.kuwo.cn/wmvpic/${relative.replace(/^\//, '')}`;
    }
    // 3) 用专辑 id 拼。
    const albumId = String(row.albumid ?? row.ALBUMID ?? '').trim();
    if (albumId && albumId !== '0') {
        return `https://img2.kuwo.cn/wmvpic/${albumId}.jpg`;
    }
    return undefined;
};

const searchKuwo = async (
    request: HttpRequest,
    platform: MobilePlatformId,
    query: string,
    limit: number,
    offset: number,
) => {
    const params = new URLSearchParams({
        all: query,
        // 页码从 1 起。
        pn: String(Math.floor(offset / Math.max(1, limit)) + 1),
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            Referer: 'https://www.kuwo.cn/',
            Cookie: 'kw_token=',
        },
        responseType: 'text',
        timeout: 20_000,
    });
    // 酷我的回答有两种形状，两种都要认（实测 2026-10-27 真机上是第一种）：
    // - 顶层 `abslist` + `TOTAL`，行里的字段名是大写的（`MUSICRID`/`NAME`/…）；
    // - `data.list` + `data.total`，行里的字段名是小写的（`musicrid`/`name`/…）。
    //
    // 所以行用一个「两种字段名都带」的类型，读的时候任选其一。
    type KuwoRow = Record<string, string | number | undefined>;
    const body = JSON.parse(response.data) as {
        code?: number;
        status?: number;
        msg?: string;
        TOTAL?: string | number;
        abslist?: KuwoRow[];
        data?: { total?: number; list?: KuwoRow[] };
    };
    if (body.code !== 200 && body.status !== 200 && !body.abslist && !body.data) {
        throw new Error(body.msg || '酷我的搜索没有成功');
    }
    const rows = body.abslist ?? body.data?.list ?? [];
    const items: UnifiedSong[] = rows.map(row => {
        // `MUSICRID` 的值形如 `MUSIC_319933051`，取数字部分。
        const musicRid = String(
            row.musicrid ?? row.dcMusicrid ?? row.rid
            ?? row.MUSICRID ?? row.DC_MUSICRID ?? row.RID ?? '',
        ).replace(/^MUSIC_/i, '');
        // 数字 rid（歌词接口要它，与 musicrid 不是一回事）。
        const rid = String(row.rid ?? row.RID ?? '').replace(/^MUSIC_/i, '');
        const artistText = String(row.artist ?? row.ARTIST ?? row.ARTISTNAME ?? '');
        return {
            id: musicRid,
            name: String(row.name ?? row.NAME ?? row.SONGNAME ?? ''),
            // 洛雪的接口给的是一个 "歌手名 & 歌手名" 的串，这里拆开。
            artists: artistText.split('&').filter(Boolean).map(name => ({ id: '', name: name.trim() })),
            album: {
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
        },
            // 酷我给的是秒。
            durationMs: Number(row.duration ?? row.DURATION ?? 0) * 1000,
            sourceRef: {
                kind: 'online',
                providerId: mobileProviderId(platform),
                mediaId: musicRid,
                source: mobileLxSourceId(platform),
                // 落雪协议里这个平台的标识符（`providerData`）。音乐源按这些字段认歌 ——
                // 缺了它，源就答不出地址（界面会说「酷我未返回音乐」）。
                providerData: {
                    musicRid,
                    ...(rid ? { rid } : {}),
                },
            } as unknown as UnifiedSong['sourceRef'],
        } as unknown as UnifiedSong;
    });
    const total = Number(body.TOTAL ?? body.data?.total ?? items.length);
    return { items, total, hasMore: offset + items.length < total, nextOffset: offset + items.length };
};

/** 酷狗搜索返回的一行（字段名大小写都见过，所以都用宽松类型）。 */
type KugouRow = Record<string, string | number | undefined>;

/**
 * 酷狗的搜索。
 *
 * 酷狗的接口要签名，但签名算法是公开的（桌面那份 `kugouTransport.ts` 的
 * `requestKugouAnonymousSearch` 就是它）：把参数按 key 排序拼成 `k=v&k=v`，
 * 前后各加一段固定的盐，再用 md5 算一次 —— Android 客户端的匿名搜索签名。
 *
 * 这里的实现与桌面那份逐字一致（同一个接口、同样的参数、同样的头），所以两边
 * 搜到的是同一批歌。
 *
 * 接口在 http（`complexsearch.kugou.com` 没有 https），但请求由原生发出
 * （`CsHttp`），不受 WebView 的混合内容限制。
 */
const searchKugou = async (
    request: HttpRequest,
    platform: MobilePlatformId,
    query: string,
    limit: number,
    offset: number,
) => {
    const clientTimeMs = Date.now();
    const clientTimeSec = Math.floor(clientTimeMs / 1000);
    const mid = md5(String(clientTimeMs));
    const params: Record<string, string | number> = {
        sorttype: '0',
        keyword: query,
        pagesize: limit,
        page: Math.floor(offset / Math.max(1, limit)) + 1,
        userid: '0',
        appid: '3116',
        token: '',
        clienttime: clientTimeSec,
        iscorrection: '1',
        uuid: '-',
        mid,
        dfid: '-',
        clientver: '11070',
        platform: 'AndroidFilter',
    };
    // 签名：参数按 key 排序 → 拼成 `k=v&k=v` → 前后加盐 → md5。
    const signatureSource = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('');
    params.signature = md5(
        `LnT6xpN3khm36zse0QzvmgTZ3waWdRSA${signatureSource}LnT6xpN3khm36zse0QzvmgTZ3waWdRSA`,
    );

    const url = new URL('http://complexsearch.kugou.com/v2/search/song');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

    const response = await request({
        url: url.toString(),
        method: 'GET',
        headers: {
            'User-Agent': 'Android14-1070-11070-201-0-SearchSong-wifi',
            'KG-Rec': '1',
            'KG-RC': '1',
            'KG-CLIENTTIMEMS': String(clientTimeMs),
            mid,
            'x-router': 'complexsearch.kugou.com',
        },
        responseType: 'text',
        timeout: 20_000,
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`酷狗的搜索接口回了 ${response.status}`);
    }
    const body = JSON.parse(response.data) as {
        status?: number;
        error_code?: number;
        error_msg?: string;
        data?: { total?: number; lists?: Array<KugouRow> };
    };
    if (body.error_code) {
        throw new Error(`酷狗的搜索没有成功：${body.error_msg || body.error_code}`);
    }
    // 歌就在 `data.lists` 里（每行一首），字段名是大驼峰：
    // `FileName`（"歌手 - 歌名"）、`SongName`（纯歌名）、`SingerName`、`AlbumName`、
    // `AlbumID`、`FileHash`（就是那首歌的 hash）、`Duration`（秒）、`Image`（封面）。
    const rows = body.data?.lists ?? [];
    const items: UnifiedSong[] = rows.map(row => {
        const hash = String(row.FileHash ?? row.fileHash ?? row.hash ?? '');
        const albumId = String(row.AlbumID ?? row.albumId ?? row.album_id ?? '');
        const albumAudioId = String(row.AlbumAudioID ?? row.albumAudioId ?? row.MixSongID ?? row.mixSongId ?? '');
        // 封面地址里有一个 `{size}` 占位（`stdmusic/{size}/…`），换成实际的大小。
        const image = String(row.Image ?? row.image ?? '');
        const coverUrl = image
            ? (image.startsWith('http://') ? image.replace('http://', 'https://') : image).replace('{size}', '200')
            : '';
        // 歌名：优先 `SongName`（纯歌名）；没有就用 `FileName` 去掉「歌手 - 」那截。
        const fileName = String(row.FileName ?? row.fileName ?? '');
        const songName = String(row.SongName ?? row.songName ?? '')
            || fileName.split(' - ').slice(1).join(' - ').trim()
            || fileName;
        const singer = String(row.SingerName ?? row.singerName ?? '');
        return {
            id: hash,
            name: songName,
            artists: singer.split('&').filter(Boolean).map((name: string) => ({ id: '', name: name.trim() })),
            album: {
                id: albumId,
                name: String(row.AlbumName ?? row.albumName ?? ''),
                coverUrl: coverUrl || undefined,
            },
            durationMs: Number(row.Duration ?? row.duration ?? 0) * 1000,
            sourceRef: {
                kind: 'online',
                providerId: mobileProviderId(platform),
                mediaId: hash,
                source: mobileLxSourceId(platform),
                // 落雪协议里这个平台的标识符（`providerData`）。音乐源按这些字段认歌 ——
                // 缺了它，源就答不出地址（界面会说「酷狗未返回音乐」）。
                //
                // 源对酷狗要的是 `songmid`（歌的 hash）、`albumId`（专辑）、`hash`（同一个
                // hash）这三个，所以这里都带上。
                providerData: {
                    hash,
                    ...(albumAudioId ? { albumAudioId, mixSongId: albumAudioId, catalogLookupId: albumAudioId } : {}),
                    ...(albumId ? { albumId } : {}),
                },
            } as unknown as UnifiedSong['sourceRef'],
        } as unknown as UnifiedSong;
    });
    const total = Number(body.data?.total ?? items.length);
    return { items, total, hasMore: offset + items.length < total, nextOffset: offset + items.length };
};

/** QQ 搜索返回的一行。 */
interface QqSong {
    id?: number | string;
    mid?: string;
    /** 播放地址要的那个 mid（与 `mid` 不是一回事）；它在 `file` 里面。 */
    file?: { media_mid?: string; mediaMid?: string };
    media_mid?: string;
    mediaMid?: string;
    title?: string;
    interval?: number;
    singer?: Array<{ id?: number | string; name?: string }>;
    album?: { id?: number | string; mid?: string; name?: string };
}

/**
 * QQ 音乐的搜索。
 *
 * QQ 的公开搜索接口（`u.y.qq.com/cgi-bin/musicu.fcg` 的 `DoSearchForQQMusicLite`）
 * **不需要签名**，也不需要登录 —— 桌面上 `qqLyricProvider.ts` 的 `searchQQSongs`
 * 就是用它（那是落雪 musicSdk 那一套）。参数与响应结构都照抄那份，所以两边一致。
 */
const searchQq = async (
    request: HttpRequest,
    platform: MobilePlatformId,
    query: string,
    limit: number,
    offset: number,
    attempt = 0,
) => {
    const payload = {
        comm: {
            ct: 11,
            cv: '1003006',
            v: '1003006',
            os_ver: '15',
            phonetype: '24122RKC7C',
            rom: 'Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys',
            tmeAppID: 'qqmusiclight',
            nettype: 'NETWORK_WIFI',
            udid: '0',
            uid: '0',
        },
        request: {
            method: 'DoSearchForQQMusicLite',
            module: 'music.search.SearchCgiService',
            param: {
                search_id: String(
                    Math.floor(Math.random() * 100000000000000 + Date.now() % 86400000),
                ),
                remoteplace: 'search.android.keyboard',
                query: query.length > 60 ? query.slice(0, 60) : query,
                // 7 = 歌。0 现在会被 QQ 答成 2001 且没有内容（见 #695），别改回去。
                search_type: 7,
                num_per_page: limit,
                page_num: Math.floor(offset / Math.max(1, limit)) + 1,
                highlight: 0,
                nqc_flag: 0,
                page_id: 1,
                grp: 1,
            },
        },
    };
    const response = await request({
        url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: 'tmeLoginType=-1;',
            'User-Agent': 'okhttp/3.14.9',
        },
        body: JSON.stringify(payload),
        responseType: 'text',
        timeout: 20_000,
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`QQ 音乐的搜索接口回了 ${response.status}`);
    }
    const body = JSON.parse(response.data) as {
        code?: number;
        request?: { code?: number; data?: { body?: { item_song?: Array<QqSong>; totalnum?: number } } };
    };
    // 成功的标志是**顶层** `code` 为 0，而且拿得到歌。
    //
    // 内层的 `request.code` 另有含义：QQ 限流时它是 2001，而顶层 `code` 仍是 0
    // （那一层是「请求被受理了」，内层才是「业务上成了没」）。把它算成失败的话，
    // 限流时整次搜索都报错 —— 而那次其实只是没给结果。
    //
    // 桌面那份判的是 `data.request?.code`（那里的 `data` 是 `body.request.data`，
    // 与这里不是同一层），所以不能照抄。
    if (body.code !== 0) {
        throw new Error(`QQ 音乐的搜索没有成功（code=${body.code}）`);
    }
    const rows = body.request?.data?.body?.item_song ?? [];
    if (!rows.length && body.request?.code !== undefined && body.request.code !== 0) {
        // QQ 限流了（2001 就是限流）。等一下再问一次多半就好 —— 连着发会被限，
        // 隔几秒再发就正常了。所以这里不直接失败，先歇一下再试。
        if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
            return searchQq(request, platform, query, limit, offset);
        }
        throw new Error(`QQ 音乐的搜索被限流了（code=${body.request.code}），过一会儿再试`);
    }
    const items: UnifiedSong[] = rows.map(row => {
        // `media_mid` 与 `mid` 不是一回事：前者是播放地址要的那个。
        // 它在 `file` 里面（桌面的 `qqNormalize` 也是从那儿取的）。
        const mediaMid = String(row.file?.media_mid ?? row.file?.mediaMid ?? row.media_mid ?? row.mediaMid ?? '');
        return {
            id: String(row.id ?? ''),
            name: row.title ?? '',
            artists: (row.singer ?? []).map(s => ({ id: String(s.id ?? ''), name: s.name ?? '' })),
            album: {
                id: String(row.album?.id ?? ''),
                name: row.album?.name ?? '',
                // QQ 的封面由专辑 mid 拼出来（`y.gtimg.cn` 那个图床）。
                coverUrl: row.album?.mid
                    ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${row.album.mid}.jpg`
                    : undefined,
            },
            durationMs: (row.interval ?? 0) * 1000,
            sourceRef: {
                kind: 'online',
                providerId: mobileProviderId(platform),
                mediaId: String(row.mid ?? row.id ?? ''),
                source: mobileLxSourceId(platform),
                // 落雪协议里这个平台的标识符（`providerData`）。音乐源按这些字段认歌 ——
                // 缺了它，源就答不出地址（界面会说「QQ 音乐未返回音乐」）。
                providerData: {
                    ...(row.mid ? { songMid: row.mid } : {}),
                    ...(mediaMid ? { mediaMid } : {}),
                    ...(row.id !== undefined ? { songId: String(row.id) } : {}),
                },
            } as unknown as UnifiedSong['sourceRef'],
        } as unknown as UnifiedSong;
    });
    const total = Number(body.request?.data?.body?.totalnum ?? items.length);
    return { items, total, hasMore: offset + items.length < total, nextOffset: offset + items.length };
};

/**
 * 网易云的封面。
 *
 * 搜索接口只给 `album.picId`（一个数字），**不能直接拼成地址** —— 网易云的封面
 * 路径里有一段自己的图片 id（`{hash}/{picId}.jpg`），那个 hash 从 picId 推不出来
 * （实测拿 picId 拼出来的地址一律 404）。
 *
 * 完整地址要从歌曲详情接口拿：`music.163.com/api/song/detail?ids=[id1,id2,…]`
 * —— 一次能给一批，比一首歌一次好得多。
 *
 * 注意 URL 里**不能有多余的斜杠**（`/api/song/detail/?ids=` 会触发风控，回 -462）。
 */
const fetchNeteaseCovers = async (
    request: HttpRequest,
    songIds: string[],
): Promise<Map<string, string>> => {
    const covers = new Map<string, string>();
    const ids = songIds.filter(id => /^\d+$/.test(id));
    if (!ids.length) return covers;

    // 那个接口**会风控**：并发或连着发几次会回 -462（要绑手机）。所以这里
    // 分批、批与批之间串行、每批被拒再试一次。
    const BATCH_SIZE = 10;
    for (let start = 0; start < ids.length; start += BATCH_SIZE) {
        const batch = ids.slice(start, start + BATCH_SIZE);
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const response = await request({
                    url: `https://music.163.com/api/song/detail?ids=[${batch.join(',')}]`,
                    method: 'GET',
                    headers: { Referer: 'https://music.163.com', 'User-Agent': DESKTOP_UA },
                    responseType: 'text',
                    timeout: 15_000,
                });
                if (response.status < 200 || response.status >= 300) break;
                const body = JSON.parse(response.data) as {
                    code?: number;
                    songs?: Array<{ id?: number | string; album?: { picUrl?: string } }>;
                };
                if (body.code !== 200) break;
                for (const song of body.songs ?? []) {
                    const picUrl = song.album?.picUrl;
                    if (picUrl && song.id !== undefined) covers.set(String(song.id), picUrl);
                }
                break;
            } catch {
                // 这一批被风控了：换一次时间再试，还没成就算了（搜索结果里还有歌手头像兜底）。
                if (attempt >= 1) break;
            }
        }
    }
    // 还有几首没拿到封面的话，**逐个**再问一次。
    //
    // 为什么：整批被拒常常是那批里有一首触发了风控（不是整批都不行）。逐个问，
    // 好的那些就出来了 —— 封面墙上一格一格是渐变占位，很显眼。
    const missing = ids.filter(id => !covers.has(id));
    for (const id of missing) {
        try {
            const response = await request({
                url: `https://music.163.com/api/song/detail?ids=[${id}]`,
                method: 'GET',
                headers: { Referer: 'https://music.163.com', 'User-Agent': DESKTOP_UA },
                responseType: 'text',
                timeout: 12_000,
            });
            if (response.status < 200 || response.status >= 300) continue;
            const body = JSON.parse(response.data) as {
                code?: number;
                songs?: Array<{ id?: number | string; album?: { picUrl?: string } }>;
            };
            if (body.code !== 200) continue;
            const picUrl = body.songs?.[0]?.album?.picUrl;
            if (picUrl) covers.set(id, picUrl);
        } catch {
            // 这一首也不给就算了（搜索结果里还有歌手头像兜底）。
        }
    }
    return covers;
};

/**
 * 搜一个平台。
 *
 * 手机版能搜的平台是四个（各自都有公开的搜索接口，桌面版也是靠它们）：
 * - 网易云：`music.163.com/api/search/get`（公开，不需要签名）；
 * - 酷我：`search.kuwo.cn/r.s`（洛雪 musicSdk 那一套，公开，不需要签名）；
 * - 酷狗：`complexsearch.kugou.com/v2/search/song`（要签名，签名算法是公开的）；
 * - QQ 音乐：`u.y.qq.com/cgi-bin/musicu.fcg`（公开，不需要签名）。
 *
 * 剩下的（波点、汽水、YouTube Music、Spotify）在桌面上靠**登录态 + 内嵌后端**
 * 才能搜，手机版没有那些后端，也拿不到登录态 —— 所以它们在手机版上不声明 search
 * 能力（界面的来源列表不会列出搜不了的平台）。
 */
export const searchPlatform = async (
    request: HttpRequest,
    platform: MobilePlatformId,
    query: string,
    limit: number,
    offset: number,
): Promise<ProviderPage<UnifiedSong>> => {
    if (platform === 'wy') {
        const page = await searchNetease(request, platform, query, limit, offset);
        // 封面：搜索接口只给 picId，完整地址要从歌曲详情接口拿（一次一批）。
        const covers = await fetchNeteaseCovers(request, page.items.map(item => String(item.id)));
        if (covers.size) {
            for (const item of page.items) {
                const picUrl = covers.get(String(item.id));
                if (picUrl) item.album = { ...item.album, coverUrl: picUrl };
            }
        }
        return page;
    }
    if (platform === 'kw') return searchKuwo(request, platform, query, limit, offset);
    if (platform === 'kg') return searchKugou(request, platform, query, limit, offset);
    return searchQq(request, platform, query, limit, offset);
};
