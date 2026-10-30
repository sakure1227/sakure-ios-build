import type { OnlineMusicProvider, ProviderLyricsResult } from '../../../types/onlineMusic';
import type { UnifiedSong } from '../../../types';
import { parseLyricsByFormat } from '../../../utils/lyrics/parserCore';
import { isPureMusicLyricText } from '../../../utils/lyrics/pureMusic';
import {
    describeKuwoFailure,
    fetchKuwoLyricText,
    getKuwoAvailability,
    getKuwoPlayInfo,
    searchKuwo,
    searchKuwoLyric,
} from './kuwoTransport';
import { kuwoMusicRid, normalizeKuwoSong, kuwoRid } from './kuwoNormalize';

// src/services/onlineMusic/kuwo/kuwoProvider.ts
// The Kuwo (酷我) platform.
//
// The platform needs no account: everything it offers is public. The request shapes are ported
// from LX Music's musicSdk (Apache-2.0), where Kuwo support lives.

/** Kuwo's address fields, in the order the quality levels prefer them. */
const ADDRESS_BY_QUALITY: ReadonlyArray<{ quality: 'standard' | 'high' | 'lossless' | 'hires'; field: string }> = [
    { quality: 'hires', field: 'ape' },
    { quality: 'lossless', field: 'flac' },
    { quality: 'high', field: 'mp3' },
    { quality: 'standard', field: 'aac' },
];

/** The lyrics of one song, parsed. */
const parseKuwoLyrics = (mainText: string, wordByWordText: string | null): ProviderLyricsResult => {
    const lyrics = parseLyricsByFormat('lrc', mainText);
    return {
        lyrics: lyrics.lines.length ? lyrics : null,
        mainText: mainText || null,
        wordByWordText: wordByWordText ?? undefined,
        isPureMusic: isPureMusicLyricText(mainText),
    };
};

export const kuwoProvider: OnlineMusicProvider = {
    id: 'kuwo',
    // 洛雪自定义源协议里这个平台的源标识
    lxSourceId: 'kw',
    // 洛雪的自定义源脚本读的是旧版扁平结构：酷我的歌靠 musicrid 认，歌词接口要数字的 rid。
    lxFields(_song, providerData) {
        const musicRid = providerData.musicRid;
        const rid = providerData.rid;
        return {
            songmid: musicRid == null ? '' : String(musicRid),
            ...(rid == null ? {} : { rid: String(rid) }),
        };
    },
    displayName: '酷我音乐',
    shortName: '酷我',
    mark: { letter: '酷', color: '#2f7fe4' },
    getAvailability: getKuwoAvailability,
    describeFailure: describeKuwoFailure,
    capabilities: {
        search: true,
        playback: true,
        lyrics: true,
        wordByWordLyrics: false,
        auth: false,
        userLibrary: false,
        playlists: false,
        albums: false,
        artists: false,
        recommendations: false,
        mutations: false,
    },
    normalizeSong: normalizeKuwoSong,
    getSongPageUrl: song => `https://www.kuwo.cn/play_detail/${kuwoMusicRid(song)}`,

    search: {
        async searchSongs(query, limit, offset) {
            if (!query.trim()) return { items: [], hasMore: false, nextOffset: offset };
            const data = await searchKuwo(query, limit, offset);
            const raw = data?.list ?? [];
            const items: UnifiedSong[] = [];
            for (const entry of raw) {
                try {
                    items.push(normalizeKuwoSong(entry));
                } catch {
                    // A row without an id is not a song; the rest of the page still is.
                }
            }
            const total = Number(data?.total ?? 0);
            const nextOffset = offset + items.length;
            return {
                items,
                hasMore: nextOffset < total,
                nextOffset,
            };
        },
    },

    playback: {
        async getSongDetail() {
            // Kuwo's own API has no "song by id" endpoint; the search is the way back to a song.
            return null;
        },
        async getAudioSource(song, quality) {
            const musicRid = kuwoMusicRid(song);
            if (!musicRid) return null;
            const info = await getKuwoPlayInfo(musicRid);
            if (!info) return null;

            // The level asked for, and the ones below it, are taken in turn: a song may have no
            // lossless file, and a lower one still plays.
            const wanted: Array<'standard' | 'high' | 'lossless' | 'hires'> =
                quality === 'hires' ? ['hires', 'lossless', 'high', 'standard']
                    : quality === 'lossless' ? ['lossless', 'high', 'standard']
                        : quality === 'high' ? ['high', 'standard']
                            : ['standard'];
            for (const level of wanted) {
                const entry = ADDRESS_BY_QUALITY.find(item => item.quality === level);
                if (!entry) continue;
                const url = (info as Record<string, unknown>)[entry.field];
                if (typeof url !== 'string' || !url) continue;
                return {
                    url,
                    fetchedAt: Date.now(),
                    quality: level,
                };
            }
            return null;
        },
    },

    lyrics: {
        async getLyrics(song): Promise<ProviderLyricsResult> {
            const rid = kuwoRid(song);
            const musicRid = kuwoMusicRid(song);
            if (!rid && !musicRid) {
                return { lyrics: null, isPureMusic: false };
            }
            const data = await searchKuwoLyric(rid || musicRid);
            const lyricUrl = data?.lrc || data?.lyric || '';
            if (!lyricUrl) {
                return { lyrics: null, isPureMusic: false };
            }
            const mainText = await fetchKuwoLyricText(lyricUrl);
            if (!mainText) {
                return { lyrics: null, isPureMusic: false };
            }
            // Kuwo's lrclyric is the word-by-word file; it is a different format, so it is left
            // to the parser below rather than claimed here.
            const wordByWordText = data?.lrclyric && data.lrclyric !== lyricUrl
                ? await fetchKuwoLyricText(data.lrclyric)
                : null;
            return parseKuwoLyrics(mainText, wordByWordText);
        },
    },

    /**
     * Kuwo has no accounts: everything it offers is public. The sign-in window therefore finds
     * this platform signed in from the start, and signing out changes nothing.
     */
    auth: {
        getLoginStatus: async () => null,
        logout: async () => {},
        getLoginTexts: () => ({ title: 'home.loginTitleKuwo', note: 'home.loginNoteKuwo' }),
    },
};

export default kuwoProvider;
