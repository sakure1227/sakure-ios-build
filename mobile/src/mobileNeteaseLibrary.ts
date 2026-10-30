// mobile/src/mobileNeteaseLibrary.ts
// 手机版网易云的「用户库」接线：把 `mobileNeteaseData.ts` 的接口接到 provider 的
// `library` / `mutations` 契约上。
//
// ## 为什么与桌面版并排
//
// 桌面版的 `neteaseProvider.library` 每个方法都调 `neteaseApi`（内嵌的 Node 后端），
// 那些调用在手机上必然失败。所以手机版**不覆盖**桌面的 provider，而是把
// `library` / `mutations` 换成本文件这一份 —— 搜索、歌词仍用手机版那套。
//
// 登录、退出登录在 `mobileAuthProviders.ts`（凭据的存取在那儿）。

import type { OnlineMusicProvider } from '../../src/types/onlineMusic';
import type { MobileRequest } from './mobileLogin';
import { loadCredential } from './mobileCredentials';
import {
    neteaseUserPlaylists,
    neteaseLikedSongIds,
    neteasePlaylistTracks,
    neteaseRecentSongs,
    neteaseLikeSong,
    neteaseIsSongLiked,
    neteaseUpdatePlaylistTracks,
    neteaseUserCloud,
    normalizeNeteaseSong,
} from './mobileNeteaseData';

const PROVIDER_ID = 'netease';

/** 读当前登录的 cookie（没有就是没登录）。 */
const readCookie = async (): Promise<string> => (
    (await loadCredential(`${PROVIDER_ID}_cookie`)) ?? ''
);

/**
 * 网易云的用户库与写入。
 */
export const buildNeteaseLibrary = (
    request: MobileRequest,
): {
    library: NonNullable<OnlineMusicProvider['library']>;
    mutations: NonNullable<OnlineMusicProvider['mutations']>;
    catalog: NonNullable<OnlineMusicProvider['catalog']>;
} => {
    const library: NonNullable<OnlineMusicProvider['library']> = {
        async getUserPlaylists(userId, limit, offset) {
            const cookie = await readCookie();
            const result = await neteaseUserPlaylists(
                request,
                cookie,
                String(userId),
                limit,
                offset,
            );
            return result;
        },
        async getLikedSongIds(userId) {
            const cookie = await readCookie();
            const result = await neteaseLikedSongIds(request, cookie, String(userId));
            return result;
        },
        async getLikedSongCount(userId) {
            const cookie = await readCookie();
            const result = await neteaseLikedSongIds(request, cookie, String(userId));
            return result.ids.length;
        },
        async getCloudCollection(user) {
            const cookie = await readCookie();
            const result = await neteaseUserCloud(request, cookie, 50, 0);
            if (!result.items.length) return null;
            return {
                id: -100,
                name: '我的云音乐',
                coverUrl: result.items[0]?.coverUrl ?? '',
                description: '',
                trackCount: result.items.length,
                isLiked: false,
                creatorId: String(user?.id ?? ''),
                creatorName: String(user?.nickname ?? ''),
                creatorAvatar: String(user?.avatarUrl ?? ''),
                subscribedCount: 0,
                playCount: 0,
            } as never;
        },
    };

    const mutations: NonNullable<OnlineMusicProvider['mutations']> = {
        async likeSong(song, liked) {
            const cookie = await readCookie();
            const id = String(typeof song === 'object' ? song.id : song);
            await neteaseLikeSong(request, cookie, id, liked);
        },
        async updatePlaylistTracks(operation, playlist, tracks) {
            const cookie = await readCookie();
            const playlistId = String(typeof playlist === 'object' ? playlist.id : playlist);
            const trackIds = tracks.map(track => String(typeof track === 'object' ? track.id : track));
            await neteaseUpdatePlaylistTracks(request, cookie, operation, playlistId, trackIds);
        },
    };

    const catalog: NonNullable<OnlineMusicProvider['catalog']> = {
        async getPlaylistTracks(id, limit, offset) {
            const cookie = await readCookie();
            return await neteasePlaylistTracks(request, cookie, String(id), limit, offset);
        },
    };

    return { library, mutations, catalog };
};

/**
 * 一首歌在不在红心里（手机版自己问平台）。
 *
 * 桌面版靠 `omni` 聚合各平台的判定，手机版只有网易云有登录态，所以直接问它。
 */
export const neteaseSongLikedState = async (
    request: MobileRequest,
    songId: string,
): Promise<boolean> => {
    const cookie = await readCookie();
    if (!cookie) return false;
    return await neteaseIsSongLiked(request, cookie, songId);
};

/**
 * 最近的播放（手机版）。
 */
export const neteaseRecentPlays = async (
    request: MobileRequest,
    limit = 50,
): Promise<any[]> => {
    const cookie = await readCookie();
    if (!cookie) return [];
    try {
        return await neteaseRecentSongs(request, cookie, limit);
    } catch {
        return [];
    }
};

export { normalizeNeteaseSong };
