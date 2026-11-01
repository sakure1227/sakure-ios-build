import { normalizeRandomVisualizerModes } from '../../utils/randomVisualizerModes';
import { sanitizeDualTheme } from '../themeSanitizer';
// 背景模式没有 mod 投稿通道，静态清单与活注册表在任何时刻都等价。
import { isBuiltinVisualizerBackgroundMode } from '../../types/visualizerModes';
import {
    SYNC_SCHEMA_VERSION,
    type SyncLibraryExportBundle,
    type SyncRemoteState,
    type SyncThemeBucketSummary,
    type SyncThemeManifest,
    type SyncedBeatGridRecord,
    type SyncedSettingsRecord,
    type SyncedVisualSettings,
    type SyncedThemeRecord,
} from './syncTypes';

// src/services/sync/syncSchema.ts
// Defensive parsing for JSON returned by user-hosted sync servers.

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isIsoDateString = (value: unknown): value is string => (
    typeof value === 'string' && !Number.isNaN(Date.parse(value))
);

const isSchemaCompatible = (value: unknown) => value === SYNC_SCHEMA_VERSION;

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every(item => typeof item === 'string')
);

const isFontStyle = (value: unknown): value is SyncedVisualSettings['lyricsFontStyle'] => (
    value === 'sans' || value === 'serif' || value === 'mono'
);

const isVisualizerBackgroundMode = (value: unknown): value is NonNullable<SyncedVisualSettings['visualizerBackgroundMode']> => (
    isBuiltinVisualizerBackgroundMode(value)
);

const parseSyncedVisualSettings = (value: Record<string, unknown>): SyncedVisualSettings => {
    const settings: SyncedVisualSettings = {};

    if (typeof value.followSystemTheme === 'boolean') settings.followSystemTheme = value.followSystemTheme;
    if (typeof value.visualizerMode === 'string' && value.visualizerMode.trim()) settings.visualizerMode = value.visualizerMode;
    if (typeof value.randomVisualizerModePerSong === 'boolean') settings.randomVisualizerModePerSong = value.randomVisualizerModePerSong;
    if (Array.isArray(value.randomVisualizerModes)) settings.randomVisualizerModes = normalizeRandomVisualizerModes(value.randomVisualizerModes);
    if (value.visualizerBackgroundMode === null) settings.visualizerBackgroundMode = null;
    else if (isVisualizerBackgroundMode(value.visualizerBackgroundMode)) settings.visualizerBackgroundMode = value.visualizerBackgroundMode;
    if (isFiniteNumber(value.backgroundOpacity)) settings.backgroundOpacity = value.backgroundOpacity;
    if (isFiniteNumber(value.visualizerOpacity)) settings.visualizerOpacity = value.visualizerOpacity;
    if (typeof value.hidePlayerTranslationSubtitle === 'boolean') settings.hidePlayerTranslationSubtitle = value.hidePlayerTranslationSubtitle;
    if (typeof value.showSubtitleTranslation === 'boolean') settings.showSubtitleTranslation = value.showSubtitleTranslation;
    if (value.subtitleContentMode === 'translation' || value.subtitleContentMode === 'romanization' || value.subtitleContentMode === 'both' || value.subtitleContentMode === 'none') {
        settings.subtitleContentMode = value.subtitleContentMode;
    }
    if (typeof value.subtitleOverlayBackground === 'boolean') settings.subtitleOverlayBackground = value.subtitleOverlayBackground;
    if (typeof value.subtitleUpcomingLyricsBlur === 'boolean') settings.subtitleUpcomingLyricsBlur = value.subtitleUpcomingLyricsBlur;
    if (isFontStyle(value.lyricsFontStyle)) settings.lyricsFontStyle = value.lyricsFontStyle;
    if (isFiniteNumber(value.lyricsFontScale)) settings.lyricsFontScale = value.lyricsFontScale;
    if (value.lyricsFontWeight === null) settings.lyricsFontWeight = null;
    else if (isFiniteNumber(value.lyricsFontWeight) && value.lyricsFontWeight >= 100 && value.lyricsFontWeight <= 900) settings.lyricsFontWeight = value.lyricsFontWeight;
    if (isStringArray(value.lyricsFontFallbackFamilies)) settings.lyricsFontFallbackFamilies = value.lyricsFontFallbackFamilies;
    if (typeof value.subtitleFontInheritsLyrics === 'boolean') settings.subtitleFontInheritsLyrics = value.subtitleFontInheritsLyrics;
    if (isFontStyle(value.subtitleFontStyle)) settings.subtitleFontStyle = value.subtitleFontStyle;
    if (value.subtitleFontWeight === null) settings.subtitleFontWeight = null;
    else if (isFiniteNumber(value.subtitleFontWeight) && value.subtitleFontWeight >= 100 && value.subtitleFontWeight <= 900) settings.subtitleFontWeight = value.subtitleFontWeight;
    if (value.subtitleFontFamily === null) settings.subtitleFontFamily = null;
    else if (typeof value.subtitleFontFamily === 'string') settings.subtitleFontFamily = value.subtitleFontFamily;
    if (isStringArray(value.subtitleFontFallbackFamilies)) settings.subtitleFontFallbackFamilies = value.subtitleFontFallbackFamilies;
    if (isRecord(value.visualizerTunings)) settings.visualizerTunings = value.visualizerTunings;
    // Frozen: the 13 lyric-style tunings below predate the visualizerTunings bundle, which carries any
    // new style. Do not add a lyric style here.
    if (value.classicTuning !== undefined) settings.classicTuning = value.classicTuning;
    if (value.cadenzaTuning !== undefined) settings.cadenzaTuning = value.cadenzaTuning;
    if (value.partitaTuning !== undefined) settings.partitaTuning = value.partitaTuning;
    if (value.fumeTuning !== undefined) settings.fumeTuning = value.fumeTuning;
    if (value.claddaghTuning !== undefined) settings.claddaghTuning = value.claddaghTuning;
    if (value.cappellaTuning !== undefined) settings.cappellaTuning = value.cappellaTuning;
    if (value.tiltTuning !== undefined) settings.tiltTuning = value.tiltTuning;
    if (value.dioramaTuning !== undefined) settings.dioramaTuning = value.dioramaTuning;
    if (value.monetBackgroundTuning !== undefined) settings.monetBackgroundTuning = value.monetBackgroundTuning;
    if (value.nomandBackgroundTuning !== undefined) settings.nomandBackgroundTuning = value.nomandBackgroundTuning;
    if (value.latentBackgroundTuning !== undefined) settings.latentBackgroundTuning = value.latentBackgroundTuning;
    if (value.soraBackgroundTuning !== undefined) settings.soraBackgroundTuning = value.soraBackgroundTuning;
    if (value.monetTuning !== undefined) settings.monetTuning = value.monetTuning;
    if (value.pendoloTuning !== undefined) settings.pendoloTuning = value.pendoloTuning;
    if (value.sonnetTuning !== undefined) settings.sonnetTuning = value.sonnetTuning;
    if (value.temperaTuning !== undefined) settings.temperaTuning = value.temperaTuning;
    if (value.lumiereTuning !== undefined) settings.lumiereTuning = value.lumiereTuning;
    if (Array.isArray(value.urlBackgroundList)) settings.urlBackgroundList = value.urlBackgroundList;
    if (value.urlBackgroundSelectedId === null) settings.urlBackgroundSelectedId = null;
    else if (typeof value.urlBackgroundSelectedId === 'string') settings.urlBackgroundSelectedId = value.urlBackgroundSelectedId;
    if (value.homeLayoutStyle === 'carousel' || value.homeLayoutStyle === 'grid') settings.homeLayoutStyle = 'grid';
    if (value.grid3dCardStyle === 'image' || value.grid3dCardStyle === 'card') settings.grid3dCardStyle = value.grid3dCardStyle;

    return settings;
};

