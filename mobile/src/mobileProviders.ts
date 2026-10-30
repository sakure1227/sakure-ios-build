// mobile/src/mobileProviders.ts
// 手机版的平台 provider。
//
// 为什么需要它：桌面上搜歌走**内嵌的 Node 后端**（`@neteasecloudmusicapienhanced/api`
// 跑在本地端口），手机上没有 Node —— 那个后端起不来。而落雪音乐（lx）的聚合搜索
// 是 fan out 到「声明了 lxSourceId 的平台 provider」上的，所以手机上要有平台 provider，
// 聚合搜索才有东西可问。
//
// 这一份提供的平台：搜索走**平台的公开接口**（不需要后端），播放地址仍然问音乐源
// （源给地址，源支持五个平台）。所以分工是：
// - 搜索：平台公开接口（这里）
// - 播放：音乐源（`customSource.request` 那条路）
//
// 注册它在 `installBridge` 里做 —— 桌面上不注册（桌面上有真平台）。
//
// ## 为什么用桌面同 id 注册（覆盖，而不是新增一套）
//
// 注册表按 `provider.id` 存（`providerRegistry.ts` 的 `providers.set(provider.id, ...)`），
// 所以**同 id 注册就是覆盖**。手机版故意用桌面的那几个 id（`netease`/`kugou`/…）注册：
//
// 1. **渲染层多处按这些 id 硬编码**（歌词匹配、本地歌曲匹配、命令面板…）。另起一套
//    `wy`/`kg`/… 的 id 的话，那些地方在手机上会找不到 provider（`getOnlineMusicProvider('netease')`
//    返回 null），行为就与桌面不一致了。
// 2. **落雪聚合搜索只认 `lxSourceId`**（`lxSources.ts` 按它筛）。桌面那几个真 provider 已经
//    声明了 `lxSourceId`（`netease`→`wy`、`kugou`→`kg`…），手机版覆盖它们之后，注册表里
//    每个平台只剩**一个** provider，`lxSourceId` 不会重复。
//    若手机版另起一套 id 而不覆盖，`lxSourceId` 就会有两个 provider 都声明 `wy`：
//    聚合搜索 fan out 到「桌面真 netease（依赖 Node 后端，必然失败）」和「手机壳」两边，
//    前者会白等 `NETEASE_PORT_WAIT_TIMEOUT_MS`（45 秒）才失败。
//
// 覆盖之后，手机上的 `netease` 就是这个壳 provider：搜索走公开接口，地址问音乐源。

import { registerOnlineMusicProvider, getOnlineMusicProvider } from '../../src/services/onlineMusic/providerRegistry';
import type { OnlineMusicProvider } from '../../src/types/onlineMusic';
// 歌词：复用各平台**自己**的实现（洛雪 musicSdk 移植过来的那几份）。
//
// 为什么不自己写一份：每个平台的歌词接口与歌的身份对不上（网易云要歌曲 id、
// 酷我要 rid、QQ 要 songmid），各家的解析方式也不同（lrc / yrc / 翻译…）。
// 桌面版已经把这几份写好并测过，手机版直接用同一份，各平台的歌词都能取到。
//
// 它们内部用浏览器 fetch 发请求 —— 手机版给 fetch 装了跨域补丁
// （`mobile/src/mobileFetchPatch.ts`），那些请求由原生发出去，同源策略管不着。
import { kuwoProvider } from '../../src/services/onlineMusic/kuwo/kuwoProvider';
import { kugouProvider } from '../../src/services/onlineMusic/kugou/kugouProvider';
import { qqProvider } from '../../src/services/onlineMusic/qq/qqProvider';
import { fetchAggregatedLyrics } from './platformLyrics';
import {
    buildNeteaseAuth,
    buildKugouAuth,
    buildQqAuth,
} from './mobileAuthProviders';
import { buildNeteaseLibrary } from './mobileNeteaseLibrary';
import type { SongResult } from '../../src/types';
import {
    searchPlatform,
    mobilePlatforms,
    mobileProviderId,
    mobileLxSourceId,
    mobilePlatformMark,
    mobilePlatformSearchable,
    type MobilePlatformId,
} from './platformSearch';

