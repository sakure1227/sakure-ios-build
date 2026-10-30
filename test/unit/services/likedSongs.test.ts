import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SongResult } from '@/types';
import {
    isSongLikedLocally,
    locallyLikedSongs,
    noteSongLiked,
    noteSongUnliked,
    resetLikedSongs,
    watchLikedSongs,
} from '@/services/likedSongs';

// test/unit/services/likedSongs.test.ts
// 本机记下的「我红星过的歌」：红星（心形）把歌收进平台的「我喜欢」——那要登录，
// 聚合平台（落雪音乐）根本没有账户。用户要的是「我的收藏」那页里看得到自己红星过的歌，
// 所以这份清单得记在这台机器上。

const song = (id: string, providerId = 'netease'): SongResult => ({
    id,
    name: `Song ${id}`,
    artists: [],
    album: { id: 0, name: '' },
    durationMs: 1000,
    sourceRef: { kind: 'online', providerId, mediaId: id },
} as unknown as SongResult);

describe('the songs liked on this machine', () => {
    const storage = { getItem: vi.fn<(key: string) => string | null>(), setItem: vi.fn<(key: string, value: string) => void>(), removeItem: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();
        storage.getItem.mockReturnValue(null);
        vi.stubGlobal('localStorage', storage);
        resetLikedSongs();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('keeps a song that was liked', () => {
        noteSongLiked(song('a'));
        expect(locallyLikedSongs().map(item => item.id)).toEqual(['a']);
        expect(isSongLikedLocally(song('a'))).toBe(true);
    });

    it('forgets a song that was unliked', () => {
        noteSongLiked(song('a'));
        noteSongUnliked(song('a'));
        expect(locallyLikedSongs()).toEqual([]);
        expect(isSongLikedLocally(song('a'))).toBe(false);
    });

    it('keeps the newest first', () => {
        noteSongLiked(song('a'));
        noteSongLiked(song('b'));
        expect(locallyLikedSongs().map(item => item.id)).toEqual(['b', 'a']);
    });

    it('does not keep the same song twice', () => {
        noteSongLiked(song('a'));
        noteSongLiked(song('a'));
        expect(locallyLikedSongs().map(item => item.id)).toEqual(['a']);
    });

    it('tells two songs of different platforms apart', () => {
        // 同一个 id 在两个平台上是两首歌（各自的地址不同），收藏要分开记。
        noteSongLiked(song('a', 'netease'));
        noteSongLiked(song('a', 'kugou'));
        expect(locallyLikedSongs()).toHaveLength(2);
        expect(isSongLikedLocally(song('a', 'netease'))).toBe(true);
        expect(isSongLikedLocally(song('a', 'kugou'))).toBe(true);
    });

    it('gives the same list every time, so a reader of it can compare by identity', () => {
        // 读它的地方是 useSyncExternalStore 的 getSnapshot：那儿要的是稳定的引用。
        noteSongLiked(song('a'));
        const first = locallyLikedSongs();
        expect(locallyLikedSongs()).toBe(first);
    });

    it('tells whoever watches that the list changed', () => {
        const watcher = vi.fn();
        const stop = watchLikedSongs(watcher);
        noteSongLiked(song('a'));
        expect(watcher).toHaveBeenCalled();
        stop();
        watcher.mockClear();
        noteSongLiked(song('b'));
        expect(watcher).not.toHaveBeenCalled();
    });

    it('reads back what was stored', () => {
        noteSongLiked(song('a'));
        // 下次启动读的是存下来的那份。
        storage.getItem.mockReturnValue(storage.setItem.mock.calls.at(-1)![1]);
        resetLikedSongs();
        expect(locallyLikedSongs().map(item => item.id)).toEqual(['a']);
    });
});
