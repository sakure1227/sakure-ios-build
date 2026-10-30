import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.

        // 音频会话：**后台播放的地基**。
        //
        // 类别 `.playback` + `mixWithOthers`：
        // - `.playback`：应用进后台、锁屏之后**声音继续出**（Info.plist 里的
        //   `UIBackgroundModes` 含 `audio` 是它的另一半，缺一不可）。
        // - `mixWithOthers`：别的应用出声时我们的歌**照播**，也不打断它们 ——
        //   这就是 iOS 上的「共存」。系统级的，不需要抢焦点、没有焦点栈，
        //   不会有 Android 那边那种断续的电流声。
        //
        // 这里只设**类别**；`setActive(true)` 要等真正开始播放时再调
        // （在 `CsMediaSession` 里做）—— 应用一启动就激活会话会被审核拒。
        //
        // `AVAudioSession.sharedInstance()` **返回的不是可选值**，所以不能写
        // `if let session = ...`（那会报 "initializer for conditional binding
        // must have Optional type"）。
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(
            .playback,
            mode: .default,
            options: [.mixWithOthers]
        )

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    // MARK: - URL 回调（QQ 登录换票链要用）

    /// 深链 / URL scheme 的回调。
    ///
    /// Capacitor 8.0.x 没有 `SceneDelegateProxy`（那是 8.6 才有的），URL 的处理
    /// 走 `ApplicationDelegateProxy` —— 它会把事件发成通知，桥接层自己监听。
    ///
    /// **QQ 音乐登录靠这条**：扫码登录完成后 QQ 会用自定义 scheme 回调，
    /// 换票链的最后一跳全靠它 —— 没有这个，登录会卡在「等待回调」。
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    /// Universal Link 的回调。
    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
