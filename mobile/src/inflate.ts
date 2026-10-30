// mobile/src/inflate.ts
// 手机版的解压：把压缩的字节解成文本。
//
// ## 为什么要有这一层
//
// 浏览器的 `DecompressionStream` 是 **Chrome 80+**（2020 年）才有的。Android 7~9 的
// 系统 WebView 版本可能还很旧（那些机器往往不更新 WebView），上面没有这个 API ——
// 一用就抛 `DecompressionStream is not defined`，音源脚本解不开、QQ 歌词解不开。
//
// 所以这里做一层兜底：
//
// 1. 有 `DecompressionStream` 就用它（原生实现，快）。
// 2. 没有就用 **fflate**（纯 JS 的 inflate，项目里已经有了这个依赖）。
//
// 两条路的结果一样，调用方不用管。
//
// ## 格式
//
// - `deflate`：zlib 头（`78 9c` 那种）—— `fflate` 的 `zlibSync`。
// - `deflate-raw`：没有头 —— `fflate` 的 `inflateSync`。
// - `gzip`：gzip 头 —— `fflate` 的 `gunzipSync`。
//
// `DecompressionStream` 与 fflate 的格式名不是一一对应，所以每个格式都给出两边的对应关系。

import { gunzipSync, inflateSync, unzlibSync } from 'fflate';

/** 要解压的格式。 */
export type InflateFormat = 'deflate' | 'deflate-raw' | 'gzip';

const nativeFormatOf = (format: InflateFormat): CompressionFormat => (
    format === 'deflate-raw' ? 'deflate-raw' : format
);

const fflateInflateOf = (format: InflateFormat): ((data: Uint8Array) => Uint8Array) => (
    format === 'gzip' ? gunzipSync : format === 'deflate' ? unzlibSync : inflateSync
);

const decodeUtf8 = (bytes: Uint8Array): string => new TextDecoder('utf-8').decode(bytes);

/**
 * 用原生 `DecompressionStream` 解压（没有就返回 null，交给兜底那条路）。
 */
const inflateWithNative = async (bytes: Uint8Array, format: InflateFormat): Promise<string | null> => {
    if (typeof DecompressionStream === 'undefined') return null;
    try {
        // `Blob` 的类型要求 ArrayBuffer 视图的类型精确匹配，所以复制一份到新的 ArrayBuffer。
        const buffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(buffer).set(bytes);
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream(nativeFormatOf(format)));
        const text = await new Response(stream).text();
        return text || null;
    } catch {
        return null;
    }
};

/**
 * 解压一段字节。
 *
 * 先试原生（快），不行就用 fflate（纯 JS，什么 WebView 都能跑）。
 */
export const inflateBytes = async (
    bytes: Uint8Array,
    format: InflateFormat = 'deflate',
): Promise<string> => {
    if (!bytes.length) return '';
    const native = await inflateWithNative(bytes, format);
    if (native !== null) return native;
    // fflate 是同步的，抛错就说明这条路也不行。
    const inflate = fflateInflateOf(format);
    return decodeUtf8(inflate(bytes));
};

/**
 * 解压一段 base64（不带前缀的）。
 */
export const inflateBase64 = async (
    base64: string,
    format: InflateFormat = 'deflate',
): Promise<string> => {
    const raw = String(base64 ?? '').trim();
    if (!raw) return '';
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    return await inflateBytes(bytes, format);
};
