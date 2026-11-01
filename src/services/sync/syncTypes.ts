import type { DualTheme, SubtitleContentMode, Theme, VisualizerBackgroundMode, VisualizerMode } from '../../types';
import type { VisualizerTuningBundle } from '../../components/visualizer/tuningRegistry';

// src/services/sync/syncTypes.ts
// Shared contracts for Folia's user-hosted sync server API.

export const SYNC_SCHEMA_VERSION = 1;
export const SYNC_PROVIDER = 'sync-server' as const;

export type SyncProvider = typeof SYNC_PROVIDER;
export type SyncStatusState = 'idle' | 'syncing' | 'success' | 'error';
export type SyncedThemeSource = 'manual' | 'auto' | 'fallback' | 'edited';

export type SyncProviderConfig = {
    provider: SyncProvider;
    enabled: boolean;
    workerBaseUrl: string;
    authToken: string;
};

export type SyncRuntimeStatus = {
    state: SyncStatusState;
    lastSyncAt: string | null;
    lastError: string | null;
};

export type SyncedVisualSettings = {
    followSystemTheme?: boolean;
    visualizerMode?: VisualizerMode;
    randomVisualizerModePerSong?: boolean;
    randomVisualizerModes?: VisualizerMode[];
    visualizerBackgroundMode?: VisualizerBackgroundMode | null;
    backgroundOpacity?: number;
    visualizerOpacity?: number;
    hidePlayerTranslationSubtitle?: boolean;
    showSubtitleTranslation?: boolean;
    subtitleContentMode?: SubtitleContentMode;
    subtitleOverlayBackground?: boolean;
    subtitleUpcomingLyricsBlur?: boolean;
    lyricsFontStyle?: Theme['fontStyle'];
    lyricsFontScale?: number;
    lyricsFontWeight?: number | null;
    lyricsFontFallbackFamilies?: string[];
    subtitleFontInheritsLyrics?: boolean;
    subtitleFontStyle?: Theme['fontStyle'];
    subtitleFontWeight?: number | null;
    subtitleFontFamily?: string | null;
    subtitleFontFallbackFamilies?: string[];
    visualizerTunings?: VisualizerTuningBundle;
    // Frozen: the 13 lyric-style tunings below predate the visualizerTunings bundle, which carries any
    // new style. Do not add a lyric style here.
    classicTuning?: unknown;
    cadenzaTuning?: unknown;
    partitaTuning?: unknown;
    fumeTuning?: unknown;
    claddaghTuning?: unknown;
    cappellaTuning?: unknown;
    tiltTuning?: unknown;
    dioramaTuning?: unknown;
    monetBackgroundTuning?: unknown;
    nomandBackgroundTuning?: unknown;
    latentBackgroundTuning?: unknown;
    soraBackgroundTuning?: unknown;
    monetTuning?: unknown;
    pendoloTuning?: unknown;
    sonnetTuning?: unknown;
    /** 智能动感模式; one setting for every visualizer, so outside the tuning bundle. */
    smartBeat?: unknown;
    temperaTuning?: unknown;
    lumiereTuning?: unknown;
    urlBackgroundList?: unknown[];
    urlBackgroundSelectedId?: string | null;
    homeLayoutStyle?: 'carousel' | 'grid';
    grid3dCardStyle?: 'image' | 'card';
};

export type SyncedSettingsRecord = {
    schemaVersion: number;
    updatedAt: string;
    data: SyncedVisualSettings;
};

export type SyncedThemeRecord = {
    fingerprint: string;
    theme: DualTheme;
    updatedAt: string;
    source: SyncedThemeSource;
};

/**
 * 一首歌的节拍表（Beat This! 分析的结果），跨设备同步用。
 *
 * ## 为什么需要它
 *
 * 「智能动感模式」（镜台的粒子随拍泛起涟漪、正在唱的字随拍跳动）靠的是
 * `beatImpact` / `downbeatImpact` 这两个信号，它们的唯一来源是 Beat This! 的分析结果。
 *
 * 那份分析要 WebGPU（`src/services/analysis/beatThis.ts` 的 `canRunBeatThis()` 要求
 * `navigator.gpu`）**和**模型的权重在盘上。手机版两样都没有：
 *
 * - **iOS 26 之前的 WKWebView 没有 WebGPU**（WebGPU 是 Safari 26 才加的，
 *   MDN 的兼容表：WebView on iOS 从 iOS 26 起才有 `navigator.gpu`）
 * - **模型的权重在 Electron 主进程的安装目录里**，渲染层读不到
 *
 * 所以手机版**当场分析不出来**。但分析结果本身只是一串时间戳 ——
 * 桌面端分析过一次，把它同步过来，手机端就能用了。
 *
 * ## 为什么单独一条通路，而不是塞进 `settings`
 *
 * `settings` 是**单行 blob**（整个 `SyncedVisualSettings` 一个键，最后写入者赢）。
 * 一首歌的节拍表是 480 个拍点、约 30-60KB；几十首塞进去，两台设备来回覆盖时
 * 整块丢失，而且每次同步都要传几十 MB。
 *
 * 所以它跟 AI 主题一样**逐行**（用 `fingerprint` 寻址），走自己的表与端点。
 *
 * ## 键对齐
 *
 * 远端用 `fingerprint`（`syncFingerprint.ts` 的 `createSongSyncFingerprint`）——
 * 在线歌曲是 `<平台>:id:<媒体id>` 这种跨端稳定的形状。
 * 落到本地时再换算回 `beat_this_grid_<analysisKey>`（`online:<平台>:<媒体id>`）。
 *
 * 只有**在线歌曲**能对齐：本地曲库的 id 是每台设备各自生成的（`local_<时间戳>_<随机>`）。
 * 手机版本来也不支持本地曲库，所以不碍事。
 */
export type SyncedBeatGridRecord = {
    /** 跨端稳定的歌指纹（`createSongSyncFingerprint`）。 */
    fingerprint: string;
    /** 拍点时刻（秒）。 */
    beats: number[];
    /** 小节第一拍的时刻（秒）。 */
    downbeats: number[];
    /**
     * 重音信息（每一拍的轻重与脉冲）。没有它，镜台的涟漪强弱全都一样。
     * 可选：桌面端存表时可能还没有重音。
     */
    accents?: unknown;
    updatedAt: string;
};

export type SyncThemeBucketSummary = {
    bucketId: number;
    count: number;
    hash: string;
    updatedAt: string | null;
};

export type SyncThemeManifest = {
    schemaVersion: number;
    bucketCount: number;
    buckets: SyncThemeBucketSummary[];
};

export type SyncRemoteState = {
    schemaVersion: number;
    settingsUpdatedAt: string | null;
    themesUpdatedAt: string | null;
    themeCount: number;
};

export type WorkerHealthResponse = {
    ok: boolean;
    schemaVersion?: number;
    backend?: string;
};

export type SyncLibraryExportBundle = {
    kind: 'folia-sync-export';
    schemaVersion: number;
    exportedAt: string;
    settings: SyncedSettingsRecord | null;
    themes: SyncedThemeRecord[];
    /**
     * 节拍表（Beat This! 的分析结果）。
     *
     * 跟着导出包一起走：换设备时不必重新分析一遍（手机版本来就分析不了）。
     * 可选 —— 旧版本的导出包里没有这一项。
     */
    beatGrids?: SyncedBeatGridRecord[];
};
