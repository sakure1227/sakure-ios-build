import { BEAT_GRID_PREFIX } from '../analysis/beatGridKeys';
import type { SongResult } from '../../types';
import { getPlaybackSourceRef } from '../../utils/appPlaybackGuards';
import { createSongSyncFingerprint } from './syncFingerprint';

// src/services/sync/beatGridSync.ts
// 把节拍表在「远端按歌指纹寻址」与「本地按分析键寻址」之间对上。
//
// ## 两个键的形状不一样
//
// - **本地分析键**（`src/services/analysis/beatGrid.ts` 的 `storageKey`）：
//   `beat_this_grid_online:<平台>:<媒体id>`
//   来源是 `getPlaybackAnalysisTarget(song).key` → `getPlaybackSongKey(song)`
//   （`src/utils/appPlaybackGuards.ts`）：在线歌曲是 `online:<平台>:<媒体id>`。
// - **远端指纹**（`src/services/sync/syncFingerprint.ts` 的 `createSongSyncFingerprint`）：
//   `<平台>:id:<媒体id>`。
//
// 差一个前缀（`online:`）和分隔符（`:` vs `:id:`）。所以在线歌曲能互相换算：
//
//   `<平台>:id:<媒体id>`  ↔  `online:<平台>:<媒体id>`
//
// ## 本地曲库为什么不行
//
// 本地曲库的分析键是 `local:local_<时间戳>_<随机>` —— 那个 id 是**每台设备各自生成**的
// （`localMusicService.ts` 的 `generateId()`），两台机器导入同一首歌，键不一样。
//
// 主题同步用「标题+艺人+时长」的元数据指纹绕开了这一点（`createSongMetadataFingerprint`），
// 节拍表也可以那样做，但手机版本来就不支持本地曲库，桌面↔桌面同步本地歌是另一件事。
// 这里只做在线歌曲 —— 那是手机版唯一支持的来源，也是用户实际会同步的那一类。
//
// ## 换算不出来的时候
//
// 返回 null：调用方据此**不**同步这一首，而不是同步出一个错位的键
//（错位的键会写到另一首歌的表里去，比不写更糟）。

/** 远端指纹 → 本地分析键。只有在线歌曲能换算。 */
export const beatGridAnalysisKeyFromFingerprint = (fingerprint: string): string | null => {
    // `<平台>:id:<媒体id>` → `online:<平台>:<媒体id>`
    const match = /^([a-z0-9_-]+):id:(.+)$/.exec(fingerprint);
    if (!match) {
        return null;
    }
    const [, providerId, mediaId] = match;
    if (!providerId || !mediaId) {
        return null;
    }
    return `online:${providerId}:${mediaId}`;
};

/** 本地分析键 → 远端指纹。 */
export const beatGridFingerprintFromAnalysisKey = (analysisKey: string): string | null => {
    // `online:<平台>:<媒体id>` → `<平台>:id:<媒体id>`
    const match = /^online:([a-z0-9_-]+):(.+)$/.exec(analysisKey);
    if (!match) {
        return null;
    }
    const [, providerId, mediaId] = match;
    if (!providerId || !mediaId) {
        return null;
    }
    return `${providerId}:id:${mediaId}`;
};

/** 这首歌在远端的指纹（只有在线歌曲有）。 */
export const beatGridFingerprintForSong = (song: SongResult | null): string | null => {
    if (!song) {
        return null;
    }
    const sourceRef = getPlaybackSourceRef(song);
    if (sourceRef.kind !== 'online') {
        return null;
    }
    // 在线歌曲的指纹就是 `<平台>:id:<媒体id>`（`createSongSyncFingerprint` 的在线分支），
    // 与上面的换算是同一形状。
    return createSongSyncFingerprint(song);
};

/** 本地存储的键（`beat_this_grid_` + 分析键）。 */
export const beatGridStorageKey = (analysisKey: string): string => `${BEAT_GRID_PREFIX}${analysisKey}`;

/** 从本地存储键里取回分析键。 */
export const beatGridAnalysisKeyFromStorageKey = (storageKey: string): string | null => (
    storageKey.startsWith(BEAT_GRID_PREFIX) ? storageKey.slice(BEAT_GRID_PREFIX.length) : null
);
