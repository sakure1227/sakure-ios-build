// mobile/src/useMobileMediaSession.ts
// 手机版的媒体会话接线：把播放状态搬到原生 MediaSession（灵动岛 / 媒体面板），
// 并在应用切到后台时把歌词动画停住。
//
// 与桌面的 `useMediaSessionBridge` 并存：桌面那条走浏览器 API（Windows 的媒体覆盖层、
// macOS 的控制中心），手机这条走原生。两者互不干扰 —— 各自判断自己那条路存不存在。

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { PlayerState } from '../../src/types';
import type { SongResult } from '../../src/types';
import {
    listenNativeMediaCommands,
    publishNativeMediaSession,
    trackMobileBackgroundState,
} from './mobileMediaSession';
import {
    getCoexistMode,
    listenCoexistModeChanges,
} from './mobileAudioFocus';

/**
 * 手机版的媒体会话。
 *
 * @param audioRef 播放用的那个 `<audio>` 元素（读进度用）。
 * @param currentSong 当前显示的歌（换歌时发布给原生）。
 * @param coverUrl 封面地址（原生那边自己去取那张图）。
 * @param playerState 播放状态（决定原生那边显示「播放」还是「暂停」）。
 * @param mediaSessionPlayRef / Pause / Prev / Next  从原生那边回来的动作要调它们。
 * @param onCoexistModeChange  共存模式变了时告诉外面（界面上的显示要跟上）。
 */
export const useMobileMediaSession = (options: {
    audioRef: RefObject<HTMLAudioElement | null>;
    currentSong: SongResult | null;
    coverUrl: string | null;
    playerState: PlayerState;
    unknownArtistLabel: string;
    mediaSessionPlayRef: RefObject<() => Promise<void>>;
    mediaSessionPauseRef: RefObject<() => void>;
    mediaSessionPrevRef: RefObject<() => void>;
    mediaSessionNextRef: RefObject<() => Promise<void> | void>;
    onCoexistModeChange?: (coexistMode: boolean) => void;
}) => {
    const {
        audioRef,
        currentSong,
        coverUrl,
        playerState,
        unknownArtistLabel,
        mediaSessionPlayRef,
        mediaSessionPauseRef,
        mediaSessionPrevRef,
        mediaSessionNextRef,
        onCoexistModeChange,
    } = options;

    // 共存播放（别人出声时我们照播）。
    //
    // 开关本身在**通知栏**上，原生直接翻（应用可能在后台，渲染层不一定醒着）。
    // 这里做两件事：
    //
    // 1. 启动时读一次当前状态，交给外面（界面上的显示要对上）。
    // 2. 听原生的「状态变了」通知 —— 通知栏上点了按钮，界面要跟上。
    useEffect(() => {
        let dispose: (() => void) | undefined;
        let disposed = false;

        void getCoexistMode().then(coexistMode => {
            if (!disposed) {
                onCoexistModeChange?.(coexistMode);
            }
        });

        void listenCoexistModeChanges(coexistMode => {
            onCoexistModeChange?.(coexistMode);
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
        };
    }, [onCoexistModeChange]);

    // 原生来的控制动作。
    useEffect(() => {
        let dispose: (() => void) | undefined;
        let disposed = false;
        void listenNativeMediaCommands({
            play: () => {
                void mediaSessionPlayRef.current?.();
            },
            pause: () => {
                mediaSessionPauseRef.current?.();
            },
            previous: () => {
                mediaSessionPrevRef.current?.();
            },
            next: () => {
                void mediaSessionNextRef.current?.();
            },
            seek: positionMs => {
                const audio = audioRef.current;
                if (audio) {
                    audio.currentTime = Math.max(0, positionMs / 1000);
                }
            },
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
        };
    }, [audioRef, mediaSessionNextRef, mediaSessionPauseRef, mediaSessionPlayRef, mediaSessionPrevRef]);

    // 前后台：后台停动画，音频照播。
    useEffect(() => trackMobileBackgroundState(), []);

    // 把当前的曲目与状态发布给原生。
    useEffect(() => {
        const audio = audioRef.current;
        const durationMs = audio && Number.isFinite(audio.duration)
            ? audio.duration * 1000
            : (currentSong?.durationMs ?? 0);
        const positionMs = audio ? audio.currentTime * 1000 : 0;
        const artist = (currentSong?.artists ?? []).map(a => a.name).filter(Boolean).join(', ');
        void publishNativeMediaSession({
            song: currentSong ?? null,
            title: currentSong?.name ?? '',
            artist: artist || unknownArtistLabel,
            album: currentSong?.album?.name ?? '',
            artworkUrl: coverUrl ?? '',
            durationMs,
            positionMs,
            playing: playerState === PlayerState.PLAYING,
        });
    }, [audioRef, coverUrl, currentSong, playerState, unknownArtistLabel]);
};
