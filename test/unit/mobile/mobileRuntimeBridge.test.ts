import { describe, expect, it, afterEach, vi } from 'vitest';
import { isMobileRuntime } from '@/utils/mobileRuntime';
import { accountPictureSrc } from '@/components/login/PlatformMark';

// test/unit/mobile/mobileRuntimeBridge.test.ts

// 手机壳的桥与桌面壳的桥形状一致：两边都有 `window.electron`。所以「是不是桌面」
// 不能只看桥在不在，要看桥自己说的 `isMobile`。这些判定散在好几处，每一处都要
// 单独确认，否则手机版会把桌面才有的那条路走一遍（而那条路没有主进程）。

const setBridge = (electron: Record<string, unknown> | undefined): void => {
    vi.stubGlobal('window', electron === undefined ? {} : { electron });
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('mobile runtime detection', () => {
    it('reads the bridge\'s own isMobile flag', () => {
        setBridge({ isMobile: true });
        expect(isMobileRuntime()).toBe(true);
    });

    it('treats a bridge without the flag as desktop', () => {
        setBridge({ someDesktopMethod: () => undefined });
        expect(isMobileRuntime()).toBe(false);
    });

    it('treats no bridge at all as not mobile', () => {
        setBridge(undefined);
        expect(isMobileRuntime()).toBe(false);
    });
});

describe('desktop-only checks on the mobile build', () => {
    it('does not treat the mobile bridge as the desktop app', () => {
        setBridge({ isMobile: true, openExternalUrl: () => undefined });

        // 头像：手机版页面是 https://localhost，http 的头像会被混合内容拦掉，
        // 所以手机版必须跟网页版一样归一化成 https。
        const inDesktopApp = Boolean((globalThis as { window?: { electron?: unknown } }).window?.electron)
            && !isMobileRuntime();
        expect(inDesktopApp).toBe(false);
        expect(accountPictureSrc('http://p1.example.test/avatar.jpg', inDesktopApp))
            .toBe('https://p1.example.test/avatar.jpg');
    });

    it('keeps HTTP avatars as they are on the desktop build', () => {
        setBridge({ someDesktopMethod: () => undefined });

        const inDesktopApp = Boolean((globalThis as { window?: { electron?: unknown } }).window?.electron)
            && !isMobileRuntime();
        expect(inDesktopApp).toBe(true);
        expect(accountPictureSrc('http://p1.example.test/avatar.jpg', inDesktopApp))
            .toBe('http://p1.example.test/avatar.jpg');
    });
});
