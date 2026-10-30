// mobile/src/mobileNeteaseData.ts
// 手机版网易云的「账号数据」：用户歌单、红心、最近播放、歌单曲目、收藏写入。
//
// ## 为什么单独一份
//
// 桌面上这些走内嵌的 Node 后端（`neteaseApi.getUserPlaylists` 等）。手机版没有那个
// 后端 —— 但这些接口和登录一样，都是「加密 + 发 HTTP」，所以这里直接实现。
//
// ## 路径与加密（照上游 `@neteasecloudmusicapienhanced/api` 的模块来，别猜）
//
// 每个接口的**路径前缀**与**加密方式**都不同，猜了就答不出来：
//
// | 接口                | 路径                        | 加密  |
// |---------------------|-----------------------------|-------|
// | 用户歌单            | `/api/user/playlist`        | weapi |
// | 歌单详情（曲目 id） | `/api/v6/playlist/detail`   | 无    |
// | 歌曲详情（批量）    | `/api/v3/song/detail`       | 无    |
// | 红心列表            | `/api/song/like/get`        | 无    |
// | 单曲红心状态        | `/api/song/like`            | 无    |
// | 喜欢 / 不喜欢       | `/api/radio/like`           | weapi |
// | 最近播放            | `/api/play-record/song/list`| weapi |
// | 云盘                | `/api/v1/cloud/get`         | 无    |
//
// 「歌单里的曲目」是**两步**：先 `/api/v6/playlist/detail` 拿到 `trackIds`，
// 再用 `song/detail` 的 `c` 参数（`[{"id":1},{"id":2}]` 那个形状）批量换成详情。
// 一步到位是不行的 —— `/api/v6/playlist/detail` 不给完整的曲目信息。

import { OnlineProviderError } from '../../src/types/onlineMusic';
import type { MobileRequest } from './mobileLogin';
import { weapi } from './mobileCrypto';

const NETEASE_HOST = 'https://interface.music.163.com';
const NETEASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 把 http 的地址换成 https（手机版的页面是 https://localhost）。 */
const toHttps = (url: unknown): string => String(url ?? '').replace(/^http:/, 'https:');

/**
 * 发一次请求。
 *
 * @param encrypted true = 用 weapi 加密（路径带 `/weapi` 前缀）；false = 明文 POST。
 */
const neteaseRequest = async (
    request: MobileRequest,
    endpoint: string,
    data: unknown,
    cookie: string,
    encrypted: boolean,
): Promise<any> => {
    let body: string;
    let url: string;

    if (encrypted) {
        const payload = weapi(data);
        body = new URLSearchParams({
            params: payload.params,
            encSecKey: payload.encSecKey,
        }).toString();
        url = `${NETEASE_HOST}/weapi/${endpoint}`;
    } else {
        body = new URLSearchParams(
            Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
        ).toString();
        url = `${NETEASE_HOST}/api/${endpoint}`;
    }

    const response = await request({
        url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': NETEASE_UA,
            Referer: 'https://music.163.com/',
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body,
    });

    let json: any = null;
    try {
        json = JSON.parse(response.text);
    } catch {
        throw new OnlineProviderError('invalid-response', `NetEase answered with no JSON (HTTP ${response.status})`, 'netease');
    }
    const code = Number(json?.code);
    if ([301, 401, 403].includes(code)) {
        throw new OnlineProviderError('auth-required', `NetEase rejected the request: not signed in (code ${code})`, 'netease');
    }
    if (response.status >= 400) {
        throw new OnlineProviderError('network', `NetEase answered HTTP ${response.status}`, 'netease');
    }
    return json;
};

/**
 * 网易云的一首歌 → 界面用的形状。
 */
export const normalizeNeteaseSong = (raw: any): any => {
    if (!raw) return null;
    const artists = Array.isArray(raw.ar) ? raw.ar : Array.isArray(raw.artists) ? raw.artists : [];
    const album = raw.al ?? raw.album ?? {};
    const albumPic = album.picUrl ?? album.pic_str ?? album.blurPicUrl ?? '';
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? raw.songName ?? ''),
        artist: artists.map((item: any) => String(item?.name ?? '')).filter(Boolean).join(' / '),
        album: String(album.name ?? raw.albumName ?? ''),
        coverUrl: toHttps(albumPic),
        duration: Number(raw.dt ?? raw.duration ?? 0),
        sourceRef: {
            kind: 'online',
            providerId: 'netease',
            mediaId: String(raw.id ?? ''),
        },
    };
};

/**
 * 网易云的一个歌单 → 界面用的形状。
 */
export const normalizeNeteasePlaylist = (raw: any, ownerId: string): any => {
    return {
        id: String(raw?.id ?? ''),
        name: String(raw?.name ?? ''),
        coverUrl: toHttps(raw?.coverImgUrl ?? raw?.picUrl ?? ''),
        description: String(raw?.description ?? ''),
        trackCount: Number(raw?.trackCount ?? raw?.track_count ?? 0),
        // 网易云自建的「我喜欢的音乐」是红心的容器（`specialType: 5`）。
        isLiked: Number(raw?.specialType ?? 0) === 5,
        creatorId: String(raw?.creator?.userId ?? raw?.userId ?? ownerId ?? ''),
        creatorName: String(raw?.creator?.nickname ?? ''),
        creatorAvatar: toHttps(raw?.creator?.avatarUrl ?? ''),
        subscribedCount: Number(raw?.subscribedCount ?? raw?.subscribed_count ?? 0),
        playCount: Number(raw?.playCount ?? 0),
    };
};

// ------------------------------------------------------------------
// 用户库
// ------------------------------------------------------------------

/**
 * 用户的歌单列表。
 */
