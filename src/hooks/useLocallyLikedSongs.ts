import { useEffect, useState } from 'react';
import { locallyLikedSongs, watchLikedSongs } from '../services/likedSongs';
import type { SongResult } from '../types';

// src/hooks/useLocallyLikedSongs.ts
// 本机红星过的歌（订阅版）：改了会重画。
//
// 心形亮不亮读的是那份记录（resolveSongLiked），而心形是纯函数算的——所以要有谁在
// 改动时说一声，界面才跟着变（点了红星，心形立刻亮，不用等下一次别的改动）。

export const useLocallyLikedSongs = (): readonly SongResult[] => {
    const [songs, setSongs] = useState<readonly SongResult[]>(() => locallyLikedSongs());
    useEffect(() => watchLikedSongs(() => setSongs(locallyLikedSongs())), []);
    return songs;
};
