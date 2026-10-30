import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    buildCustomSourceRequestInfo,
    getCustomSourcePlatform,
} from '../../../src/services/customSource/songMapping';

// test/unit/electron/customSource.test.ts
// The LX Music custom source protocol on Sakure's side: how a script's metadata is read, how it
// is stored, and how a song is mapped onto the LX Music song a script expects.

const require = createRequire(import.meta.url);

const {
    CustomSourceRuntime,
    setRetryWaiter,
} = require('../../../electron/customSource/runtime.cjs') as {
    CustomSourceRuntime: new (options: { store: { getAll: () => Array<{ id: string; name: string; enabled: boolean }> } }) => {
        /** 已挂上的源：一个时能项被可以直接注进来，不用真起一个隐藏窗口。 */
        sources: Map<string, { window: { webContents: { send: (channel: string, payload: unknown) => void } }; ready: boolean; info: unknown }>;
        handleResponse: (id: string, payload: unknown) => void;
        requestFromAny: (action: string, info: unknown) => Promise<{ sourceId: string; result: unknown } | null>;
    };
    /** 换掉重试之间的等待——单测里不该真的睡三秒。 */
    setRetryWaiter: (fn: (ms: number) => Promise<void>) => void;
};

// 重试之间的等待在单测里是假的：节奏是逻辑的一部分，真的睡三秒不是。
beforeEach(() => {
    setRetryWaiter(async () => {});
});

/** 一个不真起窗口的运行时实例，用来读出请求路由的行为。 */
type FakeRuntime = InstanceType<typeof CustomSourceRuntime>;

const {
    CustomSourceStore,
    parseScriptInfo,
    deflateScript,
    inflateScript,
} = require('../../../electron/customSource/store.cjs') as {
    CustomSourceStore: new (store: unknown) => {
        getAll: () => Array<{ id: string; name: string; enabled: boolean }>;
        importScript: (script: string) => Promise<{ id: string; name: string; description: string; enabled: boolean }>;
        getScript: (id: string) => Promise<string>;
        remove: (ids: string[]) => void;
        setEnabled: (id: string, enabled: boolean) => void;
        setAllowShowUpdateAlert: (id: string, allow: boolean) => void;
    };
    parseScriptInfo: (script: string) => { name: string; description: string; author: string; version: string };
    deflateScript: (script: string) => Promise<string>;
    inflateScript: (script: string) => Promise<string>;
};

const {
    buildResponse,
} = require('../../../electron/customSource/http.cjs') as {
    buildResponse: (
        res: { statusCode: number; statusMessage: string; headers: Record<string, string> },
        raw: Buffer,
    ) => { response: { statusCode: number; headers: Record<string, string>; body: unknown }; body: unknown };
};

const {
    parseImportUrl,
    importSourceFromUrl,
    MAX_SCRIPT_BYTES,
} = require('../../../electron/customSource/importUrl.cjs') as {
    parseImportUrl: (url: unknown) => string;
    importSourceFromUrl: (options: {
        url: unknown;
        request: (params: Record<string, unknown>) => Promise<{ error?: string; response?: { statusCode?: number }; body?: unknown }>;
        store: { importScript: (script: string) => Promise<{ id: string; name: string }> };
    }) => Promise<{ id: string; name: string }>;
    MAX_SCRIPT_BYTES: number;
};

/** A store that keeps its values in a Map, like electron-store does. */
function createFakeStore(initial: Record<string, unknown> = {}) {
    const values = new Map<string, unknown>(Object.entries(initial));
    return {
        get: (key: string) => values.get(key),
        set: (key: string, value: unknown) => {
            values.set(key, value);
        },
        raw: values,
    };
}

const SCRIPT = `/*
 * @name 测试源
 * @description 这是一个测试用的自定义源
 * @author 某人
 * @version 1.2.3
 * @homepage https://example.com
 */
lx.send('inited', { status: true, sources: {} })
`;

