import i18n from '../i18n/config';
import type { LyricData, ReplayGainMode, SongResult } from '../types';
import type { StructuredLyric } from '../types/navidrome';
import { detectTimedLyricFormat } from './lyrics/formatDetection';
import { getLineRenderHints } from './lyrics/renderHints';
import { isLocalPlaybackSong, isNavidromePlaybackSong, isStagePlaybackSong } from './appPlaybackGuards';
import { isNativeShellRuntime } from './mobileRuntime';

export { hasRenderableLyrics } from './lyrics/validity';

// Pure helpers for playback state, debug snapshots, and lyric timing.
export const clampMediaVolume = (value: number) => Math.min(1, Math.max(0, value));

export const extractCloudLyricText = (response: any): string => {
    if (typeof response?.lrc === 'string') return response.lrc;
    if (typeof response?.data?.lrc === 'string') return response.data.lrc;
    if (typeof response?.lyric === 'string') return response.lyric;
    if (typeof response?.data?.lyric === 'string') return response.data.lyric;
    return '';
};

export const findLatestActiveLineIndex = (lines: LyricData['lines'], time: number) => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        if (!line || time < line.startTime) {
            continue;
        }
        if (time <= (line.renderHints?.renderEndTime ?? line.endTime)) {
            return index;
        }
    }
    return -1;
};

export const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getReplayGainModeLabel = (mode: ReplayGainMode): string => i18n.t(`replayGain.${mode}`);

export const getAudioSrcKind = (audioSrc: string | null): 'empty' | 'blob' | 'http' | 'other' => {
    if (!audioSrc) {
        return 'empty';
    }

    if (audioSrc.startsWith('blob:')) {
        return 'blob';
    }

    if (audioSrc.startsWith('http://') || audioSrc.startsWith('https://')) {
        return 'http';
    }

    return 'other';
};

/**
 * 把音频地址升级成 https —— 只在**手机版**上做。
 *
 * 为什么：手机版的页面是 `https://localhost`（Capacitor 的 androidScheme），而各家平台
 * 的音乐 CDN 给的地址常常是 `http://`。WebView 会把「https 页面里加载 http 资源」当作
 * 混合内容**拦掉**，`<audio>` 于是报 `MEDIA_ELEMENT_ERROR: Format error`（code 4）——
 * 症状是「歌放不了」，而且**只有一部分歌放不了**（地址是 https 的能放，http 的不能）。
 *
 * 实测（2026-10-27 真机）：同一个地址，http 报 code 4，https 正常播放。
 *
 * 桌面版不需要：Electron 里页面是 `file://`，没有混合内容这回事。
 *
 * 怎么升级：这些 CDN 都同时提供 https（同一路径换协议即可），所以直接把 http 换成
 * https 就行。
 *
 * 换协议后地址若取不到，播放器会照常报「放不了」——那是地址本身失效，不是这里的事。
 */
