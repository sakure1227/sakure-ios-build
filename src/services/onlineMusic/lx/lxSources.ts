import type { OnlineMusicProvider, OnlineProviderId } from '../../../types/onlineMusic';
import { listOnlineMusicProviders } from '../providerRegistry';

// src/services/onlineMusic/lx/lxSources.ts
// 落雪音乐源：哪些 provider 是落雪音乐（LX Music）带来的。
//
// 判据是每个平台自己声明的 `lxSourceId`——落雪自定义源协议里那个平台的源标识。从落雪移植过来的
// 平台都声明了它，Folia 原有的平台一个都没有。所以这里按声明筛，不按 id 列名字：平台知识留在
// 各自的文件夹里，新增一个落雪平台只要在它自己的 provider 上声明 lxSourceId，聚合搜索自动把
// 它算进来。

/** Every registered provider that came from LX Music's music sources, in registration order. */
export const listLxMusicSources = (): readonly OnlineMusicProvider[] => (
    listOnlineMusicProviders().filter(provider => typeof provider.lxSourceId === 'string' && provider.lxSourceId.length > 0)
);

/** The ids of those providers, for logs and for the search source tabs. */
export const listLxMusicSourceIds = (): readonly OnlineProviderId[] => (
    listLxMusicSources().map(provider => provider.id)
);

/**
 * Whether a provider is one of LX Music's sources. The aggregator asks by id for the providers
 * its search fans out to; anything else (an extension provider, say) is not one of them.
 */
export const isLxMusicSource = (providerId: OnlineProviderId): boolean => (
    listLxMusicSourceIds().includes(providerId)
);
