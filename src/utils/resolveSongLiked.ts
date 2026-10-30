import { omni } from '../services/onlineMusic/omni';
import type { SongResult } from '../types';
import { isLocalPlaybackSong, isNavidromePlaybackSong, resolveNavidromePlaybackCarrier } from './appPlaybackGuards';

// src/utils/resolveSongLiked.ts
//
// One boolean over four unrelated backends. Local files answer from disk, Navidrome from its own
// starred set keyed by the carrier's id, and everything else from its provider's account (omni)
// **or** from this machine's own record of the heart (likedSongs).
//
// The last one matters for the songs a platform will not take: the heart is kept here whatever the
// platform says, so a song the platform refused still shows as liked — because it is liked, here.
//
// Written down once because the player panel and the Electron remote bridge both need it and had
// grown identical copies inline - which is how the two surfaces would eventually disagree.

type SongLikedSources = {
    isLocalSongLiked: (song: SongResult) => boolean;
    starredNavidromeSongIds: Set<string>;
};

export const resolveSongLiked = (
    song: SongResult | null,
    { isLocalSongLiked, starredNavidromeSongIds }: SongLikedSources,
): boolean => {
    if (!song) {
        return false;
    }
    if (isLocalPlaybackSong(song)) {
        return isLocalSongLiked(song);
    }
    if (isNavidromePlaybackSong(song)) {
        const navidromeSong = resolveNavidromePlaybackCarrier(song);
        return navidromeSong ? starredNavidromeSongIds.has(navidromeSong.navidromeData.id) : false;
    }
    // 平台的「我喜欢」与本机的「我的收藏」任一里有它，就算红着。
    //
    // 判定在 `omni.isSongLikedOrLocal` 那一份：点击红星时翻向用的也是它（`pressSongLike`）。
    // 两处必须是同一个判定 —— 平台没收下的歌（本机那份有、平台那份没有）若显示与翻向各
    // 算各的，红心就取消不掉。
    return omni.isSongLikedOrLocal(song);
};