export const parseSyncedSettingsRecord = (value: unknown): SyncedSettingsRecord | null => {
    if (!isRecord(value) || !isSchemaCompatible(value.schemaVersion) || !isIsoDateString(value.updatedAt) || !isRecord(value.data)) {
        return null;
    }

    return {
        schemaVersion: SYNC_SCHEMA_VERSION,
        updatedAt: value.updatedAt,
        data: parseSyncedVisualSettings(value.data),
    };
};

export const parseSyncedThemeRecord = (value: unknown): SyncedThemeRecord | null => {
    if (!isRecord(value)
        || typeof value.fingerprint !== 'string'
        || !value.fingerprint
        || !isIsoDateString(value.updatedAt)
        || !isRecord(value.theme)
    ) {
        return null;
    }

    return {
        fingerprint: value.fingerprint,
        theme: sanitizeDualTheme(value.theme),
        updatedAt: value.updatedAt,
        source: value.source === 'auto' || value.source === 'fallback' || value.source === 'edited'
            ? value.source
            : 'manual',
    };
};

export const parseSyncedThemeRecords = (value: unknown): SyncedThemeRecord[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(parseSyncedThemeRecord)
        .filter((record): record is SyncedThemeRecord => Boolean(record));
};

/**
 * 一串时刻（秒）—— 节拍表的拍点与小节第一拍。
 *
 * 校验得**紧**：服务器给的是不可信的数据，而这份数据最后会变成
 * 「什么时候让歌词跳一下」的时刻。���个 NaN 或负数会让画面在奇怪的位置弹。
 *
 * - 必须是有限数
 * - 不能是负数（时刻不能早于 0）
 * - 上限：一首歌的拍点不会超过十万（那是七小时的歌）
 */