type HttpRequest = (options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'text' | 'arraybuffer' | 'blob';
    timeout?: number;
}) => Promise<{
    status: number;
    headers: Record<string, string>;
    data: string;
    /** responseType 为 arraybuffer/blob 时，base64 的正文。 */
    dataBase64?: string;
    /** 这次回答的 `Set-Cookie`（原样那一串）。QQ 登录要靠它拿 qrsig。 */
    setCookie?: string;
}>;

/**
 * 桌面上才有意义、手机版上搜不了的平台。
 *
 * 这两个在桌面版靠**登录态 + 内嵌后端**才能搜：手机版没有那个后端，也拿不到登录态
 * （扫码登录那些流程都在桌面那套里）。所以在手机版上把它们的 search 关掉 ——
 * 不然界面的搜索来源列表会列出它们，用户点了却没反应。
 *
 * 它们仍然注册着（`providerRegistry.ts` 自动注册），这样界面上平台的清单与桌面一致，
 * 点进去能看到「这个平台在手机上不能用」而不是「这个平台不存在」。
 *
 * **汽水（qishui）与波点（bodian）已经移出这份名单** —— 它们的协议在 npm 包里，
 * 是纯 JS，手机版用原生 HTTP（`CsHttp`）+ Preferences 就能跑（见
 * `mobile/src/qishuiBridge.ts` 与 `mobile/src/bodianBridge.ts`）。所以这两个平台在
 * 手机与 iPad 上都能搜、能扫码登录、能读用户歌单。
 *
 * 剩下的两个为什么还不能：
 * - **YouTube Music（ytm）**：登录要浏览器自动化（桌面上是 2400 多行的
 *   `electron/ytm/`，含 poToken 挑战）。iOS 上做不了。
 * - **Spotify**：登录与令牌刷新依赖桌面的浏览器沙箱，同上。
 */
const DESKTOP_ONLY_PROVIDER_IDS = ['ytm', 'spotify'];

/**
 * 手机版能登录的平台，以及各自的登录实现。
 *
 * 桌面上这些平台的登录由内嵌的 Node 后端做，手机版没有那个后端 —— 但**登录协议本身
 * 可以自己实现**（`mobileAuthProviders.ts`）：网易云要的是 weapi 加密，QQ 要的是
 * 一段 OAuth 换票链，酷狗要的是一段带签名的轮询。这些都是「发 HTTP 请求」，
 * 手机版的原生 HTTP（`CsHttp`）能发。
 *
 * 酷我不在这里：它的登录要用另一套接口，还没接。
 */
const MOBILE_AUTH: Partial<Record<MobilePlatformId, (request: never) => NonNullable<OnlineMusicProvider['auth']>>> = {
    wy: buildNeteaseAuth,
    kg: buildKugouAuth,
    tx: buildQqAuth,
};

/**
 * 手机版能读用户库（歌单、红心、最近播放）的平台。
 *
 * 目前只有网易云接通了：它的账号数据接口与登录用的是同一套 weapi 加密，
 * 所以登录通了，数据接口就跟着通了。酷狗与 QQ 的用户库接口要各自的签名与
 * 会话，接入时要单独做 —— 那部分先不做，界面上也就不会有「我的歌单」。
 */
const MOBILE_LIBRARY: Partial<Record<MobilePlatformId, (request: never) => {
    library: NonNullable<OnlineMusicProvider['library']>;
    mutations: NonNullable<OnlineMusicProvider['mutations']>;
    catalog: NonNullable<OnlineMusicProvider['catalog']>;
}>> = {
    wy: buildNeteaseLibrary,
};

/**
 * 各平台**自己**的歌词实现（桌面版的那几份）。
 *
 * 键是手机版的 provider id，值是那个平台的 `lyrics` 字段。
 *
 * 网易云那份不能直接用：桌面版的 `getLyrics` 走内嵌的 Node 后端
 * （`neteaseApi.getLyric`），手机上那个后端起不来。所以网易云的歌词在手机版
 * 自己取（见 `platformLyrics.ts`）。
 */
const PLATFORM_LYRICS: Partial<Record<MobilePlatformId, NonNullable<OnlineMusicProvider['lyrics']>>> = {
    kw: kuwoProvider.lyrics,
    kg: kugouProvider.lyrics,
    tx: qqProvider.lyrics,
};