describe('customSource script metadata', () => {
    it('reads the header block of a script', () => {
        const info = parseScriptInfo(SCRIPT);
        expect(info.name).toBe('测试源');
        expect(info.description).toBe('这是一个测试用的自定义源');
        expect(info.author).toBe('某人');
        expect(info.version).toBe('1.2.3');
    });

    it('refuses a script with no header block', () => {
        expect(() => parseScriptInfo('lx.send("inited", {})')).toThrow(/无效的自定义源文件/);
    });

    it('gives a script with no name a generated one', () => {
        const info = parseScriptInfo('/*\n * @description 只有描述\n */\n');
        expect(info.name.length).toBeGreaterThan(0);
        expect(info.description).toBe('只有描述');
    });

    it('truncates an over-long name the way LX Music does', () => {
        const longName = 'x'.repeat(80);
        const info = parseScriptInfo(`/*\n * @name ${longName}\n */\n`);
        expect(info.name.length).toBeLessThan(longName.length);
        expect(info.name.endsWith('...')).toBe(true);
    });
});

describe('customSource script storage', () => {
    it('stores a script compressed and reads it back whole', async () => {
        const store = new CustomSourceStore(createFakeStore());
        const entry = await store.importScript(SCRIPT);
        expect(entry.name).toBe('测试源');
        expect(entry.enabled).toBe(true);
        // The stored form is gz_+base64, the same shape LX Music uses.
        const stored = store.getAll();
        expect(stored).toHaveLength(1);
        const raw = (store as unknown as { scripts: Map<string, string> }).scripts.get(entry.id);
        expect(raw?.startsWith('gz_')).toBe(true);
        expect(await store.getScript(entry.id)).toBe(SCRIPT);
    });

    it('round-trips through deflate and inflate', async () => {
        const compressed = await deflateScript(SCRIPT);
        expect(compressed.startsWith('gz_')).toBe(true);
        expect(await inflateScript(compressed)).toBe(SCRIPT);
        // A plain script passes through untouched, so a script saved by another version still loads.
        expect(await inflateScript(SCRIPT)).toBe(SCRIPT);
    });

    it('refuses a script identical to one already imported', async () => {
        const store = new CustomSourceStore(createFakeStore());
        await store.importScript(SCRIPT);
        await expect(store.importScript(SCRIPT)).rejects.toThrow(/内容与已有的源/);
    });

    it('removes a source and its script', async () => {
        const store = new CustomSourceStore(createFakeStore());
        const entry = await store.importScript(SCRIPT);
        store.remove([entry.id]);
        expect(store.getAll()).toHaveLength(0);
        await expect(store.getScript(entry.id)).rejects.toThrow(/不存在/);
    });

    it('switches a source on and off', async () => {
        const store = new CustomSourceStore(createFakeStore());
        const entry = await store.importScript(SCRIPT);
        store.setEnabled(entry.id, false);
        expect(store.getAll()[0].enabled).toBe(false);
        store.setEnabled(entry.id, true);
        expect(store.getAll()[0].enabled).toBe(true);
    });

    it('reads sources back from storage after a restart', async () => {
        const fake = createFakeStore();
        const first = new CustomSourceStore(fake);
        const entry = await first.importScript(SCRIPT);
        // A fresh instance over the same storage, as a new run of the app would see.
        const second = new CustomSourceStore(fake);
        expect(second.getAll()).toHaveLength(1);
        expect(second.getAll()[0].id).toBe(entry.id);
        expect(await second.getScript(entry.id)).toBe(SCRIPT);
    });
});

