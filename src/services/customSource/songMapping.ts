// src/services/customSource/songMapping.ts
//
// Maps a Sakure song onto the song object an LX Music custom source script receives.
//
// The shape here is LX Music's *old* song shape, which is what a script actually gets: LX Music
// converts its own internal song into that shape (`toOldMusicInfo`) before handing it to a custom
// source, and the field names are flat - `musicInfo.songmid`, `musicInfo.hash`,
// `musicInfo.strMediaMid` sit at the top level, not under a `meta` object. A script written for
// LX Music reads them there, so that is what Sakure has to produce.
//
// The two models do not line up: LX Music's song carries the platform's own identifiers (an id, a
// mid, a hash, a copyright id), while Sakure's UnifiedSong carries a provider id and a media id
// under `sourceRef`. The platform's identifiers come out of the provider's own payload; the
// mapping layer reads them by name.
//
// Which LX field each platform's identifier belongs in is that platform's own business, so each
// one declares it (`lxFields` on its provider): the mapping layer names no platform and no
// platform-specific field.

import type { SongResult, UnifiedSong } from '../../types';
import type { CustomSourcePlatform } from './types';
import { getOnlineMusicProvider } from '../onlineMusic/providerRegistry';

/**
 * The LX Music source id for a song, or null when the song did not come from an online platform
 * a custom source could handle (a local file, a Navidrome stream, or a platform the LX Music
 * protocol has no id for).
 *
 * Which LX Music source a song belongs to is each platform's own declaration (`lxSourceId` on
 * its provider): this file names no platform of its own.
 */
export const getCustomSourcePlatform = (song: SongResult): CustomSourcePlatform | null => {
    if (song.sourceRef?.kind !== 'online') return null;
    const provider = getOnlineMusicProvider(song.sourceRef.providerId);
    const lxSourceId = provider?.lxSourceId;
    if (!lxSourceId) return null;
    return lxSourceId as CustomSourcePlatform;
};

/** Formats a duration in milliseconds as LX Music's "mm:ss" (or "h:mm:ss"). */
const formatInterval = (durationMs: number | undefined): string | null => {
    if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) return null;
    const totalSeconds = Math.round(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

/** Joins the artist names the way LX Music does: a comma-separated list. */
const joinArtists = (song: SongResult): string => (
    song.artists?.map(artist => artist.name).filter(Boolean).join(', ') ?? ''
);

/**
 * The song object an LX Music custom source script receives.
 *
 * This is LX Music's old (flat) song shape: the identifiers sit at the top level under the names
 * the platform uses for them, and `songmid` is the song's id on its platform.
 */
export interface LxMusicInfo {
    id: string;
    name: string;
    singer: string;
    source: string;
    interval: string | null;
    /** The song's id on its platform. LX Music's scripts read this one. */
    songmid: string;
    albumId?: string;
    albumName?: string;
    /** The platform's other identifiers, named by the platform itself. */
    [key: string]: unknown;
}

/**
 * The `info` object a custom source script receives.
 *
 * LX Music passes `{ type, musicInfo }`, and scripts read `info.musicInfo` for the song and
 * `info.type` for the quality asked for.
 */
export const buildCustomSourceRequestInfo = (
    song: UnifiedSong | SongResult,
    quality?: string,
): { type?: string; musicInfo: LxMusicInfo } | null => {
    const platform = getCustomSourcePlatform(song);
    if (!platform) return null;
    if (song.sourceRef?.kind !== 'online') return null;

    const provider = getOnlineMusicProvider(song.sourceRef.providerId);
    const providerData = song.sourceRef.providerData ?? {};
    const mediaId = String(song.sourceRef.mediaId ?? '');

    // The platform's own identifiers, under the LX field names that platform uses. A platform
    // that declares none still gets the common fields below.
    const platformFields = provider?.lxFields?.(song, providerData) ?? {};

    const musicInfo: LxMusicInfo = {
        id: mediaId,
        name: song.name ?? '',
        singer: joinArtists(song),
        source: platform,
        interval: formatInterval(song.durationMs),
        songmid: mediaId,
        ...platformFields,
    };

    // The album, where the song knows one. LX Music's scripts read `albumName` and `albumId`.
    const albumName = song.album?.name ?? '';
    if (albumName) musicInfo.albumName = albumName;
    const albumId = song.album?.id != null ? String(song.album.id) : '';
    if (albumId) musicInfo.albumId = albumId;

    // The cover, where the song knows one. LX Music's scripts read `img`.
    const coverUrl = song.album?.coverUrl ?? '';
    if (coverUrl) musicInfo.img = coverUrl;

    return quality ? { type: quality, musicInfo } : { musicInfo };
};
