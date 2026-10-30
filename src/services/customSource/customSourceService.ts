// src/services/customSource/customSourceService.ts
//
// The renderer's side of the LX Music custom source protocol.
//
// The scripts themselves run in hidden windows in the main process; everything here goes through
// the preload bridge. The browser build has no such bridge, so every call reports "not available"
// rather than throwing - the page then hides the whole custom source section.
//
// A note on what a custom source can and cannot do: the protocol has three actions (musicUrl,
// lyric, pic) and no search. Searching always belongs to a built-in provider. A custom source
// only strengthens a song that was already found.

import type {
    CustomSourceAction,
    CustomSourceAnswer,
    CustomSourceEntry,
    CustomSourcePlatform,
    CustomSourceResult,
} from './types';

const bridge = () => (typeof window !== 'undefined' ? window.electron?.customSource : undefined);

/** Whether the desktop app's bridge is there. The web build has none. */
export const isCustomSourceAvailable = (): boolean => bridge() != null;

/** Every imported source, with its run state. */
export const listCustomSources = async (): Promise<CustomSourceEntry[]> => {
    const api = bridge();
    if (!api) return [];
    return api.list();
};

/** Imports a script; the raw text of an LX Music custom source file. */
export const importCustomSource = async (script: string): Promise<CustomSourceEntry> => {
    const api = bridge();
    if (!api) throw new Error('自定义源功能仅在桌面端可用');
    return api.importScript(script);
};

/**
 * Imports a script from a URL.
 *
 * The fetch happens in the main process, not here: a renderer's fetch carries neither the system
 * proxy nor the system certificate chain, and the hosts these scripts live on (raw.githubusercontent
 * .com, ghproxy mirrors, ...) usually need one of the two. The URL is validated before anything is
 * downloaded, and the answer has to be a script - a page that happens to sit at the address is
 * refused by the store.
 */
export const importCustomSourceFromUrl = async (url: string): Promise<CustomSourceEntry> => {
    const api = bridge();
    if (!api) throw new Error('自定义源功能仅在桌面端可用');
    return api.importScriptFromUrl(url);
};

/** Removes sources. */
export const removeCustomSources = async (ids: string[]): Promise<CustomSourceEntry[]> => {
    const api = bridge();
    if (!api) return [];
    return api.remove(ids);
};

/** Switches a source on or off. A source that is switched on starts its script window. */
export const setCustomSourceEnabled = async (id: string, enabled: boolean): Promise<CustomSourceEntry[]> => {
    const api = bridge();
    if (!api) return [];
    return api.setEnabled(id, enabled);
};

/** Whether a source may show an update notice. */
export const setCustomSourceAllowUpdateAlert = async (id: string, allow: boolean): Promise<CustomSourceEntry[]> => {
    const api = bridge();
    if (!api) return [];
    return api.setAllowUpdateAlert(id, allow);
};

/** Opens the script window's developer tools. */
export const openCustomSourceDevTools = async (id: string): Promise<void> => {
    await bridge()?.openDevTools(id);
};

/** Opens the source's homepage in the browser. */
export const openCustomSourceHomepage = async (url: string): Promise<void> => {
    await bridge()?.openHomepage(url);
};

/**
 * Asks every ready source to handle the request, one after another, until one answers.
 *
 * Returns null when the bridge is not there (the web build). Otherwise the answer says who
 * answered, or why nobody did - the reason is what lets the caller tell "no source installed"
 * apart from "the sources could not deliver", which the user needs to see differently.
 */
export const requestFromCustomSources = async (
    action: CustomSourceAction,
    info: Record<string, unknown>,
): Promise<CustomSourceAnswer | null> => {
    const api = bridge();
    if (!api) return null;
    try {
        const answer = await api.requestFromAny(action, info) as CustomSourceAnswer | null;
        if (!answer) return { sourceId: null, result: null, reason: 'no-source' };
        return answer;
    } catch {
        // A source that throws is that source's problem; the built-in path still works.
        return { sourceId: null, result: null, reason: 'no-answer' };
    }
};

/**
 * Asks for a playback address.
 *
 * The built-in provider's answer comes first: a custom source is a supplement, not a replacement.
 * Only when the built-in one has nothing does this try the sources.
 */
export const resolveCustomSourceMusicUrl = async (
    info: Record<string, unknown>,
): Promise<string | null> => {
    const answer = await requestFromCustomSources('musicUrl', info);
    const result = answer?.result;
    if (!result || result.action !== 'musicUrl') return null;
    const url = result.data?.url;
    return typeof url === 'string' && url ? url : null;
};

/**
 * A real song to ask a source about.
 *
 * The point of the test is to find out whether the source still answers, so it has to ask about
 * a song the source can actually find. A made-up name ("test") is answered with "no such song"
 * by every source that works properly - which would say nothing about the source at all.
 *
 * This one is a well-known old song that is free on every platform, present in every catalogue,
 * and unlikely to ever be pulled. The fields are the ones the LX protocol passes along; a source
 * that looks a song up by name and singer needs them to be right (get the interval wrong and the
 * source will not match it).
 *
 * The song is not the only thing a source can lack: some tracks are simply not in a source's
 * catalogue, and then the source says "I do not have it" for a song that is perfectly fine. The
 * list below has a few, so one that does not work does not decide the whole test.
 */