describe('customSource song mapping', () => {
    const song = {
        id: '123456',
        name: '测试歌曲',
        artists: [{ name: '歌手甲' }, { name: '歌手乙' }],
        album: { id: 'al-1', name: '专辑' },
        durationMs: 235000,
        sourceRef: {
            kind: 'online' as const,
            providerId: 'netease' as never,
            mediaId: '987654',
        },
    };

    it('maps a NetEase song onto the wy platform', () => {
        expect(getCustomSourcePlatform(song as never)).toBe('wy');
    });

    it('maps a song with no online source onto nothing', () => {
        expect(getCustomSourcePlatform({ ...song, sourceRef: { kind: 'local', mediaId: 'x' } } as never)).toBeNull();
    });

    it('builds the LX Music song a script expects', () => {
        const request = buildCustomSourceRequestInfo(song as never, '320k');
        // 洛雪的自定义源脚本收到的是旧版扁平结构：字段平铺在顶层，不是 meta 里。
        expect(request?.type).toBe('320k');
        expect(request?.musicInfo.source).toBe('wy');
        expect(request?.musicInfo.name).toBe('测试歌曲');
        expect(request?.musicInfo.singer).toBe('歌手甲, 歌手乙');
        expect(request?.musicInfo.interval).toBe('03:55');
        expect(request?.musicInfo.songmid).toBe('987654');
        expect(request?.musicInfo.albumName).toBe('专辑');
        expect(request?.musicInfo.albumId).toBe('al-1');
        // 新版的 meta 结构不在其中：脚本读不到它，就不该假装有。
        expect(request?.musicInfo.meta).toBeUndefined();
    });

    it('formats a length over an hour as h:mm:ss', () => {
        const request = buildCustomSourceRequestInfo({ ...song, durationMs: 3725000 } as never, '320k');
        expect(request?.musicInfo.interval).toBe('1:02:05');
    });

    it('puts the quality and the song into the request info', () => {
        const request = buildCustomSourceRequestInfo(song as never, 'flac');
        expect(request?.type).toBe('flac');
        expect(request?.musicInfo.source).toBe('wy');
        expect(request?.musicInfo.name).toBe('测试歌曲');
    });

    it('gives no request info for a local song', () => {
        expect(buildCustomSourceRequestInfo({ ...song, sourceRef: { kind: 'local', mediaId: 'x' } } as never)).toBeNull();
    });

    it('names each platform\'s own identifiers the way that platform does', () => {
        // 酷狗靠 hash 认歌，QQ 播放地址要 file 里的 media mid，酷我要数字 rid。
        const kugou = buildCustomSourceRequestInfo({
            ...song,
            sourceRef: {
                kind: 'online' as const,
                providerId: 'kugou' as never,
                mediaId: 'HASH123',
                providerData: { hash: 'HASH123', mixSongId: 'mix-1' },
            },
        } as never, '320k');
        expect(kugou?.musicInfo.songmid).toBe('HASH123');
        expect(kugou?.musicInfo.hash).toBe('HASH123');
        expect(kugou?.musicInfo.albumAudioId).toBe('mix-1');

        const qq = buildCustomSourceRequestInfo({
            ...song,
            sourceRef: {
                kind: 'online' as const,
                providerId: 'qq' as never,
                mediaId: 'MID-1',
                providerData: { songMid: 'MID-1', mediaMid: 'MEDIA-1', songId: 5105918 },
            },
        } as never, '320k');
        expect(qq?.musicInfo.songmid).toBe('MID-1');
        expect(qq?.musicInfo.strMediaMid).toBe('MEDIA-1');
        expect(qq?.musicInfo.songId).toBe('5105918');

        const kuwo = buildCustomSourceRequestInfo({
            ...song,
            sourceRef: {
                kind: 'online' as const,
                providerId: 'kuwo' as never,
                mediaId: 'MUSIC_123',
                providerData: { musicRid: '123', rid: '456' },
            },
        } as never, '320k');
        expect(kuwo?.musicInfo.songmid).toBe('123');
        expect(kuwo?.musicInfo.rid).toBe('456');
    });
});

