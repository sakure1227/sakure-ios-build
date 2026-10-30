// mobile/src/nodeCryptoShim.ts
//
// `node:crypto` 的浏览器替身。
//
// ## 为什么需要
//
// 汽水与波点的协议包（`qishui-music-api` / `bodian-music-api`）是 CommonJS 的
// Node 包，其中：
//
// - `qishui-music-api/src/auth.cjs` → `const crypto = require('node:crypto')`
// - `bodian-music-api/src/auth.cjs` → 同上
//
// 它们用到 Node 的 `crypto.createHash('md5')` 与 `crypto.randomBytes(n)` ——
// 浏览器里**没有** `crypto.createHash`（浏览器的 `crypto` 只有 WebCrypto：
// `subtle` / `getRandomValues` / `randomUUID`），于是调用处报
// 「xxx is not a function」，minify 之后就成了看不出来的「i is not a function」。
//
// 桌面上这些包跑在 Electron 的**主进程**里（有真 Node），不用管；手机版把它们
// 打进渲染层，就得补上这一层。
//
// ## 装在哪
//
// `vite.config.ts` 里把 `node:crypto` 这个模块名指向本文件。只影响**渲染层 bundle**
// —— Electron 主进程是 Node 直接跑的，不经过 Vite，碰不到这个 alias。
// 渲染层里除了这两个协议包，没有别的地方用 `node:crypto`（所以替换是安全的）。
//
// ## 实现范围
//
// 只实现这两个包真正用到的那几个：
//
// - `createHash('md5')` —— 汽水用它算设备标识；波点用它算请求签名。
//   **只有 md5**：这是 Node 的 `crypto.createHash` 支持的十几种算法之一，
//   但那两个包只用到 md5（查过 `crypto.createHash` 的全部调用点，算法参数都是
//   'md5'）。别的算法要的话得另找实现 —— 没有就明确报出来，不假装支持。
// - `randomBytes(n)` —— 汽水用它生成随机的设备号后缀。
// - `randomUUID()` —— 波点的 `catalog.cjs` 用它（Node 的 `crypto.randomUUID`）。
import md5 from 'blueimp-md5';
import { Buffer } from 'buffer';

/** Node 的 `Hash` 形状：`update(...).digest('hex')`。 */
interface NodeHash {
    update(data: string | Uint8Array): NodeHash;
    digest(encoding?: 'hex' | 'base64'): string;
}

/**
 * blueimp-md5 只收字符串。对二进制输入（Uint8Array）走 latin1 逐字符转换 ——
 * 那两个包的 `update()` 传的其实都是字符串（设备号、签名串），所以这里够用。
 */
const md5Hex = (data: string | Uint8Array): string => {
    if (typeof data === 'string') return md5(data);
    let text = '';
    for (let i = 0; i < data.length; i += 1) text += String.fromCharCode(data[i]);
    return md5(text);
};

const createHashImpl = (algorithm: string): NodeHash => {
    const name = String(algorithm).toLowerCase();
    if (name !== 'md5') {
        // 明确报出来，而不是悄悄给个错的摘要 —— 那比报错更坏。
        throw new Error(`nodeCryptoShim: unsupported hash algorithm "${algorithm}" (only md5 is implemented)`);
    }
    let buffer = '';
    const hash: NodeHash = {
        update(data) {
            buffer += typeof data === 'string' ? data : md5Hex(data);
            return hash;
        },
        digest() {
            return md5Hex(buffer);
        },
    };
    return hash;
};

/**
 * 随机字节：用浏览器的 `crypto.getRandomValues`（WebCrypto，浏览器都有）。
 *
 * 返回的是**真的 Buffer**（`buffer` 包的浏览器版），不是 Uint8Array ——
 * 汽水的 `createQishuiDeviceId()` 走的是
 * `randomBytes(8).readBigUInt64BE() % 9e18n + 1e18n`，
 * `readBigUInt64BE` 是 Buffer 的方法，Uint8Array 上没有。
 */