const isTimeList = (value: unknown): value is number[] => (
    Array.isArray(value)
    && value.length <= 100_000
    && value.every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0)
);

export const parseSyncedBeatGridRecord = (value: unknown): SyncedBeatGridRecord | null => {
    if (!isRecord(value)
        || typeof value.fingerprint !== 'string'
        || !value.fingerprint
        || !isIsoDateString(value.updatedAt)
        || !isTimeList(value.beats)
        || !value.beats.length
        || !isTimeList(value.downbeats)
    ) {
        return null;
    }

    const record: SyncedBeatGridRecord = {
        fingerprint: value.fingerprint,
        beats: value.beats,
        downbeats: value.downbeats,
        updatedAt: value.updatedAt,
    };
    // 重音是可选的：桌面端存表时可能还没有重音。没有它，镜台的涟漪强弱一样，
    // 但「歌词随拍跳动」照旧（它只用拍点与小节第一拍）。
    if (value.accents !== undefined && value.accents !== null) {
        record.accents = value.accents;
    }
    return record;
};

export const parseSyncedBeatGridRecords = (value: unknown): SyncedBeatGridRecord[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(parseSyncedBeatGridRecord)
        .filter((record): record is SyncedBeatGridRecord => Boolean(record));
};

export const parseSyncLibraryExportBundle = (value: unknown): SyncLibraryExportBundle | null => {
    if (!isRecord(value)
        || value.kind !== 'folia-sync-export'
        || !isSchemaCompatible(value.schemaVersion)
        || !isIsoDateString(value.exportedAt)
        || !Array.isArray(value.themes)
    ) {
        return null;
    }

    const themes = value.themes.map(parseSyncedThemeRecord);
    if (themes.some(theme => !theme)) {
        return null;
    }

    // 节拍表是可选的 —— 旧版本的导出包里没有这一项，那就没有。
    const beatGrids = value.beatGrids === undefined || value.beatGrids === null
        ? undefined
        : parseSyncedBeatGridRecords(value.beatGrids);

    const settings = value.settings === null
        ? null
        : parseSyncedSettingsRecord(value.settings);
    if (value.settings !== null && !settings) {
        return null;
    }

    return {
        kind: 'folia-sync-export',
        schemaVersion: SYNC_SCHEMA_VERSION,
        exportedAt: value.exportedAt,
        settings,
        themes: themes as SyncedThemeRecord[],
        ...(beatGrids ? { beatGrids } : {}),
    };
};

export const parseSyncRemoteState = (value: unknown): SyncRemoteState | null => {
    if (!isRecord(value) || !isSchemaCompatible(value.schemaVersion)) {
        return null;
    }

    const settingsUpdatedAt = typeof value.settingsUpdatedAt === 'string' ? value.settingsUpdatedAt : null;
    const themesUpdatedAt = typeof value.themesUpdatedAt === 'string' ? value.themesUpdatedAt : null;
    if ((value.settingsUpdatedAt != null && !isIsoDateString(settingsUpdatedAt))
        || (value.themesUpdatedAt != null && !isIsoDateString(themesUpdatedAt))
        || typeof value.themeCount !== 'number'
        || !Number.isFinite(value.themeCount)
    ) {
        return null;
    }

    return {
        schemaVersion: SYNC_SCHEMA_VERSION,
        settingsUpdatedAt,
        themesUpdatedAt,
        themeCount: Math.max(0, Math.trunc(value.themeCount)),
    };
};

const parseThemeBucketSummary = (value: unknown): SyncThemeBucketSummary | null => {
    if (!isRecord(value)
        || typeof value.bucketId !== 'number'
        || !Number.isInteger(value.bucketId)
        || value.bucketId < 0
        || typeof value.count !== 'number'
        || !Number.isFinite(value.count)
        || typeof value.hash !== 'string'
    ) {
        return null;
    }

    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    if (value.updatedAt != null && !isIsoDateString(updatedAt)) {
        return null;
    }

    return {
        bucketId: value.bucketId,
        count: Math.max(0, Math.trunc(value.count)),
        hash: value.hash,
        updatedAt,
    };
};

export const parseSyncThemeManifest = (value: unknown): SyncThemeManifest | null => {
    if (!isRecord(value)
        || !isSchemaCompatible(value.schemaVersion)
        || typeof value.bucketCount !== 'number'
        || !Number.isInteger(value.bucketCount)
        || !Array.isArray(value.buckets)
    ) {
        return null;
    }

    const buckets = value.buckets.map(parseThemeBucketSummary);
    if (buckets.some(bucket => !bucket)) {
        return null;
    }

    return {
        schemaVersion: SYNC_SCHEMA_VERSION,
        bucketCount: value.bucketCount,
        buckets: buckets as SyncThemeBucketSummary[],
    };
};
