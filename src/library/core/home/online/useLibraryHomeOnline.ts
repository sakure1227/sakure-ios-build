import { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocalPlaylist, LocalSong, SongResult } from '../../../../types';
import type { LibraryHomeCard, LibraryHomeResources } from '../homeModel.contract';
import { buildOnlineAlbumCards, buildOnlinePlaylistCards, buildOnlineRadioCards } from '../homeCards';
import { buildFavoritesPlaylist, buildOwnPlaylistCards, buildRecentsPlaylist } from '../ownPlaylistCards';
import { playableLocalSongsById, locallyLikedSongsOf } from '../ownPlaylistTracks.service';
import { watchLikedSongs } from '../../../../services/likedSongs';
import { recentPlaysOfManyAccounts, watchRecentPlays } from '../../../../services/recentPlays';
import { useOnlineProviderAccountStore } from '../../../../stores/useOnlineProviderAccountStore';
import { useRecentPlaysScopes } from '../useRecentPlaysScopes';
import {
    isOnlineHomeTab,
    onlineHomeTitleKey,
    resolveOnlineHomeLoading,
    resolveOnlineTabUnavailableReason,
    translateHomeMessage,
} from '../homeSources';
import { useLibraryHomeOnlineFeeds } from './useLibraryHomeOnlineFeeds';
import type { LibraryHomeSources } from '../useLibraryHomeSources';

// src/library/core/home/online/useLibraryHomeOnline.ts
// 在线页签的列表：账户歌单 / 收藏专辑 / 电台三份卡片（core/home/homeCards），当前页签的标题、加载态与
// 不可用原因。收藏专辑与电台来自宿主的首页资源（归属与读取见 useLibraryHomeOnlineFeeds）。
//
// 歌单页签还有第四份来源：本机自己的两个默认歌单（最近播放 / 我的收藏）。平台没有歌单库时
// （落雪音乐是各家源的聚合入口，没有账户也没有歌单）账户歌单是空的，而本机这两个跟平台无关——
// 它们垫在那一页上，页签才能开、墙上也有东西可点。

export type LibraryHomeOnlineList = {
    /** 当前在线页签的卡片（不在在线页签时为空）。 */
    items: LibraryHomeCard[];
    title: string;
    isLoading: boolean;
    /** 列表为空时显示的文案：页签不可用的原因，否则是「加载中」。 */
    emptyMessage: string;
};

/**
 * 本机默认歌单的数据。
 *
 * 宿主传进来的只有本地曲库那两份（歌与歌单）；「最近播放」由 core 自己读
 * （services/recentPlays.ts 记在这台机器上，按平台与账号分开）。
 */
export type LibraryHomeOwnPlaylistsInput = {
    /** 本地曲库的歌单（其中有被标喜欢的那一张）。 */
    localPlaylists: readonly LocalPlaylist[];
    /** 本地曲库的歌，用来把收藏歌单的 songIds 换成歌。 */
    localSongs: readonly LocalSong[];
};