const randomBytesImpl = (size: number): Buffer => {
    const bytes = Buffer.alloc(size);
    const webCrypto = globalThis.crypto;
    if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
        throw new Error('nodeCryptoShim: crypto.getRandomValues is unavailable');
    }
    webCrypto.getRandomValues(bytes);
    return bytes;
};


/**
 * 给 CommonJS 的 `require('node:crypto')` 用的形状。
 *
 * Vite 在预打包 CommonJS 时会把 `require('node:crypto')` 变成对默认导出的 interop，
 * 所以这里**同时**给具名导出与 default —— 两种取法都能用上。
 */
/**
 * Node 的私钥运算（`createPrivateKey` / `generateKeyPairSync` / `sign`）。
 *
 * 这三个**浏览器做不了**，也不该硬做：
 *
 * - `createPrivateKey(pem)` —— 把 PEM 私钥变成可签名的密钥对象。浏览器的
 *   WebCrypto 能 import PEM（`crypto.subtle.importKey`），但**导出的格式不同**
 *   （WebCrypto 给 SPKI DER，Node 给 PEM），包的代码按 Node 的格式处理
 *   （`Buffer.from(pem).toString('base64')`）。
 * - `generateKeyPairSync` —— 生成密钥对。WebCrypto 有 `generateKey`，但是**异步**的，
 *   而包这里是同步调用。
 * - `sign('sha256', data, key)` —— 用私钥签名。WebCrypto 的 `sign` 是异步的。
 *
 * 影响到的是汽水的**扫码登录**与**登录后的账户请求**（`qishuiGuardHeaders` 用
 * `createPrivateKey` + `sign` 给每个请求签名）。**未登录的搜索不受影响** ——
 * 那条路走公开令牌，不需要签名。
 *
 * 所以这里给明确的报错：出错时能一眼看出「是登录这条线做不了」，而不是
 * 「undefined is not a function」那种要猜半天的信息。
 */
const privateKeyUnavailable = (api: string): never => {
    throw new Error(
        `nodeCryptoShim: crypto.${api} is not available in the renderer. `
        + 'Qishui sign-in (and signed account requests) need native key operations; '
        + 'public search works without them.',
    );
};

const cryptoShim = {
    createHash: createHashImpl,
    randomBytes: (size: number) => randomBytesImpl(size),
    createPrivateKey: () => privateKeyUnavailable('createPrivateKey'),
    generateKeyPairSync: () => privateKeyUnavailable('generateKeyPairSync'),
    sign: () => privateKeyUnavailable('sign'),
    randomUUID: (): string => {
        const webCrypto = globalThis.crypto;
        if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();
        // 兜底：按 RFC 4122 的 v4 格式从随机字节拼一个。
        const bytes = randomBytesImpl(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
};

export default cryptoShim;

/**
 * 具名导出**必须与 cryptoShim 的成员一一对应**。
 *
 * 为什么：那两个协议包是 CommonJS，用的是**解构**：
 *
 *     const { createPrivateKey, generateKeyPairSync, randomBytes, sign } = require('node:crypto');
 *     const { randomUUID } = require('node:crypto');
 *
 * CommonJS 的 `require()` 拿到 ESM 模块时，interop 给的可能是**命名空间对象**
 * （具名导出）而**不是** default。于是只要有一个成员漏了具名导出，包解构出来就是
 * `undefined` —— 调用时才炸，而且报错是「xxx is not a function」，看不出是缺导出。
 *
 * （`randomUUID` 就是这么丢的：它只在 cryptoShim 对象里，没有具名导出。）
 */
export const createHash = cryptoShim.createHash;
export const randomBytes = cryptoShim.randomBytes;
export const randomUUID = cryptoShim.randomUUID;
export const createPrivateKey = cryptoShim.createPrivateKey;
export const generateKeyPairSync = cryptoShim.generateKeyPairSync;
export const sign = cryptoShim.sign;
export { cryptoShim };
