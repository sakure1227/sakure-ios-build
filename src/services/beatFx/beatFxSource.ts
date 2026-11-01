import type { SongResult } from '../../types';
import { mergeBeatFxEvents, type BeatFxEvent } from './clock';
import { getTrackBeatAccents, getTrackBeatGrid } from '../analysis/beatGrid';
import { getDrumHits, loadStoredDrumHits, loadTrackDrumHits, setWantedDrumTrack } from '../analysis/drumHits';
import { BEAT_THIS_SAMPLE_RATE, canRunBeatThis } from '../analysis/beatThis';
import { decodeAtRate, readLocalTrackBytes, toMidSide } from '../analysis/trackAudio';
import { decodeTrackAtRate, loadTrackBytes, type TrackBytesSource } from '../analysis/trackBytes';
import { whyNotTheSong } from '../wholeSongCheck';
import { getPlaybackAnalysisTarget } from '../playbackRecovery/representationRegistry';
import { isCacheableAudioResponse } from '../playbackRecovery/mediaCacheGuard';
import { getPrefetchedData, isUrlValid } from '../prefetchService';
import { getPlaybackSourceRef } from '../../utils/appPlaybackGuards';
import { beatGridFingerprintForSong } from '../sync/beatGridSync';
import { pullRemoteBeatGridsToLocal } from '../sync/beatGridRepository';
import { visualizerWantsBeats } from '../../components/visualizer/beatClockTargets';
import { useVisualizerSettingsStore } from '../../stores/useVisualizerSettingsStore';
import type { PlaybackRepresentation } from '../../types/playbackRecovery';

// src/services/beatFx/beatFxSource.ts
// Where the beat FX get the playing track's beat list from.
//
// analysis/beatGrid.ts answers it: the list stored for this track by an earlier play, or the run of
// it already in flight, or a run now on the track's own bytes. The model is Beat This!'s final0,
// packaged with the app, and the list is automix's too: whichever of the two reaches a track first
// runs it, and the other reads the list.
//
// The bytes are what is already on this machine (analysis/trackAudio.ts): the playback
// representation, the media cache, the local file. An online track is only cached once played to the
// end, so one not cached yet is read once more from the stream URL its playback resolved (the
// prefetch entry for that very song, never another's): its beats arrive a few seconds into its first
// play instead of on its second (the user chose this over waiting, 2026-10-17). Only analysed, not
// cached: the media cache keeps its own rule of fully played tracks. Before playback has resolved
// that URL there are no bytes yet, and `retry` says so. A stream that is not the whole song (a
// preview clip, wholeSongCheck.ts) is not analysed: its beats would be stored as the song's.
//
// The bytes are read once for the beats, the drum hits and automix alike (analysis/trackBytes.ts):
// whichever asks first reads them, the others are handed a copy.
//
// The run is on the renderer's GPU only - the beat FX never ask for the CPU fallback automix may use -
// so a machine whose GPU cannot take it gets no beats - and the visualizer its original picture - rather than a CPU inference competing
// with playback for the length of a track.
//
// The beats come with their accents (analysis/beatAccents.ts) when the list was stored with them. A
// list stored without them (by a CPU run of automix's, or before accents existed) answers at once
// without them - the beat FX as they were - and
// `accented` brings the same beats with accents once they are measured, for the caller to swap in.
//
// The track's drum hits (`loadBeatFxTrackDrums`, analysis/drumHits.ts: htdemucs' drum stem on the
// GPU) are read on their own, from the same bytes, only when a live effect
// on screen plays them (时计's 仿真鼓面), as they cost the track's bytes and seconds of GPU. They no
// longer wait on the beats: a picture that plays only drum hits never runs beat_this.
//
// Under 智能动感模式's `cached` (`storedOnly`) both are read from what is stored and nothing else: no
// bytes read, no decode, no model run - not even the accents of a list stored without them, which
// then plays without, as a CPU-stored list always did. A beat list automix is analysing right now is
// waited for, as it runs either way. A track with nothing stored answers 'none' and is not asked
// again during the play.

export type BeatFxSourceKind = 'beat_this' | 'none';

