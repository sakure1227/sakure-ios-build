import type { UnifiedSong } from '../../../types';
import type { OnlineMusicProvider, OnlineProviderId, ProviderExplorePage, ProviderExploreSection } from '../../../types/onlineMusic';
import { aggregateLxSearch } from './lxAggregateSearch';

// src/services/onlineMusic/lx/lxProvider.ts
// 「落雪音乐」——把落雪音乐（LX Music）的全部音乐源当成一个平台。
//
// 它不是一个真实的平台，是落雪那些源的聚合入口：选它不需要登录（落雪的源本来就是免登录听歌的），
// 搜索一次问遍所有落雪源，结果混在一页里，每首歌自带来源。播放、歌词、封面不走这里——歌曲的
// sourceRef.providerId 是它真正的来源，omni 全链路照常路由。所以这个 provider 只声明搜索和
// 发现页：别的能力一个都没有，界面上的登录、歌单、专辑页签会自己收起来。
//
// 落雪源的清单（lxSources）问的是 provider 注册表，而注册表 import 这个文件来注册它——静态
// import 会在注册表求值到注册这一行时形成一个还填不上的环（lxProvider 还是 undefined）。
// 所以清单在执行期才取：search 和 explore 被调用时注册早已完成。构建工具拼装的顺序不保证，
// 测试里直接 import 这个文件就会撞上，不要改回静态 import。

/**
 * One source's daily-recommendation section, or null where that source could not be read (no
 * session, an interface that refuses, an empty answer). `readDaily` is injected so the merge
 * stays testable; the provider hands in the source's own read.
 */
const dailySectionOf = async (
    source: OnlineMusicProvider,
    readDaily: (source: OnlineMusicProvider) => Promise<UnifiedSong[]>,
): Promise<ProviderExploreSection | null> => {
    try {
        const songs = await readDaily(source);
        if (!songs.length) return null;
        return {
            id: `lx-daily-${source.id}`,
            title: source.shortName || source.displayName,
            items: songs.slice(0, 12).map(song => ({ kind: 'song' as const, song })),
        };
    } catch (error) {
        console.warn(`[LX] explore: ${source.id} daily recommendations unavailable`, error);
        return null;
    }
};

/**
 * The discovery page's sections: one daily-recommendation section per source that has one, in the
 * order the sources stand. A source that cannot be read costs its section alone; a source with no
 * recommendations of its own has no section. Pure over its inputs, so the rules are testable
 * without a network: which sources are asked, what a failure costs, what an empty answer costs.
 */
export const buildLxExploreSections = async (
    sources: readonly OnlineMusicProvider[],
    readDaily: (source: OnlineMusicProvider) => Promise<UnifiedSong[]>,
): Promise<ProviderExploreSection[]> => {
    const withDaily = sources.filter(source => Boolean(source.recommendations?.getDailySongs));
    const settled = await Promise.allSettled(withDaily.map(source => dailySectionOf(source, readDaily)));
    return settled
        .map(result => (result.status === 'fulfilled' ? result.value : null))
        .filter((section): section is ProviderExploreSection => section !== null);
};

export const lxProvider: OnlineMusicProvider = {
    id: 'lx',
    // 不是一个真实的平台，不参与落雪自定义源协议，所以没有 lxSourceId——也因此不会被自己聚合进去。
    displayName: '落雪音乐',
    // 选了落雪听歌，地址就先从自定义源要：落雪的用法就是这样，源给不出地址时才回到这首歌
    // 自己那个平台（兜底，别让原本能放的歌变放不了）。共用层按这个声明改顺序，不认平台。
    prefersCustomSourceAudio: true,
    shortName: '落雪',
    mark: { letter: '雪', color: '#7c6cf0' },
    getAvailability: () => ({ configured: true }),
    /**
     * 落雪是各家源的聚合入口：它放出来的歌每一首都带着**真实来源**的平台。
     * 所以「这台机器在落雪下放过什么」记在各家的名下，不在落雪名下——
     * 「最近播放」要问旗下那些源各一份（用这个名单）。
     *
     * 与 search / explore 一样用动态 import：清单在执行期才取（见文件头的说明）——
     * 静态 import 注册表会形成环（注册表 import 这个文件来注册它），那时它还没填上。
     */
    aggregatesProviderIds: async () => {
        const { listLxMusicSourceIds } = await import('./lxSources');
        return listLxMusicSourceIds();
    },
    capabilities: {
        // Everything a song needs after it is found - playing it, its lyrics, its cover - is the
        // source's own, reached through the song's sourceRef. Only the search and the discovery
        // page are here.
        search: true,
        playback: false,
        lyrics: false,
        wordByWordLyrics: false,
        auth: false,
        userLibrary: false,
        playlists: false,
        albums: false,
        artists: false,
        recommendations: false,
        mutations: false,
        explore: true,
    },

    // No raw rows of its own to normalise: every song this aggregator hands out was already
    // normalised by the source it came from. The one thing to check is that it really is a song
    // of a source - a row of anything else has nothing to do here.
    normalizeSong(raw: unknown): UnifiedSong {
        const candidate = raw as Partial<UnifiedSong>;
        if (candidate && typeof candidate === 'object' && candidate.sourceRef?.kind === 'online' && typeof candidate.id !== 'undefined') {
            return raw as UnifiedSong;
        }
        throw new Error('lx: cannot normalize a song that is not from one of the LX sources');
    },

    search: {
        async searchSongs(query: string, limit: number, offset: number) {
            const { listLxMusicSources } = await import('./lxSources');
            const sources = listLxMusicSources().filter(source => Boolean(source.search));
            const page = await aggregateLxSearch({
                query,
                limit,
                offset,
                sources,
                searchEach: (provider, askedLimit, askedOffset) => provider.search!.searchSongs(query, askedLimit, askedOffset),
            });
            return { items: page.items, hasMore: page.hasMore, nextOffset: page.nextOffset };
        },
    },

    /**
     * The discovery page: one daily-recommendation section per source that has one, headed by the
     * source's own name. A source that cannot be read (no session, an interface that refuses)
     * costs its section alone - the same rule as the aggregated search. A source with no
     * recommendations of its own has no section: the page shows what there is, not filler.
     */
    explore: {
        async getFeed(): Promise<ProviderExplorePage> {
            const { listLxMusicSources } = await import('./lxSources');
            const sources = listLxMusicSources();
            return {
                sections: await buildLxExploreSections(sources, source => source.recommendations!.getDailySongs!()),
            };
        },
    },

    /**
     * No account to sign in to: the sources are public. The sign-in window shows this platform as
     * one that needs no account (the same shape as a platform whose sources are all public), and
     * choosing it switches straight to it.
     */
    auth: {
        getLoginStatus: async () => null,
        logout: async () => {},
        getLoginTexts: () => ({ title: 'home.loginTitleLx', note: 'home.loginNoteLx' }),
    },
};

export default lxProvider;
