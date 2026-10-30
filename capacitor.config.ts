import type { CapacitorConfig } from '@capacitor/cli';

// capacitor.config.ts
// 手机版（Android）。
//
// 这是 Sakure 的**第二个前端**：渲染层（src/）是两边共用的，平台差别都收在
// 「桥」里 —— 桌面那边是 electron/preload.cjs 暴露的 window.electron，
// 手机这边是 mobile/ 下的那一份（形状一样，能力用 WebView 与原生插件实现）。
//
// 这一版只做**在线音乐 + 音乐源**：本机曲库、桌面歌词、壁纸、mods、远程控制
// 那些是桌面才有的东西，手机上不做。

const config: CapacitorConfig = {
    appId: 'top.izuna.sakure',
    appName: 'Sakure',
    // 渲染层还是 Vite 出来的 dist/ —— 与桌面共用同一份代码。
    webDir: 'dist-mobile',

    android: {
        // 打开就是横屏：不随设备转。手机横着拿才像播放器，竖屏那个布局本来就不是给手机做的。
        // （横屏写进 AndroidManifest 的 screenOrientation="landscape" —— Capacitor 的
        //   配置里没有这一项，写在这里不生效。）
        // 深色：应用本来就是深色底。
        backgroundColor: '#09090b',
        // 允许混合内容？不用 —— 页面自己管颜色。
        allowMixedContent: false,
        // WebView 的 CDP 调试口（真机调试用，`dev/probes/deviceProbe.sh` 连的就是它）。
        //
        // **不写死**：Capacitor 自己会按构建类型判断（`CapConfig` 里这一项的默认值是
        // `isDebug`，即只有 debuggable 的包才开），所以 debug 版自动能连 CDP，
        // release 版自动不开。
        //
        // 之前这里写的是 `false`，那个显式值会**盖掉** Capacitor 的按类型判断 ——
        // 结果 debug 版也连不上探针，白折腾（这正是交接文档里「debug 版开放 CDP」与
        // 实际不符的原因）。
        //
        // 需要在 release 版临时开调试口时，用环境变量：
        //   SAKURE_CDP=1 npx cap sync android
        webContentsDebuggingEnabled: process.env.SAKURE_CDP === '1' ? true : undefined,
    },

    ios: {
        // 深色：应用本来就是深色底（启动画面与状态栏）。
        backgroundColor: '#09090b',
        // 内容铺到状态栏后面（跟 Android 那边一样的沉浸式）。
        //
        // iOS 没有「隐藏状态栏」这个能力（系统状态栏是 iOS 的地盘，App 动不了）——
        // 所以那边是「内容铺到后面 + 状态栏半透明」这套做法。
        //
        // ���意 `UIStatusBarHidden` 那个键不在 Capacitor 的配置里 —— 要真隐藏得改
        // Info.plist（`UIViewControllerBasedStatusBarAppearance` + `prefersStatusBarHidden`），
        // 那是 AppDelegate 里的活。
        contentInset: 'never',
        // WebView 的调试口（Safari Web Inspector 连它调试）。
        //
        // 跟 Android 那边一样**不写死**：Capacitor 自己按构建类型判断，debug 版自动开。
        webContentsDebuggingEnabled: process.env.SAKURE_CDP === '1' ? true : undefined,
    },

    plugins: {
        SplashScreen: {
            launchShowDuration: 1200,
            backgroundColor: '#09090b',
            showSpinner: false,
        },
        Keyboard: {
            // 输入框弹起时页面要能缩：歌词搜索、源搜索都要打字。
            resize: 'body',
            resizeOnFullScreen: true,
        },
        StatusBar: {
            // 沉浸式：内容铺到状态栏后面，状态栏自己隐藏。
            //
            // 原来这里是 `overlaysWebView: false` —— 意思是「WebView 从状态栏下方开始」，
            // 于是状态栏一直占着一条（用户看得到时间、电量，还压着界面），而
            // StatusBar 插件又会去注入 `env(safe-area-inset-*)` 的 CSS 变量（那个
            // 变量在 `overlaysWebView: false` 下是 0，注入没有意义，还会报
            // 「Error injecting safe area CSS」）。
            //
            // 开了沉浸式之后：
            // - 状态栏隐藏，界面是完整的一屏（手机横屏时多出来的这一条最碍事）；
            // - 状态栏插件注入的安全区变量开始有意义：浮在角落的按钮（右上角那个
            //   灯泡）按 `safe-area-inset-top` 让开，不再压住状态栏那一行的按钮。
            overlaysWebView: true,
            style: 'DARK',
            backgroundColor: '#09090b',
        },
        // 本机曲库这一版不做，但权限先留着（以后要加扫描时不用重做）。
        // 未 root 也能读：走 MediaStore 的媒体库，不需要 root。
    },

    server: {
        // 打包版不走 dev server。
        androidScheme: 'https',
    },
};

export default config;