export interface BeatFxTrackBeats {
    events: BeatFxEvent[];
    source: BeatFxSourceKind;
    /** Why there are no beats, when there are none. */
    note?: string;
    /** No beats only because the track's bytes are not to be had yet; worth asking again shortly. */
    retry?: boolean;
    /** The track's dynamics scale (0.45..1); 1 without accents. */
    trackScale: number;
    /** The same beats with accents, when these came without; null if they cannot be measured now. */
    accented?: Promise<BeatFxTrackBeats | null>;
}

const memory = new Map<string, Promise<BeatFxTrackBeats>>();

/** An online track's bytes from the stream URL its playback resolved, if there is a live one. */
const readStreamedTrackBytes = async (song: SongResult): Promise<ArrayBuffer | null> => {
    if (getPlaybackSourceRef(song).kind !== 'online') return null;
    const prefetched = getPrefetchedData(song);
    const url = prefetched?.audioUrl;
    if (!url || url === 'CACHED_IN_DB' || !isUrlValid(prefetched.audioUrlFetchedAt) || !/^https?:/.test(url)) return null;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        // An error page or a cut-off download decoded would be stored as this track's beats.
        if (!isCacheableAudioResponse(response, blob)) return null;
        // Kept for automix too (trackBytes.ts), whose rule is the whole song only.
        const notTheSong = await whyNotTheSong(song, url, blob);
        if (notTheSong) {
            console.info(`[BeatFx] not analysing the stream: it is ${notTheSong}`);
            return null;
        }
        return await blob.arrayBuffer();
    } catch (error) {
        console.warn('[BeatFx] could not read the stream for beats', error);
        return null;
    }
};
const MAX_TRACKS = 24;

interface TrackBytes {
    bytes: ArrayBuffer | null;
    /** Why there are none, when there are none. */
    note?: string;
    /** Where they came from (trackBytes.ts), for the decode's log line. */
    source: TrackBytesSource;
}

/**
 * The track's bytes as `key` names them: the representation's, or the local copy, or its stream -
 * or another analyser's read of them (trackBytes.ts).
 */
const readTrackBytes = async (song: SongResult, key: string, representation: PlaybackRepresentation | null): Promise<TrackBytes> => {
    let note: string | undefined;
    const { bytes, source } = await loadTrackBytes(key, async () => {
        const found = await readLocalTrackBytes(song, { representation });
        let read = found && 'bytes' in found ? found.bytes : null;
        // A representation's bytes are what the key names; an online track's stream is read only
        // when there is none.
        if (!read && !representation) read = await readStreamedTrackBytes(song);
        if (!read) note = found && 'skipped' in found ? found.skipped : undefined;
        return read;
    });
    if (bytes) return { bytes, source };
    return { bytes: null, note: note ?? 'track not cached yet, and no stream URL resolved', source };
};