export const useLibraryHomeOnline = (
    resources: Pick<LibraryHomeResources, 'favoriteAlbums' | 'radioFeed'>,
    sources: Pick<LibraryHomeSources, 'tab' | 'online' | 'personalFmModeLabel'>,
    ownPlaylists?: LibraryHomeOwnPlaylistsInput,
): LibraryHomeOnlineList => {
    const { t } = useTranslation();
    const { tab, online, personalFmModeLabel } = sources;
    const { favoriteAlbums, radioFeed } = useLibraryHomeOnlineFeeds({
        resources,
        tab,
        providerId: online.providerId,
        userId: online.user?.id ?? null,
        canUseAlbums: online.canUseAlbums,
        canUseRadio: online.canUseRadio,
    });

    // 本机最近放过的歌：按平台与账号分开记（那份记录本来的样子）。
    // 聚合入口（落雪音乐）放出来的歌带着真实来源的平台，所以要问它旗下那些源各一份。
    //
    // **每一家用它自己那个账户的 id 去问**：放过的歌记在「平台 + 那个平台的账户」名下，
    // 而聚合入口自己没有账户（它的账户 id 是空的）。用空的去问，问到的是「那家平台 + 空的
    // 而那一家那些歌记在「那家平台 + 那个账户的 id」底下 —— 对不上，聚合入口那页的
    // 「最近播放」于是空的（切走再切回来看着像被清空了）。
    const accountId = String(online.user?.id ?? '');
    const recentScopes = useRecentPlaysScopes(online.providerId);
    const recentSongs = useSyncExternalStore(
        watchRecentPlays,
        () => recentPlaysOfManyAccounts(
            recentScopes,
            providerId => String(useOnlineProviderAccountStore.getState().accounts[providerId]?.user?.id ?? accountId),
        ),
        // 服务端渲染时没有 localStorage：给空列表（不假装有歌）。
        () => [] as SongResult[],
    );

    const playlistCards = useMemo(() => buildOnlinePlaylistCards(online.collections, t), [online.collections, t]);
    const albumCards = useMemo(() => buildOnlineAlbumCards(favoriteAlbums.data, t), [favoriteAlbums.data, t]);
    const radioCards = useMemo(
        () => buildOnlineRadioCards(radioFeed.data, { t, personalFmModeLabel }),
        [personalFmModeLabel, radioFeed.data, t],
    );

    // 本机默认歌单：排在平台自己的歌单前面。
    //
    // 它们是"默认"的——每个平台都有，可平台的账户里未必有（落雪音乐就没有账户，
    // 也没有歌单库）。把它们放在前面，落雪那页一进来就有东西可点；别的平台则多出
    // 红星过的歌：红星一下就变，所以要订阅它（否则「我的收藏」要等下次渲染才更新）。
    const likedSongs = useSyncExternalStore(
        watchLikedSongs,
        locallyLikedSongsOf,
        () => [] as SongResult[],
    );
    // 两张本机自己的歌单（本机放过的歌、本机标喜欢的歌）。
    const ownPlaylistCards = useMemo<LibraryHomeCard[]>(() => {
        if (!ownPlaylists) return [];
        const playlists = [buildRecentsPlaylist(recentSongs)];
        // 「我的收藏」装的是本地曲库的歌（本地文件），要先变成能播的那一份；
        // 红星收下的在线歌直接就在。
        const favoritesPlaylist = ownPlaylists.localPlaylists.find(playlist => playlist.isFavorite === true);
        const songsBySongId = favoritesPlaylist
            ? playableLocalSongsById(ownPlaylists.localSongs, favoritesPlaylist.songIds)
            : new Map<string, SongResult>();
        // 「我的收藏」在两处：本机曲库标喜欢的歌 + 红星收下的歌。哪一处有就显示。
        const favorites = buildFavoritesPlaylist(
            ownPlaylists.localPlaylists,
            songsBySongId,
            likedSongs,
        );
        if (favorites) playlists.push(favorites);
        return buildOwnPlaylistCards(playlists, t);
    }, [ownPlaylists, recentSongs, likedSongs, t]);

    const onlinePlaylistCards = useMemo(
        () => [...ownPlaylistCards, ...playlistCards],
        [ownPlaylistCards, playlistCards],
    );

    const items = tab === 'playlist' ? onlinePlaylistCards : tab === 'albums' ? albumCards : tab === 'radio' ? radioCards : NO_CARDS;
    const onlineTab = isOnlineHomeTab(tab) ? tab : 'radio';
    const unavailable = resolveOnlineTabUnavailableReason(online, onlineTab);
    return {
        items,
        title: t(onlineHomeTitleKey(onlineTab)),
        isLoading: resolveOnlineHomeLoading({
            tab,
            source: online,
            favoriteAlbumsLoading: favoriteAlbums.status === 'loading',
            radioFeedLoading: radioFeed.status === 'loading',
        }),
        emptyMessage: unavailable ? translateHomeMessage(t, unavailable) : t('home.loadingLibrary'),
    };
};

const NO_CARDS: LibraryHomeCard[] = [];
