import { describe, expect, it } from 'vitest';

// test/unit/library/home/ownPlaylistCards.test.ts
// 本机自己的两个默认歌单：「最近播放」与「我的收藏」。
//
// 为什么有这两个：落雪音乐（各家源的聚合入口）没有账户也没有歌单库，歌单页签原本
// 整个灰掉。可这两个歌单是本机的——跟平台有没有歌单库无关——所以它们垫在那一页上，
// 页签才能开、也有东西可点。

import {
    OWN_PLAYLIST_FAVORITES_ID,
    OWN_PLAYLIST_RECENTS_ID,
    buildFavoritesPlaylist,
    buildOwnPlaylistCards,
    buildRecentsPlaylist,
    isOwnPlaylistCard,
    ownPlaylistOf,
} from '@/library/core/home/ownPlaylistCards';
import type { TFunction } from 'i18next';
import type { LocalPlaylist, LocalSong } from '@/types';

const t = ((key: string) => key) as unknown as TFunction;

const song = (id: string, name = `song-${id}`, coverUrl?: string) => ({
    id,
    name,
    artists: [],
    album: coverUrl ? { id: 0, name: '', coverUrl } : { id: 0, name: '' },
    durationMs: 1000,
} as never);

/** 本地曲库里的一首歌（「我的收藏」装的就是这些）。 */
const localSong = (id: string): LocalSong => ({
    id,
    fileName: `${id}.mp3`,
    filePath: `${id}.mp3`,
    duration: 1000,
    fileSize: 1,
    mimeType: 'audio/mpeg',
    addedAt: 1,
    title: id,
    titleOrigin: 'import',
    importedMetadata: { title: id, titleSource: 'embedded', artistNames: [] },
} as LocalSong);

const playlist = (id: string, songIds: string[], isFavorite = false): LocalPlaylist => ({
    id,
    name: `playlist-${id}`,
    songIds,
    createdAt: 0,
    updatedAt: 0,
    isFavorite,
});

describe('the two playlists the machine keeps for itself', () => {
    it('puts the songs played lately into the recents playlist', () => {
        const songs = [song('a'), song('b')];
        const built = buildRecentsPlaylist(songs);
        expect(built.source).toBe('own');
        expect(built.id).toBe(OWN_PLAYLIST_RECENTS_ID);
        expect(built.tracks).toHaveLength(2);
        expect(built.trackCount).toBe(2);
    });

    it('has a recents playlist even when nothing was played yet', () => {
        // 它是这一页的入口：空着也在，放一首歌就有内容了。
        const built = buildRecentsPlaylist([]);
        expect(built.tracks).toHaveLength(0);
        expect(built.trackCount).toBe(0);
    });

    it('puts the songs of the favourite playlist into the favourites playlist', () => {
        const built = buildFavoritesPlaylist(
            [playlist('p1', ['a', 'b'], true)],
            new Map([['a', song('a')], ['b', song('b')]]),
        );
        expect(built?.id).toBe(OWN_PLAYLIST_FAVORITES_ID);
        expect(built?.tracks).toHaveLength(2);
    });

    it('has no favourites playlist when the library has no favourite one', () => {
        // 本地曲库里没有标喜欢的歌单：没有这张歌单，不该有一张空卡。
        expect(buildFavoritesPlaylist([playlist('p1', ['a'])], new Map())).toBeNull();
        expect(buildFavoritesPlaylist([], new Map())).toBeNull();
    });

    it('does not take a playlist that is not the favourite one', () => {
        expect(buildFavoritesPlaylist([playlist('p1', ['a'])], new Map())).toBeNull();
    });

    it('keeps the favourite playlist even when it holds no song', () => {
        // 歌单在、里面还没有歌：那是用户自己的空歌单，不是没有这张歌单。
        const built = buildFavoritesPlaylist([playlist('p1', [], true)], new Map());
        expect(built).not.toBeNull();
        expect(built?.tracks).toHaveLength(0);
    });

    it('skips a song the favourite playlist names but the library no longer has', () => {
        // 歌被删了（收藏歌单里还留着它的 id）：那只放还在的歌。
        const built = buildFavoritesPlaylist([playlist('p1', ['a', 'gone'], true)], new Map([['a', song('a')]]));
        expect(built?.tracks).toHaveLength(1);
    });
});

