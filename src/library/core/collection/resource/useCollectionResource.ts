import { useEffect, useMemo, useState } from 'react';
import type { SongResult } from '../../../../types';
import type { MediaId } from '../../../../types/onlineMusic';
import type { LibraryCollectionDescriptor } from '../collection.contract';
import type { CollectionResource } from '../../shared/resource.contract';
import { collectionResourceRegistry } from './collectionResourceRegistry.service';
import { createCollectionResource, resolveCollectionResourceKey } from './createCollectionResource.service';
import { createStaticCollectionResource } from './staticCollectionResource.service';

// src/library/core/collection/resource/useCollectionResource.ts
// 宿主用：为当前打开的集合拿到资源并持有它。renderer 只接收资源对象并自己订阅，
// 所以切换 renderer 不会释放资源、不会重新请求；宿主本身也不订阅快照，不会因为分页重渲染。

type UseCollectionResourceParams = {
    descriptor: LibraryCollectionDescriptor | null;
    currentUserId?: MediaId | null;
    /** 本地集合的曲目由宿主在渲染期算好，直接包成静态资源。 */
    localTracks?: SongResult[];
};

export const useCollectionResource = ({
    descriptor,
    currentUserId,
    localTracks,
}: UseCollectionResourceParams): CollectionResource | null => {
    const key = descriptor ? resolveCollectionResourceKey(descriptor, currentUserId) : null;
    // 本机自己的歌单（source 'own'）的曲目就在描述里：跟本地集合一样是静态资源，
    // 不用请求——本地集合的曲目由宿主在渲染期算好，本机歌单的曲目直接带在描述里。
    const isStatic = descriptor?.source === 'local' || descriptor?.source === 'own';
    // 资源被 registry 回收时（例如长时间只 peek 未 retain），换一代重新拿。
    const [peekEpoch, setPeekEpoch] = useState(0);

    const resource = useMemo(() => {
        if (!descriptor || !key) return null;
        if (isStatic) {
            const tracks = descriptor.source === 'own'
                ? descriptor.tracks
                : (localTracks ?? []);
            return createStaticCollectionResource(key, tracks);
        }
        return collectionResourceRegistry.peekOrCreate(key, descriptor, () => createCollectionResource(key, descriptor));
        // descriptor 本身不进依赖：同一个 key 下的描述变化由 ensure 处理（按版本决定是否重新加载）。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, isStatic, localTracks, peekEpoch]);

    useEffect(() => {
        if (!resource || resource.kind === 'static') return;
        const release = collectionResourceRegistry.retain(resource);
        if (!release) {
            setPeekEpoch(epoch => epoch + 1);
            return;
        }
        return release;
    }, [resource]);

    useEffect(() => {
        if (resource && descriptor) {
            resource.ensure(descriptor, { currentUserId });
        }
    }, [currentUserId, descriptor, resource]);

    return resource;
};