describe('customSource url import', () => {
    describe('parseImportUrl', () => {
        it('accepts an http or https url, trimmed', () => {
            expect(parseImportUrl('  https://example.com/source.js  ')).toBe('https://example.com/source.js');
            expect(parseImportUrl('http://example.com/source.js')).toBe('http://example.com/source.js');
        });

        it('refuses anything that is not a non-empty string', () => {
            expect(() => parseImportUrl('')).toThrow(/链接为空/);
            expect(() => parseImportUrl('   ')).toThrow(/链接为空/);
            expect(() => parseImportUrl(undefined)).toThrow(/链接为空/);
            expect(() => parseImportUrl(42)).toThrow(/链接为空/);
        });

        it('refuses a malformed url', () => {
            expect(() => parseImportUrl('not a url')).toThrow(/链接格式无效/);
        });

        it('refuses a scheme that is not http or https', () => {
            expect(() => parseImportUrl('file:///etc/passwd')).toThrow(/只支持 http\/https/);
            expect(() => parseImportUrl('javascript:alert(1)')).toThrow(/只支持 http\/https/);
        });
    });

    describe('importSourceFromUrl', () => {
        /** A request that answers with a canned body, like http.cjs's performRequest would. */
        const fakeRequest = (body: unknown, statusCode = 200) => async () => ({ response: { statusCode }, body });

        it('imports the script the url hands back', async () => {
            const store = new CustomSourceStore(createFakeStore());
            const entry = await importSourceFromUrl({
                url: 'https://example.com/source.js',
                request: fakeRequest(SCRIPT),
                store,
            });
            expect(entry.name).toBe('测试源');
            expect(store.getAll()).toHaveLength(1);
        });

        it('reports a transport error with its reason', async () => {
            const request = async () => ({ error: 'net::ERR_CONNECTION_REFUSED' });
            await expect(importSourceFromUrl({ url: 'https://example.com/source.js', request, store: new CustomSourceStore(createFakeStore()) }))
                .rejects.toThrow(/下载失败: net::ERR_CONNECTION_REFUSED/);
        });

        it('reports a non-200 status', async () => {
            await expect(importSourceFromUrl({ url: 'https://example.com/source.js', request: fakeRequest('not found', 404), store: new CustomSourceStore(createFakeStore()) }))
                .rejects.toThrow(/下载失败: HTTP 404/);
        });

        it('refuses an empty body', async () => {
            await expect(importSourceFromUrl({ url: 'https://example.com/source.js', request: fakeRequest('  \n '), store: new CustomSourceStore(createFakeStore()) }))
                .rejects.toThrow(/内容为空/);
        });

        it('refuses a body that is not a script, the way a page at the address would be', async () => {
            await expect(importSourceFromUrl({ url: 'https://example.com/', request: fakeRequest('<html><body>hi</body></html>'), store: new CustomSourceStore(createFakeStore()) }))
                .rejects.toThrow(/无效的自定义源文件/);
        });

        it('refuses an oversized body', async () => {
            const big = `/*\n * @name 大源\n */\n${'x'.repeat(MAX_SCRIPT_BYTES)}`;
            await expect(importSourceFromUrl({ url: 'https://example.com/source.js', request: fakeRequest(big), store: new CustomSourceStore(createFakeStore()) }))
                .rejects.toThrow(/脚本过大/);
        });

        it('validates the url before any request is made', async () => {
            let requested = false;
            const request = async () => {
                requested = true;
                return { response: { statusCode: 200 }, body: SCRIPT };
            };
            await expect(importSourceFromUrl({ url: 'file:///etc/passwd', request, store: new CustomSourceStore(createFakeStore()) }))
                .rejects.toThrow(/只支持 http\/https/);
            expect(requested).toBe(false);
        });
    });
});

