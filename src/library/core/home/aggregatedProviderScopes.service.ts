import type { OnlineProviderId } from '../../../types/onlineMusic';
import { omni } from '../../../services/onlineMusic/omni';

// src/library/core/home/aggregatedProviderScopes.service.ts
// 当前平台放过的歌，记在哪些平台名下。
//
// 聚合入口（落雪音乐）放出来的歌带着**真实来源**的平台——那一家的 provider，不是
// 聚合器自己。所以「这台机器在落雪下放过什么」记在各家的名下，不在落雪名下：
// 只问落雪那一份是空的。
//
// 普通平台就是它自己那一个。core 不认哪个平台是聚合的——那是平台自己声明的
// （aggregatesProviderIds）。

/** 当前平台（providerId）放过的歌记在哪些平台名下。 */
export const recentPlaysScopesOf = async (providerId: OnlineProviderId): Promise<readonly OnlineProviderId[]> => {
    const aggregated = await omni.aggregatedProviderIds(providerId);
    // 聚合入口自己也可能有记录（它自己发的歌），所以它在名单里。
    return aggregated.length > 0 ? [providerId, ...aggregated] : [providerId];
};