// 歌单没有自己的封面，用最上面那首歌的：至少看起来像那几首歌，而不是一块纯色。
describe('the cover of those playlists', () => {
    it('takes the cover of the first song that has one', () => {
        const built = buildRecentsPlaylist([
            song('a', 'a', 'https://img/a.jpg'),
            song('b', 'b', 'https://img/b.jpg'),
        ]);
        expect(built.coverUrl).toBe('https://img/a.jpg');
    });

    it('skips a song without a cover and takes the next one', () => {
        const built = buildRecentsPlaylist([
            song('a', 'a'),
            song('b', 'b', 'https://img/b.jpg'),
        ]);
        expect(built.coverUrl).toBe('https://img/b.jpg');
    });

    it('has no cover when none of the songs has one', () => {
        expect(buildRecentsPlaylist([song('a')]).coverUrl).toBeUndefined();
        expect(buildRecentsPlaylist([]).coverUrl).toBeUndefined();
    });

    it('puts the songs liked with the heart into the favourites playlist too', () => {
        // 红星（心形）收下的在线歌与本机标喜欢的歌在同一页「我的收藏」里。
        const liked = song('r', 'r', 'https://img/r.jpg');
        const built = buildFavoritesPlaylist(
            [playlist('p1', ['a'], true)],
            new Map([['a', song('a')]]),
            [liked],
        );
        expect(built?.tracks.map(track => track.id)).toEqual(['r', 'a']);
    });

    it('has a favourites playlist for the liked songs alone', () => {
        // 本机曲库没有「我喜欢」歌单，但红星收过歌 —— 那这一页照样有「我的收藏」。
        const built = buildFavoritesPlaylist([], new Map(), [song('r', 'r')]);
        expect(built?.tracks.map(track => track.id)).toEqual(['r']);
    });

    it('has no favourites playlist when nothing is liked at all', () => {
        expect(buildFavoritesPlaylist([], new Map(), [])).toBeNull();
    });

    it('gives the favourites playlist the cover of its first song too', () => {
        const built = buildFavoritesPlaylist(
            [playlist('p1', ['a'], true)],
            new Map([['a', song('a', 'a', 'https://img/a.jpg')]]),
        );
        expect(built?.coverUrl).toBe('https://img/a.jpg');
    });
});

describe('the cards of those playlists', () => {
    it('names the recents one and the favourites one', () => {
        const cards = buildOwnPlaylistCards([
            buildRecentsPlaylist([song('a')]),
            { ...buildRecentsPlaylist([]), id: OWN_PLAYLIST_FAVORITES_ID, name: '' },
        ], t);
        expect(cards[0].name).toBe('home.ownPlaylistRecents');
        expect(cards[1].name).toBe('home.ownPlaylistFavorites');
    });

    it('does not show the name the library happens to store', () => {
        // 收藏歌单在曲库里存的名字是写死的英文（'Liked Songs'）——那不是给人看的名字。
        const cards = buildOwnPlaylistCards([
            { ...buildRecentsPlaylist([]), id: OWN_PLAYLIST_FAVORITES_ID, name: 'Liked Songs' },
        ], t);
        expect(cards[0].name).toBe('home.ownPlaylistFavorites');
    });

    it('carries the playlist itself so opening it needs no request', () => {
        const built = buildRecentsPlaylist([song('a')]);
        const [card] = buildOwnPlaylistCards([built], t);
        expect(card.raw).toBe(built);
        expect(ownPlaylistOf(card)?.tracks).toHaveLength(1);
    });

    it('tells the two of them apart from an ordinary playlist', () => {
        expect(isOwnPlaylistCard({ id: OWN_PLAYLIST_RECENTS_ID })).toBe(true);
        expect(isOwnPlaylistCard({ id: OWN_PLAYLIST_FAVORITES_ID })).toBe(true);
        expect(isOwnPlaylistCard({ id: 'some-online-playlist' })).toBe(false);
    });

    it('does not mistake an ordinary playlist for one of ours', () => {
        expect(ownPlaylistOf({ raw: { source: 'online', id: 'x' } })).toBeNull();
        expect(ownPlaylistOf({ raw: undefined })).toBeNull();
    });
});
