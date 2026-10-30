import type { SongResult } from '../types';

// src/services/likedSongs.ts
// 本机记下的「我红星过的歌」（在线歌）。
//
// 为什么要有这一份：红星（心形）把歌收进**平台**的「我喜欢」——那需要登录，
// 平台不认（落雪音乐那样的聚合平台就没有账户），而且它只是平台那边的一份清单。
// 用户要的是「我的收藏」这一页里看得到自己红星过的歌，那得**记在这台机器上**：
// 红星的那一刻，整首歌就在手边（像与歌、歌手、专辑、封面），记下来就是了。
//
// 与本机曲库的「我喜欢」歌单（localPlaylistService 的 isFavorite）分开：那份装的是
// **本机文件**，这份装的是**在线歌**。两边的收藏在一处看，但各存各的。

const STORAGE_KEY = 'folia_liked_songs';

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);

const isSong = (value: unknown): value is SongResult => (
    typeof value === 'object' && value !== null && 'id' in value && 'name' in value
);

/** 一首歌的钥匙：它在哪个平台的哪一首。 */
const keyOf = (song: SongResult): string => {
    const source = song.sourceRef;
    if (source && source.kind === 'online') return `online:${source.providerId}:${String(source.mediaId)}`;
    return `song:${String(song.id)}`;
};

/** 本机记下的红星过的歌，最新的在前。 */
let kept: SongResult[] | null = null;

const read = (): SongResult[] => {
    if (kept) return kept;
    try {
        const raw = storage()?.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as unknown : null;
        kept = Array.isArray(parsed) ? parsed.filter(isSong) : [];
    } catch {
        kept = [];
    }
    return kept;
};

/** 记下的这些歌（给界面用）：改过就通知一声，界面好跟着更新。 */
const watchers = new Set<() => void>();

export const watchLikedSongs = (watcher: () => void): (() => void) => {
    watchers.add(watcher);
    return () => { watchers.delete(watcher); };
};

const announce = (): void => {
    for (const watcher of watchers) watcher();
};

const write = (songs: SongResult[]): void => {
    kept = songs;
    try {
        storage()?.setItem(STORAGE_KEY, JSON.stringify(songs));
    } catch {
        // 存不下就只在这次会话里留着（与 recentPlays 一样）。
    }
    announce();
};

/** 红星收下了一首歌。 */
export const noteSongLiked = (song: SongResult): void => {
    write([song, ...read().filter(other => keyOf(other) !== keyOf(song))]);
};

/** 红星取消了。 */
export const noteSongUnliked = (song: SongResult): void => {
    write(read().filter(other => keyOf(other) !== keyOf(song)));
};

/** 这首歌红星过吗。 */
export const isSongLikedLocally = (song: SongResult): boolean => (
    read().some(other => keyOf(other) === keyOf(song))
);

/** 本机红星过的歌，最新的在前。 */
export const locallyLikedSongs = (): SongResult[] => read();

/** 测试用：清掉本机记下的那些歌。 */
export const resetLikedSongs = (): void => {
    kept = null;
    try { storage()?.removeItem(STORAGE_KEY); } catch { /* 本来就没有 */ }
    announce();
};
