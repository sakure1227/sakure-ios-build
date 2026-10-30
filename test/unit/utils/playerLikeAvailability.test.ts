import { describe, expect, it, vi } from 'vitest';
import type { SongResult } from '@/types';
import { resolveLikeAvailability } from '@/utils/playerLikeAvailability';

// test/unit/utils/playerLikeAvailability.test.ts
// 「喜爱」这个动作能不能用。
//
// 用户要的是「红星永远亮着，点了就进「我的收藏」」。平台的「我喜欢」要登录才有，
// 而落雪音乐那样的聚合平台根本没有账户——所以平台收不了时，收藏落在本机，
// 不能因此把心形灰掉。

const onlineSong = (providerId: string): SongResult => ({
    id: '1',
    name: 'Song',
    artists: [],
    album: { id: 0, name: '' },
    durationMs: 0,
    sourceRef: { kind: 'online', providerId, mediaId: '1' },
} as unknown as SongResult);

const localSong = (): SongResult => ({
    id: 'local-1',
    name: 'Local',
    artists: [],
    album: { id: 0, name: '' },
    durationMs: 0,
    localRef: { songId: 'local-1' },
} as unknown as SongResult);

describe('whether the heart can be used', () => {
    it('is usable for an online song, whichever platform it is from', () => {
        // 平台收不了（没登录、没有这个能力）时，收藏落在本机 —— 不是「不能点」。
        expect(resolveLikeAvailability(onlineSong('netease'), false, false)).toEqual({ disabled: false, reason: null });
        expect(resolveLikeAvailability(onlineSong('kugou'), false, false)).toEqual({ disabled: false, reason: null });
        expect(resolveLikeAvailability(onlineSong('kuwo'), false, false)).toEqual({ disabled: false, reason: null });
    });

    it('is usable for a local song', () => {
        expect(resolveLikeAvailability(localSong(), false, false)).toEqual({ disabled: false, reason: null });
    });

    it('is not usable when there is no song', () => {
        expect(resolveLikeAvailability(null, false, false)).toEqual({ disabled: true, reason: null });
    });

    it('is not usable while the controls are off or a stage plays', () => {
        expect(resolveLikeAvailability(onlineSong('netease'), true, false).disabled).toBe(true);
        expect(resolveLikeAvailability(onlineSong('netease'), false, true).disabled).toBe(true);
    });
});