/**
 * 各平台**自己的** `lxFields`（桌面那份）。
 *
 * 这一段是「平台 → 落雪协议里那个平台的标识符叫什么」的对应表：音乐源按这些字段
 * 认歌（酷狗要 `hash`、酷我要 `musicRid`、QQ 要 `songMid`/`mediaMid`）。
 *
 * 手机版的 provider 不用桌面的搜索（走平台的公开接口），但**要用**这张表 ——
 * 少了它，音乐源收到的 `musicInfo` 里没有那些标识符，就认不出这首歌，答不出地址
 * （界面会说「酷狗未返回音乐」）。
 *
 * 网易云那份不用带：它的标识符就是歌曲 id，`lxFields` 只做了一次转写。
 */
/**
 * 给平台的 `lxFields` 加一层兜底：`providerData` 里没有那个标识符时，用 `mediaId`。
 *
 * 为什么：桌面的 `lxFields` 是给**它自己的**搜索结果写的 —— 那些结果的
 * `sourceRef.providerData` 里一定带着标识符（hash / musicRid / songMid）。
 * 手机版的歌有一路是**别处来的**（比如落雪聚合转发过来的、或者收藏里存的旧记录），
 * 那里的 `providerData` 可能是空的 —— 于是桌面的 `lxFields` 给出 `songmid: ''`，
 * 音乐源收到一个空的标识符，认不出这首歌，于是**答不出地址**（界面显示
 * 「某某未返回音乐」）。
 *
 * 兜底用的是 `mediaId`：手机版搜索时 `mediaId` 就是那个平台的标识符本身
 * （酷狗是 hash、酷我是 musicRid、QQ 是 mid），所以它总是对的。
 */
const withSongMidFallback = (
    fields: OnlineMusicProvider['lxFields'],
): NonNullable<OnlineMusicProvider['lxFields']> => (song, providerData) => {
    const mapped = fields?.(song, providerData) ?? {};
    const fallback = String(song.sourceRef?.kind === 'online' ? song.sourceRef.mediaId ?? '' : '');
    const songMid = mapped.songmid;
    return {
        ...mapped,
        songmid: typeof songMid === 'string' && songMid ? songMid : fallback,
    };
};

const PLATFORM_LX_FIELDS: Partial<Record<MobilePlatformId, NonNullable<OnlineMusicProvider['lxFields']>>> = {
    kw: withSongMidFallback(kuwoProvider.lxFields),
    kg: withSongMidFallback(kugouProvider.lxFields),
    tx: withSongMidFallback(qqProvider.lxFields),
};

/**
 * 造一个平台 provider。
 *
 * 它只做搜索；播放地址是音乐源的事（所以 `playback: false` —— 这个平台自己
 * 给不出地址，`omni` 会转去问源）。
 *
 * `prefersCustomSourceAudio: true` 是关键：它让「问源」排在「问平台」**前面**
 * （`omni.ts` 的 `asksSourcesFirst`）。这个平台上本来就没有播放能力，不这样排的话
 * 每首歌都会先去问一个必然失败的平台，白等一次超时。
 */
