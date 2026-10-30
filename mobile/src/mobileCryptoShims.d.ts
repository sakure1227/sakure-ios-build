// mobile/src/mobileCryptoShims.d.ts
// `crypto-js` 与 `node-forge` 没有随包发类型（`@types/crypto-js` / `@types/node-forge`
// 不在依赖里）。这里只声明手机版**实际用到**的那几个成员 —— 不是整包类型，
// 但足够让类型检查盯住用法（写错成员名会报错）。

declare module 'crypto-js' {
    export const enc: {
        Utf8: { parse(input: string): unknown };
        Hex: { parse(input: string): unknown };
        Base64: { stringify(input: unknown): string };
    };
    export const mode: {
        CBC: unknown;
        ECB: unknown;
    };
    export const pad: {
        Pkcs7: unknown;
    };
    export const AES: {
        encrypt(plaintext: unknown, key: unknown, options: { iv: unknown; mode: unknown; padding: unknown }): {
            toString(): string;
            ciphertext: { toString(): string };
        };
        decrypt(ciphertext: unknown, key: unknown, options: { iv?: unknown; mode?: unknown }): unknown;
    };
    export function MD5(input: string): { toString(): string };
}

declare module 'node-forge' {
    export const pki: {
        publicKeyFromPem(pem: string): {
            encrypt(data: string, mode: string): unknown;
        };
    };
    export const util: {
        bytesToHex(bytes: unknown): string;
    };
}

declare module 'qrcode' {
    export function toDataURL(
        text: string,
        options?: {
            errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
            margin?: number;
            width?: number;
            color?: { dark?: string; light?: string };
        },
    ): Promise<string>;
}
