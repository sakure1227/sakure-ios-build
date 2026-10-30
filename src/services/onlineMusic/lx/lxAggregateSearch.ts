import type { UnifiedSong } from '../../../types';
import type { OnlineMusicProvider, ProviderPage } from '../../../types/onlineMusic';

// src/services/onlineMusic/lx/lxAggregateSearch.ts
// 落雪聚合搜索：一次关键词，同时问遍每一个落雪音乐源，把各家的答案交错合成一页。
//
// 和落雪原版的行为对齐：每家源各自搜索（各自的匹配度排序原样保留），结果按「第一家的第 1 首、
// 第二家的第 1 首……然后是第一家的第 2 首」这样轮询交错，一页里来源是混着的，每首歌自带来源
// （歌曲的 sourceRef.providerId，界面上的来源徽标读它）。同一首歌在多家都有时就出现多行——这是
// 有意的：一家没有免费地址的歌，另一家可能有，听的人自己选来源。
//
// 一家搜失败不影响其他家：它的那一份就是空的，这一页照出。分页是在合并后的列表上切的，所以翻到
// 第 N 页时每家要重新要前 (offset + limit) 条——和落雪原版一样，搜索是轻的，不值得为它建缓存。

/** One source's answer to the search, kept apart so a failure is only that source's. */
export interface LxSearchSourceAnswer {
    providerId: string;
    page: ProviderPage<UnifiedSong>;
}

/** Asks one provider for its page of the search. Injected so the merge itself stays testable. */
export type LxSearchEach = (provider: OnlineMusicProvider, limit: number, offset: number) => Promise<ProviderPage<UnifiedSong>>;

export interface LxAggregateSearchInput {
    query: string;
    limit: number;
    offset: number;
    /** The providers to fan out to, in the order they are interleaved in. */
    sources: readonly OnlineMusicProvider[];
    searchEach: LxSearchEach;
}

export interface LxAggregateSearchResult {
    items: UnifiedSong[];
    hasMore: boolean;
    nextOffset: number;
    /** The sources that were asked, in the order they were asked; a failed one is still listed. */
    askedProviderIds: string[];
}

/**
 * Interleaves the sources' answers, round by round: the first song of each source, then the second
 * song of each source, and so on. A source that ran out simply drops out of later rounds. The order
 * inside one source's own list is its order - usually how well the song matched.
 */
export const interleaveSourceAnswers = (answers: readonly LxSearchSourceAnswer[]): UnifiedSong[] => {
    const lists = answers.map(answer => answer.page.items);
    const merged: UnifiedSong[] = [];
    for (let round = 0; ; round += 1) {
        let any = false;
        for (const items of lists) {
            const song = items[round];
            if (song === undefined) continue;
            any = true;
            merged.push(song);
        }
        if (!any) break;
    }
    return merged;
};

/**
 * Fans the query out to every source, merges the answers and cuts the asked-for page out of the
 * merged list. Each source is asked for `offset + limit` songs: the page starts at `offset` in the
 * merged list, and a source that answered fewer than that cannot fill it, the others make up for it.
 */
export const aggregateLxSearch = async (input: LxAggregateSearchInput): Promise<LxAggregateSearchResult> => {
    const { query, limit, offset, sources, searchEach } = input;
    if (sources.length === 0 || limit <= 0) {
        return { items: [], hasMore: false, nextOffset: offset, askedProviderIds: [] };
    }
    // Every source is asked for the whole span the page is cut from, not just the page: the merged
    // list interleaves them, so the songs of the page can come from any source's head.
    const perSource = offset + limit;
    const settled = await Promise.allSettled(sources.map(provider => searchEach(provider, perSource, 0)));
    const answers: LxSearchSourceAnswer[] = settled.map((result, index) => ({
        providerId: sources[index].id,
        page: result.status === 'fulfilled' ? result.value : { items: [], hasMore: false, nextOffset: 0 },
    }));
    const merged = interleaveSourceAnswers(answers);
    return {
        items: merged.slice(offset, offset + limit),
        // Any source that says it has more means the merged list has more beyond this page: a
        // source that answered fewer than it was asked for can still have a next page, and the
        // next page re-asks every source for the whole span anyway.
        hasMore: answers.some(answer => answer.page.hasMore),
        nextOffset: offset + Math.min(limit, Math.max(merged.length - offset, 0)),
        askedProviderIds: answers.map(answer => answer.providerId),
    };
};
