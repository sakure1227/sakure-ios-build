// src/services/customSource/types.ts
//
// The LX Music custom source protocol, as Sakure sees it.
//
// A source script declares which music platforms it can handle and, for each of them, which
// actions it supports. The protocol has three actions and no search: a custom source strengthens
// what a built-in provider already found (the playback address, the lyrics, the cover), it never
// searches on its own.

/** The music platforms a custom source may declare. These are LX Music's platform ids. */
export const CUSTOM_SOURCE_PLATFORMS = ['kw', 'kg', 'tx', 'wy', 'mg', 'local'] as const;

export type CustomSourcePlatform = (typeof CUSTOM_SOURCE_PLATFORMS)[number];

/** The three actions the protocol defines. */
export const CUSTOM_SOURCE_ACTIONS = ['musicUrl', 'lyric', 'pic'] as const;

export type CustomSourceAction = (typeof CUSTOM_SOURCE_ACTIONS)[number];

/** The audio qualities a source may declare. */
export const CUSTOM_SOURCE_QUALITIES = ['128k', '320k', 'flac', 'flac24bit'] as const;

export type CustomSourceQuality = (typeof CUSTOM_SOURCE_QUALITIES)[number];

/** What a source declared for one platform. */
export interface CustomSourcePlatformCapability {
    type: 'music';
    actions: CustomSourceAction[];
    qualitys: CustomSourceQuality[];
}

/** The capability map a source reports when it initialises. */
export type CustomSourceCapabilityMap = Partial<Record<CustomSourcePlatform, CustomSourcePlatformCapability>>;

/**
 * Why a request to the sources came back with nothing.
 *
 * The cases say different things to the user, so they are kept apart instead of all being "no
 * answer": "no-source" means the feature is not in use at all (nothing to complain about),
 * "unsupported-platform" means the installed sources do not cover this platform,
 * "not-ready" means a source is installed but its script has not started, "rate-limited" means the
 * source's own service is busy and said so (waiting helps), and "no-answer" means the sources were
 * asked and could not deliver - the one case that is worth a word on screen.
 */
export type CustomSourceMissReason =
    | 'no-source'
    | 'unsupported-platform'
    | 'not-ready'
    | 'rate-limited'
    | 'no-answer'
    | 'unknown-platform';

/** The answer of a request to the sources. */
export type CustomSourceAnswer =
    | { sourceId: string; result: CustomSourceResult; reason?: undefined }
    | { sourceId: null; result: null; reason: CustomSourceMissReason };

/** One imported source, as the renderer sees it. */
export interface CustomSourceEntry {
    id: string;
    name: string;
    description: string;
    author: string;
    homepage: string;
    version: string;
    /** Whether the user has it switched on. */
    enabled: boolean;
    /** Whether the source may show an update notice. */
    allowShowUpdateAlert: boolean;
    /** Whether the script window is up and the script has declared its capabilities. */
    running: boolean;
    /** What the script declared; null while it has not initialised. */
    sources: CustomSourceCapabilityMap | null;
}

/** The request a source script receives. */
export interface CustomSourceRequestInfo {
    source: string;
    action: CustomSourceAction;
    info: Record<string, unknown>;
}

/** The playback address a source hands back for `musicUrl`. */
export interface CustomSourceMusicUrlResult {
    source: string;
    action: 'musicUrl';
    data: {
        type: string;
        url: string;
    };
}

/** The lyrics a source hands back for `lyric`. */
export interface CustomSourceLyricResult {
    source: string;
    action: 'lyric';
    data: {
        lyric: string;
        tlyric: string | null;
        rlyric: string | null;
        lxlyric: string | null;
    };
}

/** The cover address a source hands back for `pic`. */
export interface CustomSourcePicResult {
    source: string;
    action: 'pic';
    data: string;
}

export type CustomSourceResult =
    | CustomSourceMusicUrlResult
    | CustomSourceLyricResult
    | CustomSourcePicResult;
