import { describe, expect, it } from 'vitest';

// test/unit/onlineMusic/lxAggregateSearch.test.ts
// The LX Music aggregator: how one keyword's answers from every LX source become one page - the
// interleave order, the page cut, the paging, and what a source that fails costs the page.

import {
    aggregateLxSearch,
    interleaveSourceAnswers,
    type LxSearchEach,
    type LxSearchSourceAnswer,
} from '../../../src/services/onlineMusic/lx/lxAggregateSearch';
import { buildLxExploreSections } from '../../../src/services/onlineMusic/lx/lxProvider';
import { listLxMusicSources, listLxMusicSourceIds, isLxMusicSource } from '../../../src/services/onlineMusic/lx/lxSources';
import type { OnlineMusicProvider, ProviderPage } from '../../../src/types/onlineMusic';
import type { UnifiedSong } from '../../../src/types';

/** A song that only carries what the aggregator looks at: its id and where it came from. */
const song = (id: string, providerId: string): UnifiedSong => ({
    id,
    name: `歌${id}`,
    sourceRef: { kind: 'online', providerId, mediaId: id },
}) as unknown as UnifiedSong;

/** A provider stub: only its id and its canned page of the search are looked at. */
const sourceStub = (id: string, search?: LxSearchEach): OnlineMusicProvider => ({
    id,
    ...(search ? { search: { searchSongs: search as unknown as OnlineMusicProvider['search'] } } : {}),
}) as unknown as OnlineMusicProvider;

const page = (ids: string[], providerId: string, hasMore = false): ProviderPage<UnifiedSong> => ({
    items: ids.map(id => song(id, providerId)),
    hasMore,
    nextOffset: ids.length,
});

/** The `searchEach` of a stub whose answer is a fixed page, ignoring what it is asked for. */
const answersWith = (answer: ProviderPage<UnifiedSong>): LxSearchEach => async () => answer;

describe('interleaveSourceAnswers', () => {
    it('round-robins the sources, first song of each first', () => {
        const merged = interleaveSourceAnswers([
            { providerId: 'a', page: page(['a1', 'a2', 'a3'], 'a') },
            { providerId: 'b', page: page(['b1', 'b2'], 'b') },
            { providerId: 'c', page: page(['c1'], 'c') },
        ]);
        expect(merged.map(s => s.id)).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3']);
    });

    it('keeps each source\'s own order inside its songs', () => {
        const merged = interleaveSourceAnswers([
            { providerId: 'a', page: page(['a1', 'a2'], 'a') },
            { providerId: 'b', page: page(['b1', 'b2'], 'b') },
        ]);
        const of = (id: string) => merged.filter(s => (s.sourceRef as { providerId: string }).providerId === id).map(s => s.id);
        expect(of('a')).toEqual(['a1', 'a2']);
        expect(of('b')).toEqual(['b1', 'b2']);
    });

    it('gives an empty list for no answers', () => {
        expect(interleaveSourceAnswers([])).toEqual([]);
    });

    it('skips a source that answered nothing without holding the others up', () => {
        const merged = interleaveSourceAnswers([
            { providerId: 'a', page: page([], 'a') },
            { providerId: 'b', page: page(['b1'], 'b') },
        ]);
        expect(merged.map(s => s.id)).toEqual(['b1']);
    });
});

describe('aggregateLxSearch', () => {
    const sources = [
        sourceStub('a', answersWith(page(['a1', 'a2', 'a3', 'a4'], 'a'))),
        sourceStub('b', answersWith(page(['b1', 'b2', 'b3', 'b4'], 'b'))),
    ];

    it('fans the query out to every source and merges one page', async () => {
        const asked: string[] = [];
        const searchEach: LxSearchEach = async (provider, limit, offset) => {
            asked.push(`${provider.id}:${limit}:${offset}`);
            return answersWith(page([`${provider.id}1`, `${provider.id}2`], provider.id))(provider, limit, offset);
        };
        const result = await aggregateLxSearch({ query: '稻香', limit: 3, offset: 0, sources, searchEach });
        // Every source was asked, each for the whole span the page is cut from (offset + limit).
        expect(asked).toEqual(['a:3:0', 'b:3:0']);
        expect(result.items.map(s => s.id)).toEqual(['a1', 'b1', 'a2']);
        expect(result.hasMore).toBe(false);
        expect(result.nextOffset).toBe(3);
    });

    it('keeps each song\'s own source, so the player can route it', async () => {
        const result = await aggregateLxSearch({ query: '稻香', limit: 4, offset: 0, sources, searchEach: (provider, limit, offset) => answersWith(page([`${provider.id}1`, `${provider.id}2`], provider.id))(provider, limit, offset) });
        expect(result.items.map(s => (s.sourceRef as { providerId: string }).providerId)).toEqual(['a', 'b', 'a', 'b']);
    });

    it('cuts the asked-for page out of the merged list', async () => {
        const result = await aggregateLxSearch({
            query: '稻香',
            limit: 2,
            offset: 2,
            sources,
            searchEach: (provider, askedLimit, askedOffset) => answersWith(page([`${provider.id}1`, `${provider.id}2`, `${provider.id}3`, `${provider.id}4`], provider.id))(provider, askedLimit, askedOffset),
        });
        expect(result.items.map(s => s.id)).toEqual(['a2', 'b2']);
        expect(result.nextOffset).toBe(4);
    });

    it('says there is more while any source has more', async () => {
        const result = await aggregateLxSearch({
            query: '稻香',
            limit: 2,
            offset: 0,
            sources: [sourceStub('a', answersWith(page(['a1'], 'a', true))), sourceStub('b', answersWith(page(['b1', 'b2'], 'b')))],
            searchEach: (provider, limit, offset) => provider.search!.searchSongs('', limit, offset),
        });
        expect(result.hasMore).toBe(true);
    });

    it('takes a failed source as empty and still answers the page from the others', async () => {
        const result = await aggregateLxSearch({
            query: '稻香',
            limit: 4,
            offset: 0,
            sources: [sourceStub('a', async () => { throw new Error('boom'); }), sourceStub('b', answersWith(page(['b1', 'b2', 'b3', 'b4'], 'b')))],
            searchEach: (provider, limit, offset) => provider.search!.searchSongs('', limit, offset),
        });
        expect(result.items.map(s => s.id)).toEqual(['b1', 'b2', 'b3', 'b4']);
        expect(result.askedProviderIds).toEqual(['a', 'b']);
    });

    it('asks no source at all for an empty list or a page of nothing', async () => {
        const none = await aggregateLxSearch({ query: '稻香', limit: 5, offset: 0, sources: [], searchEach: async () => page([], 'a') });
        expect(none).toEqual({ items: [], hasMore: false, nextOffset: 0, askedProviderIds: [] });
        const zero = await aggregateLxSearch({ query: '稻香', limit: 0, offset: 0, sources, searchEach: async () => page([], 'a') });
        expect(zero.items).toEqual([]);
    });
});

