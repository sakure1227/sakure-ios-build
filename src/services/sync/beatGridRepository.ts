import { getCacheEntriesByPrefix, saveToCache } from '../db';
import { BEAT_GRID_PREFIX, BEAT_GRID_STORED_EVENT } from '../analysis/beatGridKeys';
import { getSyncConfig, isSyncConfigured } from './syncConfig';
import { getRemoteBeatGrids, putRemoteBeatGrids } from './syncClient';
import {
    beatGridAnalysisKeyFromFingerprint,
    beatGridAnalysisKeyFromStorageKey,
    beatGridFingerprintFromAnalysisKey,
    beatGridStorageKey,
} from './beatGridSync';
import type { SyncedBeatGridRecord } from './syncTypes';

// src/services/sync/beatGridRepository.ts
// 节拍表（Beat This! 的分析结果）的跨设备同步。
//
// ## 它解决什么
//
// 「智能动感模式」里镜台的歌词随拍跳动，靠的是 `beatImpact` / `downbeatImpact`，
// 而它们的唯一来源是 Beat This! 的分析结果。那份分析要 WebGPU + 权重在盘上，
// **手机版两样都没有**（iOS 26 之前的 WKWebView 没有 WebGPU；权重在 Electron 的
// 安装目录里，渲染层读不到）。
//
// 所以手机端当场分析不出来。但分析结果只是一串时间戳 —— 桌面端分析过一次，
// 同步过来，手机端就能用了（`readStoredBeatGrid` 在「能不能跑模型」的守卫**之前**
// 被调用，所以本地有表就能用，见 `src/services/analysis/beatGrid.ts`）。
//
// ## 存的是哪一段
//
// 本地存的是 `StoredBeatGrid`（`{version, beats, downbeats, accents?}`），
// 键是 `beat_this_grid_<分析键>`。远端存的是 `SyncedBeatGridRecord`
// （`{fingerprint, beats, downbeats, accents?, updatedAt}`）——
// 键是**歌指纹**，不是分析键：分析键是设备本地的（本地曲库的 id 每台机器各自生成），
// 指纹才是跨端稳定的（见 `beatGridSync.ts`）。
//
// ## 版本
//
// 本地表带一个 `version`（`BEAT_GRID_VERSION`），模型/算法变了就要 +1。
// 远端不存版本 —— 拉到之后按**本地的**版本号写进本地表。
// 版本对不上时（本地表是旧版本写的）本地那份作废，用远端这份覆盖。
// 这里只同步 `version === 1` 的表：更新的版本还没见过，别把不认识的东西写进去。

/** 本地存的节拍表（与 `src/services/analysis/beatGrid.ts` 的 StoredBeatGrid 同形）。 */
type StoredBeatGrid = {
    version: number;
    beats: number[];
    downbeats: number[];
    accents?: unknown;
};

/** 能同步的版本 —— 与分析模块的 `BEAT_GRID_VERSION` 一致。 */
const SYNCABLE_VERSION = 1;

/**
 * 存下节拍表之后，隔多久才上传。
 *
 * 那一刻画面正在等拍点（要靠它动），上传是后台的事 —— 别占着首帧。
 * 延后一点还有另一个好处：分析一首歌可能连着存好几次（先存拍点、后补重音），
 * 合成一次上传就够了。
 */
const BEAT_GRID_UPLOAD_DELAY_MS = 4_000;

const getConfiguredSync = () => {
    const config = getSyncConfig();
    return isSyncConfigured(config) ? config : null;
};

export type BeatGridSyncResult = {
    uploadedCount: number;
    downloadedCount: number;
    /** 远端没有这个功能（老服务器），或者同步没配。 */
    skipped: boolean;
};

/**
 * 把本地存的节拍表推到远端。
 *
 * 只推**在线歌曲**的：本地曲库的分析键每台设备各自生成，推上去也认不回来
 * （见 `beatGridSync.ts` 顶上那段）。换不出来的键直接跳过 ——
 * 推一个错位的键会写到别的歌名下，比不推更糟。
 */
export const pushLocalBeatGridsToRemote = async (): Promise<BeatGridSyncResult> => {
    const config = getConfiguredSync();
    if (!config) {
        return { uploadedCount: 0, downloadedCount: 0, skipped: true };
    }

    let entries: Array<{ key: string; data: StoredBeatGrid; timestamp: number }>;
    try {
        entries = await getCacheEntriesByPrefix<StoredBeatGrid>(BEAT_GRID_PREFIX);
    } catch {
        return { uploadedCount: 0, downloadedCount: 0, skipped: true };
    }

    const records: SyncedBeatGridRecord[] = [];
    for (const entry of entries) {
        const analysisKey = beatGridAnalysisKeyFromStorageKey(entry.key);
        if (!analysisKey) {
            continue;
        }
        const fingerprint = beatGridFingerprintFromAnalysisKey(analysisKey);
        if (!fingerprint) {
            continue;
        }
        const grid = entry.data;
        if (!grid || grid.version !== SYNCABLE_VERSION || !Array.isArray(grid.beats) || !grid.beats.length) {
            continue;
        }
        const record: SyncedBeatGridRecord = {
            fingerprint,
            beats: grid.beats,
            downbeats: Array.isArray(grid.downbeats) ? grid.downbeats : [],
            updatedAt: new Date(entry.timestamp || Date.now()).toISOString(),
        };
        if (grid.accents) {
            record.accents = grid.accents;
        }
        records.push(record);
    }

    if (!records.length) {
        return { uploadedCount: 0, downloadedCount: 0, skipped: false };
    }

    await putRemoteBeatGrids(config, records);
    return { uploadedCount: records.length, downloadedCount: 0, skipped: false };
};