// ---- 请求怎么走到源上去 ----
//
// 按协议的形状给的 info（{ type, musicInfo }，平台在 musicInfo.source）能不能找到对应的源，
// 是补源唯一的一次机会：平台认不出来就不是「答案不对」，而是一个源都没问。
describe('customSource request routing', () => {
    const newRuntime = (ids: readonly string[]): FakeRuntime => new CustomSourceRuntime({
        store: { getAll: () => ids.map(id => ({ id, name: `源 ${id}`, enabled: true })) },
    });

    /** 一个假源的窗口：把主进程发来的东西记下来，再由用例决定怎么回答。 */
    const mountSource = (
        runtime: FakeRuntime,
        id: string,
        options: {
            platforms: Record<string, { type: string; actions: string[]; qualitys: string[] }>;
            answer?: (requestKey: string, payload: { requestKey: string; data: { source: string; action: string; info: unknown } }) => void;
        },
    ) => {
        const sent: Array<{ requestKey: string; data: { source: string; action: string; info: unknown } }> = [];
        runtime.sources.set(id, {
            window: {
                webContents: {
                    send: (_channel, payload) => {
                        const request = payload as { requestKey: string; data: { source: string; action: string; info: unknown } };
                        sent.push(request);
                        options.answer?.(request.requestKey, request);
                    },
                },
            },
            ready: true,
            info: { sources: options.platforms },
        });
        return sent;
    };

    /** 一首歌加上要的音质：mappings 层给出去的就是这个形状（buildCustomSourceRequestInfo）。 */
    const lxInfo = (source: string) => ({
        type: '128k',
        musicInfo: { id: 'HASH1', name: '测试', singer: '某人', source, interval: '03:55', songmid: 'HASH1', hash: 'HASH1' },
    });

    const KG_SOURCE = { kg: { type: 'music', actions: ['musicUrl'], qualitys: ['128k'] } };
    const url = (requestKey: string, runtime: FakeRuntime, id: string, value: string) => runtime.handleResponse(id, {
        status: true,
        data: { requestKey, result: { source: 'kg', action: 'musicUrl', data: { type: '128k', url: value } } },
    });

    it('asks a source for a song the protocol hands over, platform included in the song', async () => {
        const runtime = newRuntime(['s1']);
        const sent = mountSource(runtime, 's1', {
            platforms: KG_SOURCE,
            answer: (key, _request) => url(key, runtime, 's1', 'https://example.com/a.m4a'),
        });

        const answer = await runtime.requestFromAny('musicUrl', lxInfo('kg'));
        expect(answer?.sourceId).toBe('s1');
        expect(sent).toHaveLength(1);
        // 脚本那边收到的还是落雪的形状：平台在外层，info 是 { type, musicInfo }。
        expect(sent[0].data.source).toBe('kg');
        expect(sent[0].data.action).toBe('musicUrl');
        expect(sent[0].data.info).toEqual(lxInfo('kg'));
    });

    it('asks nobody when the info names no platform', async () => {
        const runtime = newRuntime(['s1']);
        const sent = mountSource(runtime, 's1', { platforms: KG_SOURCE });
        // 答不上来时要说清为什么：平台都不知，谁支持哪个平台就无从判断。
        expect(await runtime.requestFromAny('musicUrl', { type: '128k', musicInfo: { songmid: 'HASH1' } }))
            .toEqual({ sourceId: null, result: null, reason: 'unknown-platform' });
        expect(sent).toHaveLength(0);
    });

    it('skips a source that does not serve that platform', async () => {
        const runtime = newRuntime(['s1']);
        const sent = mountSource(runtime, 's1', { platforms: KG_SOURCE });
        // 源装着的，但它不接这个平台：这不是「源坏了」，是「源不认这个平台」。
        expect(await runtime.requestFromAny('musicUrl', lxInfo('wy')))
            .toEqual({ sourceId: null, result: null, reason: 'unsupported-platform' });
        expect(sent).toHaveLength(0);
    });

    it('says the sources could not answer when they were asked and gave nothing', async () => {
        const runtime = newRuntime(['s1']);
        // 源接这个平台，也确实被问了，但它答不出来（脚本抛错或给不出地址）——
        // 这是最该让用户知道的一种：源自己坏了。
        mountSource(runtime, 's1', {
            platforms: KG_SOURCE,
            answer: (key) => runtime.handleResponse('s1', { status: false, message: 'failed', data: { requestKey: key } }),
        });
        expect(await runtime.requestFromAny('musicUrl', lxInfo('kg')))
            .toEqual({ sourceId: null, result: null, reason: 'no-answer' });
    });

    it('says no source is installed when there is none', async () => {
        const runtime = newRuntime([]);
        expect(await runtime.requestFromAny('musicUrl', lxInfo('kg')))
            .toEqual({ sourceId: null, result: null, reason: 'no-source' });
    });

    it('says the source has not started yet when it is installed but not up', async () => {
        const runtime = newRuntime(['s1']);
        // 装着的，但脚本还没起来（正在启动、或启动失败了）：这是暂时状态，不是源坏了。
        runtime.sources.set('s1', {
            window: { webContents: { send: () => {} } },
            ready: false,
            info: null,
        });
        expect(await runtime.requestFromAny('musicUrl', lxInfo('kg')))
            .toEqual({ sourceId: null, result: null, reason: 'not-ready' });
    });

    it('retries a source that says it is busy, and then reports it as limited', async () => {
        const runtime = newRuntime(['s1']);
        let attempts = 0;
        mountSource(runtime, 's1', {
            platforms: KG_SOURCE,
            answer: (key) => {
                attempts++;
                runtime.handleResponse('s1', {
                    status: false,
                    message: '请求过于频繁，请稍后重试 (429)',
                    data: { requestKey: key },
                });
            },
        });
        // 限流是可以重试的：源自己说了稍后重试。
        expect(await runtime.requestFromAny('musicUrl', lxInfo('kg')))
            .toEqual({ sourceId: null, result: null, reason: 'rate-limited' });
        expect(attempts).toBeGreaterThan(1);
    });

    it('does not retry a source that simply cannot answer', async () => {
        const runtime = newRuntime(['s1']);
        let attempts = 0;
        mountSource(runtime, 's1', {
            platforms: KG_SOURCE,
            answer: (key) => {
                attempts++;
                runtime.handleResponse('s1', {
                    status: false,
                    message: '获取失败 (500)',
                    data: { requestKey: key },
                });
            },
        });
        // 「这首歌它库里没有」重试也没用，不该白等。
        expect(await runtime.requestFromAny('musicUrl', lxInfo('kg')))
            .toEqual({ sourceId: null, result: null, reason: 'no-answer' });
        expect(attempts).toBe(1);
    });

    it('still honours a platform named beside the info, the way a hand-made request does', async () => {
        const runtime = newRuntime(['s1']);
        const sent = mountSource(runtime, 's1', {
            platforms: KG_SOURCE,
            answer: (key, _request) => url(key, runtime, 's1', 'https://example.com/b.m4a'),
        });
        const info = { source: 'kg', ...lxInfo('kg') };
        expect((await runtime.requestFromAny('musicUrl', info))?.sourceId).toBe('s1');
        // 送出去的仍是 info 自己：平台是挑源用的，不是替脚本补进去的。
        expect(sent[0].data.info).toEqual(info);
    });

    it('lets the next source answer when the first one fails', async () => {
        const runtime = newRuntime(['s1', 's2']);
        mountSource(runtime, 's1', { platforms: KG_SOURCE, answer: (key) => runtime.handleResponse('s1', { status: false, message: 'failed', data: { requestKey: key } }) });
        const second = mountSource(runtime, 's2', {
            platforms: KG_SOURCE,
            answer: (key, _request) => url(key, runtime, 's2', 'https://example.com/c.m4a'),
        });
        expect((await runtime.requestFromAny('musicUrl', lxInfo('kg')))?.sourceId).toBe('s2');
        expect(second).toHaveLength(1);
    });
});

