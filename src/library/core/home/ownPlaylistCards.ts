import type { TFunction } from 'i18next';
import type { LocalPlaylist, SongResult } from '../../../types';
import type { OwnGridViewCollectionDescriptor } from '../collection/collection.contract';
import type { LibraryHomeCard } from './homeModel.contract';

// src/library/core/home/ownPlaylistCards.ts
// 本机自己的两个默认歌单：「最近播放」与「我的收藏」。
//
// 为什么有这两个：它们跟在线平台没有关系——「最近播放」是这台机器上放过的歌，
// 「我的收藏」是本地曲库里被标喜欢的那张歌单。有些平台没有自己的歌单库
// （落雪音乐就是：它是各家源的聚合入口，没有账户，也没有歌单），在那些平台下
// 歌单页签原本会整个灰掉、什么也点不开。可这两个歌单是本机的，平台有没有歌单
// 与它们无关——所以它们垫在那一页上，页签就能开、也有东西可点。
//
// 它们排在平台自己的歌单前面：这是"默认"的意思——每个平台都有这两个，
// 平台的账户里未必有。

/** 本机默认歌单的固定 id（不是本地曲库的歌单 id，所以不会与用户自建的歌单撞）。 */
export const OWN_PLAYLIST_RECENTS_ID = 'own-playlist-recents';
export const OWN_PLAYLIST_FAVORITES_ID = 'own-playlist-favorites';

/** 「我的收藏」在本地曲库里的那张歌单（isFavorite 的那一张）。 */
const isFavoritesPlaylist = (playlist: LocalPlaylist): boolean => playlist.isFavorite === true;

/**
 * 一个歌单的封面：最上面那首歌的封面。
 *
 * 歌单没有自己的封面（它不是平台的歌单，没有平台给的那张图），所以用第一首歌的——
 * 至少看起来像那几首歌，而不是一块纯色。
 */
export const coverOfTracks = (tracks: readonly SongResult[]): string | undefined => (
    tracks.find(track => Boolean(track.album?.coverUrl))?.album?.coverUrl
);

/**
 * 「最近播放」这个歌单：放这台机器上最近放过的歌。
 *
 * 放过的歌是按平台与账号分开的（见 services/recentPlays.ts），所以这里给的是
 * 当前平台与账号下的那些——在这个平台上听过的歌进这一个平台的那一份，在另一个
 * 平台上听过的进另一个平台的那一份。这是那份记录本来的样子：它记的是
 * 「在这个平台上放过什么」。
 */
export const buildRecentsPlaylist = (recentSongs: readonly SongResult[]): OwnGridViewCollectionDescriptor => ({
    source: 'own',
    id: OWN_PLAYLIST_RECENTS_ID,
    type: 'playlist',
    name: '',
    tracks: [...recentSongs],
    trackCount: recentSongs.length,
    coverUrl: coverOfTracks(recentSongs),
    isVirtual: true,
});

/**
 * 「我的收藏」这个歌单：本机曲库里被标喜欢的歌 + 红星（心形）收下的在线歌。
 *
 * 两份收藏各存各的（本地曲库的 isFavorite 歌单装本机文件；红星记在 services/likedSongs
 * 里，装在线歌），但用户看的是同一个「我的收藏」——所以这里把两份合起来。
 *
 * 两份都空的时候，这张卡不该出现：没有收藏就没有「收藏」这一页。
 * 只有一份有歌时也在（那就是用户收藏的全部）。
 *
 * `songsBySongId` 是本地曲库的歌（已经是能播的那一份：宿主转好的，core 不碰
 * 播放适配器——那是 services 的事，core 里的纯变换不依赖它）。收藏歌单里点名的
 * 歌不在曲库里了（被删了）就跳过。
 */
export const buildFavoritesPlaylist = (
    localPlaylists: readonly LocalPlaylist[],
    songsBySongId: ReadonlyMap<string, SongResult>,
    likedSongs: readonly SongResult[] = [],
): OwnGridViewCollectionDescriptor | null => {
    const playlist = localPlaylists.find(isFavoritesPlaylist);
    const localTracks = playlist
        ? playlist.songIds
            .map(id => songsBySongId.get(id))
            .filter((song): song is SongResult => Boolean(song))
        : [];
    // 红星收下的歌排前面（刚收的最先看到），本机标喜欢的跟在后面。
    const tracks = [...likedSongs, ...localTracks];
    if (tracks.length === 0 && !playlist) return null;
    return {
        source: 'own',
        id: OWN_PLAYLIST_FAVORITES_ID,
        type: 'playlist',
        name: playlist?.name ?? '',
        tracks,
        trackCount: tracks.length,
        coverUrl: coverOfTracks(tracks),
        isVirtual: true,
    };
};

/**
 * 本机默认歌单的卡片。
 *
 * 卡片的 raw 放的是这个歌单的集合描述（OwnGridViewCollectionDescriptor）——点它时
 * 走本机那条路：曲目就在描述里，不用请求，也不用问平台要。
 */
export const buildOwnPlaylistCards = (
    playlists: readonly OwnGridViewCollectionDescriptor[],
    t: TFunction,
): LibraryHomeCard[] => (
    playlists.map(playlist => ({
        id: playlist.id,
        // 名字用本地化的那一份：收藏歌单在曲库里存的名字是写死的英文
        // （'Liked Songs'），那不是给人看的名字。
        name: playlist.id === OWN_PLAYLIST_RECENTS_ID
            ? t('home.ownPlaylistRecents')
            : t('home.ownPlaylistFavorites'),
        type: 'playlist',
        coverUrl: playlist.coverUrl,
        description: playlist.id === OWN_PLAYLIST_RECENTS_ID
            ? t('home.ownPlaylistRecentsNote')
            : t('home.ownPlaylistFavoritesNote'),
        summary: '',
        trackCount: playlist.trackCount ?? playlist.tracks.length,
        isVirtual: true,
        raw: playlist,
    }))
);

/** 一张本机默认歌单的卡片是不是（用来决定点它时走哪条打开的路）。 */
export const isOwnPlaylistCard = (card: Pick<LibraryHomeCard, 'id'>): boolean => (
    card.id === OWN_PLAYLIST_RECENTS_ID || card.id === OWN_PLAYLIST_FAVORITES_ID
);

/** 一张卡片的 raw 是不是本机默认歌单的集合描述。 */
export const ownPlaylistOf = (card: Pick<LibraryHomeCard, 'raw'>): OwnGridViewCollectionDescriptor | null => {
    const raw = card.raw as OwnGridViewCollectionDescriptor | undefined;
    return raw && raw.source === 'own' ? raw : null;
};