/**
 * 把远端的节拍表拉到本地。
 *
 * 只拉**要用的那几首**（按指纹要）—— 远端可能有几百首，全拉下来既慢又占地方。
 *
 * 落到本地时按**本地的分析键**写（`beat_this_grid_<分析键>`），
 * 这样 `readStoredBeatGrid` 就能读到 —— 手机版的节拍 FX 于是有拍可跳。
 */
export const pullRemoteBeatGridsToLocal = async (
    fingerprints: string[],
): Promise<BeatGridSyncResult> => {
    const config = getConfiguredSync();
    if (!config) {
        return { uploadedCount: 0, downloadedCount: 0, skipped: true };
    }
    const wanted = Array.from(new Set(fingerprints.filter(Boolean)));
    if (!wanted.length) {
        return { uploadedCount: 0, downloadedCount: 0, skipped: false };
    }

    let records: SyncedBeatGridRecord[];
    try {
        records = await getRemoteBeatGrids(config, wanted);
    } catch {
        // 远端读不到（服务器还没这个功能、或网络问题）—— 不是错误，本地照常用没有节拍的状态。
        return { uploadedCount: 0, downloadedCount: 0, skipped: true };
    }

    const downloaded = await storeBeatGridRecordsLocally(records);

    return { uploadedCount: 0, downloadedCount: downloaded, skipped: false };
};

/**
 * 把这些节拍表直接落到本地缓存（不经服务器）。
 *
 * 用于「导入一份导出包」：包里已经带着节拍表了，不用再去服务器取。
 */
export const storeBeatGridRecordsLocally = async (
    records: SyncedBeatGridRecord[],
): Promise<number> => {
    let stored = 0;
    for (const record of records) {
        const analysisKey = beatGridAnalysisKeyFromFingerprint(record.fingerprint);
        if (!analysisKey || !record.beats.length) {
            continue;
        }
        const entry: StoredBeatGrid = {
            version: SYNCABLE_VERSION,
            beats: record.beats,
            downbeats: record.downbeats,
        };
        if (record.accents) {
            entry.accents = record.accents;
        }
        try {
            await saveToCache(beatGridStorageKey(analysisKey), entry);
            stored += 1;
        } catch (error) {
            console.warn('[BeatGridSync] could not store the beat list', error);
        }
    }
    return stored;
};

/**
 * 听到「节拍表存下来了」就把它推上去。
 *
 * ## 为什么要有这个
 *
 * 手机版当场分析不出来（没有 WebGPU、没有权重），它能用的节拍表只有桌面端
 * 分析过的那份 —— 而桌面端分析完不会主动告诉服务器，是这里替它说。
 *
 * 没有它，用户得手动点一次「同步」才等得到 —— 那对「手机上也想看到镜台随拍跳」
 * 来说太远了。
 *
 * ## 为什么延后一下
 *
 * 刚存完表的那一刻，页面正在等拍点（画面要靠它动）。**先让它动起来**，
 * 上传是后台的事，不该占着首帧。
 *
 * ## 连带把重音也传了
 *
 * 重音（每一拍的轻重）是镜台涟漪强弱的关键，没有它涟漪全都一样。
 * 它跟拍点是同一次存储里写下去的，所以一起传。
 */
export const watchBeatGridStores = (): (() => void) => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
        return () => {};
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const onStored = () => {
        if (timer) {
            clearTimeout(timer);
        }
        // 延后一点：分析一首歌可能连着存好几次（先存拍点、后补重音），
        // 合成一次上传就够了。
        timer = setTimeout(() => {
            timer = null;
            void pushLocalBeatGridsToRemote().catch((error) => {
                console.info('[BeatGridSync] the beat list could not be uploaded:', error);
            });
        }, BEAT_GRID_UPLOAD_DELAY_MS);
    };

    window.addEventListener(BEAT_GRID_STORED_EVENT, onStored);
    return () => {
        if (timer) {
            clearTimeout(timer);
        }
        window.removeEventListener(BEAT_GRID_STORED_EVENT, onStored);
    };
};
