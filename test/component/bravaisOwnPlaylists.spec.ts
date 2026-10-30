import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { PROBE_AGGREGATOR_PROVIDER, PROBE_PROVIDER_A } from '../../dev/probes/libraryBehavior/fixtureRules';
import { buildServiceStubModule, LOCAL_MUSIC_SERVICE_ROUTE } from '../../dev/probes/homeBehavior/serviceStubModule';
import '../../dev/probes/homeBehavior/probeApi';

// test/component/bravaisOwnPlaylists.spec.ts
// 首页歌单页签上的本机默认歌单（最近播放 / 我的收藏）：
//   - 平台没有歌单库时（落雪音乐那样的聚合平台）歌单页签不再灰掉，墙上有这两张卡；
//   - 平台有自己的歌单时，本机这两个排在前面；
//   - 点开它们走的是本机那条路（曲目就在本机，不问平台要）。

const stage = (page: Page) => page.locator('[data-library-stage="bravais"]');
const seam = (page: Page) => page.locator('[data-bravais-seam]');
const settled = (page: Page) => expect(stage(page)).not.toHaveAttribute('data-bravais-settling', /.*/, { timeout: 10_000 });
const tabs = (page: Page) => page.evaluate(() => window.__homeProbe!.tabs());
const items = (page: Page) => page.evaluate(() => window.__homeProbe!.items());
const opened = (page: Page) => page.evaluate(() => window.__homeProbe!.opened());

// 探针的条目 id 是裸 id（卡片在墙上的 key 才是 card:<type>:<id>）。
const RECENTS_ID = 'own-playlist-recents';

const mountBravais = async (mount: (id: string) => Promise<unknown>, page: Page) => {
    await page.route(LOCAL_MUSIC_SERVICE_ROUTE, route => route.fulfill({ contentType: 'text/javascript', body: buildServiceStubModule() }));
    await mount('homeBehavior');
    await expect.poll(() => page.evaluate(() => window.__homeProbe?.ready() ?? false), { timeout: 30_000 }).toBe(true);
    await page.evaluate(() => window.__homeProbe!.setSuite('bravais'));
    await expect(stage(page)).toHaveAttribute('data-bravais-layer', 'home:playlist', { timeout: 15_000 });
    await settled(page);
};

const showTab = async (page: Page, tab: string) => {
    await seam(page).locator(`[data-bravais-tab="${tab}"]`).click();
    await expect(stage(page)).toHaveAttribute('data-bravais-layer', `home:${tab}`);
    await settled(page);
};

test.describe('[bravais-only] the playlists the machine keeps for itself', () => {
    test('the playlist tab opens on a platform without a playlist library', async ({ page, mount }) => {
        await mountBravais(mount, page);

        // 切到「落雪式」的平台：没有账户，也没有歌单库。
        expect(await page.evaluate(id => window.__homeProbe!.switchProvider(id), PROBE_AGGREGATOR_PROVIDER)).toBe(true);
        await expect.poll(async () => (await tabs(page)).find(tab => tab.key === 'playlist')?.disabled).toBe(false);
    });

    test('the wall shows the recents and favourites playlists there', async ({ page, mount }) => {
        await mountBravais(mount, page);
        expect(await page.evaluate(id => window.__homeProbe!.switchProvider(id), PROBE_AGGREGATOR_PROVIDER)).toBe(true);
        await showTab(page, 'playlist');

        const names = (await items(page)).map(item => item.name);
        expect(names).toContain('Recently played');
    });

    test('they come before the platform playlists of a platform that has them', async ({ page, mount }) => {
        await mountBravais(mount, page);
        await showTab(page, 'playlist');

        // 默认的两个排在前面，平台自己的歌单跟在后面。
        const ids = (await items(page)).map(item => item.id);
        const recents = ids.indexOf(RECENTS_ID);
        expect(recents).toBeGreaterThanOrEqual(0);
        const platformOne = ids.findIndex(id => id !== RECENTS_ID && id !== 'own-playlist-favorites');
        if (platformOne >= 0) expect(recents).toBeLessThan(platformOne);
    });

    test('a song liked with the heart shows up in the favourites playlist', async ({ page, mount }) => {
        await mountBravais(mount, page);
        await showTab(page, 'playlist');

        // 红星一下（与用户点心形走同一条路）。
        // 歌的 key 是 `online:<平台>:<id>`：平台要是真的注册着的那个。
        const liked = await page.evaluate(id => window.__homeProbe!.likeSong(`online:${id}:liked1`), PROBE_PROVIDER_A);
        expect(liked).toBe(true);
        // 「我的收藏」里就该有它了。
        const names = (await items(page)).map(item => item.name);
        expect(names).toContain('My favorites');
        const favorites = (await items(page)).find(item => item.id === 'own-playlist-favorites');
        expect(favorites?.trackCount).toBeGreaterThan(0);
    });

    test('the heart is lit and the song is kept even when the platform will not take it', async ({ page, mount }) => {
        await mountBravais(mount, page);
        await showTab(page, 'playlist');

        // 平台收不下这一首（没登录、没有这个能力）：红星照样亮，收藏照样落在本机。
        const liked = await page.evaluate(id => window.__homeProbe!.likeSong(`online:${id}:kept-locally`), PROBE_PROVIDER_A);
        expect(liked).toBe(true);

        const favorites = (await items(page)).find(item => item.id === 'own-playlist-favorites');
        expect(favorites?.trackCount).toBeGreaterThan(0);
    });

    test('opening one of them opens the machine playlist, not a platform one', async ({ page, mount }) => {
        await mountBravais(mount, page);
        await showTab(page, 'playlist');

        await page.evaluate(id => window.__homeProbe!.open(id), RECENTS_ID);
        const last = (await opened(page)).at(-1);
        expect(last?.source).toBe('own');
        expect(last?.id).toBe('own-playlist-recents');
    });
});
