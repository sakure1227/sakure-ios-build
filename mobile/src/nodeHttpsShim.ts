// mobile/src/nodeHttpsShim.ts
//
// `node:https` 的浏览器替身（波点的协议包顶层 `require('node:https')`）。
//
// 波点的 HTTP 层（`bodian-music-api/src/http.cjs`）是这么用它的：
//
// - 给了 `requestFactory` 时**不用**它（走我们给的那个）；
// - 没给时才 `https.request(url, { method }, onResponse)` —— 那是 Node 的流式接口。
//
// 手机版总是给 `requestFactory`（走原生 HTTP），所以这个 shim **不会被真的用上**。
// 但它必须存在：那是顶层 `require`，浏览器里解析不到就会让**整个模块加载失败**
// —— 于是连搜索都用不了（包的其他部分都加载不进来）。
//
// 所以这里给一个「一调用就明确报错」的替身：真被用到了，错误信息直接说明
// 「手机版要走 requestFactory」，而不是让排查的人猜。
const notAvailable = (): never => {
    throw new Error(
        'nodeHttpsShim: node:https is not available in the renderer. '
        + 'The mobile build must pass a requestFactory (native HTTP) instead.',
    );
};

const httpsShim = {
    request: notAvailable,
    get: notAvailable,
};

export default httpsShim;
export const request = notAvailable;
export const get = notAvailable;