export const neteaseUserPlaylists = async (
    request: MobileRequest,
    cookie: string,
    userId: string,
    limit = 50,
    offset = 0,
): Promise<{ items: any[]; hasMore: boolean; nextOffset: number }> => {
    const json = await neteaseRequest(
        request,
        'user/playlist',
        { uid: userId, limit, offset },
        cookie,
        true,
    );
    const raw = Array.isArray(json?.playlist) ? json.playlist : [];
    const items = raw.map((item: any) => normalizeNeteasePlaylist(item, userId));
    return { items, hasMore: items.length === limit, nextOffset: offset + items.length };
};

/**
 * 红心（喜欢）的歌曲 id。
 *
 * 网易云一次就给全量，所以 `whole: true`（调用方知道不用翻页）。
 */
export const neteaseLikedSongIds = async (
    request: MobileRequest,
    cookie: string,
    userId: string,
): Promise<{ ids: string[]; whole: boolean }> => {
    const json = await neteaseRequest(
        request,
        'song/like/get',
        { uid: userId, timestamp: Date.now() },
        cookie,
        false,
    );
    if (Number(json?.code) !== 200) {
        throw new OnlineProviderError('unavailable', `NetEase returned no liked-songs list (code ${json?.code})`, 'netease');
    }
    const ids = Array.isArray(json?.ids) ? json.ids.map(String) : [];
    return { ids, whole: true };
};

/**
 * 一个歌单里的曲目（两步：先曲目 id，再批量换详情）。
 */
export const neteasePlaylistTracks = async (
    request: MobileRequest,
    cookie: string,
    playlistId: string,
    limit = 50,
    offset = 0,
): Promise<{ items: any[]; hasMore: boolean; nextOffset: number }> => {
    const detail = await neteaseRequest(
        request,
        'v6/playlist/detail',
        { id: playlistId, n: 100000, s: 8 },
        cookie,
        false,
    );
    const trackIds = Array.isArray(detail?.playlist?.trackIds) ? detail.playlist.trackIds : [];
    const page = trackIds.slice(offset, offset + limit);
    if (!page.length) {
        return { items: [], hasMore: false, nextOffset: offset };
    }

    const items = await neteaseSongDetails(
        request,
        cookie,
        page.map((item: any) => String(item?.id ?? '')).filter(Boolean),
    );
    return {
        items,
        hasMore: offset + items.length < trackIds.length,
        nextOffset: offset + items.length,
    };
};

/**
 * 最近的播放记录。
 */
export const neteaseRecentSongs = async (
    request: MobileRequest,
    cookie: string,
    limit = 50,
): Promise<any[]> => {
    const json = await neteaseRequest(
        request,
        'play-record/song/list',
        { limit: 100 },
        cookie,
        true,
    );
    const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json?.songs) ? json.songs : [];
    return raw.map(normalizeNeteaseSong).filter(Boolean).slice(0, limit);
};

/**
 * 一首歌的详情（按 id 批量取）。
 *
 * 平台的 `c` 参数是 `[{"id":1},{"id":2}]` 这个形状（不是逗号分隔的 id 串）。
 */
export const neteaseSongDetails = async (
    request: MobileRequest,
    cookie: string,
    ids: string[],
): Promise<any[]> => {
    const clean = ids.filter(Boolean).slice(0, 1000);
    if (!clean.length) return [];
    const json = await neteaseRequest(
        request,
        'v3/song/detail',
        { c: `[${clean.map(id => `{"id":${id}}`).join(',')}]` },
        cookie,
        false,
    );
    const raw = Array.isArray(json?.songs) ? json.songs : [];
    return raw.map(normalizeNeteaseSong).filter(Boolean);
};

/**
 * 喜欢 / 不喜欢一首歌。
 */
export const neteaseLikeSong = async (
    request: MobileRequest,
    cookie: string,
    songId: string,
    like: boolean,
): Promise<void> => {
    await neteaseRequest(request, 'radio/like', { id: songId, like }, cookie, true);
};

/**
 * 一首歌在不在红心里。
 */
export const neteaseIsSongLiked = async (
    request: MobileRequest,
    cookie: string,
    songId: string,
): Promise<boolean> => {
    try {
        const json = await neteaseRequest(request, 'song/like', { id: songId }, cookie, false);
        return Boolean(json?.liked);
    } catch {
        return false;
    }
};

/**
 * 歌单里加歌 / 删歌。
 *
 * 路径是 `/playlist/manipulate/tracks`（不是 `playlist/tracks/add`），加减都是它 ——
 * 加添与删除的区别在参数 `op`（`add` / `del`）里。还有一个差异：歌的 id 的参数名是
 * `trackIds`（一个 JSON 数组字符串），不是 `tracks`（逗号分隔的字符串）。
 */
export const neteaseUpdatePlaylistTracks = async (
    request: MobileRequest,
    cookie: string,
    op: 'add' | 'del',
    playlistId: string,
    trackIds: string[],
): Promise<void> => {
    if (!trackIds.length) return;
    await neteaseRequest(
        request,
        'playlist/manipulate/tracks',
        {
            op,
            pid: playlistId,
            trackIds: JSON.stringify(trackIds),
            imme: 'true',
        },
        cookie,
        true,
    );
};

/**
 * 云盘（网易云的「我的云音乐」）。
 */
export const neteaseUserCloud = async (
    request: MobileRequest,
    cookie: string,
    limit = 50,
    offset = 0,
): Promise<{ items: any[]; hasMore: boolean; nextOffset: number }> => {
    const json = await neteaseRequest(
        request,
        'v1/cloud/get',
        { limit, offset },
        cookie,
        false,
    );
    const raw = Array.isArray(json?.data) ? json.data : [];
    const items = raw.map(normalizeNeteaseSong).filter(Boolean);
    return { items, hasMore: items.length === limit, nextOffset: offset + items.length };
};
