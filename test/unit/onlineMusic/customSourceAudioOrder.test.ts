import { afterEach, describe, expect, it, vi } from 'vitest';

// test/unit/onlineMusic/customSourceAudioOrder.test.ts
// 播放地址先问谁：常规平台是内置 provider 先答、补源兜底；靠补源听歌的那一家反过来——
// 先问补源，源给不出地址才回到这首歌自己那个平台（平台自己声明，共用层不认平台）。
//
// 补源那一路在 node 里没有桥（window.electron.customSource 不存在），一律答不上来，
// 所以这里把它换成可控的假：只关心「先问谁、问到就走谁的」，不碰脚本与窗口。
//
// 假返回的是完整的样子（url + 为什么没有），因为补源答不上来时它会带一个原因回去，
// 播放链路要靠这个原因才知道该不该告诉用户「源没在干活」。

vi.mock('@/services/customSource/audioFallback', () => ({
    toLxQuality: vi.fn(() => '128k'),
    resolveCustomSourceAudio: vi.fn(async () => ({ url: null, reason: null, sourceId: null })),
}));

// 提示本身在 sourceFailureNotice.test.ts 里单独测；这里只关心「有没有说」与「说的是什么」。
vi.mock('@/services/customSource/sourceFailureNotice', () => ({
    noteSourceFailure: vi.fn(() => false),
}));

import { omni } from '@/services/onlineMusic/omni';
import { registerOnlineMusicProvider, unregisterOnlineMusicProvider } from '@/services/onlineMusic/providerRegistry';
import { useOnlineProviderAccountStore } from '@/stores/useOnlineProviderAccountStore';
import { resolveCustomSourceAudio } from '@/services/customSource/audioFallback';
import { noteSourceFailure } from '@/services/customSource/sourceFailureNotice';
import type { UnifiedSong } from '@/types';
import type { OnlineMusicProvider, ProviderCapabilities } from '@/types/onlineMusic';

const ownerId = 'order-source-owner';
const aggregateId = 'order-aggregate';

const capabilities: ProviderCapabilities = {
    search: true, playback: true, lyrics: false, auth: false, userLibrary: false,
    playlists: false, albums: false, artists: false, recommendations: false,
    mutations: false, wordByWordLyrics: false,
};

const song = (owner: string, mediaId = '1'): UnifiedSong => ({
    id: mediaId,
    name: `${owner}:${mediaId}`,
    artists: [],
    album: { id: '', name: '' },
    durationMs: 1,
    sourceRef: { kind: 'online', providerId: owner, mediaId },
});

type BuiltInAudioSource = NonNullable<OnlineMusicProvider['playback']>['getAudioSource'];

/** 一首歌真正属于的那个平台：播放地址它自己会给。 */
const ownerOf = (getAudioSource: BuiltInAudioSource): OnlineMusicProvider => ({
    id: ownerId,
    displayName: ownerId,
    capabilities,
    normalizeSong: raw => song(ownerId, String((raw as { id?: string }).id || '1')),
    playback: { getSongDetail: async mediaId => song(ownerId, String(mediaId)), getAudioSource },
});

/** 靠补源听歌的那一家：只声明「先问补源」，自己不给地址。 */
const aggregate = (): OnlineMusicProvider => ({
    id: aggregateId,
    displayName: aggregateId,
    capabilities: { ...capabilities, playback: false },
    normalizeSong: raw => song(aggregateId, String((raw as { id?: string }).id || '1')),
    prefersCustomSourceAudio: true,
});

const askedSource = vi.mocked(resolveCustomSourceAudio);
const useActive = (providerId: string) => useOnlineProviderAccountStore.getState().setActiveProviderId(providerId);

/** 源给出了一个地址。 */
const answered = (url: string) => ({ url, reason: null, sourceId: 'src-1' });
/** 源被问了却没答出地址（reason 带着「为什么」，播放链路要靠它决定要不要告诉用户）。 */
const missed = (reason: 'no-answer' | 'no-source' | 'unsupported-platform' | 'not-ready' = 'no-answer') =>
    ({ url: null, reason, sourceId: null });

afterEach(() => {
    unregisterOnlineMusicProvider(ownerId);
    unregisterOnlineMusicProvider(aggregateId);
    useActive('netease');
    omni.invalidateActiveRequests();
    askedSource.mockReset();
    askedSource.mockResolvedValue(missed('no-source'));
    vi.mocked(noteSourceFailure).mockReset();
});

