// src/services/coexistPlayback.ts
// 「共存播放」的共享桥：渲染层与 App.tsx 之间的一条窄缝。
//
// ## 为什么需要它
//
// 「共存播放」的意思是：别的应用（抖音、网易云、视频号……）出声时，我们的歌
// **照播**，而不是像系统默认那样被自动暂停。
//
// 链路的完整样子：
//
// 1. 系统的音频焦点被抖音抢走 → Chromium 的 `AudioFocusDelegate` 收到
//    `AUDIOFOCUS_LOSS` → 它把 `<audio>` 暂停 → 触发元素的 `pause` 事件。
// 2. `App.tsx` 的 `onPause` 接到这个事件。**默认**它会把播放状态置成 PAUSED
//    —— 这就是「打开有声音的东西，我们的歌自己就停了」。
// 3. 共存模式开着时，第 2 步要**改成**：不置 PAUSED（元素还要接着播）。
//
// 第 3 步必须在 `App.tsx` 的 `onPause` 里做 —— 那是唯一知道「这个 pause 是
// 用户按的，还是系统抢焦点造成的」的地方（用户按暂停时，播放状态**先**被置成
// PAUSED，系统抢焦点时状态还停在 PLAYING）。
//
// ## 这里**不**做什么（很重要）
//
// **不调用 `element.play()` 恢复播放。**
//
// 第一版是「pause 了就 play() 回来」。真机实测（探针
// `dev/probes/coexistAudioProbe.cjs`）抓到的事件序列是：
//
// ```
// 25358 pause   25359 play   25360 playing
// 25370 pause   25370 play   25370 playing
// ... 15 秒 567 次
// ```
//
// 15 秒 567 次 pause/play 循环 —— 每次循环都重启一次解码器，听起来就是「电流声」
// +「卡卡的」。原因是我们的 `play()` 让 **Chromium 重新去申请焦点**，它把**我们
// 原生那份**挤下去，原生再抢回来，Chromium 再被挤 …… 无限循环。
//
// 恢复是**原生那边**的事（`CsMediaSession.java`）：它持有焦点，被抢了立刻抢回；
// Chromium 的 `<audio>` 在这期间一直就没停过（它没收到 LOSS），不需要谁去救。
//
// ## 桌面端
//
// 桌面端没有音频焦点这套东西，共存模式也不会开着。所以这里默认是「关」的，
// 桌面上的行为**一点不变**。

/**
 * 「重新起播」的回调。
 *
 * @param element 刚被暂停的那个 `<audio>` 元素。
 * @returns 接管了（true）还是不管（false —— 那就按默认走，置成 PAUSED）。
 */
export type CoexistResumeHandler = (element: HTMLAudioElement) => boolean;

/**
 * 共存播放的桥。
 *
 * 用一个普通对象而不是 store —— 它只有一个消费者（App.tsx 的 `onPause`）和一个
 * 生产者（手机版的 hook），中间不需要响应式。
 */
export const coexistPlayback = {
    /** 共存模式开着吗。 */
    enabled: false,

    /**
     * 「起播」的处理者。
     *
     * 由手机版设置（`mobile/src/useCoexistPlayback.ts`）；桌面版不设，于是
     * `App.tsx` 的 `onPause` 走默认路径，行为不变。
     */
    resumeHandler: null as CoexistResumeHandler | null,
};

/**
 * 供 `App.tsx` 的 `onPause` 调用：这次暂停要不要「接回来」。
 *
 * @param element 被暂停的元素。
 * @returns true = 已接管（别置 PAUSED，继续播）；false = 不管（照默认走）。
 */
export const tryResumeAfterCoexistPause = (element: HTMLAudioElement): boolean => {
    if (!coexistPlayback.enabled) {
        return false;
    }
    const handler = coexistPlayback.resumeHandler;
    if (!handler) {
        return false;
    }
    return handler(element);
};
