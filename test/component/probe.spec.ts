import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { buildServiceStubModule, LOCAL_MUSIC_SERVICE_ROUTE } from '../../dev/probes/homeBehavior/serviceStubModule';
import '../../dev/probes/homeBehavior/probeApi';
const resize = async (page: Page, height: number, width = 1440) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const dump = () => {
    const chain: any[] = [];
    let e: HTMLElement | null = document.querySelector('.bravais-seam-home-nav');
    for (let i = 0; i < 6 && e; i++) {
        const kids = Array.from(e.children).map(c => ({ cls: (c as HTMLElement).className?.toString?.().slice(0, 35) ?? '', h: (c as HTMLElement).offsetHeight, pos: getComputedStyle(c).position }));
        const st = getComputedStyle(e);
        chain.push({ cls: (e.className || '').toString().slice(0, 35), h: e.offsetHeight, pad: st.paddingBottom, kids });
        e = e.parentElement;
    }
    return chain;
};
test('dump chain', async ({ page, mount }) => {
    await page.route(LOCAL_MUSIC_SERVICE_ROUTE, route => route.fulfill({ contentType: 'text/javascript', body: buildServiceStubModule() }));
    await mount('homeBehavior');
    await expect.poll(() => page.evaluate(() => window.__homeProbe?.ready() ?? false), { timeout: 30_000 }).toBe(true);
    await page.evaluate(() => window.__homeProbe!.setSuite('bravais'));
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.__homeProbe!.setNowPlaying('online:probe:loaded', false));
    await page.waitForTimeout(800);
    for (let height = 1100; height >= 480; height -= 10) { await resize(page, height); await page.waitForTimeout(40); }
    await page.locator('[data-bravais-tab="local"]').click();
    await page.waitForTimeout(1200);
    await resize(page, 1100);
    await page.waitForTimeout(1200);
    console.log('CHAIN ' + JSON.stringify(await page.evaluate(dump), null, 1));
});