describe('lxSources', () => {
    it('finds the LX-ported sources by their own lxSourceId declaration', () => {
        // The four providers ported from LX Music's musicSdk declare lxSourceId; Folia's own
        // platforms (bodian, ytm, spotify, qishui) declare none. Registered by providerRegistry
        // on import, which this test file pulls in through lxSources' own import.
        const ids = listLxMusicSourceIds();
        expect(ids).toContain('netease');
        expect(ids).toContain('kugou');
        expect(ids).toContain('qq');
        expect(ids).toContain('kuwo');
        expect(ids).not.toContain('bodian');
        expect(ids).not.toContain('ytm');
        expect(ids).not.toContain('spotify');
        expect(ids).not.toContain('qishui');
        // The aggregator itself is not a source of LX Music's protocol, so it must not be in it.
        expect(ids).not.toContain('lx');
    });

    it('answers isLxMusicSource the same way for a known source and a stranger', () => {
        expect(isLxMusicSource('netease')).toBe(true);
        expect(isLxMusicSource('lx')).toBe(false);
        expect(isLxMusicSource('some-mod-provider')).toBe(false);
    });

    it('lists every source with a search, which is what the aggregator fans out to', () => {
        for (const source of listLxMusicSources()) {
            expect(typeof source.search?.searchSongs).toBe('function');
        }
    });
});

describe('lx explore sections', () => {
    const exploreSong = (id: string): UnifiedSong => ({ id, name: `歌${id}` }) as unknown as UnifiedSong;
    const exploreSource = (id: string, opts: { shortName?: string; hasDaily?: boolean } = {}): OnlineMusicProvider => ({
        id,
        displayName: `平台${id}`,
        ...(opts.shortName ? { shortName: opts.shortName } : {}),
        ...(opts.hasDaily ? { recommendations: { getDailySongs: async () => [] } } : {}),
    }) as unknown as OnlineMusicProvider;

    it('gives one section per source that has daily recommendations, headed by its own name', async () => {
        const sources = [
            exploreSource('a', { shortName: '源甲', hasDaily: true }),
            exploreSource('b', { hasDaily: true }),
            exploreSource('c'), // no recommendations at all
        ];
        const readDaily = async (source: OnlineMusicProvider) => (source.id === 'b' ? [] : [exploreSong('1'), exploreSong('2')]);
        const sections = await buildLxExploreSections(sources, readDaily);
        expect(sections.map(s => [s.id, s.title, s.items.length])).toEqual([
            ['lx-daily-a', '源甲', 2],
        ]);
    });

    it('drops a section whose read failed, and keeps the others', async () => {
        const sources = [exploreSource('a', { hasDaily: true }), exploreSource('b', { hasDaily: true })];
        const readDaily = async (source: OnlineMusicProvider) => {
            if (source.id === 'a') throw new Error('no session');
            return [exploreSong('1')];
        };
        const sections = await buildLxExploreSections(sources, readDaily);
        expect(sections.map(s => s.id)).toEqual(['lx-daily-b']);
    });

    it('caps a section at a dozen songs', async () => {
        const sources = [exploreSource('a', { hasDaily: true })];
        const readDaily = async () => Array.from({ length: 30 }, (_, i) => exploreSong(String(i)));
        const sections = await buildLxExploreSections(sources, readDaily);
        expect(sections[0].items).toHaveLength(12);
    });
});
