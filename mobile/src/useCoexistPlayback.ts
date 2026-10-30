// mobile/src/useCoexistPlayback.ts
// 「共存播放」：别的应用（抖音、网易云、视频号……）出声时，我们的歌**照播**。
//
// ## 原理（跟 QQ 音乐的「允许与其他应用同时播放」一样）
//
// > 别的 App 抢走音频焦点时，**不暂停、不停止**，继续往 AudioTrack 喂数据，
// > 两边的声音混着一起响。
//
// 安卓系统**没有**「我的音频优先级最高、别人抢不走」的 API —— 能做的只是
// 「自己被抢走焦点之后选择不停」。
//
// ## 我们怎么做到「不停」
//
// 音频是 WebView 里的 `<audio>`，播放在 **Chromium 进程**里。Chromium 内部有个
// `AudioFocusDelegate` 替我们管焦点：申请**永久焦点**（`AUDIOFOCUS_GAIN`），收到
// `AUDIOFOCUS_LOSS` 就**把 `<audio>` 暂停掉**。那个 delegate 是 WebView 的内部
// 行为，没有开关，改不了它的代码。
//
// **但可以让它收不到 LOSS。** 焦点栈是后进先出的：原生（`CsMediaSession.java`）
// 也申请一份焦点，就能压在 Chromium 那份**上面** —— 别人（抖音）来抢时被挤下去的
// 是我们，Chromium 那份安然无恙，收不到 LOSS，**不暂停**，声音继续出。
//
// 我们收到 LOSS 时不放弃、稍后立刻抢回来 —— 系统层面我们确实丢了焦点，但
// **Chromium 没有丢**，`<audio>` 一直在播，音频流没断 —— 这就是「混音共存」。
//
// ## 为什么渲染层**不能**在 pause 事件里立刻 play()
//
// 第一版是「`pause` 了就立刻 `play()` 回来」。真机实测（探针
// `dev/probes/coexistAudioProbe.cjs`）抓到的事件序列是这样的：
//
// ```
// 25358 pause   25359 play   25360 playing
// 25370 pause   25370 play   25370 playing
// ... 15 秒 567 次
// ```
//
// **15 秒 567 次 pause/play 循环**（每秒 38 次），而且 `currentTime` 一直卡在
// 8.832 —— 元素根本没在推进，每次循环都在重启解码器。听起来就是「电流声」
// +「卡卡的」。
//
// 原因是**时序**：Chromium 收到 LOSS 才 pause；我们立刻 `play()` → Chromium 立刻
// 重新去申请焦点 → 焦点还没稳定又被判 LOSS → 又 pause → 无限循环。
//
// **所以恢复要「慢半拍」**：等焦点那边安顿下来再恢复，而且**限频**。
//
// ## 三道闸（缺一个都会出问题）
//
// 1. **延迟**：pause 之后等 ~350ms 再恢复 —— 让 Chromium 那次焦点申请先落地；
// 2. **限频**：两次恢复之间至少隔 ~1.2s —— 上一次的恢复没稳住就不再来一次；
// 3. **只在需要时**：状态还是 PLAYING（不是用户按的暂停）、歌没放完、没在恢复中。
//
// 有了这三道闸，循环从「每秒 38 次」降到「每秒不到 1 次」—— 电流声消失，
// 剩下的只是偶尔的一下顿挫（别的应用硬抢焦点时本来就该有的）。

import { useEffect, useRef } from 'react';
import { coexistPlayback } from '../../src/services/coexistPlayback';
import { PlayerState } from '../../src/types';
import { usePlaybackStore } from '../../src/stores/usePlaybackStore';
import { isAndroidRuntime } from '../../src/utils/mobilePlatform';
import { listenResumeRequests } from './mobileAudioFocus';

/**
 * pause 之后等多久才恢复（毫秒）。
 *
 * 让 Chromium 那次焦点申请先落地 —— 太快恢复会跟它互相打断（见上面的说明）。
 */
const RESUME_DELAY_MS = 350;

/**
 * 两次恢复之间至少隔多久（毫秒）。
 *
 * 上一��次恢复还没稳住，就不要再来一次。
 */
const RESUME_MIN_INTERVAL_MS = 1200;

/**
 * 共存播放的接线。
 *
 * @param enabled 共存模式开着吗（由通知栏那个开关控制，原生直接翻）。
 * @param getActiveDeck 拿到**当前在响**的那个 `<audio>` 元素。
 *   页面里有两个（automix 的双 deck），恢复错了那个等于没恢复 —— 所以由外面给。
 */
