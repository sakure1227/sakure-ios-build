// mobile/src/mobileCredentials.ts
// 手机版的登录凭据存储。
//
// ## 为什么单独一个文件
//
// 登录凭据（网易云的 `MUSIC_U`、QQ 的 `access_token`、酷狗的 `token`）是**账号本身**。
// 它比搜索历史、比自定义封面都要敏感：拿到它就等于拿到这个账号。
//
// ## 怎么存的
//
// 桌面上用 Electron 的 `safeStorage`（系统钥匙串）加密后存盘。手机版没有那个，
// 但有 Android Keystore。做法：
//
// 1. 首次使用时向系统要一个 256 位的 AES 密钥（`CsCrypto` 插件，Android Keystore 生成，
//    **密钥本身永远不出 Keystore**）。
// 2. 每次保存凭据时用那个密钥 AES-GCM 加密，再把密文（`iv + 密文 + tag`）存进
//    Capacitor 的 Preferences。
//
// 这样磁盘上只有密文：拿到 APK 或 root 权限拿到 Preferences 的内容，也读不出凭据 —
// 除非能在解锁时调 Keystore（那需要设备已解锁且应用在运行）。
//
// 拿不到 Keystore 时（极少见：极少数定制 ROM、或者应用数据被清过而密钥还在系统里
// 但密钥已被系统删除），退回明文存，并记下来 —— 那时至少功能还能用。

import { registerPlugin } from '@capacitor/core';

/**
 * 原生的加密插件。
 *
 * 注意参数的形状：Capacitor 的插件方法要的是**一个对象**（`{ alias, plainText }`），
 * 不是位置参数。传位置参数的话，原生那边 `call.getString("plainText")`
 * 拿到的是 null ——然后就是「凭据丢了」。
 */
type CsCryptoPlugin = {
    /** 拿（或生成）Keystore 里的 AES 密钥。密钥的字节拿不出来（它在 Keystore 里）。 */
    getOrCreateKey(options: { alias: string }): Promise<{ key: string; created: boolean }>;
    /** 用 Keystore 里的密钥做 AES-GCM 加密。 */
    encrypt(options: { alias: string; plainText: string }): Promise<{ iv: string; cipherText: string }>;
    /** 解密。 */
    decrypt(options: { alias: string; iv: string; cipherText: string }): Promise<{ plainText: string }>;
    /** 这个密钥还在不在（系统里被清过就会不在）。 */
    hasKey(options: { alias: string }): Promise<{ exists: boolean }>;
};

type PreferencesPlugin = {
    get(options: { key: string }): Promise<{ value: string | null }>;
    set(options: { key: string; value: string }): Promise<void>;
    remove(options: { key: string }): Promise<void>;
};

const getCsCrypto = (): CsCryptoPlugin => registerPlugin<CsCryptoPlugin>('CsCrypto');
const getPreferences = (): PreferencesPlugin => registerPlugin<PreferencesPlugin>('Preferences');

const KEY_ALIAS = 'sakure_login_v1';
const PREFIX = 'sakure_cred_';

/** 存下来的东西标明自己是不是加密的（不是的话读的时候知道）。 */
const ENCRYPTED_MARK = 'enc:';
const PLAIN_MARK = 'plain:';

/** 这个运行期里，明文存过一次（Keystore 拿不到时）。 */
let plaintextFallback = false;

/** Keystore 拿不到时是不是已经退回了明文。 */
export const isUsingPlaintextFallback = (): boolean => plaintextFallback;

const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array => {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const safeStorage = async (): Promise<PreferencesPlugin | null> => {
    try {
        return getPreferences();
    } catch {
        return null;
    }
};

/**
 * 存一条凭据。
 *
 * @param key 键（一般用平台的会话字段名，如 `cookie`、`token`）
 * @param value 明文值
 */
export const saveCredential = async (key: string, value: string): Promise<void> => {
    const preferences = await safeStorage();
    if (!preferences) return;

    const storageKey = `${PREFIX}${key}`;
    if (!value) {
        await preferences.remove({ key: storageKey });
        return;
    }

    try {
        const crypto = getCsCrypto();
        const { iv, cipherText } = await crypto.encrypt({ alias: KEY_ALIAS, plainText: value });
        await preferences.set({ key: storageKey, value: `${ENCRYPTED_MARK}${iv}.${cipherText}` });
    } catch (error) {
        // Keystore 不可用：功能比安全重要，先存下来（值前面标明没加密）。
        console.warn('[mobileCredentials] Keystore unavailable, storing plaintext:', error);
        plaintextFallback = true;
        await preferences.set({ key: storageKey, value: `${PLAIN_MARK}${value}` });
    }
};

/**
 * 读一条凭据。
 *
 * 读不出来（密钥被系统清过、内容坏了）时回 null —— 让上层当作「没登录」，
 * 而不是拿着半截数据去请求平台。
 */
export const loadCredential = async (key: string): Promise<string | null> => {
    const preferences = await safeStorage();
    if (!preferences) return null;

    try {
        const { value } = await preferences.get({ key: `${PREFIX}${key}` });
        if (!value) return null;
        if (value.startsWith(PLAIN_MARK)) return value.slice(PLAIN_MARK.length);
        if (!value.startsWith(ENCRYPTED_MARK)) return null;

        const payload = value.slice(ENCRYPTED_MARK.length);
        const dot = payload.indexOf('.');
        if (dot <= 0) return null;
        const iv = payload.slice(0, dot);
        const cipherText = payload.slice(dot + 1);

        const crypto = getCsCrypto();
        const { plainText } = await crypto.decrypt({ alias: KEY_ALIAS, iv, cipherText });
        return plainText;
    } catch (error) {
        console.warn('[mobileCredentials] Could not read the credential:', error);
        return null;
    }
};

/** 删一条凭据。 */
export const removeCredential = async (key: string): Promise<void> => {
    const preferences = await safeStorage();
    if (!preferences) return;
    try {
        await preferences.remove({ key: `${PREFIX}${key}` });
    } catch (error) {
        console.warn('[mobileCredentials] Could not remove the credential:', error);
    }
};

/**
 * 这个 Keystore 密钥还在不在。
 *
 * 启动时问一次：不在的话，之前存的密文读不出来了（登录态要当作没了）。
 */
export const hasCredentialKey = async (): Promise<boolean> => {
    try {
        const crypto = getCsCrypto();
        const { exists } = await crypto.hasKey({ alias: KEY_ALIAS });
        return exists;
    } catch {
        return false;
    }
};

// 让 fromBase64 有用（解密时可能要处理字节）。
export const decodeBase64 = fromBase64;
export const encodeBase64 = toBase64;