describe('the order the audio address is asked in', () => {
    it('asks a custom source first on a platform that lives off sources, and keeps its address', async () => {
        const builtIn = vi.fn(async () => ({ url: 'https://built-in/1', fetchedAt: 1, quality: 'standard' as const }));
        registerOnlineMusicProvider(ownerOf(builtIn));
        registerOnlineMusicProvider(aggregate());
        useActive(aggregateId);
        askedSource.mockResolvedValue(answered('https://source/1'));

        await expect(omni.getAudioSource(song(ownerId, '1'), 'standard')).resolves.toMatchObject({ url: 'https://source/1' });
        // 源给得出地址，内置那一路就不必再问。
        expect(builtIn).not.toHaveBeenCalled();
        expect(askedSource).toHaveBeenCalledTimes(1);
    });

    it('falls back to the song\'s own platform when a source has no address for it', async () => {
        const builtIn = vi.fn(async () => ({ url: 'https://built-in/1', fetchedAt: 1, quality: 'standard' as const }));
        registerOnlineMusicProvider(ownerOf(builtIn));
        registerOnlineMusicProvider(aggregate());
        useActive(aggregateId);
        askedSource.mockResolvedValue(missed('no-answer'));

        await expect(omni.getAudioSource(song(ownerId, '1'), 'standard')).resolves.toMatchObject({ url: 'https://built-in/1' });
        expect(builtIn).toHaveBeenCalledTimes(1);
        // 先问过一次就够了：源给不出地址就是给不出，不再问第二遍。
        expect(askedSource).toHaveBeenCalledTimes(1);
    });

    it('keeps the built-in provider first on a platform that does not say otherwise', async () => {
        const builtIn = vi.fn(async () => ({ url: 'https://built-in/1', fetchedAt: 1, quality: 'standard' as const }));
        registerOnlineMusicProvider(ownerOf(builtIn));
        useActive(ownerId);
        askedSource.mockResolvedValue(answered('https://source/1'));

        await expect(omni.getAudioSource(song(ownerId, '1'), 'standard')).resolves.toMatchObject({ url: 'https://built-in/1' });
        expect(builtIn).toHaveBeenCalledTimes(1);
        // 内置答了，补源就不必问。
        expect(askedSource).not.toHaveBeenCalled();
    });

    it('still asks a source when the built-in provider gives no address at all', async () => {
        const builtIn = vi.fn(async () => null);
        registerOnlineMusicProvider(ownerOf(builtIn));
        useActive(ownerId);
        askedSource.mockResolvedValue(answered('https://source/1'));

        await expect(omni.getAudioSource(song(ownerId, '1'), 'standard')).resolves.toMatchObject({ url: 'https://source/1' });
        expect(askedSource).toHaveBeenCalledTimes(1);
    });
});

// 源答不上来时用户该知道：他以为源在干活，其实它已经坏了。
//
// 这里是播放链路这一侧：它把「源没答出来」这件事报上去，附带原因。
// 「哪些原因值得说」是提示模块自己的事（sourceFailureNotice.test.ts 里有它的规矩），
// 这一层只负责把事实报准：报的是什么原因、是在等歌还是在预取。
describe('reporting that a custom source could not answer', () => {
    const builtInProvider = (builtIn: () => Promise<{ url: string; fetchedAt: number; quality: 'standard' } | null>) => {
        registerOnlineMusicProvider(ownerOf(vi.fn(builtIn)));
        registerOnlineMusicProvider(aggregate());
        useActive(aggregateId);
    };

    it('reports the reason when the source was asked and the built-in provider took over', async () => {
        builtInProvider(async () => ({ url: 'https://built-in/1', fetchedAt: 1, quality: 'standard' }));
        askedSource.mockResolvedValue(missed('no-answer'));

        await omni.getAudioSource(song(ownerId, '1'), 'standard');
        expect(noteSourceFailure).toHaveBeenCalledWith('no-answer', { scope: 'play' });
    });

    it('reports why the source could not answer, not just that it could not', async () => {
        builtInProvider(async () => ({ url: 'https://built-in/1', fetchedAt: 1, quality: 'standard' }));
        // 没装源与源坏了是两件事，用户要做的下一步也不同。
        askedSource.mockResolvedValue(missed('no-source'));

        await omni.getAudioSource(song(ownerId, '1'), 'standard');
        expect(noteSourceFailure).toHaveBeenCalledWith('no-source', { scope: 'play' });
    });

    it('says it while the prefetcher is asking too, marked as such', async () => {
        builtInProvider(async () => ({ url: 'https://built-in/1', fetchedAt: 1, quality: 'standard' }));
        askedSource.mockResolvedValue(missed('no-answer'));

        await omni.getAudioSource(song(ownerId, '1'), 'standard', 'prefetch');
        // 预取这一路由提示模块决定不打扰用户，但事实照样报上去。
        expect(noteSourceFailure).toHaveBeenCalledWith('no-answer', { scope: 'prefetch' });
    });

    it('reports nothing when nothing plays at all', async () => {
        // 内置源也没给出地址：这时候用户看到的是播放失败那条提示，源的事不必再叠一句。
        builtInProvider(async () => null);
        askedSource.mockResolvedValue(missed('no-answer'));

        await omni.getAudioSource(song(ownerId, '1'), 'standard');
        expect(noteSourceFailure).not.toHaveBeenCalled();
    });
});