export const useCoexistPlayback = (options: {
    enabled: boolean;
    getActiveDeck?: () => HTMLAudioElement | null;
}) => {
    const { enabled, getActiveDeck } = options;

    // 上次恢复是什么时候（限频用）。
    const lastResumeRef = useRef(0);
    // 有没有恢复已经排在等着（避免排一堆）。
    const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * 恢复播放（带延迟 + 限频）。
     *
     * 两条路都会走到这里：
     * - `App.tsx` 的 `onPause`（元素被系统停了）；
     * - 原生说「焦点被抢走了」（`resumeRequested` 事件）。
     */
    const scheduleResume = useRef((element: HTMLAudioElement) => {
        if (element.ended) {
            return;
        }
        if (usePlaybackStore.getState().playerState !== PlayerState.PLAYING) {
            return;
        }
        if (resumeTimerRef.current !== null) {
            return;
        }
        const now = Date.now();
        if (now - lastResumeRef.current < RESUME_MIN_INTERVAL_MS) {
            return;
        }
        lastResumeRef.current = now;

        resumeTimerRef.current = setTimeout(() => {
            resumeTimerRef.current = null;
            if (usePlaybackStore.getState().playerState !== PlayerState.PLAYING) {
                return;
            }
            if (!element.paused || element.ended) {
                // 已经自己恢复好了。
                return;
            }
            const promise = element.play();
            if (promise !== undefined) {
                void promise.catch(() => {
                    // 起播失败（比如源已经没了）—— 下一次 pause 事件会再试。
                });
            }
        }, RESUME_DELAY_MS);
    });

    useEffect(() => {
        // 把开关状态交给共享桥 —— `App.tsx` 的 `onPause` 要看它。
        coexistPlayback.enabled = enabled;

        if (!enabled) {
            coexistPlayback.resumeHandler = null;
            if (resumeTimerRef.current !== null) {
                clearTimeout(resumeTimerRef.current);
                resumeTimerRef.current = null;
            }
            return;
        }

        // **iOS 上整套不注册。**
        //
        // iOS 没有音频焦点那套机制：`AVAudioSession` 的 `mixWithOthers` 让别的
        // 应用出声时我们的歌**照播** —— 共存是系统级的、天生的，不需要开关，
        // 也不会有 Android 那边那种「被抢焦点 → 暂停 → 恢复」的断续。
        //
        // 在 iOS 上注册这个处理者只会带来副作用：渲染层会以为「被系统抢了焦点」
        // 而去 `play()` 恢复 —— 那是多余的断续（用户会听到电流声）。
        if (!isAndroidRuntime()) {
            coexistPlayback.resumeHandler = null;
            return;
        }

        // 注册「把歌接回来」的处理者。由 `App.tsx` 的 `onPause` 调用 ——
        // 那是唯一知道「用户按的 vs 系统抢的」的地方。
        //
        // 判据：**播放状态还停在 PLAYING** ⇒ 不是用户按的暂停 ⇒ 是系统抢焦点
        // 造成的 ⇒ 该接回来。
        //
        // 用户按暂停时，`usePlaybackTransportController` 会**先**把状态置成
        // PAUSED 再让元素停（`setPlayerState(PlayerState.PAUSED)` 在
        // `audioRef.current.pause()` 之前），所以那时状态已经是 PAUSED，
        // 这里不会误恢复。
        coexistPlayback.resumeHandler = (element: HTMLAudioElement): boolean => {
            if (element.ended) {
                // 歌放完了 —— 不是被抢焦点。
                return false;
            }
            if (usePlaybackStore.getState().playerState !== PlayerState.PLAYING) {
                // 用户主动暂停的（状态已经被置成 PAUSED）—— 不管。
                return false;
            }
            scheduleResume.current(element);
            return true;
        };

        // 原生说「焦点被抢走了」—— 也走同一套恢复逻辑。
        let dispose: (() => void) | undefined;
        let disposed = false;
        void listenResumeRequests(() => {
            const element = getActiveDeck?.() ?? null;
            if (element) {
                scheduleResume.current(element);
            }
        }).then(disposer => {
            if (disposed) {
                disposer();
                return;
            }
            dispose = disposer;
        });

        return () => {
            disposed = true;
            dispose?.();
            coexistPlayback.enabled = false;
            coexistPlayback.resumeHandler = null;
            if (resumeTimerRef.current !== null) {
                clearTimeout(resumeTimerRef.current);
                resumeTimerRef.current = null;
            }
        };
    }, [enabled, getActiveDeck]);
};
