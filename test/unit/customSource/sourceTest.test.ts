import { describe, expect, it, vi } from 'vitest';

// test/unit/customSource/sourceTest.test.ts
// 「这个源还能不能用」——用户在自己的落雪里看到野花听不了歌，来这里想知道是自己装错了，
// 还是源本身坏了。这个问题只能靠「问它一次」来回答。
//
// 答不上来的几种情形要分开说：
//   - 给了一个不是地址的东西（脚本出错了，或者源改了自己的协议）→ 没答上来；
//   - 压根没回答 → 没答上来；
//   - 答了一个像样的地址 → 源还活着。

import { readCustomSourceTestAnswer, readCustomSourceTestFailure, testCustomSource, CUSTOM_SOURCE_TEST_SONG, CUSTOM_SOURCE_TEST_SONGS } from '@/services/customSource/customSourceService';
import type { CustomSourceResult } from '@/services/customSource/types';

const musicUrl = (url: unknown): CustomSourceResult => ({
    source: 'wy',
    action: 'musicUrl',
    data: { type: '128k', url: url as string },
});

describe('reading what a source answered when asked whether it still works', () => {
    it('says it works when the source gave a usable address', () => {
        expect(readCustomSourceTestAnswer(musicUrl('https://example.com/a.m4a')))
            .toEqual({ ok: true, url: 'https://example.com/a.m4a', reason: null });
    });

    it('says it did not answer when the answer is not an address', () => {
        // 脚本改了协议、或者自己算错了：这不是「地址」，不能当成能用。
        expect(readCustomSourceTestAnswer(musicUrl('not a url')))
            .toEqual({ ok: false, url: null, reason: 'no-answer' });
        expect(readCustomSourceTestAnswer(musicUrl('')))
            .toEqual({ ok: false, url: null, reason: 'no-answer' });
        expect(readCustomSourceTestAnswer(musicUrl(undefined)))
            .toEqual({ ok: false, url: null, reason: 'no-answer' });
    });

    it('says it did not answer when there is no answer at all', () => {
        expect(readCustomSourceTestAnswer(null))
            .toEqual({ ok: false, url: null, reason: 'no-answer' });
        expect(readCustomSourceTestAnswer(undefined))
            .toEqual({ ok: false, url: null, reason: 'no-answer' });
    });

    it('says it did not answer when the answer is about something else', () => {
        const lyric: CustomSourceResult = {
            source: 'wy',
            action: 'lyric',
            data: { lyric: 'x', tlyric: null, rlyric: null, lxlyric: null },
        };
        expect(readCustomSourceTestAnswer(lyric))
            .toEqual({ ok: false, url: null, reason: 'no-answer' });
    });

    it('accepts an http address as well as https', () => {
        expect(readCustomSourceTestAnswer(musicUrl('http://example.com/a.m4a')).ok).toBe(true);
    });
});

// 失败信息从主进程回来，路上被 Electron 包了一层。那层包装是给开发者看的：
// 用户看到「Error invoking remote method 'sakure-cs-request'」只会一头雾水。
// 要给他看的是源自己说的话——源有自己的服务端，它的话才说得出问题在哪。
describe('turning a failed test into something the user can act on', () => {
    it('takes off the Electron wrapper and keeps what the source said', () => {
        expect(readCustomSourceTestFailure(new Error(
            "Error invoking remote method 'sakure-cs-request': Error: GD接口失败: GD接口状态200，未返回可用的服务器ip请稍后再试",
        ))).toBe('GD接口失败: GD接口状态200，未返回可用的服务器ip请稍后再试');
    });

    it('takes off a bare Error prefix as well', () => {
        expect(readCustomSourceTestFailure(new Error('Error: 连接超时'))).toBe('连接超时');
    });

    it('says something when there was nothing to keep', () => {
        expect(readCustomSourceTestFailure(new Error(''))).toBe('unknown');
        expect(readCustomSourceTestFailure(new Error("Error invoking remote method 'x': "))).toBe('unknown');
    });

    it('takes a plain string too', () => {
        expect(readCustomSourceTestFailure('boom')).toBe('boom');
    });

    it('leaves a message that never had the wrapper alone', () => {
        expect(readCustomSourceTestFailure(new Error('源没有回应'))).toBe('源没有回应');
    });
});

// 「测试这个源」问的是一首歌。用假名字问，源会答「没这首歌」——
// 那说的是歌不对，不是源坏了。源是照着歌名和歌手去找的，所以这两个字段得是真的。
describe('the song the test asks about', () => {
    it('names a real song, not a placeholder', () => {
        expect(CUSTOM_SOURCE_TEST_SONG.name).not.toBe('test');
        expect(CUSTOM_SOURCE_TEST_SONG.singer).not.toBe('test');
        expect(CUSTOM_SOURCE_TEST_SONG.songmid).not.toBe('test');
        expect(CUSTOM_SOURCE_TEST_SONG.name.length).toBeGreaterThan(0);
        expect(CUSTOM_SOURCE_TEST_SONG.singer.length).toBeGreaterThan(0);
    });

    it('carries the fields a source looks a song up by', () => {
        // 源要靠这几样去查歌：少了它们，源连「这首歌叫什么」都不知道。
        for (const field of ['id', 'songmid', 'name', 'singer', 'albumName', 'interval'] as const) {
            expect(CUSTOM_SOURCE_TEST_SONG[field]).toBeTruthy();
        }
    });

    it('has more than one song to try', () => {
        // 源可能没有某一首歌，但不代表它坏了。多问几首，一首没有不代表全部没有。
        expect(CUSTOM_SOURCE_TEST_SONGS.length).toBeGreaterThan(1);
        const names = CUSTOM_SOURCE_TEST_SONGS.map(song => song.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('asks songs whose fields are all filled in', () => {
        for (const song of CUSTOM_SOURCE_TEST_SONGS) {
            for (const field of ['id', 'songmid', 'name', 'singer', 'albumName', 'interval'] as const) {
                expect(song[field], `${song.name} 的 ${field}`).toBeTruthy();
            }
        }
    });
});

// 源可能没有某一首歌——星海源就取不到《晴天》，但《海阔天空》它有。
// 一首没有不代表源坏了，所以测试要接着问下一首。
describe('asking a source about more than one song', () => {
    it('moves on to the next song when one is not there', async () => {
        const asked: string[] = [];
        const api = {
            request: vi.fn(async (_id: string, _platform: string, _action: string, info: { musicInfo: { name: string } }) => {
                asked.push(info.musicInfo.name);
                // 第一首源没有，第二首有。
                return asked.length === 1 ? null : musicUrl('https://example.com/b.m4a');
            }),
        };
        vi.stubGlobal('window', { electron: { customSource: api } });

        const result = await testCustomSource('src-1');
        expect(result.ok).toBe(true);
        expect(result.url).toBe('https://example.com/b.m4a');
        expect(asked).toEqual(['海阔天空', '坐立不安']);
    });

    it('says it failed only after every song has been tried', async () => {
        const asked: string[] = [];
        const api = {
            request: vi.fn(async (_id: string, _platform: string, _action: string, info: { musicInfo: { name: string } }) => {
                asked.push(info.musicInfo.name);
                throw new Error('源那边没有这首歌');
            }),
        };
        vi.stubGlobal('window', { electron: { customSource: api } });

        const result = await testCustomSource('src-1');
        expect(result.ok).toBe(false);
        expect(asked).toHaveLength(CUSTOM_SOURCE_TEST_SONGS.length);
        expect(result.reason).toBe('源那边没有这首歌');
    });
});
