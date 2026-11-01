import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import capacitorConfig from '../../../capacitor.config';

// test/unit/mobile/fullscreenInsets.test.ts

// 「有些设备顶部出现一条黑条、那儿不渲染画面」的回归锁。
//
// 那个黑条有三个**互相独立**的原因，少钉住一个就还会冒出来：
//
// 1. **挖孔 letterbox**（Android）
//    清单里写的是 `android:windowLayoutInDisplayCutoutMode="shortEdges"`。那个值只
//    在挖孔落在**短边**时才让内容画进挖孔区；挖孔落在**长边**（横屏时就是上下两条）
//    时，系统给窗口套一个 letterbox —— 那一条只画窗口背景色（#09090b，近黑），
//    内容不画进去。机型不同现象不同，正是因为挖孔落在长边还是短边看机型。
//    解法：运行时用 `LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS`（API 30+）。
//
// 2. **Capacitor 自带的 SystemBars 插件把系统栏放回来**
//    它是核心插件，Bridge 一建起来就注册了，**不管配没配都会跑**。没配
//    `plugins.SystemBars.hidden` 时它按默认的 false 调 `show(systemBars())` ——
//    而且那一句是 post 到主线程消息队列上的，发生在 `onCreate()` 返回之后，
//    也就是发生在原生把系统栏藏好**之后**。谁后到谁赢，系统栏就回来了。
//
// 3. **iOS 启动时状态栏还挂着**
//    `Info.plist` 里没有 `UIStatusBarHidden` 时，Capacitor 的
//    `setStatusBarDefaults()` 让 `isStatusBarVisible` 保持 true，状态栏要等页面里
//    那句 `StatusBar.hide()` 跑到才藏 —— 中间那一段就是一条压在界面上的状态栏。
//
// 这些是「样式/时机」上的东西，浏览器里测不出来（单测跑在 node 环境，也没有真机），
// 所以按源码文本检查 —— 与 storeContract、layerBoundaries 同一套做法。

const ROOT = path.resolve(__dirname, '../../..');
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8');

const MAIN_ACTIVITY = 'android/app/src/main/java/top/izuna/sakure/MainActivity.java';
const INFO_PLIST = 'ios/App/App/Info.plist';
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';

describe('android display cutout', () => {
    it('asks for ALWAYS so the window is never letterboxed', () => {
        const source = read(MAIN_ACTIVITY);

        // `ALWAYS`（API 30+）是「所有边都画进挖孔区」，不会有 letterbox。
        expect(source).toContain('LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS');
        // API 28/29 没有 ALWAYS 这个选项，只能退回 shortEdges —— 但不能没有兜底。
        expect(source).toContain('LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES');
    });

    it('only uses ALWAYS where the platform has it', () => {
        const source = read(MAIN_ACTIVITY);

        // ALWAYS 是 API 30（Android 11）才有的常量，低版本上引用它会崩。
        expect(source).toMatch(
            /Build\.VERSION_CODES\.R[\s\S]{0,200}LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS/
        );
        // 挖孔本身是 API 28 才有的，更低的版本连提都不该提。
        expect(source).toMatch(
            /Build\.VERSION_CODES\.P[\s\S]{0,400}layoutInDisplayCutoutMode/
        );
    });

    it('lets the content draw behind the system bars as well', () => {
        const source = read(MAIN_ACTIVITY);

        // ALWAYS 的文档里写明：内容要盖住系统栏，得先 setDecorFitsSystemWindows(false)。
        // 少了这一句，挖孔区依然画不进去。
        expect(source).toContain('setDecorFitsSystemWindows(false)');
    });

    it('keeps the manifest baseline shortEdges for the devices that only know that', () => {
        // 清单里那一行是 API 28/29 的底子。运行时会覆盖成 ALWAYS，所以这里不能改成
        // `always` —— 那个枚举值老系统读不懂（编译期按 compileSdk 认，运行时按平台认）。
        expect(read(MANIFEST)).toContain('android:windowLayoutInDisplayCutoutMode="shortEdges"');
    });
});

describe('android system bars', () => {
    it('tells the built-in SystemBars plugin to keep the bars hidden', () => {
        // 不配这一项，核心插件会按默认的 false 把系统栏**放回来**（而且是在
        // 原生藏好之后才放回来）。
        expect(capacitorConfig.plugins?.SystemBars?.hidden).toBe(true);
    });

    it('keeps the safe-area CSS variables enabled', () => {
        // `src/index.css` 的 --st-safe-* 读的就是这几个注入变量；Android 的 WebView
        // 不认 env(safe-area-inset-*)，全靠这条注入才有值。
        expect(capacitorConfig.plugins?.SystemBars?.insetsHandling).toBe('css');
    });

    it('does not mix the deprecated systemUiVisibility flags into the new path', () => {
        const source = read(MAIN_ACTIVITY);

        // Android 11 起 setSystemUiVisibility 会整个替换掉 insets controller 记着的
        // 状态，把刚藏好的系统栏放回去。所以它只能留在 API 30 以下的老路上。
        const guard = source.indexOf('Build.VERSION_CODES.R');
        const legacyCall = source.indexOf('setSystemUiVisibility(');

        expect(guard).toBeGreaterThan(-1);
        expect(legacyCall).toBeGreaterThan(-1);
        expect(legacyCall).toBeGreaterThan(guard);
    });
});

describe('ios status bar', () => {
    it('hides the status bar from the very first frame', () => {
        const plist = read(INFO_PLIST);

        expect(plist).toMatch(/<key>UIStatusBarHidden<\/key>\s*<true\/>/);
    });

    it('keeps the status bar content light on the dark background', () => {
        // 用户往下一拉把状态栏叫出来时，底色是应用的深色，字得是亮的。
        const plist = read(INFO_PLIST);

        expect(plist).toMatch(
            /<key>UIStatusBarStyle<\/key>\s*<string>UIStatusBarStyleLightContent<\/string>/
        );
    });
});
