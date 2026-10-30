// mobile/src/mobileCrypto.ts
// 手机版的加密工具：网易云的 weapi（RSA + AES-CBC）。
//
// ## 为什么需要它
//
// 桌面上网易云的请求由内嵌的 Node 后端（`@neteasecloudmusicapienhanced/api`）发，
// 那套后端把 weapi 加密做在 Node 里。手机版没有 Node —— 但**加密本身不需要 Node**：
// weapi 就是「AES-CBC 两次 + RSA 一次」，浏览器里用 `crypto-js` 与 `node-forge` 就能算。
//
// 所以手机版自己把这一步做掉，请求直接发给网易云的接口（原生 HTTP，没有同源限制）。
//
// ## 算法（与上游 `api/util/crypto.js` 的 `weapi` 一致）
//
// 1. `text` = 业务参数的 JSON。
// 2. `secretKey` = 16 个随机 base62 字符。
// 3. `params` = AES-CBC(text, presetKey, iv) → 再 AES-CBC(那个结果, secretKey, iv)。
// 4. `encSecKey` = RSA-公钥加密(`secretKey` 反转后的字符串)，输出十六进制。
//
// 两次加密的键不同：第一次用固定的 presetKey，第二次用每次随机的 secretKey；
// 密钥本身用 RSA 传过去（RSA 只能加密很短的东西，所以只传 16 字节的 secretKey）。

import CryptoJS from 'crypto-js';
import forge from 'node-forge';

const IV = '0102030405060708';
const PRESET_KEY = '0CoJUm6Qyw8W8jud';
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * 网易云的 RSA 公钥（PKCS#1 v1.5）。
 *
 * 用的是 PEM 形式：`node-forge` 的 `publicKeyFromPem` 直接认。加密方式是 `NONE`
 * （即 PKCS#1 v1.5 的填充），不是 OAEP —— 网易云那边只认这个。
 */
const NETEASE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;

/** AES-CBC 加密，输出 base64。 */
const aesEncrypt = (text: string, key: string): string => CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(text),
    CryptoJS.enc.Utf8.parse(key),
    {
        iv: CryptoJS.enc.Utf8.parse(IV),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    },
).toString();

/** RSA（PKCS#1 v1.5）加密，输出十六进制。 */
const rsaEncrypt = (text: string, publicKey: string): string => {
    const key = forge.pki.publicKeyFromPem(publicKey);
    return forge.util.bytesToHex(key.encrypt(text, 'NONE'));
};

/** 16 个随机 base62 字符。 */
const randomSecretKey = (): string => {
    let key = '';
    for (let i = 0; i < 16; i += 1) {
        key += BASE62.charAt(Math.round(Math.random() * 61));
    }
    return key;
};

export type WeapiPayload = {
    params: string;
    encSecKey: string;
};

/**
 * 网易云的 weapi 加密。
 *
 * @param data 业务参数（会被 JSON 序列化后加密）
 */
export const weapi = (data: unknown): WeapiPayload => {
    const text = JSON.stringify(data);
    const secretKey = randomSecretKey();
    return {
        params: aesEncrypt(aesEncrypt(text, PRESET_KEY), secretKey),
        // 密钥反转让网易云那边解出来的顺序与它自己算的一样。
        encSecKey: rsaEncrypt(secretKey.split('').reverse().join(''), NETEASE_PUBLIC_KEY),
    };
};

/**
 * 酷狗的 Web 接口签名盐。
 *
 * 注意签名算法里这个盐出现**两次**（前后各一次），不是只在末尾。
 */
const KUGOU_WEB_SIGN_SALT = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt';

/**
 * 酷狗的 Web 签名。
 *
 * 算法（与酷狗 Web 接口一致）：
 * 1. 参数按键名排序；
 * 2. 拼成 `key=value` **无分隔符**的串（`join('')`，不是 `join('&')`）；
 * 3. `md5(盐 + 那个串 + 盐)`。
 *
 * 第 2 步没有 `&`、第 3 步盐在两头 —— 这两处与直觉不同，少一个就答不出二维码
 * （平台回 `error_code: 20010` 参数错误）。
 *
 * @param params 参与签名的参数（值的顺序不重要，会自己按键名排）
 */
export const kugouSign = (params: Record<string, string | number>): string => {
    const source = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('');
    return CryptoJS.MD5(`${KUGOU_WEB_SIGN_SALT}${source}${KUGOU_WEB_SIGN_SALT}`).toString();
};

/**
 * 酷狗的设备 mid。
 *
 * `md5(当前毫秒 + 随机数)`。作用是让每次请求看起来来自不同的设备；
 * 平台不校验它的来源，只要每次不一样就行。
 */
export const kugouCreateMid = (): string => (
    CryptoJS.MD5(`${Date.now()}${Math.random()}`).toString()
);

/**
 * QQ 的 hash33（`ssl.ptlogin2.qq.com` 的 ptqrtoken 用它）。
 *
 * 那是 QQ 登录的老算法：`e = (e << 5) + 字符码`，逐字符累加，最后取 31 位。
 */
export const qqHash33 = (text: string): number => {
    let hash = 0;
    const source = String(text ?? '');
    for (let i = 0; i < source.length; i += 1) {
        hash += (hash << 5) + source.charCodeAt(i);
    }
    return 2147483647 & hash;
};

/**
 * QQ 的 gtk（签名 `p_skey` 用它）。
 *
 * 与 hash33 相似，但初值是 5381 且不取 31 位截断之外的同样写法。
 */
export const qqGetGtk = (pSkey: string): number => {
    let hash = 5381;
    const source = String(pSkey ?? '');
    for (let i = 0; i < source.length; i += 1) {
        hash += (hash << 5) + source.charCodeAt(i);
    }
    return hash & 2147483647;
};
