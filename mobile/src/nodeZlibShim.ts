// mobile/src/nodeZlibShim.ts
//
// `node:zlib` 的浏览器替身（波点的协议包顶层 `require('node:zlib')`）。
//
// 波点用它做一件事：响应带 `Content-Encoding: gzip` 且字节以 `1f 8b` 开头时，
// 调 `zlib.gunzipSync` 解压。
//
// 手机版不会走到那条路 —— 原生 HTTP（`CsHttp` / 浏览器的 fetch）**已经解压过了**，
// 正文不是 gzip 格式，包里的那个判断自然不成立。所以这个 shim 只是为了让
// 顶层 `require('node:zlib')` 能解析成功（否则整个模块加载不了，搜索都用不了）。
//
// 真被调到了怎么办：浏览器有 `DecompressionStream('gzip')`（异步），
// 但包的调用点是**同步**的，没法等。所以这里明确报错 ——
// 那说明响应确实是压缩的，而那条路需要另行处理（原生层解压，或给包一个同步方案）。
const notAvailable = (): never => {
    throw new Error(
        'nodeZlibShim: node:zlib is not available in the renderer. '
        + 'The native HTTP layer already decompresses responses, so this should never be reached; '
        + 'if it is, the response came through uncompressed and needs another look.',
    );
};

const zlibShim = {
    gunzipSync: notAvailable,
    gzipSync: notAvailable,
    inflateSync: notAvailable,
    deflateSync: notAvailable,
};

export default zlibShim;
export const gunzipSync = notAvailable;
export const gzipSync = notAvailable;
export const inflateSync = notAvailable;
export const deflateSync = notAvailable;