const resolveTrackBeats = async (
    song: SongResult,
    key: string,
    representation: PlaybackRepresentation | null,
    storedOnly: boolean,
): Promise<BeatFxTrackBeats> => {
    let note = storedOnly ? 'none stored (智能动感模式 uses stored results only)' : 'beat_this returned no beats (no usable GPU, or a failed run)';
    let retry = false;
    let grid: Awaited<ReturnType<typeof getTrackBeatGrid>>;
    const readBytes = async () => {
        const read = await readTrackBytes(song, key, representation);
        if (!read.bytes) {
            note = read.note ?? note;
            retry = true;
        }
        return read;
    };
    const readMid = async () => {
        // Asked before the read and the decode, which are seconds of work for nobody without one.
        if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
            note = 'no WebGPU in this renderer';
            return null;
        }
        const read = await readBytes();
        if (!read.bytes) return null;
        const buffer = await decodeTrackAtRate(key, BEAT_THIS_SAMPLE_RATE, read.bytes, decodeAtRate, 'beats', read.source);
        if (!buffer) {
            note = 'decode failed';
            return null;
        }
        return toMidSide(buffer).mid;
    };
    try {
        // The picture on screen waits on these: ahead of automix's background profiles on the GPU.
        grid = await getTrackBeatGrid(key, readMid, { storedOnly, urgency: 'onScreen' });
        if (!grid?.beats.length) {
            // 本地没有：这台机器又分析不了（手机版没有 WebGPU、没有权重）时，
            // 去同步服务器问一次 —— 桌面端分析过的表就在那儿。
            // 拉到了就落到本地缓存，这里再读一次。
            //
            // 桌面端几乎不走这条（本地通常有；真要拉时服务器里也有），
            // 而它是**唯一**能让手机版拿到拍点的地方。
            //
            // `storedOnly`（智能动感模式的 `cached` 档）也要拉：那一档的意思正是
            // 「只读存好的结果」，而同步过来的表就是存好的结果之一。
            // 但「关掉智能动感模式」（`off`）时 `storedOnly` 也是 true —— 那时
            // 不该为了一个用不上的效果去打扰服务器，所以先看效果是不是开着。
            if (await shouldFetchSyncedBeats(song, storedOnly) && await fetchSyncedBeatGrid(song, key)) {
                grid = await getTrackBeatGrid(key, readMid, { storedOnly, urgency: 'onScreen' });
            }
        }
    } catch (error) {
        // A throw here (a cache read, a worker, a GPU device lost mid-run) is "no beats" like any
        // other: answered, so the caller's frame falls back, and not remembered, so a later play retries.
        return { events: [], source: 'none', note: `beat lookup failed: ${String(error)}`, trackScale: 1 };
    }
    if (grid?.beats.length) {
        const found = grid;
        if (found.accents || storedOnly) {
            return {
                events: mergeBeatFxEvents(found.beats, found.downbeats, found.accents),
                source: 'beat_this',
                trackScale: found.accents?.trackScale ?? 1,
            };
        }
        // Measured on a worker after the fact; a failure only leaves the beats as they are.
        const accented = getTrackBeatAccents(key, found, readMid)
            .then((accents): BeatFxTrackBeats | null => (accents
                ? {
                    events: mergeBeatFxEvents(found.beats, found.downbeats, accents),
                    source: 'beat_this',
                    trackScale: accents.trackScale,
                }
                : null))
            .catch(() => null);
        return { events: mergeBeatFxEvents(found.beats, found.downbeats), source: 'beat_this', trackScale: 1, accented };
    }
    if (!storedOnly && !canRunBeatThis()) return { events: [], source: 'none', note: 'not the desktop app', trackScale: 1 };
    return { events: [], source: 'none', note, trackScale: 1, ...(retry ? { retry } : {}) };
};

/**
 * 从同步服务器把这首歌的节拍表拉下来。
 *
 * ## 为什么需要这一步
 *
 * 手机版**当场分析不出来**（没有 WebGPU，也没有模型权重 —— 见 `canRunBeatThis`），
 * 但桌面端分析过的节拍表只是一串时间戳 —— 同步过来就能用。
 *
 * 所以本地没有、且这台机器也分析不了时，问一次同步服务器：
 * 拉到了就落到本地缓存（`beat_this_grid_<分析键>`），下一次直接读缓存。
 *
 * ## 为什么放在这里
 *
 * 这里是所有路径的汇合点：桌面的「智能动感模式」与 automix 都走它。
 * 桌面上这一步几乎不花钱（本地缓存里通常有；真要拉时服务器里也有），
 * 而它是**唯一**能让手机版拿到拍点的地方。
 *
 * ## 拉不到就算了
 *
 * 同步是可选功能（要用户自建服务器），服务器上可能没有这首歌的表，
 * 也可能连不上。任何一种都只是「没有节拍」—— 那本来就是没有节拍时的样子，
 * 不该变成错误，也不该拖慢播放。所以这里全部兜住，只记一条日志。
 */
const fetchSyncedBeatGrid = async (song: SongResult, key: string): Promise<boolean> => {
    try {
        const fingerprint = beatGridFingerprintForSong(song);
        if (!fingerprint) {
            return false;
        }
        const result = await pullRemoteBeatGridsToLocal([fingerprint]);
        return result.downloadedCount > 0;
    } catch (error) {
        console.info('[BeatFx] the synced beat list could not be fetched:', error);
        return false;
    }
};

