import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SongResult } from '@/types';
import { noteSongPlayed, recentPlaysOfMany, resetRecentPlays } from '@/services/recentPlays';

// test/unit/library/home/aggregatedProviderScopes.test.ts
// 聚合入口（落雪音乐）放出来的歌带着**真实来源**的平台，不是聚合器自己。
// 所以「这台机器在落雪下放过什么」记在各家的名下，不在落雪名下——
// 「最近播放」要问它旗下那些源各一份才问得到。

const song = (id: string, providerId: string): SongResult => ({
    id,
    name: `Song ${id}`,
    artists: [],
    album: { id: '', name: '' },
    durationMs: 0,
    sourceRef: { kind: 'online', providerId, mediaId: id },
} as unknown as SongResult);

describe('the songs played under an aggregating platform', () => {
    const storage = { getItem: vi.fn<(key: string) => string | null>(), setItem: vi.fn<(key: string, value: string) => void>() };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(Date.parse('2026-10-07T10:00:00Z'));
        storage.getItem.mockReturnValue(null);
        vi.stubGlobal('localStorage', storage);
        resetRecentPlays();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('are kept under the platform they really came from', () => {
        // 落雪放出来的这首歌来自它旗下的一家：记录记在那家名下。
        noteSongPlayed(song('a', 'netease'), 'me');
        // 聚合器自己名下没有记录——只问它那一份是空的。
        expect(recentPlaysOfMany(['lx'], 'me')).toEqual([]);
        // 问它旗下那些源就问得到。
        expect(recentPlaysOfMany(['lx', 'netease'], 'me').map(entry => entry.id)).toEqual(['a']);
    });

    it('are all there once the whole family is asked', () => {
        noteSongPlayed(song('a', 'netease'), 'me');
        vi.advanceTimersByTime(1000);
        noteSongPlayed(song('b', 'kugou'), 'me');
        vi.advanceTimersByTime(1000);
        noteSongPlayed(song('c', 'qq'), 'me');
        const ids = recentPlaysOfMany(['lx', 'netease', 'kugou', 'qq'], 'me').map(entry => entry.id);
        expect(ids).toEqual(['c', 'b', 'a']);
    });
});
