import AVFoundation
import Capacitor
import Foundation
import MediaPlayer
import UIKit

/// CsMediaSession —— iOS 版的系统媒体会话。
///
/// ## 它管三件事
///
/// 1. **后台音频会话**（`AVAudioSession`）：类别设成 `.playback`，这样锁屏、切别的
///    应用之后**声音继续出**。这是 iOS 上「后台只播音频」的地基 ——
///    没有它，应用一进后台音频就被系统掐掉。
/// 2. **锁屏控制面板**（`MPNowPlayingInfoCenter` + `MPRemoteCommandCenter`）：
///    锁屏时显示歌名/歌手/封面/进度条，并能拖进度、暂停、下一首。
/// 3. **后台省电**：进后台时告诉渲染层「停动画」（`setBackgrounded`）。
///
/// ## 后台只播声音、不烧电
///
/// iOS 上「后台还能出声」是**明确授权**的：Info.plist 里要有
/// `UIBackgroundModes` 含 `audio`，而运行时要有 `AVAudioSession` 的
/// `.playback` 类别。两者缺一不可。
///
/// 有了后台音频资格，音频会继续播；但 WebView 里的 JS 定时器与动画**照样在跑**
/// （iOS 不像 Android 那样冻结进程），所以那部分要自己停 —— 渲染层收到
/// `setBackgrounded(true)` 就会停歌词动画与可视化器。
///
/// ## 共存：iOS 上天然就有
///
/// Android 那边要跟系统抢音频焦点（焦点栈、丢焦点就暂停、还要跟 Chromium 的
/// delegate 打架）—— iOS 完全没有这套东西。这里的 `mixWithOthers` 选项就是
/// 「允许与其他应用同时播放」：**别的应用出声时我们的歌照播**，对方也不受
/// 影响。系统级的，不需要用户授权，也不会有断续的电流声。
///
/// 所以 iOS 版的 `getCoexistMode` 恒为「关」——共享的 JS 代码据此知道
/// **没有**「被系统抢焦点而需要恢复」那套逻辑要走。
///
/// ## 与 Android 版的契约一致
///
/// JS 那边（`mobile/src/mobileMediaSession.ts`）用的是同一套形状：
///
/// - `update` —— title / artist / album / artworkUrl / duration / position
/// - `playbackState` —— state（'playing'|'paused'|'stopped'）/ position / duration
/// - `setControlsEnabled` —— enabled
/// - `setBackgrounded` —— backgrounded
/// - 事件 `mediaCommand` —— `{ command, position? }`，command 是
///   'play' / 'pause' / 'previous' / 'next' / 'seek'
@objc(CsMediaSession)
public class CsMediaSession: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CsMediaSessionPlugin"
    public let jsName = "CsMediaSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playbackState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setControlsEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBackgrounded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCoexistMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCoexistMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reclaimFocus", returnType: CAPPluginReturnPromise)
    ]

    /// 曲目的信息（锁屏面板要用）。
    private var track: [String: Any] = [:]
    /// 当前的播放状态。
    private var playbackState: String = "stopped"
    private var durationMs: Int = 0
    private var positionMs: Int = 0
    /// 后台时控制面板上的按钮要不要禁用。
    private var controlsEnabled: Bool = true
    private var backgrounded: Bool = false
    /// 音频会话配好了没有（后台音频的地基）。
    private var audioSessionConfigured: Bool = false
    /// 当前是不是在播（决定要不要激活音频会话）。
    private var isPlaying: Bool = false

    override public func load() {
        super.load()
        configureRemoteCommands()
        configureAudioSession()
    }

    // MARK: - 音频会话（后台播放的地基）

    /// 把音频会话配成「播放」类别。
    ///
    /// `AVAudioSession.Category.playback` 是 iOS 上后台继续出声的那一个类别 ——
    /// 应用进后台、锁屏、切到别的应用，音乐都继续播。
    ///
    /// 不配的话（默认是 `.soloAmbient`），应用一进后台音频就被系统掐断 ——
    /// 这正是「后台只播放音频」要解决的核心问题。
    ///
    /// `mixWithOthers`：**允许与别的应用同时出声** —— 抖音、网易云这些不受影响，
    /// 我们的歌也不打断它们。这是 iOS 上最接近「共存」的开关（不需要用户授权）。
    private func configureAudioSession() {
        guard !audioSessionConfigured else { return }
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playback,
                mode: .default,
                // 允许与其他应用同时出声（= 共存），且静音键能静音音乐
                // （跟系统里别的播放器一样）。
                options: [.mixWithOthers]
            )
            audioSessionConfigured = true
        } catch {
            NSLog("[CsMediaSession] Could not set the audio session category: \(error.localizedDescription)")
        }
    }

    /// 播放开始时激活会话。
    ///
    /// `setActive(true)` 要在**开始播放时**调，而不是启动时 —— 系统按「当前有声音在出」
    /// 来决定要不要给后台执行的资格。应用一启动就激活会话会被审核拒。
    private func activateAudioSession() {
        configureAudioSession()
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(true)
    }

    /// 暂停/停止时让会话休息（省电，也把后台执行的资格还回去）。
    private func deactivateAudioSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(false, options: [.notifyOthersOnDeactivation])
    }

    // MARK: - 锁屏控制面板

    /// 注册锁屏面板上的按钮（播放/暂停/上一首/下一首/拖进度）。
    private func configureRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()

        center.playCommand.addTarget { [weak self] _ in
            self?.sendCommand("play")
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.sendCommand("pause")
            return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.sendCommand("toggle")
            return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.sendCommand("previous")
            return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.sendCommand("next")
            return .success
        }
        // 锁屏面板上拖进度条。
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            self?.sendCommand("seek", position: Int(positionEvent.positionTime * 1000))
            return .success
        }
    }

    /// 把原生的动作转给渲染层。
    private func sendCommand(_ command: String, position: Int? = nil) {
        var payload: [String: Any] = ["command": command]
        if let position = position {
            payload["position"] = position
        }
        notifyListeners("mediaCommand", data: payload)
    }

    // MARK: - 插件方法

    @objc func update(_ call: CAPPluginCall) {
        let title = call.getString("title", "") ?? ""
        let artist = call.getString("artist", "") ?? ""
        let album = call.getString("album", "") ?? ""
        let artworkUrl = call.getString("artworkUrl", "") ?? ""
        let duration = call.getInt("duration", 0)
        let position = call.getInt("position", 0)

        track = [
            "title": title,
            "artist": artist,
            "album": album,
            "artworkUrl": artworkUrl,
            "duration": duration
        ]
        durationMs = duration
        positionMs = position

        publishNowPlayingInfo()
        call.resolve()
    }

    @objc func playbackState(_ call: CAPPluginCall) {
        playbackState = call.getString("state", "stopped") ?? "stopped"
        durationMs = call.getInt("duration", durationMs)
        positionMs = call.getInt("position", positionMs)

        // 播放中就激活音频会话（后台继续出声的资格），暂停了还回去。
        //
        // 只在**状态真的变了**时切换 —— 每秒都发一次 playbackState 的话，
        // `setActive` 会被反复调用，白白耗电。
        let nowPlaying = playbackState == "playing"
        if nowPlaying != isPlaying {
            isPlaying = nowPlaying
            if nowPlaying {
                activateAudioSession()
            } else {
                deactivateAudioSession()
            }
        }

        publishNowPlayingInfo()
        call.resolve()
    }

    @objc func setControlsEnabled(_ call: CAPPluginCall) {
        controlsEnabled = call.getBool("enabled", true)
        publishNowPlayingInfo()
        call.resolve()
    }

    @objc func setBackgrounded(_ call: CAPPluginCall) {
        backgrounded = call.getBool("backgrounded", false)
        call.resolve()
    }

    /// 共存模式 —— **iOS 上恒为「关」**（理由见类注释）。
    @objc func getCoexistMode(_ call: CAPPluginCall) {
        var result = JSObject()
        result["coexistMode"] = false
        call.resolve(result)
    }

    /// 共存模式 —— iOS 上恒为「关」（理由见类注释）。
    @objc func setCoexistMode(_ call: CAPPluginCall) {
        var result = JSObject()
        result["coexistMode"] = false
        call.resolve(result)
    }

    /// 抢焦点 —— iOS 上没有焦点栈这回事，空操作即可。
    ///
    /// 留着这个方法是为了**不让渲染层的旧调用报错**：Android 那边的渲染层会发这个
    /// 请求，iOS 上原生这边直接回一个「好」就行。
    @objc func reclaimFocus(_ call: CAPPluginCall) {
        call.resolve()
    }

    // MARK: - 锁屏面板的内容

    /// 把当前曲目与进度写进锁屏面板。
    private func publishNowPlayingInfo() {
        var info: [String: Any] = [:]

        if !track.isEmpty {
            info[MPMediaItemPropertyTitle] = track["title"] ?? ""
            info[MPMediaItemPropertyArtist] = track["artist"] ?? ""
            info[MPMediaItemPropertyAlbumTitle] = track["album"] ?? ""
        }
        if durationMs > 0 {
            info[MPMediaItemPropertyPlaybackDuration] = Double(durationMs) / 1000.0
        }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = Double(positionMs) / 1000.0
        info[MPNowPlayingInfoPropertyPlaybackRate] = playbackState == "playing" ? 1.0 : 0.0
        info[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue

        if let urlString = track["artworkUrl"] as? String, !urlString.isEmpty,
           let url = URL(string: urlString) {
            loadArtwork(from: url) { [weak self] image in
                guard let self = self, let image = image else { return }
                var updated = info
                updated[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                MPNowPlayingInfoCenter.default().nowPlayingInfo = updated
            }
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// 取封面图。
    ///
    /// 封面是网络上的图，取回来要一点时间 —— 所以是异步的，拿到后再更新一次
    /// `nowPlayingInfo`（锁屏面板会自己刷新）。
    private func loadArtwork(from url: URL, completion: @escaping (UIImage?) -> Void) {
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let image = UIImage(data: data) else {
                completion(nil)
                return
            }
            DispatchQueue.main.async { completion(image) }
        }.resume()
    }
}