const toHttpsAudioUrl = (url: string): string => {
    if (!url.startsWith('http://')) return url;
    return url.replace(/^http:\/\//i, 'https://');
};

export const toSafeRemoteUrl = (url: string | null | undefined): string | null | undefined => {
    if (!url) {
        return url;
    }

    const normalizedUrl = url.split(/,\s*(?=https?:\/\/)/i)[0]?.trim() || url;

    // 手机版：这里的地址最终会交给 `<audio>`，而页面是 https —— 一律升级成 https。
    //
    // **放在这里而不是只放在取址的那一处**，是因为地址会从好几条路来：
    // - 现取（`toPlayableAudioUrl`）；
    // - 预取缓存里存的（`getPrefetchedData` → `toSafePlaybackUrl` → 这里）；
    // - 恢复播放时从会话里取的。
    // 早前只升级了第一条路，于是「预取过的歌」拿到的还是 http 地址，照样播不了 ——
    // 症状是「有的歌能放有的不能」，而且与「放不放得动」无关，只与「这歌是不是被预取过」有关。
    // 归一化只有一处，所有路都过它，才不会有漏网的。
    if (isNativeShellRuntime()) {
        return toHttpsAudioUrl(normalizedUrl);
    }

    if (normalizedUrl.startsWith('http:') && normalizedUrl.includes('music.126.net')) {
        return normalizedUrl.replace('http:', 'https:');
    }

    try {
        const parsedUrl = new URL(normalizedUrl);
        if (
            parsedUrl.protocol === 'http:' &&
            parsedUrl.hostname.startsWith('fs.') &&
            parsedUrl.hostname.endsWith('.kugou.com')
        ) {
            return normalizedUrl.replace(/^http:/, 'https:');
        }
    } catch {
        return normalizedUrl;
    }

    return normalizedUrl;
};

/**
 * Keeps KuGou's original HTTP media URL only in Electron; Web/PWA retains HTTPS normalization.
 *
 * 手机版**不算 Electron**：它的页面是 `https://localhost`，保留 http 地址就会撞上
 * 混合内容（被 WebView 拦掉，音频报 code 4）。所以手机版走「不是 Electron」那条路，
 * 一切都归一化成 https。
 */
export const toSafePlaybackUrl = (
    url: string | null | undefined,
    isElectron = typeof window !== 'undefined' && Boolean(window.electron) && !isNativeShellRuntime()
): string | null | undefined => {
    if (!url || !isElectron) {
        return toSafeRemoteUrl(url);
    }

    const normalizedUrl = url.split(/,\s*(?=https?:\/\/)/i)[0]?.trim() || url;
    try {
        const parsedUrl = new URL(normalizedUrl);
        if (
            parsedUrl.protocol === 'http:' &&
            parsedUrl.hostname.startsWith('fs.') &&
            parsedUrl.hostname.endsWith('.kugou.com')
        ) {
            return normalizedUrl;
        }
    } catch {
        return normalizedUrl;
    }

    return toSafeRemoteUrl(normalizedUrl);
};

// toSafePlaybackUrl only normalizes (http→https, drops trailing fallback URLs) and never filters the scheme;
// script schemes and blank strings are not audio sources. Shared by the loader and the prefetch resolver.
const NON_MEDIA_URL_SCHEME = /^\s*(javascript|vbscript):/i;

export const toPlayableAudioUrl = (rawUrl: string | null | undefined): string | null => {
    const url = toSafePlaybackUrl(rawUrl);
    if (!url || !url.trim() || NON_MEDIA_URL_SCHEME.test(url)) return null;
    return url;
};

export const resolveDebugSongSource = (song: SongResult | null): 'none' | 'local' | 'navidrome' | 'online' => {
    if (isStagePlaybackSong(song)) {
        return 'online';
    }

    if (isLocalPlaybackSong(song)) {
        return 'local';
    }

    if (isNavidromePlaybackSong(song)) {
        return 'navidrome';
    }

    return song ? 'online' : 'none';
};

export const resolveDebugLyricsSource = (
    song: SongResult | null,
    lyrics: LyricData | null
): 'none' | 'local' | 'embedded' | 'online' | 'navi' => {
    if (isStagePlaybackSong(song)) {
        return lyrics ? 'local' : 'none';
    }

    if (isLocalPlaybackSong(song)) {
        return lyrics ? 'online' : 'none';
    }

    if (isNavidromePlaybackSong(song)) {
        const navidromeSong = song as NavidromeSongLike;
        if (navidromeSong.lyricsSource) {
            return navidromeSong.lyricsSource;
        }
        if (navidromeSong.matchedLyrics) {
            return 'online';
        }
        const hasStructuredLyrics = Array.isArray(navidromeSong.cachedStructuredLyrics)
            ? navidromeSong.cachedStructuredLyrics.length > 0
            : Boolean(navidromeSong.cachedStructuredLyrics?.line.length || navidromeSong.cachedStructuredLyrics?.cueLine?.length);
        if (lyrics || hasStructuredLyrics || navidromeSong.cachedPlainLyrics?.trim()) {
            return 'navi';
        }
        return 'none';
    }

    if (song && lyrics) {
        return 'online';
    }

    return 'none';
};

type NavidromeSongLike = SongResult & {
    lyricsSource?: 'navi' | 'online';
    matchedLyrics?: LyricData;
    cachedStructuredLyrics?: StructuredLyric | StructuredLyric[] | StructuredLyric['line'];
    cachedPlainLyrics?: string;
};

export const hasEnhancedStructuredLines = (item: StructuredLyric): boolean => {
    return item.cueLine?.some(cueLine => cueLine.cue?.some(cue => typeof cue.start === 'number'))
        || item.line?.some(line => detectTimedLyricFormat(line.value) === 'enhanced-lrc')
        || false;
};

export const toDebugLineSnapshot = (line: LyricData['lines'][number] | null) => {
    if (!line) {
        return null;
    }

    const renderHints = getLineRenderHints(line);
    return {
        text: line.fullText || null,
        translation: line.translation ?? null,
        wordCount: line.words.length,
        startTime: line.startTime,
        endTime: line.endTime,
        renderEndTime: renderHints?.renderEndTime ?? null,
        rawDuration: renderHints?.rawDuration ?? Math.max(line.endTime - line.startTime, 0),
        timingClass: renderHints?.timingClass ?? null,
        lineTransitionMode: renderHints?.lineTransitionMode ?? null,
        wordRevealMode: renderHints?.wordRevealMode ?? null,
    };
};
