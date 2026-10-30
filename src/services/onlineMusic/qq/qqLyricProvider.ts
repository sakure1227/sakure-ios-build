// src/services/onlineMusic/qq/qqLyricProvider.ts

/**
 * QQ Music lyrics provider module.
 * Provides search and download/decryption capabilities for QQ Music lyrics.
 */

import { SongResult } from '../../../types';
import { parseLyricsByFormat } from '../../../utils/lyrics/parserCore';
import { detectTimedLyricFormat } from '../../../utils/lyrics/formatDetection';
import { qrcDecrypt } from './qrcDecrypt';
import { applyDetectedChorusEffects, applyChorusRangesByTime } from '../../../utils/lyrics/chorusEffects';
import type { ChorusRange } from '../../../utils/lyrics/chorusEffects';
import { getOriginalCoverUrl } from '../../../utils/coverUrl';
import { lyricProxyWebUrl } from '../../lyricProxy';

/**
 * 这个环境里有没有桌面那套桥。
 *
 * ## 为什么不在模块加载时算好
 *
 * 旧的写法是模块加载时就把它算好存起来。但手机版的桥是**后挂的**
 * （见 `mobile/src/bridge.ts`）—— 而这些模块可能比桥早。那时候 `window.electron`
 * 还是 undefined，就会误判成「网页版」。
 *
 * 误判的后果：请求被改道到 `/api/lyric-proxy?url=...`（网页版的代理地址）——
 * 手机上没有那个端点，拿到的是一个 404 的 HTML 页，解析时报
 * `Unexpected token '<'` —— 就是「歌词拿不到」的真正原因。
 *
 * 成为函数调用（每次都重新看）就不会再错。
 */
const isDesktopBridge = (): boolean => (
    typeof window !== 'undefined' && Boolean((window as any).electron)
);

/**
 * Sends a POST request to u.y.qq.com via proxy or directly in Electron.
 */
