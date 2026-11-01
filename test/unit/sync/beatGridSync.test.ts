import { describe, expect, it } from 'vitest';
import {
    beatGridAnalysisKeyFromFingerprint,
    beatGridAnalysisKeyFromStorageKey,
    beatGridFingerprintFromAnalysisKey,
    beatGridStorageKey,
} from '@/services/sync/beatGridSync';
import { parseSyncedBeatGridRecord, parseSyncedBeatGridRecords } from '@/services/sync/syncSchema';

// test/unit/sync/beatGridSync.test.ts
// Guards the beat-list sync: the key mapping between the remote song fingerprint and the local
// analysis key, and the parsing of what the server sends back.
//
// Why it matters: the mobile app cannot analyse beats on its own (no WebGPU before iOS 26, and the
// model's weights live in the desktop install), so the beat list it uses is the one the desktop
// analysed, carried over by the sync server. A key that maps to the wrong song would put one song's
// beats on another - the picture would jump at the wrong moments.

describe('beat grid key mapping', () => {
    it('maps an online song between the remote fingerprint and the local analysis key', () => {
        const fingerprint = 'someprovider:id:12345';
        const analysisKey = beatGridAnalysisKeyFromFingerprint(fingerprint);

        expect(analysisKey).toBe('online:someprovider:12345');
        expect(beatGridFingerprintFromAnalysisKey(analysisKey!)).toBe(fingerprint);
    });

    it('keeps the two directions consistent', () => {
        // Whatever a fingerprint maps to, mapping it back gives the same fingerprint.
        const fingerprints = [
            'p1:id:1',
            'p2:id:abc-123',
            'p3:id:999999999',
        ];
        for (const fingerprint of fingerprints) {
            const analysisKey = beatGridAnalysisKeyFromFingerprint(fingerprint);
            expect(analysisKey).not.toBeNull();
            expect(beatGridFingerprintFromAnalysisKey(analysisKey!)).toBe(fingerprint);
        }
    });

    it('refuses a fingerprint that is not an online song', () => {
        // The metadata fingerprint (title|artist|duration) has no platform id in it, so it cannot be
        // mapped back to an analysis key. Mapping it would file the beats under a wrong key.
        expect(beatGridAnalysisKeyFromFingerprint('local|bad apple|nomico|220')).toBeNull();
        expect(beatGridAnalysisKeyFromFingerprint('')).toBeNull();
        expect(beatGridAnalysisKeyFromFingerprint('no-colon-here')).toBeNull();
        expect(beatGridAnalysisKeyFromFingerprint(':id:123')).toBeNull();
        expect(beatGridAnalysisKeyFromFingerprint('p:id:')).toBeNull();
    });

    it('refuses a local analysis key', () => {
        // A local library song's id is generated per device, so it never matches another device.
        expect(beatGridFingerprintFromAnalysisKey('local:local_1234_abcd')).toBeNull();
        expect(beatGridFingerprintFromAnalysisKey('')).toBeNull();
    });

    it('builds and reads the local storage key', () => {
        const key = beatGridStorageKey('online:p:1');
        expect(key.startsWith('beat_this_grid_')).toBe(true);
        expect(beatGridAnalysisKeyFromStorageKey(key)).toBe('online:p:1');
        expect(beatGridAnalysisKeyFromStorageKey('something_else')).toBeNull();
    });
});

describe('synced beat grid parsing', () => {
    const valid = {
        fingerprint: 'p:id:1',
        beats: [0.5, 1.0, 1.5],
        downbeats: [0.5],
        updatedAt: '2026-10-30T00:00:00.000Z',
    };

    it('keeps a well-formed record', () => {
        const record = parseSyncedBeatGridRecord(valid);
        expect(record).not.toBeNull();
        expect(record!.fingerprint).toBe('p:id:1');
        expect(record!.beats).toEqual([0.5, 1.0, 1.5]);
        expect(record!.downbeats).toEqual([0.5]);
    });

    it('keeps the accents when they are there', () => {
        const record = parseSyncedBeatGridRecord({ ...valid, accents: { impact: [1, 2, 3] } });
        expect(record!.accents).toEqual({ impact: [1, 2, 3] });
    });

    it('drops a record with no beats', () => {
        // An empty list is not worth keeping; storing it would shadow a later, real one.
        expect(parseSyncedBeatGridRecord({ ...valid, beats: [] })).toBeNull();
    });

    it('drops a record whose times are not usable', () => {
        // A NaN or a negative moment would make the picture jump at a strange place.
        expect(parseSyncedBeatGridRecord({ ...valid, beats: [0.5, Number.NaN] })).toBeNull();
        expect(parseSyncedBeatGridRecord({ ...valid, beats: [0.5, -1] })).toBeNull();
        expect(parseSyncedBeatGridRecord({ ...valid, beats: ['0.5'] })).toBeNull();
        expect(parseSyncedBeatGridRecord({ ...valid, downbeats: [Number.NaN] })).toBeNull();
    });

    it('drops a record missing what it needs', () => {
        expect(parseSyncedBeatGridRecord({ ...valid, fingerprint: '' })).toBeNull();
        expect(parseSyncedBeatGridRecord({ ...valid, updatedAt: 'not a date' })).toBeNull();
        expect(parseSyncedBeatGridRecord({ ...valid, beats: undefined })).toBeNull();
        expect(parseSyncedBeatGridRecord(null)).toBeNull();
        expect(parseSyncedBeatGridRecord('nonsense')).toBeNull();
    });

    it('keeps the good records of a list and drops the rest', () => {
        const records = parseSyncedBeatGridRecords([valid, { ...valid, beats: [] }, { ...valid, fingerprint: 'p:id:2' }]);
        expect(records).toHaveLength(2);
        expect(records.map(record => record.fingerprint)).toEqual(['p:id:1', 'p:id:2']);
    });

    it('answers an empty list for anything that is not a list', () => {
        expect(parseSyncedBeatGridRecords(null)).toEqual([]);
        expect(parseSyncedBeatGridRecords({})).toEqual([]);
    });
});
