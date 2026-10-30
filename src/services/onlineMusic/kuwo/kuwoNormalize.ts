import type { Artist, UnifiedSong } from '../../../types';
import type { JsonValue } from '../../../types/onlineMusic';
import { OnlineProviderError } from '../../../types/onlineMusic';

// src/services/onlineMusic/kuwo/kuwoNormalize.ts
// Maps Kuwo's (酷我) answers onto Sakure's song model.
//
// The request shapes and the field names are ported from LX Music's musicSdk (Apache-2.0);
// the mapping onto UnifiedSong is Sakure's own.

export type KuwoRecord = Record<string, any>;

export const kuwoRecord = (value: unknown): KuwoRecord => (
    value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const text = (value: unknown) => value == null ? '' : String(value);

/** Kuwo's cover addresses are plain http; the app prefers https where the host allows it. */
const cover = (value: unknown) => text(value).replace(/^http:\/\//, 'https://');

const ref = (kind: 'album' | 'artist', id: unknown) => (
    id ? { providerId: 'kuwo' as const, kind, id: text(id) } : undefined
);

/**
 * Kuwo writes several artists into one string, separated by `&`; LX Music shows them with `、`.
 */
const splitArtists = (raw: unknown): string[] => (
    text(raw).split(/&/).map(name => name.trim()).filter(Boolean)
);

const artistsOf = (item: KuwoRecord): Artist[] => (
    splitArtists(item.artist ?? item.artists).map(name => ({
        id: name,
        name,
    }))
);

/** Kuwo's cover address for an album, from the album id. */
const coverOf = (albumId: unknown): string => {
    const id = text(albumId);
    return id ? cover(`http://img.kwcdn.cn/data/album/${albumId}.jpg`) : '';
};

/**
 * One song of a Kuwo search answer.
 *
 * `musicrid` is the id Kuwo's own API uses; `rid` is the numeric one its lyric endpoint takes.
 */
export const normalizeKuwoSong = (raw: unknown): UnifiedSong => {
    const item = kuwoRecord(raw);
    const musicRid = text(item.musicrid ?? item.MUSICRID ?? item.id).replace(/^MUSIC_/, '');
    if (!musicRid) {
        throw new OnlineProviderError('invalid-response', 'Kuwo song has no id', 'kuwo');
    }
    const albumId = text(item.albumid ?? item.ALBUMID);
    const data: Record<string, JsonValue> = {
        musicRid,
        rid: text(item.rid ?? item.RID),
    };
    return {
        id: musicRid,
        name: text(item.name ?? item.SONGNAME),
        artists: artistsOf(item),
        album: {
            id: albumId,
            name: text(item.album ?? item.ALBUM),
            coverUrl: coverOf(item.albumid ?? item.ALBUMID),
            catalogRef: ref('album', albumId),
        },
        durationMs: Math.max(0, Number(item.duration ?? item.DURATION) || 0) * 1000,
        sourceRef: {
            kind: 'online',
            providerId: 'kuwo',
            mediaId: musicRid,
            providerData: data,
        },
    };
};

/** The id of a song, the way Kuwo's own endpoints take it. */
export const kuwoMusicRid = (song: { sourceRef?: { kind: string; mediaId?: string; providerData?: Record<string, unknown> } }): string => {
    const fromData = song.sourceRef?.providerData?.musicRid;
    if (typeof fromData === 'string' && fromData) return fromData;
    return song.sourceRef?.kind === 'online' ? text(song.sourceRef.mediaId) : '';
};

/** The numeric rid of a song, which Kuwo's lyric endpoint takes. */
export const kuwoRid = (song: { sourceRef?: { kind: string; providerData?: Record<string, unknown> } }): string => {
    const fromData = song.sourceRef?.providerData?.rid;
    return typeof fromData === 'string' ? fromData : '';
};