async function requestQQ(method: string, module: string, param: any): Promise<any> {
  const payload = {
    comm: {
      ct: 11,
      cv: "1003006",
      v: "1003006",
      os_ver: "15",
      phonetype: "24122RKC7C",
      rom: "Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys",
      tmeAppID: "qqmusiclight",
      nettype: "NETWORK_WIFI",
      udid: "0",
      uid: "0",
    },
    request: {
      method,
      module,
      param,
    },
  };

  const targetUrl = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
  const url = isDesktopBridge() ? targetUrl : lyricProxyWebUrl(targetUrl);

  const response = await fetch(url, {
    method: 'POST',
    credentials: isDesktopBridge() ? 'omit' : 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'tmeLoginType=-1;',
      'User-Agent': 'okhttp/3.14.9',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`QQ Music API request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0 || data.request?.code !== 0) {
    throw new Error(`QQ Music API error: code ${data.code || data.request?.code}`);
  }

  return data.request.data;
}

/**
 * Encodes string to Base64 in UTF-8.
 */
function toBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  }
}

/**
 * Detects if a lyric string is in QRC format.
 */
function detectIsQrc(content: string): boolean {
  return content.includes('(') && content.includes(')') && /\[\d+,\d+\]/.test(content);
}

/**
 * Searches songs on QQ Music anonymously and throws on upstream refusal (e.g. the frequent code 2001).
 */
export async function searchQQSongs(keyword: string, page = 1, pageSize = 20): Promise<SongResult[]> {
  const safeKeyword = keyword.trim();
  if (!safeKeyword) return [];

  const pagesize = pageSize;
  const param = {
    search_id: String(
      Math.floor(
        Math.random() * 100000000000000 + Date.now() % 86400000
      )
    ),
    remoteplace: "search.android.keyboard",
    query: safeKeyword.length > 60 ? safeKeyword.slice(0, 60) : safeKeyword,
    // 7 = songs. 0 used to mean songs too, but QQ now answers 2001 with no items to every 0 search
    // while the same request with 7 is answered (checked 2026-10-17, #695): do not change it back.
    search_type: 7,
    num_per_page: pagesize,
    page_num: page,
    highlight: 0,
    nqc_flag: 0,
    page_id: 1,
    grp: 1,
  };

  const data = await requestQQ("DoSearchForQQMusicLite", "music.search.SearchCgiService", param);
  const songs = data?.body?.item_song || [];

  return songs.map((info: any) => {
    const artists = (info.singer || []).map((s: any, idx: number) => ({
      id: s.id || idx,
      name: s.name || 'Unknown Artist',
    }));

    const albumMid = info.album?.mid;
    const picUrl = albumMid
      ? getOriginalCoverUrl(`https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg?max_age=2592000`)
      : undefined;

    return {
      id: Number(info.id || 0),
      name: info.title || 'Unknown Song',
      artists,
      album: {
        id: Number(info.album?.id || 0),
        name: info.album?.name || 'Unknown Album',
        coverUrl: picUrl,
      },
      durationMs: (info.interval || 0) * 1000,
      qqMid: info.mid,
    };
  });
}

/**
 * Searches songs on QQ Music for lyric and metadata matching: a refused search is just "no candidates".
 */
export async function searchQQLyrics(keyword: string, page = 1, pageSize = 20): Promise<SongResult[]> {
  try {
    return await searchQQSongs(keyword, page, pageSize);
  } catch (error) {
    console.error('[QQMusic] Search failed:', error);
    return [];
  }
}

/**
 * Fetches and decrypts QQ Music lyrics.
 */

/**
 * 读明文歌词（平台在 `crypt: 0` 时给的那一份）。
 *
 * 它是 base64 的 lrc/qrc 文本。与密文的区别：密文是十六进制的字节（解密后才是文本），
 * 明文就是 base64。分开的方法：解密后的内容以 `<` 开头（QRC 是 XML），而明文的 base64
 * 解码后是歌词文本（以 `[00:` 这样的时间记开头）。
 *
 * 按这个区别对：明文直接用，密文走解密。
 */
const readPlainLyric = (value: string): { text: string } | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  // 密文是十六进制（只有 0-9a-f），明文的 base64 里有大小写字母与、/=。
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    return null;
  }
  try {
    const decoded = decodeBase64Utf8(raw);
    if (!decoded.trim()) return null;
    // QRC 是 XML，普通 lrc 以时间记开头（`[00:12.34]`）。
    const looksLikeLyric = decoded.trimStart().startsWith('<') || decoded.trim().startsWith('[');
    if (!looksLikeLyric) {
      return null;
    }
    return { text: decoded };
  } catch {
    return null;
  }
};

/** base64 解码为 UTF-8 文本（中文也要对）。 */
const decodeBase64Utf8 = (value: string): string => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
};

export async function fetchQQLyrics(
  song: SongResult,
  options: { chorusRanges?: ChorusRange[] } = {}
): Promise<any | null> {
  if (!song.id || !song.qqMid) {
    throw new Error('Missing song ID or mid');
  }

  const artistsStr = song.artists?.map(a => a.name).join(', ') || '';
  
  const param = {
    albumName: toBase64(song.album?.name || ''),
    // 0 = 明文（base64 的歌词文本）。密文（crypt: 1）要在浏览器里做 3DES 解密，
    // 手机版的 WebView 不一定支持，所以先要明文。解密那一路作为兜底。
    crypt: 0,
    ct: 19,
    cv: 2111,
    interval: Math.floor(song.durationMs / 1000),
    lrc_t: 0,
    qrc: 1,
    qrc_t: 0,
    roma: 1,
    roma_t: 0,
    singerName: toBase64(artistsStr),
    songID: Number(song.id),
    songName: toBase64(song.name),
    trans: 1,
    trans_t: 0,
    type: 0,
  };

  try {
    const data = await requestQQ("GetPlayLyricInfo", "music.musichallSong.PlayLyricInfo", param);
    const encryptedLyricHex = data?.lyric;
    const encryptedTransHex = data?.trans;
    const encryptedRomanizationHex = data?.roma;

    if (!encryptedLyricHex) {
      return null;
    }

    // 明文还是密文？
    //
    // 平台的取词接口有两种给法：`crypt: 1` 给密文（要 3DES 解密），
    // `crypt: 0` 给明文（base64 的 lrc/qrc 文本）。
    //
    // 我们优先要明文：密文那一路要在浏览器里做 3DES 解密再压缩，
    // 而手机版的 WebView 上那些能力不一定存在（解密失败时只能看到「没歌词」，
    // 而平台本来就能给明文，没必适部虑解密。
    const plain = readPlainLyric(encryptedLyricHex);

    const decryptedLyric = plain ? plain.text : await qrcDecrypt(encryptedLyricHex);
    const decryptedTrans = encryptedTransHex
      ? (readPlainLyric(encryptedTransHex)?.text ?? await qrcDecrypt(encryptedTransHex))
      : '';
    const decryptedRomanization = encryptedRomanizationHex
      ? (readPlainLyric(encryptedRomanizationHex)?.text ?? await qrcDecrypt(encryptedRomanizationHex))
      : '';

    const isQrc = detectIsQrc(decryptedLyric);
    const format = isQrc ? 'qrc' : detectTimedLyricFormat(decryptedLyric);

    const parsed = parseLyricsByFormat(format, decryptedLyric, decryptedTrans, {}, decryptedRomanization);
    if (!parsed) {
      return null;
    }
    parsed.isWordByWord = isQrc;
    if (options.chorusRanges && options.chorusRanges.length > 0) {
      return applyChorusRangesByTime(parsed, options.chorusRanges);
    }
    return applyDetectedChorusEffects(parsed, decryptedLyric);
  } catch (error) {
    console.error('[QQMusic] Fetch lyrics failed:', error);
    return null;
  }
}
