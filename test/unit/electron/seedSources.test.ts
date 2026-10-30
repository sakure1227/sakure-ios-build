import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require_ = createRequire(import.meta.url);
const { seedDefaultSources, seedPath } = require_('../../../electron/seedSources.cjs');

// test/unit/electron/seedSources.test.ts
// 新装的 Sakure 自带一个源（星海音乐源），别人不用自己找。
//
// 规则：用户还没有任何源 → 装上；已经有源了 → 不动（他装过别的、或删过这个源，
// 那是他的意思）。

describe('seeding the default source', () => {
    const storeOf = (initial: Record<string, unknown> = {}) => {
        const values = new Map<string, unknown>(Object.entries(initial));
        return {
            get: (key: string) => values.get(key),
            set: (key: string, value: unknown) => { values.set(key, value); },
            values,
        };
    };

    it('finds the seed file in the right place, packaged and not', () => {
        // 打包后种子在 resources 里（extraResources），代码在 resources/app.asar 里。
        expect(seedPath('D:/app/resources/app.asar')).toBe(path.join('D:/app/resources', 'seed', 'userSources.json'));
        expect(seedPath('D:/app/resources/app.asar.unpacked')).toBe(path.join('D:/app/resources', 'seed', 'userSources.json'));
        // 开发时在仓库的 build/seed 下。
        expect(seedPath('D:/sakure')).toBe(path.join('D:/sakure', 'build', 'seed', 'userSources.json'));
    });

    it('installs the seed when the user has no source at all', () => {
        const store = storeOf({});
        const result = seedDefaultSources(store, 'D:/sakure');
        expect(result.installed).toBe(true);
        const sources = store.get('userSources') as Array<{ name: string; script: string }>;
        expect(sources).toHaveLength(1);
        expect(sources[0].name).toBe('星海音乐源');
        // 脚本是压缩存的（gz_ + deflate + base64）—— 应用读的时候要能解开。
        expect(sources[0].script.startsWith('gz_')).toBe(true);
    });

    it('leaves the sources alone when the user already has some', () => {
        const mine = [{ id: 'mine', name: '我的源', script: 'gz_x' }];
        const store = storeOf({ userSources: mine });
        const result = seedDefaultSources(store, 'D:/sakure');
        expect(result.installed).toBe(false);
        expect(store.get('userSources')).toEqual(mine);
    });

    it('says so when there is no seed file', () => {
        const store = storeOf({});
        const result = seedDefaultSources(store, 'D:/nowhere-at-all');
        expect(result.installed).toBe(false);
        expect(store.get('userSources')).toBeUndefined();
    });
});
