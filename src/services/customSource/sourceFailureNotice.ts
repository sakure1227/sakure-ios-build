import { Puzzle } from 'lucide-react';
import i18n from '../../i18n/config';
import { setStatusMessage, useStatusMessageStore } from '../../stores/useStatusMessageStore';
import { openSettings } from '../../stores/useSettingsModalStore';
import type { CustomSourceMissReason } from './types';

// src/services/customSource/sourceFailureNotice.ts
// 「自定义源没能给地址」这件事，让用户看得见。
//
// 以前补源答不上来时是静默的：内置 provider 接上，歌照放。用户看到的是歌在放，于是以为
// 「自定义源没用」——可他真正该知道的是「你装的源自己挂了，该换一个或修一个」。这两件事的
// 下一步完全不同，混成沉默就是让人往错的方向查。
//
// 什么时候说、什么时候不说：
//   - 只在源真的被问了却答不上来时说（no-answer）。没装源不是毛病，没开这个功能更不是。
//   - 只在播放时说。预取是后台的事，用户没在那儿点歌，不该被后台的失败打扰。
//   - 一段时间内只说一次。一首一首地弹会把提示变成噪音，而源坏了这件事说一句就够。
//   - 不盖掉正在显示的错误提示或常驻提示（要用户确认的那种）。

/** 同一件事多久之内不重复说。源坏了是持续状态，反复说没有新信息。 */
const NOTICE_COOLDOWN_MS = 60_000;

/** 这条提示显示多久。 */
const NOTICE_DURATION_MS = 6000;

let lastNoticeAt = -Infinity;

/**
 * 这次的失败要不要对用户说。
 *
 * 「值不值得说」和「最近说过没有」是两件事：
 *   - 值不值得说，看它是什么：源被限流了（过一会儿就好）与源答不上来（源可能坏了）都值得说一句，
 *     但说的内容不同；没装源、源不接这个平台、源还没起来，都不需要用户动手。
 *   - 最近说过没有，要记状态。
 */
export const shouldShowSourceFailureNotice = (
    reason: CustomSourceMissReason | null,
): boolean => reason === 'no-answer' || reason === 'rate-limited';

/**
 * 同���件事多久之内不重复说。源坏了是持续状态，反复说没有新信息。
 *
 * 与 shouldShowSourceFailureNotice 分开，是因为这两件事的答案不一样：一次失败值不值得说，
 * 取决于它是什么；说不说，取决于最近说过没有。后者要记状态，前者是纯判断。
 */
export const sourceFailureIsCoolingDown = (now: number = Date.now()): boolean =>
    now - lastNoticeAt < NOTICE_COOLDOWN_MS;

/**
 * 说一句「自定义源没能给地址，已用内置源」，并给一个去设置页的动作。
 *
 * 放在这里而不是播放链路里，是因为它要跨两条路径（播放与预取）都能用，而预取不该弹。
 *
 * 说的话看情况：源被限流是「过一会儿就好」，源答不上来是「源可能坏了」——
 * 这两件的下一步不一样（一个等，一个换源），说成同一句就是把用户往错方向引。
 *
 * 返回这条提示有没有真的出现：正在显示错误提示或常驻提示（要用户确认的那种）时不插队，
 * 那条更重要。这种情况下**不记冷却**——这一次的提示没出现，下一次还该有机会出现。
 */
export const showSourceFailureNotice = (
    reason: CustomSourceMissReason | null = 'no-answer',
    now: number = Date.now(),
): boolean => {
    // 正在显示错误提示或常驻提示（要用户确认的那种）时不插队：那条更重要。
    const current = useStatusMessageStore.getState().message;
    if (current && (current.persistent || current.type === 'error')) return false;

    const limited = reason === 'rate-limited';
    setStatusMessage({
        type: 'info',
        text: i18n.t(limited ? 'status.customSourceRateLimited' : 'status.customSourceNoAddress'),
        note: i18n.t(limited ? 'status.customSourceRateLimitedNote' : 'status.customSourceNoAddressNote'),
        actionLabel: i18n.t('status.customSourceNoAddressAction'),
        actionIcon: Puzzle,
        durationMs: NOTICE_DURATION_MS,
        onAction: () => {
            setStatusMessage(null);
            openSettings('options', 'customSource');
        },
    });
    lastNoticeAt = now;
    return true;
};

/**
 * 把一次补源的失败变成用户看得见的一句话。
 *
 * `scope` 是「谁在问」：等歌的人（play）值得被告知，预取（prefetch）是后台的事，不打扰。
 */
export const noteSourceFailure = (
    reason: CustomSourceMissReason | null,
    options: { scope?: 'play' | 'prefetch'; now?: number } = {},
): boolean => {
    if ((options.scope ?? 'play') !== 'play') return false;
    if (!shouldShowSourceFailureNotice(reason)) return false;
    const now = options.now ?? Date.now();
    if (sourceFailureIsCoolingDown(now)) return false;
    return showSourceFailureNotice(reason, now);
};

/** 清掉冷却（测试用）。 */
export const resetSourceFailureNotice = (): void => {
    lastNoticeAt = -Infinity;
};
