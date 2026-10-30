import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// test/unit/customSource/sourceFailureNotice.test.ts
// 补源失败要让用户看得见——但不是每次都看见。
//
// 这件事的难处不在「弹一条提示」，在「什么时候该弹」：
//   - 没装源不是毛病（用户自己没开这个功能），弹了是打扰；
//   - 源不接这个平台也不是毛病（换首歌就好）；
//   - 源被问了却答不上来才是要说的：源自己坏了，用户得知道该去换一个；
//   - 预取是后台的事，用户没在等歌，不该被它打断；
//   - 源坏了是持续状态，一首一首弹就是噪音，说一次就够。

vi.mock('../../../src/i18n/config', () => ({
    default: { t: (key: string) => key },
}));

vi.mock('../../../src/stores/useSettingsModalStore', () => ({
    openSettings: vi.fn(),
}));

import {
    noteSourceFailure,
    resetSourceFailureNotice,
    shouldShowSourceFailureNotice,
    showSourceFailureNotice,
} from '@/services/customSource/sourceFailureNotice';
import { useStatusMessageStore } from '@/stores/useStatusMessageStore';
import { openSettings } from '@/stores/useSettingsModalStore';

const message = () => useStatusMessageStore.getState().message;

beforeEach(() => {
    resetSourceFailureNotice();
    useStatusMessageStore.getState().setMessage(null);
    vi.mocked(openSettings).mockReset();
});

afterEach(() => {
    resetSourceFailureNotice();
    useStatusMessageStore.getState().setMessage(null);
});

describe('whether a custom source failure is worth saying', () => {
    it('says it when the sources were asked and could not answer', () => {
        expect(shouldShowSourceFailureNotice('no-answer')).toBe(true);
    });

    it('says nothing when no source is installed', () => {
        // 用户自己没开这个功能，不是毛病。
        expect(shouldShowSourceFailureNotice('no-source')).toBe(false);
    });

    it('says nothing when the sources do not serve that platform', () => {
        expect(shouldShowSourceFailureNotice('unsupported-platform')).toBe(false);
    });

    it('says nothing when a source has not started yet', () => {
        // 启动中的正常状态，等一下就好。
        expect(shouldShowSourceFailureNotice('not-ready')).toBe(false);
    });

    it('says it too when the source is only busy', () => {
        // 源被限流了：这跟「源坏了」是两种话——一个等，一个换源。
        expect(shouldShowSourceFailureNotice('rate-limited')).toBe(true);
    });

    it('says nothing when there is no reason at all', () => {
        expect(shouldShowSourceFailureNotice(null)).toBe(false);
    });

    it('says it once, not for every song', () => {
        // 「值不值得说」是纯判断：源答不上来，就一直值得说。
        expect(shouldShowSourceFailureNotice('no-answer')).toBe(true);
        // 「最近说过没有」是另一回事：说了之后一段时间内不再说。
        expect(noteSourceFailure('no-answer', { now: 1000 })).toBe(true);
        expect(noteSourceFailure('no-answer', { now: 2000 })).toBe(false);
        expect(noteSourceFailure('no-answer', { now: 61_000 })).toBe(true);
    });
});

describe('the notice itself', () => {
    it('says that the built-in source was used, and offers a way to the sources', () => {
        noteSourceFailure('no-answer', { now: 1000 });
        const shown = message();
        expect(shown?.type).toBe('info');
        expect(shown?.text).toBe('status.customSourceNoAddress');
        expect(shown?.note).toBe('status.customSourceNoAddressNote');
        expect(shown?.actionLabel).toBe('status.customSourceNoAddressAction');
    });

    it('opens the custom source page when its action is taken', () => {
        showSourceFailureNotice('no-answer', 1000);
        message()?.onAction?.();
        expect(openSettings).toHaveBeenCalledWith('options', 'customSource');
        // 提示自己让位给设置页。
        expect(message()).toBeNull();
    });

    it('does not interrupt the prefetcher', () => {
        // 预取是后台的事，用户没在等歌。
        expect(noteSourceFailure('no-answer', { scope: 'prefetch', now: 1000 })).toBe(false);
        expect(message()).toBeNull();
    });

    it('says the source is busy when it is only rate-limiting', () => {
        // 限流不是源坏了：该说的是「过一会儿就好」，不是「换个源」。
        noteSourceFailure('rate-limited', { now: 1000 });
        expect(message()?.text).toBe('status.customSourceRateLimited');
        expect(message()?.note).toBe('status.customSourceRateLimitedNote');
    });

    it('says the source could not answer when that is what happened', () => {
        noteSourceFailure('no-answer', { now: 1000 });
        expect(message()?.text).toBe('status.customSourceNoAddress');
    });

    it('does not cover an error that is already on screen', () => {
        useStatusMessageStore.getState().setMessage({ type: 'error', text: '别的错' });
        expect(noteSourceFailure('no-answer', { now: 1000 })).toBe(false);
        expect(message()?.text).toBe('别的错');
    });

    it('does not cover a notice that asks the user to confirm something', () => {
        useStatusMessageStore.getState().setMessage({ type: 'info', text: '要你确认', persistent: true });
        expect(noteSourceFailure('no-answer', { now: 1000 })).toBe(false);
        expect(message()?.text).toBe('要你确认');
    });
});
