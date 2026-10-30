import { useEffect, useState } from 'react';
import type { OnlineProviderId } from '../../../types/onlineMusic';
import { recentPlaysScopesOf } from './aggregatedProviderScopes.service';

// src/library/core/home/useRecentPlaysScopes.ts
// 当前平台放过的歌记在哪些平台名下。
//
// 聚合入口（落雪音乐）放出来的歌带着**真实来源**的平台——那一家的 provider，不是
// 聚合器自己。所以「这台机器在落雪下放过什么」记在各家的名下，不在落雪名下：
// 只问落雪那一份是空的。
//
// 名单是问出来的（注册表里谁声明了落雪标识），而问它要绕开注册表与落雪的循环依赖，
// 所以那份名单是异步的：先按「只有它自己」算（那份至少不为空），问回来再补上它旗下的。

export const useRecentPlaysScopes = (providerId: OnlineProviderId): readonly OnlineProviderId[] => {
    const [scopes, setScopes] = useState<readonly OnlineProviderId[]>([providerId]);

    useEffect(() => {
        let cancelled = false;
        // 换平台了：先回到「只有它自己」，别把上一个平台的名单留着。
        setScopes([providerId]);
        void recentPlaysScopesOf(providerId).then(next => {
            if (!cancelled) setScopes(next);
        });
        return () => { cancelled = true; };
    }, [providerId]);

    return scopes;
};
