import { useCallback, useEffect, useRef, useState } from 'react';

// src/hooks/usePinchZoom.ts
//
// 列表页的**双指缩放**：两指捏合把列表放大或缩小，双击复位。
//
// 为什么要有：手机的列表行高与字号是定死的，屏小的时候一行只放得下几个字；字大
// 的时候一屏又只放得下几行。缩放让这两头都能调 —— 挤的时候看清，放不下的时候
// 多看几行。
//
// 为什么不是「设置里一个缩放档位」：那要改字号变量、还要在每个列表页接一遍；
// 捏合是**就地**的，在哪个列表里捏就缩哪个，不用设置。
//
// 只在手机版启用（桌面上没有双指；鼠标的 Ctrl+滚轮是另一回事，不在这里做）。
//
// 缩放用 `transform: scale()` 而不是 `zoom`：transform 不改变布局，列表的滚动高度
// 不会跟着变，缩放后拖动的手感与原来一致。锚点是两指的中点，捏哪哪放大。

/** 缩放的上下限。 */
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;
/** 双击复位到 1。 */
const DOUBLE_TAP_MS = 320;

export interface PinchZoomState {
    /** 当前缩放（1 是原样）。 */
    scale: number;
    /** 挂到要缩放的那个元素上的样式。 */
    style: { transform: string; transformOrigin: string; willChange: string };
    /** 是否正在缩放（用来抑制那一下点击）。 */
    zooming: boolean;
}

const clamp = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/**
 * 双指缩放 + 双击复位。
 *
 * 用法：把返回的 `style` 挂到要缩放的列表容器上，把 `ref` 挂到同一个元素。
 */
export const usePinchZoom = (enabled = true): {
    ref: (element: HTMLElement | null) => void;
    style: PinchZoomState['style'];
    zooming: boolean;
} => {
    const elementRef = useRef<HTMLElement | null>(null);
    const [scale, setScale] = useState(1);
    const [origin, setOrigin] = useState('50% 50%');
    const [zooming, setZooming] = useState(false);

    // 捏合开始时的状态：两指的距离与当时的缩放。
    const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
    const lastTapAt = useRef(0);
    const movedDuringTouch = useRef(false);

    const element = useCallback((next: HTMLElement | null) => {
        elementRef.current = next;
    }, []);

    useEffect(() => {
        const node = elementRef.current;
        if (!enabled || !node) return undefined;

        const distanceOf = (touches: TouchList): number => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.hypot(dx, dy);
        };

        const onTouchStart = (event: TouchEvent): void => {
            if (event.touches.length === 2) {
                pinchStart.current = { distance: distanceOf(event.touches), scale };
                setZooming(true);
                movedDuringTouch.current = true;
                return;
            }
            if (event.touches.length === 1) {
                // 单指：记一下是不是「双击」（没移动过的那种）。
                const now = Date.now();
                if (now - lastTapAt.current < DOUBLE_TAP_MS) {
                    setScale(1);
                    setOrigin('50% 50%');
                    lastTapAt.current = 0;
                    movedDuringTouch.current = true;
                } else {
                    lastTapAt.current = now;
                }
            }
        };

        const onTouchMove = (event: TouchEvent): void => {
            const start = pinchStart.current;
            if (!start || event.touches.length !== 2) return;
            event.preventDefault();
            const distance = distanceOf(event.touches);
            if (start.distance <= 0) return;
            const next = clamp(start.scale * (distance / start.distance));
            setScale(next);
            // 锚在两指中点：捏哪哪放大。
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            const rect = node.getBoundingClientRect();
            setOrigin(`${((midX - rect.left) / rect.width) * 100}% ${((midY - rect.top) / rect.height) * 100}%`);
        };

        const onTouchEnd = (event: TouchEvent): void => {
            if (event.touches.length < 2) {
                pinchStart.current = null;
                // 这一轮捏合结束，过一会儿才允许下一次点击（免得捏合顺带点了一下）。
                if (movedDuringTouch.current) {
                    setZooming(false);
                    window.setTimeout(() => { movedDuringTouch.current = false; }, 60);
                }
            }
        };

        // `passive: false` 才能 preventDefault（否则浏览器会自己滚页面）。
        node.addEventListener('touchstart', onTouchStart, { passive: true });
        node.addEventListener('touchmove', onTouchMove, { passive: false });
        node.addEventListener('touchend', onTouchEnd, { passive: true });
        node.addEventListener('touchcancel', onTouchEnd, { passive: true });
        return () => {
            node.removeEventListener('touchstart', onTouchStart);
            node.removeEventListener('touchmove', onTouchMove);
            node.removeEventListener('touchend', onTouchEnd);
            node.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [enabled, scale]);

    return {
        ref: element,
        style: {
            transform: scale === 1 ? 'none' : `scale(${scale})`,
            transformOrigin: origin,
            willChange: scale === 1 ? 'auto' : 'transform',
        },
        zooming,
    };
};