// ---- 问源要哪一级音质 ----
//
// 源初始化时只声明自己能给哪几级（qualitys）。应用默认要 320k，而常见的补源只声明 128k——
// 照 320k 去问它就多半不给，补源这条白路的意义恰恰是「有一个地址就行」，比音质重要。
describe('customSource asked quality', () => {
    const newRuntime = (ids: readonly string[]): FakeRuntime => new CustomSourceRuntime({
        store: { getAll: () => ids.map(id => ({ id, name: `源 ${id}`, enabled: true })) },
    });

    /** 挂上一个只声明给定几级音质的源，返回它收到的请求。 */
    const mount = (runtime: FakeRuntime, qualitys: string[]) => {
        const sent: Array<{ data: { info: { type: string } } }> = [];
        runtime.sources.set('s1', {
            window: {
                webContents: {
                    send: (_channel, payload) => {
                        const request = payload as { requestKey: string; data: { info: { type: string } } };
                        sent.push(request);
                        runtime.handleResponse('s1', {
                            status: true,
                            data: { requestKey: request.requestKey, result: { source: 'kg', action: 'musicUrl', data: { type: request.data.info.type, url: 'https://example.com/x.m4a' } } },
                        });
                    },
                },
            },
            ready: true,
            info: { sources: { kg: { type: 'music', actions: ['musicUrl'], qualitys } } },
        });
        return sent;
    };

    const askedType = async (qualitys: string[], wanted: string) => {
        const runtime = newRuntime(['s1']);
        const sent = mount(runtime, qualitys);
        await runtime.requestFromAny('musicUrl', {
            type: wanted,
            musicInfo: { source: 'kg', songmid: 'HASH1', hash: 'HASH1' },
        });
        return sent[0]?.data.info.type;
    };

    it('asks the level the source declared when it cannot give the one that was wanted', async () => {
        // 默认要 320k，而源只给 128k：退到 128k，而不是照 320k 白问。
        expect(await askedType(['128k'], '320k')).toBe('128k');
        expect(await askedType(['128k'], 'flac')).toBe('128k');
    });

    it('keeps the wanted level when the source declared it', async () => {
        expect(await askedType(['128k', '320k', 'flac'], '320k')).toBe('320k');
        expect(await askedType(['128k'], '128k')).toBe('128k');
    });

    it('steps down no further than the source asked for, and never up past nothing', async () => {
        // 只给 128k 和 320k 的源，要 flac 时退到 320k（不高于要的那一级里最高的一级）。
        expect(await askedType(['128k', '320k'], 'flac')).toBe('320k');
        // 源声明的几级里没有要的那级、且都更高时，给它声明的最低一级。
        expect(await askedType(['flac', 'flac24bit'], '128k')).toBe('flac');
    });
});

