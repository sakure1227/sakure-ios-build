import type { LocalSong, SongResult } from '../../../types';
import { buildLocalQueue, LIST_ROW_COVER_SIZE } from '../../../services/playbackAdapters';
import { locallyLikedSongs } from '../../../services/likedSongs';

// src/library/core/home/ownPlaylistTracks.service.ts
// 本机默认歌单（最近播放 / 我的收藏）里那些本地文件，变成能播的那一份。
//
// 「我的收藏」装的是本地曲库的歌（LocalSong——文件路径、时长、封面资源那些），
// 而歌单页与集合页要的是能播的那一份（UnifiedSong extends SongResult：歌名、歌手、
// 专辑、时长，外加播放要用的来源）。这个转换在 services 里（playbackAdapters）——
// core 里的纯变换不依赖它，所以这一层是 service 而不是 model。

/**
 * 本地曲库的歌，按 id 索引；已是能播的那一份。
 *
 * 只转收藏歌单点名的那几首，不把整个曲库都转一遍——曲库可能有几万首。
 */
export const playableLocalSongsById = (
    localSongs: readonly LocalSong[],
    wantedSongIds: readonly string[],
): Map<string, SongResult> => {
    if (wantedSongIds.length === 0) return new Map();
    const wanted = new Set(wantedSongIds);
    const mine = localSongs.filter(song => wanted.has(song.id));
    const converted = buildLocalQueue([...mine], undefined, undefined, LIST_ROW_COVER_SIZE) as SongResult[];
    // 本地歌的 id 是字符串（UnifiedSong 上是 MediaId，这里统一按本地曲库的 id 索引）。
    return new Map(converted.map(song => [String(song.id), song]));
};

/**
 * 本机红星过的歌（在线歌）。
 *
 * core 的 model 层不依赖 services，所以这份数据从 service 层拿（这里）。
 */
export const locallyLikedSongsOf = (): SongResult[] => locallyLikedSongs();
