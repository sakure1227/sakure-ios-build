import { describe, expect, it } from 'vitest';

// test/unit/onlineMusic/kuwo.test.ts
// The Kuwo (酷我) adapter: how a row of Kuwo's search answer becomes a song of the app's model,
// and how the platform's ids are read back out of it.

import { normalizeKuwoSong, kuwoMusicRid, kuwoRid } from '../../../src/services/onlineMusic/kuwo/kuwoNormalize';

describe('kuwo song normalisation', () => {
    const row = {
        musicrid: 123456,
        rid: 987654,
        name: '测试歌曲',
        artist: '歌手甲&歌手乙',
        album: '测试专辑',
        albumid: 555,
        duration: 235,
    };

    it('turns a search row into a song', () => {
        const song = normalizeKuwoSong(row);
        expect(song.id).toBe('123456');
        expect(song.name).toBe('测试歌曲');
        expect(song.album.name).toBe('测试专辑');
        expect(song.durationMs).toBe(235000);
        expect(song.sourceRef.kind).toBe('online');
        expect(song.sourceRef.kind === 'online' && song.sourceRef.providerId).toBe('kuwo');
    });

    it('splits the artists the way Kuwo writes them', () => {
        const song = normalizeKuwoSong(row);
        expect(song.artists.map(artist => artist.name)).toEqual(['歌手甲', '歌手乙']);
    });

    it('keeps the ids Kuwo\'s own endpoints take', () => {
        const song = normalizeKuwoSong(row);
        expect(kuwoMusicRid(song)).toBe('123456');
        expect(kuwoRid(song)).toBe('987654');
    });

    it('takes the id a MUSIC_ prefix carries', () => {
        const song = normalizeKuwoSong({ ...row, musicrid: 'MUSIC_777' });
        expect(song.id).toBe('777');
    });

    it('refuses a row without an id', () => {
        expect(() => normalizeKuwoSong({ name: '无 id' })).toThrow();
    });

    it('survives a row with nothing in it', () => {
        expect(() => normalizeKuwoSong(null)).toThrow();
    });

    it('reads no id out of a song of another platform', () => {
        expect(kuwoMusicRid({ sourceRef: { kind: 'local', mediaId: 'x' } })).toBe('');
    });
});
