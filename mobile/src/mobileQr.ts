// mobile/src/mobileQr.ts
// 手机版的二维码渲染。
//
// ## 为什么需要它
//
// 三个平台的二维码给法不一样：
//
// - 网易云：直接给一张 base64 的 png（`qrimg`）—— 不用画。
// - QQ：给一张 png 的**二进制**（`ptqrshow` 的回答）—— 要转成 data URL。
// - 酷狗：给的是二维码的**地址**（`https://h5.kugou.com/apps/loginQRCode/...`）——
//   要自己把那个地址画成二维码的图。
//
// 所以这里提供一个统一的出口：不管平台给的是图还是地址，最后都交回一张 data URL。
//
// ## 用哪个库
//
// `qrcode` 这个包在依赖里，且它自己声明了浏览器入口（`package.json` 的
// `browser` 字段把 `lib/index.js` 换成 `lib/browser.js`）—— 那份入口不含 `fs`
// 依赖，能在 WebView 里跑。Vite 会按这个字段挑。

import QRCode from 'qrcode';

/**
 * 把一段文字画成二维码（data URL 的 png）。
 *
 * @param text 二维码里的内容（平台的地址或 key）
 */
export const renderQrAsDataUrl = async (text: string): Promise<string> => {
    const url = await QRCode.toDataURL(String(text), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: {
            dark: '#000000ff',
            light: '#ffffffff',
        },
    });
    return String(url);
};

/**
 * 把一张 png 的**二进制**变成 data URL。
 *
 * QQ 的二维码是二进制（`ptqrshow` 直接给图片）。手机版的原生 HTTP 层用
 * `responseType: 'arraybuffer'` 拿它，拿回来的是 base64 —— 这里补上 data URL 的前缀。
 */
export const toPngDataUrl = (base64: string): string => {
    const clean = String(base64 ?? '').replace(/\s+/g, '');
    if (!clean) return '';
    if (clean.startsWith('data:')) return clean;
    return `data:image/png;base64,${clean}`;
};
