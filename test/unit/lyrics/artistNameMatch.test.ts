import { describe, expect, it } from 'vitest';
import { normalizeArtistNameForMatch } from '@/utils/lyrics/artistNameMatch';
import { calculateMatchScoreDetails } from '@/utils/lyrics/matchScore';
import type { SongResult } from '@/types';

// test/unit/lyrics/artistNameMatch.test.ts
// 歌手名的匹配用归一化：分隔符不算差异。
//
// 背景：同一位歌手在不同地方写法不一样（QQ 写 `Tiam,吴鉴格`，歌单里是 `Tiam、吴鉴格`），
// 不归一化就比不出来 —— 歌词匹配的分数掉到门槛以下，本来找得到的歌词被丢掉
// （用户看到的现象是「歌在酷狗、歌词在 QQ」却显示没有歌词）。

describe('歌手名的匹配用归一化', () => {
    it('去掉各种分隔符', () => {
        expect(normalizeArtistNameForMatch('Tiam,吴鉴格')).toBe('tiam吴鉴格');
        expect(normalizeArtistNameForMatch('Tiam、吴鉴格')).toBe('tiam吴鉴格');
        expect(normalizeArtistNameForMatch('Tiam & 吴鉴格')).toBe('tiam吴鉴格');
        expect(normalizeArtistNameForMatch('Tiam/吴鉴格')).toBe('tiam吴鉴格');
        expect(normalizeArtistNameForMatch('Tiam·吴鉴格')).toBe('tiam吴鉴格');
        expect(normalizeArtistNameForMatch('Tiam 吴鉴格')).toBe('tiam吴鉴格');
    });

    it('大小写不算差异', () => {
        expect(normalizeArtistNameForMatch('BEYOND')).toBe('beyond');
        expect(normalizeArtistNameForMatch('Beyond')).toBe('beyond');
    });

    it('空的名字归一化后还是空', () => {
        expect(normalizeArtistNameForMatch('')).toBe('');
        expect(normalizeArtistNameForMatch('  , 、 ')).toBe('');
    });

    it('分隔符不同的那一份，匹配分数与没分隔符的一样', () => {
        // 歌单里的写法（顿号）。
        const target = { title: '那天之后', artist: 'Tiam、吴鉴格', durationMs: 188_000 };
        // 平台搜索结果里的写法（逗号）。
        const candidate = {
            id: '491310086',
            name: '那天之后',
            artists: [{ id: 0, name: 'Tiam,吴鉴格' }],
            album: { id: 0, name: '' },
            durationMs: 188_000,
        } as unknown as SongResult;

        const withSeparators = calculateMatchScoreDetails(
            { ...target, artist: 'Tiam,吴鉴格' },
            candidate,
        );
        const normalized = calculateMatchScoreDetails(
            { ...target, artist: normalizeArtistNameForMatch(target.artist) },
            { ...candidate, artists: [{ id: 0, name: normalizeArtistNameForMatch('Tiam,吴鉴格') }] } as unknown as SongResult,
        );

        // 归一化之后两者一样，而且歌手是匹配的。
        expect(normalized.score).toBe(withSeparators.score);
        expect(normalized.artistMatched).toBe(true);
        expect(normalized.titleMatched).toBe(true);
    });
});