// ---- 脚本拿到的响应长什么样 ----
//
// 社区脚本是照落雪的 needle 写的：要播放地址时读 `resp.body.code`，拿到的是已经解析好的对象。
// 只把 body 当作回调的第三个参数交出去的话，这些脚本读 `resp.body` 得到 undefined，跟着就在
// `.code` 上摔一跤——一个地址也拿不到，补源等于没有。
describe('customSource http bridge', () => {
    const answer = (headers: Record<string, string>, text: string) => buildResponse(
        { statusCode: 200, statusMessage: 'OK', headers },
        Buffer.from(text, 'utf8'),
    );

    it('carries the parsed body on the response, the way needle does', () => {
        const { response, body } = answer({ 'content-type': 'application/json' }, '{"code":0,"data":"https://a/b.m4a"}');
        expect(response.body).toEqual({ code: 0, data: 'https://a/b.m4a' });
        // 落雪里 resp.body 与回调的第三个参数本就是同一个值，这里也不是两份。
        expect(body).toBe(response.body);
    });

    it('leaves a body that is not JSON alone, instead of handing over a mangled object', () => {
        const html = '<html><body>hi</body></html>';
        expect(answer({ 'content-type': 'text/html' }, html).response.body).toBe(html);
    });

    it('parses a JSON body whatever the response says it is', () => {
        // 落雪不看内容类型，能解析就解析：国内的接口把 JSON 配成 text/plain 返回的不在少数，
        // 照内容类型判断就会把这些接口的结果原样交出去，脚本一个字段也读不到。
        // 类型写出来：空对象与带 content-type 的对象混在一个数组里，推断出来的类型是
        // 「content-type?: undefined」，塞不进 Record<string, string>。
        const headerSets: Record<string, string>[] = [{}, { 'content-type': 'text/plain; charset=utf-8' }];
        for (const headers of headerSets) {
            const { response } = answer(headers, '{"code":0,"data":"https://a/b.m4a"}');
            expect(response.body).toEqual({ code: 0, data: 'https://a/b.m4a' });
        }
    });

    it('reads a bare number the way upstream does, rather than second-guessing it', () => {
        // 「12345」是合法 JSON，落雪会把它读成 12345。脚本是照这个写的，替它改口径才是错的那一个。
        expect(answer({ 'content-type': 'text/plain' }, '12345').response.body).toBe(12345);
    });

    it('falls back to the text when a body said JSON but is not', () => {
        const broken = '{"code":0,';
        expect(answer({ 'content-type': 'application/json' }, broken).response.body).toBe(broken);
    });

    it('keeps the status and the headers a script may read', () => {
        const { response } = answer({ 'content-type': 'application/json', 'set-cookie': 'a=1' }, '{}');
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('application/json');
    });
});
