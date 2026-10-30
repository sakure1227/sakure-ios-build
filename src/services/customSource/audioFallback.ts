// src/services/customSource/audioFallback.ts
//
// A custom source as a fallback for the playback address.
//
// The order is deliberate: the built-in provider answers first, and a custom source is only asked
// when the provider gave nothing. That is how LX Music works too - a custom source supplements a
// platform that cannot hand out an address on its own (a track that needs a different key, a
// region-locked one, a VIP one). A source that could answer everything would make the built-in
// providers pointless, and the protocol was never meant for that.
//
// The address a source hands back is a plain URL, so it says nothing about the quality it is. It
// is treated as the level that was asked for, which is the closest true thing available.
//
// The answer also says *why* there is no address. "No source installed" and "the sources were
// asked and could not deliver" are different facts, and the user acts on them differently: the
// first needs no action, the second means the source is broken and should be fixed or replaced.
// Collapsing both into a null URL would leave the user with a silent fallback and no idea why.

import type { AudioQualityPreference } from '../../types/onlineMusic';
import type { SongResult } from '../../types';
import { buildCustomSourceRequestInfo } from './songMapping';
import { requestFromCustomSources } from './customSourceService';
import type { CustomSourceMissReason } from './types';

/**
 * The LX Music quality name for a Sakure quality level.
 *
 * LX Music names its levels 128k / 320k / flac / flac24bit; Sakure names them standard / high /
 * lossless / hires. The mapping is the one LX Music itself uses when it asks a source.
 */
export const toLxQuality = (quality: AudioQualityPreference): string => {
    switch (quality) {
        case 'standard':
            return '128k';
        case 'high':
            return '320k';
        case 'lossless':
            return 'flac';
        case 'hires':
            return 'flac24bit';
        case 'ultra':
            // Sakure's 'ultra' sits between high and lossless; LX Music has no name for it, so
            // 320k is the closest one a source can be asked for.
            return '320k';
        default:
            return '128k';
    }
};

/**
 * What asking the custom sources for a playback address came to.
 *
 * `url` is the address, when there is one. `reason` says why there is not - null when there is an
 * address, and the reason when there is not.
 */
export interface CustomSourceAudioAnswer {
    url: string | null;
    reason: CustomSourceMissReason | null;
    /** Which source gave the address, when one did. */
    sourceId: string | null;
}

/**
 * Asks the custom sources for a playback address.
 *
 * Returns null for the URL when no source could answer, which leaves the caller with what the
 * built-in provider said. The reason travels alongside so the caller can tell the user what
 * happened - see `CustomSourceAudioAnswer`.
 */
export const resolveCustomSourceAudio = async (
    song: SongResult,
    quality: AudioQualityPreference,
): Promise<CustomSourceAudioAnswer> => {
    const lxQuality = toLxQuality(quality);
    const info = buildCustomSourceRequestInfo(song, lxQuality);
    // 这首歌本来就不属于落雪协议能处理的平台（本地文件、Navidrome、协议里没有 id 的平台）：
    // 源根本没被问过，不该算作「源没答出地址」。
    if (!info) return { url: null, reason: null, sourceId: null };

    try {
        const answer = await requestFromCustomSources('musicUrl', info as unknown as Record<string, unknown>);
        if (!answer) return { url: null, reason: 'no-source', sourceId: null };
        const result = answer.result;
        if (!result || result.action !== 'musicUrl') {
            return { url: null, reason: answer.reason ?? 'no-answer', sourceId: null };
        }
        const url = result.data?.url;
        if (typeof url !== 'string' || !/^https?:/.test(url)) {
            return { url: null, reason: 'no-answer', sourceId: null };
        }
        return { url, reason: null, sourceId: answer.sourceId };
    } catch {
        return { url: null, reason: 'no-answer', sourceId: null };
    }
};

/**
 * Asks the custom sources for a playback address, keeping only the URL.
 *
 * The plain "URL or null" shape, for the callers that only care whether there is an address.
 */
export const resolveCustomSourceAudioUrl = async (
    song: SongResult,
    quality: AudioQualityPreference,
): Promise<string | null> => (await resolveCustomSourceAudio(song, quality)).url;