export const CUSTOM_SOURCE_TEST_SONGS = [
    { id: '347230', songmid: '347230', name: '海阔天空', singer: 'Beyond', albumName: '海阔天空', interval: '5:26' },
    { id: '209058', songmid: '209058', name: '坐立不安', singer: '蔡健雅', albumName: '双栖动物', interval: '4:14' },
    { id: '33894312', songmid: '33894312', name: '不要说话', singer: '陈奕迅', albumName: '不想放手', interval: '4:10' },
] as const;

/** The song the test asks about first. */
export const CUSTOM_SOURCE_TEST_SONG = CUSTOM_SOURCE_TEST_SONGS[0];

/**
 * Asks one source for a playback address, to see whether it still works.
 *
 * The list says a source is "running" when its script has started - but a script that started is
 * not the same as a source that answers. The script's own service can be down (this happens: the
 * community sources come and go), and the only way to tell the two apart is to ask it.
 *
 * Several songs are tried in turn: a source that does not have one particular song says so
 * truthfully, and that must not be read as "the source is broken". A source that has none of
 * them is a source that is not working.
 *
 * `platform` is the LX Music platform id to ask about ('wy' and so on).
 */
export const testCustomSource = async (
    id: string,
    platform: CustomSourcePlatform = 'wy',
): Promise<{ ok: boolean; url: string | null; reason: string | null }> => {
    const api = bridge();
    if (!api) return { ok: false, url: null, reason: 'unavailable' };
    let lastReason = 'no-answer';
    for (const song of CUSTOM_SOURCE_TEST_SONGS) {
        try {
            const answer = await api.request(id, platform, 'musicUrl', {
                type: '128k',
                musicInfo: { ...song, source: platform },
            }) as CustomSourceResult | null;
            const read = readCustomSourceTestAnswer(answer);
            if (read.ok) return read;
            lastReason = read.reason ?? lastReason;
        } catch (error) {
            lastReason = readCustomSourceTestFailure(error);
        }
    }
    return { ok: false, url: null, reason: lastReason };
};

/**
 * What a test answer means: whether the source answered with a usable address, and why not when
 * it did not.
 *
 * Kept apart from the request so the rule is testable without a bridge: a source that answers
 * with something that is not an http address has not answered, and saying so is the whole point
 * of the test.
 */
export const readCustomSourceTestAnswer = (
    answer: CustomSourceResult | null | undefined,
): { ok: boolean; url: string | null; reason: string | null } => {
    if (!answer || answer.action !== 'musicUrl') return { ok: false, url: null, reason: 'no-answer' };
    const url = answer.data?.url;
    if (typeof url !== 'string' || !/^https?:/.test(url)) return { ok: false, url: null, reason: 'no-answer' };
    return { ok: true, url, reason: null };
};

/**
 * What a failed test means, in words the user can act on.
 *
 * The failure arrives from the main process, and Electron wraps it on the way: "Error invoking
 * remote method 'sakure-cs-request': Error: ..." - that prefix is plumbing, and the user has
 * no idea what a "remote method" is. What is worth showing is what the source itself said
 * (a source that has a service of its own puts its own words in the message).
 *
 * Kept apart from the request so the rule is testable without a bridge.
 */
export const readCustomSourceTestFailure = (
    error: unknown,
): string => {
    const raw = error instanceof Error ? error.message : String(error);
    // Electron 的包装：Error invoking remote method 'sakure-cs-request': Error: <真正的原因>
    const unwrapped = raw
        .replace(/^Error invoking remote method '[^']*':\s*/, '')
        .replace(/^Error:\s*/, '')
        .trim();
    return unwrapped || 'unknown';
};

/**
 * Asks for lyrics.
 *
 * The lyrics come back in LX Music's shape (lyric / tlyric / rlyric / lxlyric). The caller
 * decides what to do with them; the built-in provider's lyrics stay first.
 */
export const resolveCustomSourceLyric = async (
    info: Record<string, unknown>,
): Promise<{ lyric: string; tlyric: string | null; rlyric: string | null; lxlyric: string | null } | null> => {
    const answer = await requestFromCustomSources('lyric', info);
    const result = answer?.result;
    if (!result || result.action !== 'lyric') return null;
    const data = result.data;
    if (!data || typeof data.lyric !== 'string' || !data.lyric) return null;
    return {
        lyric: data.lyric,
        tlyric: data.tlyric ?? null,
        rlyric: data.rlyric ?? null,
        lxlyric: data.lxlyric ?? null,
    };
};

/** Asks for a cover address. */
export const resolveCustomSourcePic = async (
    info: Record<string, unknown>,
): Promise<string | null> => {
    const answer = await requestFromCustomSources('pic', info);
    const result = answer?.result;
    if (!result || result.action !== 'pic') return null;
    const url = result.data;
    return typeof url === 'string' && url ? url : null;
};