/**
 * 该不该去同步服务器问一次节拍表。
 *
 * 三个条件都要满足：
 *
 * 1. **这台机器分析不了** —— 有 WebGPU 的话，分析比拉快得多（本地就有）。
 * 2. **效果开着** —— 智能动感模式关了，或者屏幕上没有要拍点的效果时，
 *    不该为了一个用不上的东西去打扰服务器。
 * 3. **这歌能对齐** —— 只有在线歌曲能跨端对上（本地曲库的 id 每台机器各自生成，
 *    见 `beatGridSync.ts`）。
 */
const shouldFetchSyncedBeats = async (song: SongResult, storedOnly: boolean): Promise<boolean> => {
    if (canRunBeatThis()) {
        // 这台机器能自己分析 —— 分析比拉快（本地就有），也更新（刚分析的重音更准）。
        return false;
    }
    if (!storedOnly) {
        // 「当场分析」那档：这台机器做不到（上面已经排除了），只能靠同步。
        return true;
    }
    // 「只读存好的」那档：只有屏幕上真的在放要拍点的效果时才值得拉。
    try {
        const settings = useVisualizerSettingsStore.getState();
        return visualizerWantsBeats(settings);
    } catch {
        return false;
    }
};

/**
 * The beat list for a track and the analysis key it belongs to, computed once per session and shared
 * by concurrent callers. The key and the representation whose bytes are read are resolved together,
 * so a transcode registering mid-analysis cannot file one's beats under the other's key. `storedOnly`
 * (智能动感模式's `cached`) is remembered apart: its answer may lack the accents an `on` lookup adds.
 */
export const loadBeatFxTrackBeats = (song: SongResult, { storedOnly = false } = {}): { key: string; beats: Promise<BeatFxTrackBeats> } => {
    const { key, representation } = getPlaybackAnalysisTarget(song);
    const remembered = storedOnly ? `stored:${key}` : key;
    const existing = memory.get(remembered);
    if (existing) return { key, beats: existing };
    const pending = resolveTrackBeats(song, key, representation, storedOnly);
    memory.set(remembered, pending);
    while (memory.size > MAX_TRACKS) {
        const oldest = memory.keys().next().value;
        if (oldest === undefined) break;
        memory.delete(oldest);
    }
    // A failed lookup is not remembered, so a later play (e.g. once the track is cached) retries.
    void pending.then((result) => {
        if (result.source === 'none' && memory.get(remembered) === pending) memory.delete(remembered);
    });
    return { key, beats: pending };
};

/** How a drum hit lookup ended: hits to play, none for this track, or no bytes yet (ask again). */
export type BeatFxTrackDrums = 'hits' | 'none' | 'retry';

/**
 * Starts reading a track's drum hits (analysis/drumHits.ts) - from the cache, or separated now on the
 * GPU - for a live effect that plays them, under the same analysis key as its beats. 'hits' once
 * `getDrumHits` answers for the key; 'none' for a drumless track, no htdemucs_gpu or no WebGPU;
 * 'retry' when the bytes are not to be had yet (an online track whose stream URL playback has not
 * resolved). The track asked for is the one a separation may run for; the caller says when it is
 * left (`setWantedDrumTrack(null)`) - on a track change or the switch going off, not a picture switch.
 * (Since the analysis service's 2b, a picture switch too: the separation stops and keeps where it was,
 * DrumResume in drumHits.ts; from the PR #750 review.)
 * `storedOnly` (智能动感模式's `cached`): the cache alone, 'hits' or 'none', and no track is wanted.
 */
export const loadBeatFxTrackDrums = (song: SongResult, { storedOnly = false } = {}): { key: string; drums: Promise<BeatFxTrackDrums> } => {
    const { key, representation } = getPlaybackAnalysisTarget(song);
    if (storedOnly) {
        const drums = loadStoredDrumHits(key).then((analysis): BeatFxTrackDrums => (analysis && getDrumHits(key) ? 'hits' : 'none'));
        return { key, drums };
    }
    setWantedDrumTrack(key);
    let missing = false;
    const readBytes = async () => {
        const read = await readTrackBytes(song, key, representation);
        if (!read.bytes) missing = true;
        return read.bytes;
    };
    const drums = loadTrackDrumHits(key, readBytes)
        .then((analysis): BeatFxTrackDrums => (analysis && getDrumHits(key) ? 'hits' : missing ? 'retry' : 'none'));
    return { key, drums };
};
