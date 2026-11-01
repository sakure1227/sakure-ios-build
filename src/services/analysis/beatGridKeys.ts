// src/services/analysis/beatGridKeys.ts
// The storage key prefixes of the stored beat lists. A module of its own, importing nothing, so services/repositories/cacheRepository.ts can route and categorise these keys
// without importing beatGrid.ts and, through it, the database it is part of. The drum hits htdemucs
// reads for 智能动感模式 (drumHits.ts) are kept beside them, for the same reason.

/** final0's lists, which automix and the beat FX share; the prefix they always had. */
export const BEAT_GRID_PREFIX = 'beat_this_grid_';

/**
 * small0's lists, from when the beat FX ran it: nothing reads them now, but "clear analysis cache"
 * still clears them with the rest.
 */
const LEGACY_BEAT_GRID_PREFIXES = ['beat_this_small_grid_'] as const;

/** Whether `key` is a stored beat list, this version's or a legacy one. */
export const isBeatGridKey = (key: string): boolean =>
    [BEAT_GRID_PREFIX, ...LEGACY_BEAT_GRID_PREFIXES].some(prefix => key.startsWith(prefix));

/**
 * 节拍表存下来了之后发的事件名。
 *
 * 同步层听它，把新存下来的表推到服务器（`src/services/sync/beatGridRepository.ts`）。
 *
 * 为什么用事件而不是直接调用同步层：`beatGrid.ts` 是**底层**模块（它自己就住在
 * 数据库那一层），直接 import 同步层会把 sync → analysis → sync 的环拉进来。
 * 事件是单向的：这里发，同步层听，两边互不知道对方。
 *
 * 常量放在这个无依赖的模块里，就是为了让同步层能拿到它而不必碰 `beatGrid.ts`。
 */
export const BEAT_GRID_STORED_EVENT = 'folia-beat-grid-stored';

/** A track's drum hits off htdemucs' drum stem (drumHits.ts); the version is part of the prefix. */
export const DRUM_HITS_PREFIX = 'drum_hits_v1_';

/** Whether `key` is a track's stored drum hits. */
export const isDrumHitsKey = (key: string): boolean => key.startsWith(DRUM_HITS_PREFIX);
