import { OnlineProviderError } from '../../../types/onlineMusic';
import type { ProviderErrorCode } from '../../../types/onlineMusic';

// src/services/onlineMusic/kuwo/kuwoTransport.ts
// The HTTP boundary of the Kuwo (酷我) platform.
//
// The platform has no account system to speak of: everything it offers is public and needs no
// sign-in. The requests therefore go straight out from the renderer, the way LX Music's own
// musicSdk does it. The request shapes are ported from LX Music (Apache-2.0).

const SEARCH_ENDPOINT = 'http://search.kuwo.cn/r.s';
const PLAY_URL_ENDPOINT = 'http://www.kuwo.cn/api/www/play/playMusicInfo';
const LYRIC_ENDPOINT = 'http://m.kuwo.cn/api/service/search';

const REQUEST_TIMEOUT = 15000;

/** One HTTP request out of the renderer. */
const request = async (url: string, init?: RequestInit): Promise<Response> => {
    try {
        return await fetch(url, {
            ...init,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
            credentials: 'omit',
        });
    } catch (error) {
        throw new OnlineProviderError('network', `Kuwo request failed: ${error instanceof Error ? error.message : String(error)}`, 'kuwo');
    }
};

/** One row of a Kuwo search answer. */
export interface KuwoSearchItem {
    musicrid?: number | string;
    dcMusicrid?: number | string;
    name?: string;
    artist?: string;
    album?: string;
    albumid?: number | string;
    duration?: number;
    rid?: number | string;
}

/** What a Kuwo search answers. */
export interface KuwoSearchData {
    total?: number;
    hasMore?: boolean;
    list?: KuwoSearchItem[];
}

/** The search endpoint's answer, before it is read as a search result. */
interface KuwoSearchBody {
    code?: number;
    status?: number;
    msg?: string;
    data?: KuwoSearchData;
}

/** Searches Kuwo for songs. */
export const searchKuwo = async (query: string, limit: number, offset: number): Promise<KuwoSearchData | undefined> => {
    const params = new URLSearchParams({
        all: query,
        pn: String(Math.floor(offset / Math.max(1, limit)) + 1),
        rn: String(limit),
        uid: '794762570',
        ver: 'kwplayer_ar_9.2.2.1',
        vipver: '1',
        show_copyright_off: '1',
        newver: '1',
        ft: 'music',
        cluster: '0',
        strategy: '2012',
        encoding: 'utf8',
        rformat: 'json',
        vermerge: '1',
        mobi: '1',
        issubtitle: '1',
    });
    const response = await request(`${SEARCH_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
        throw new OnlineProviderError('network', `Kuwo search failed with ${response.status}`, 'kuwo', undefined, response.status);
    }
    const body = await response.json() as KuwoSearchBody;
    if (body.code !== 200 && body.status !== 200) {
        throw new OnlineProviderError('not-playable', body.msg || 'Kuwo search failed', 'kuwo');
    }
    return body.data;
};

/** The play-address endpoint's answer, as far as the fields used here. */
export interface KuwoPlayInfo {
    musicid?: string;
    rid?: string;
    mid?: string;
    format?: string;
    timelength?: number;
    mp3?: string;
    flac?: string;
    m4a?: string;
    wav?: string;
    aac?: string;
    ape?: string;
}

/** The play endpoint's answer, before it is read as an address. */
interface KuwoPlayBody {
    code?: number;
    success?: boolean;
    data?: KuwoPlayInfo;
}

/** Asks Kuwo for the address of one song. */
export const getKuwoPlayInfo = async (musicRid: string): Promise<KuwoPlayInfo | undefined> => {
    const params = new URLSearchParams({
        rid: `MUSIC_${musicRid}`,
        format: 'mp3|flac|aac|m4a|ape|wav',
        br: '1024ku',
        f: 'json',
    });
    const response = await request(`${PLAY_URL_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
        throw new OnlineProviderError('network', `Kuwo play request failed with ${response.status}`, 'kuwo', undefined, response.status);
    }
    const body = await response.json() as KuwoPlayBody;
    if (body.code !== 200 && body.success !== true) {
        throw new OnlineProviderError('not-playable', 'Kuwo gave no address for this song', 'kuwo');
    }
    return body.data;
};

/** The lyric endpoint's answer: where the lyric files are. */
export interface KuwoLyricInfo {
    lrc?: string;
    lrclyric?: string;
    lyric?: string;
}

/** The lyric endpoint's answer, before it is read. */
interface KuwoLyricBody {
    code?: number;
    success?: boolean;
    data?: KuwoLyricInfo;
}

/** Asks Kuwo where the lyrics of one song are. */
export const searchKuwoLyric = async (musicRid: string): Promise<KuwoLyricInfo | undefined> => {
    const params = new URLSearchParams({
        corpus: '1',
        key: 'all',
        duration: '300',
        musicId: `MUSIC_${musicRid}`,
        pc: '1',
    });
    const response = await request(`${LYRIC_ENDPOINT}?${params.toString()}`);
    if (!response.ok) return undefined;
    const body = await response.json() as KuwoLyricBody;
    if (body.code !== 200 && body.success !== true) return undefined;
    return body.data;
};

/** Reads the lyric file itself. */
export const fetchKuwoLyricText = async (url: string): Promise<string> => {
    if (!/^https?:\/\//.test(url)) return '';
    const response = await request(url);
    if (!response.ok) return '';
    return response.text();
};

/** Whether the platform can be reached from here at all. */
export const getKuwoAvailability = () => (
    typeof fetch === 'function'
        ? { configured: true } as const
        : { configured: false, reason: 'runtime-unavailable' } as const
);

/** What a failure of this platform means to the listener. */
export const describeKuwoFailure = (_operation: string, error: unknown) => {
    const code: ProviderErrorCode = error instanceof OnlineProviderError ? error.code : 'network';
    if (code === 'network') {
        return { case: 'unreachable' as const };
    }
    if (code === 'not-playable') {
        return { case: 'no-audio' as const };
    }
    return null;
};