const buildMobileProvider = (request: HttpRequest, platform: MobilePlatformId, name: string): OnlineMusicProvider => {
    const providerId = mobileProviderId(platform);
    const searchable = mobilePlatformSearchable(platform);
    // 这个平台**自己**的歌词实现（桌面的那几份）。取不到时会落到聚合底座。
    const ownLyrics = PLATFORM_LYRICS[platform];
    // 这个平台的登录（手机版自己实现的扫码协议，见 `mobileAuthProviders.ts`）。
    // 没有它的平台（如酷我）就登录不了 —— 界面也就不会给它显示登录入口。
    const auth = MOBILE_AUTH[platform]?.(request as never);
    // 用户库与写入（只有网易云在手机版上接通了账号数据）。
    const userData = MOBILE_LIBRARY[platform]?.(request as never);
    const library = userData?.library;
    const mutations = userData?.mutations;
    const catalog = userData?.catalog;
    // 歌词：**全平台聚合**。
    //
    // 先问歌自己那个平台的歌词接口；取不到就按歌名+歌手到有公开接口的平台
    // （网易云 / 酷我）搜到对应曲目再取那份。这样不管歌是从哪个平台搜来的，
    // 都有机会拿到歌词——而不是只有某一个平台的歌才有。
    const lyrics = {
        async getLyrics(song: SongResult) {
            return await fetchAggregatedLyrics(request, song, ownLyrics?.getLyrics);
        },
    };
    return {
        id: providerId,
        displayName: `${name}（手机版）`,
        shortName: name,
        // 落雪的源协议里这个平台的代号 —— 有了它，落雪的聚合搜索就会问这一家，
        // 音乐源也才知道「这首歌该问哪个平台的源」（`songMapping.getCustomSourcePlatform`）。
        lxSourceId: mobileLxSourceId(platform),
        // 播放地址先问源（源能给五个平台的地址）。
        prefersCustomSourceAudio: true,
        // 落雪协议里这个平台的标识符（`lxFields`）：音乐源按这些字段认歌。
        // 少了它，源就答不出地址（界面会说「某某未返回音乐」）。
        ...(PLATFORM_LX_FIELDS[platform] ? { lxFields: PLATFORM_LX_FIELDS[platform] } : {}),
        mark: mobilePlatformMark(platform),
        getAvailability: () => ({ configured: true }),
        capabilities: {
            // 只有真正有公开搜索接口的平台才说「能搜」。说能搜却搜不了，比说不能搜更糟：
            // 界面的来源列表会列出它（`SearchWorkspace` 按能力过滤），用户点了却是空的。
            search: searchable,
            playback: false,
            // 歌词：这个平台取得到吗（见上面的 lyrics）。
            lyrics: true,
            wordByWordLyrics: false,
            // 登录：手机版**自己**做扫码登录（`mobileAuthProviders.ts`）——
            // 桌面版靠内嵌的 Node 后端，手机版没有那个后端，但登录协议可以自己实现。
            auth: Boolean(auth),
            userLibrary: Boolean(auth),
            playlists: Boolean(auth),
            albums: false,
            artists: false,
            recommendations: false,
            mutations: Boolean(auth),
            explore: false,
        },
        // 搜不了就不给 search —— 落雪聚合搜索按 `source.search` 过滤
        // （`lxProvider.searchSongs`），没有这个函数就不会被 fan out 到。
        ...(searchable ? {
            search: {
                async searchSongs(query: string, limit: number, offset: number) {
                    return searchPlatform(request, platform, query, limit, offset) as never;
                },
            },
        } : {}),
        // 歌词：聚合实现（见上面）。没有它，`omni.getLyrics` 会抛
        // 「lyrics is not supported by …」，歌词动画就只剩背景没有字。
        lyrics,
        // 登录：手机版自己实现的扫码协议（见 `mobileAuthProviders.ts`）。
        // 没有它，界面上这个平台就没有登录入口。
        ...(auth ? { auth } : {}),
        // 用户库与写入：手机版自己实现的（见 `mobileNeteaseLibrary.ts`）。
        // 桌面版那一份的每个方法都调内嵌的 Node 后端，手机上必然失败 ——
        // 所以这里换成本手机版自己发请求的实现。
        ...(library ? { library } : {}),
        ...(mutations ? { mutations } : {}),
        ...(catalog ? { catalog } : {}),
    } as unknown as OnlineMusicProvider;
};

/**
 * 注册手机版的平台 provider。
 *
 * 只在**手机版**调用（桌面上有真的平台 provider，重复注册会让它们被覆盖）。
 *
 * 两件事：
 * 1. 用手机版的壳**覆盖**这四个平台（网易云、酷我、酷狗、QQ 音乐）——它们的搜索
 *    走各自平台的公开接口（桌面版靠内嵌后端，手机版没有）。
 * 2. 把另外四个（波点、汽水、YouTube Music、Spotify）的 search 能力**关掉**。
 *    它们在桌面上靠登录态 + 内嵌后端才能搜，手机版两样都没有；但它们的 provider
 *    是 `providerRegistry.ts` 自动注册的，能力声明还是桌面的那份 —— 于是界面的搜索
 *    来源列表会列出它们，用户点了却是「点不动」。
 */
export const registerMobileProviders = (request: HttpRequest): void => {
    for (const platform of mobilePlatforms()) {
        registerOnlineMusicProvider(buildMobileProvider(request, platform.id as MobilePlatformId, platform.name));
    }
    for (const providerId of DESKTOP_ONLY_PROVIDER_IDS) {
        const provider = getOnlineMusicProvider(providerId);
        if (!provider) continue;
        registerOnlineMusicProvider({
            ...provider,
            capabilities: { ...provider.capabilities, search: false },
            // 搜索也一并去掉：界面按能力过滤，但别的地方还会看这个函数在不在。
            search: undefined,
        } as unknown as OnlineMusicProvider);
    }
};
