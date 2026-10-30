import UIKit
import Capacitor

/// SceneDelegate —— Capacitor 8.0.x 的 iOS 生命周期入口。
///
/// ## 为什么没有 `SceneDelegateProxy`
///
/// Capacitor **8.6** 引入了 `SceneDelegateProxy`，让 SceneDelegate 把
/// `openURLContexts` / `continue userActivity` 转发过去。但我们用的 core 是
/// **8.0.2**（要跟官方插件同代），那个版本里**没有这个类** ——
/// 编译会报 `cannot find 'SceneDelegateProxy' in scope`。
///
/// 8.0.2 的做法是走 `ApplicationDelegateProxy`（`CAPApplicationDelegateProxy`），
/// 它挂在 **AppDelegate** 上 —— 见 `AppDelegate.application(_:open:options:)`。
/// 所以这里只需要把 WebView 挂起来。
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()
    }
}
