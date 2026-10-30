// customSource/renderer/preload.cjs — 自定义源脚本的 lx API 桥
//
// 移植自 lx-music-desktop 的 src/main/modules/userApi/renderer/preload.js（Apache-2.0）。
//
// 这里暴露给脚本的 `lx` 对象就是落雪自定义源协议的 v2.0.0 表面：脚本用
// `lx.on('request', handler)` 声明自己能处理什么，用 `lx.request(...)` 发 HTTP 请求，
// 用 `lx.utils.crypto / buffer / zlib` 做加解密与压缩。
//
// 与落雪的差异：落雪的 lx.request 用 needle 发请求，这里改为把请求交给主进程，
// 由主进程用 Electron 的 net 模块发出（走系统代理与系统证书链）。脚本侧拿到的回调签名
// 与落雪一致：callback(err, resp, body)。

const { contextBridge, ipcRenderer, webFrame } = require('electron');
const zlib = require('node:zlib');
const { createCipheriv, publicEncrypt, constants, randomBytes, createHash } = require('node:crypto');

const EV = {
    INIT_ENV: 'sakure-cs-init-env',
    INIT: 'sakure-cs-init',
    REQUEST: 'sakure-cs-request',
    RESPONSE: 'sakure-cs-response',
    OPEN_DEVTOOLS: 'sakure-cs-open-devtools',
    SHOW_UPDATE_ALERT: 'sakure-cs-show-update-alert',
    PROXY_UPDATE: 'sakure-cs-proxy-update',
};

const EVENT_NAMES = {
    request: 'request',
    inited: 'inited',
    updateAlert: 'updateAlert',
};

const eventNames = Object.values(EVENT_NAMES);

/** 落雪协议里支持的音乐源与它们的能力 */
const ALL_SOURCES = ['kw', 'kg', 'tx', 'wy', 'mg', 'local'];
const SUPPORT_QUALITYS = {
    kw: ['128k', '320k', 'flac', 'flac24bit'],
    kg: ['128k', '320k', 'flac', 'flac24bit'],
    tx: ['128k', '320k', 'flac', 'flac24bit'],
    wy: ['128k', '320k', 'flac', 'flac24bit'],
    mg: ['128k', '320k', 'flac', 'flac24bit'],
    local: [],
};
// 源是支持歌词与封面的（社区源初始化时声明 `actions: ['musicUrl','lyric','pic']`），
// 而宿主的请求处理（buildResult）本来就有这两个动作的分支。这里只写 `musicUrl` 的
// 话，初始化时告诉了源「你不支持歌词与封面」，它于是不接这两个动作 —— 明明它有一份
// 跨平台收录的歌词与封面（它按歌名找，比单个平台宽）。
const SUPPORT_ACTIONS = {
    kw: ['musicUrl', 'lyric', 'pic'],
    kg: ['musicUrl', 'lyric', 'pic'],
    tx: ['musicUrl', 'lyric', 'pic'],
    wy: ['musicUrl', 'lyric', 'pic'],
    mg: ['musicUrl', 'lyric', 'pic'],
    xm: ['musicUrl', 'lyric', 'pic'],
    local: ['musicUrl', 'lyric', 'pic'],
};

let isInitedApi = false;
let isShowedUpdateAlert = false;
const events = { request: null };

const sendMessage = (channel, data, status, message) => {
    ipcRenderer.send(channel, { data, status, message });
};

/** 歌词结果的校验，限制长度避免脚本塞入异常大的内容 */
const verifyLyricInfo = (info) => {
    if (typeof info !== 'object' || typeof info.lyric !== 'string') throw new Error('failed');
    if (info.lyric.length > 51200) throw new Error('failed');
    return {
        lyric: info.lyric,
        tlyric: typeof info.tlyric === 'string' && info.tlyric.length < 5120 ? info.tlyric : null,
        rlyric: typeof info.rlyric === 'string' && info.rlyric.length < 5120 ? info.rlyric : null,
        lxlyric: typeof info.lxlyric === 'string' && info.lxlyric.length < 8192 ? info.lxlyric : null,
    };
};

/** 主进程回传的结果转成落雪协议的结果结构 */
const buildResult = (action, data, response) => {
    switch (action) {
        case 'musicUrl':
            if (typeof response !== 'string' || response.length > 2048 || !/^https?:/.test(response)) throw new Error('failed');
            return { source: data.source, action: data.action, data: { type: data.info.type, url: response } };
        case 'lyric':
            return { source: data.source, action: data.action, data: verifyLyricInfo(response) };
        case 'pic':
            if (typeof response !== 'string' || response.length > 2048 || !/^https?:/.test(response)) throw new Error('failed');
            return { source: data.source, action: data.action, data: response };
        default:
            throw new Error(`unsupported action: ${action}`);
    }
};

const handleRequest = (context, { requestKey, data }) => {
    if (!events.request) {
        sendMessage(EV.RESPONSE, { requestKey }, false, 'Request event is not defined');
        return;
    }
    try {
        Promise.resolve(events.request.call(context, {
            source: data.source,
            action: data.action,
            info: data.info,
        })).then(response => {
            const sendData = { requestKey, result: buildResult(data.action, data, response) };
            sendMessage(EV.RESPONSE, sendData, true);
        }).catch(err => {
            sendMessage(EV.RESPONSE, { requestKey }, false, err?.message || String(err));
        });
    } catch (err) {
        sendMessage(EV.RESPONSE, { requestKey }, false, err?.message || String(err));
    }
};

/** 脚本声明自己的能力 */
const handleInit = (context, info) => {
    if (!info) {
        sendMessage(EV.INIT, null, false, 'Missing required parameter init info');
        return;
    }
    if (info.openDevTools === true) sendMessage(EV.OPEN_DEVTOOLS);

    const sourceInfo = { sources: {} };
    try {
        for (const source of ALL_SOURCES) {
            const userSource = info.sources?.[source];
            if (!userSource || userSource.type !== 'music') continue;
            const qualitys = SUPPORT_QUALITYS[source] || [];
            const actions = SUPPORT_ACTIONS[source] || [];
            sourceInfo.sources[source] = {
                type: 'music',
                actions: actions.filter(action => userSource.actions?.includes(action)),
                qualitys: qualitys.filter(quality => userSource.qualitys?.includes(quality)),
            };
        }
    } catch (error) {
        sendMessage(EV.INIT, null, false, error.message);
        return;
    }
    sendMessage(EV.INIT, sourceInfo, true);

    ipcRenderer.on(EV.REQUEST, (event, data) => handleRequest(context, data));
};

const handleShowUpdateAlert = (data, resolve, reject) => {
    if (!data || typeof data !== 'object') {
        reject(new Error('parameter format error.'));
        return;
    }
    if (!data.log || typeof data.log !== 'string') {
        reject(new Error('log is required.'));
        return;
    }
    if (data.updateUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(data.updateUrl) && data.updateUrl.length > 1024) delete data.updateUrl;
    if (data.log.length > 1024) data.log = `${data.log.substring(0, 1024)}...`;
    sendMessage(EV.SHOW_UPDATE_ALERT, { log: data.log, updateUrl: data.updateUrl });
    resolve();
};

/** 脚本在初始化阶段抛错时，把错误报给主进程 */
const onError = (errorMessage) => {
    if (isInitedApi) return;
    isInitedApi = true;
    if (errorMessage.length > 1024) errorMessage = `${errorMessage.substring(0, 1024)}...`;
    sendMessage(EV.INIT, null, false, errorMessage);
};

const initEnv = (userApi) => {
    contextBridge.exposeInMainWorld('lx', {
        EVENT_NAMES,

        /**
         * 发一个 HTTP 请求。真正的网络动作由主进程完成（走系统代理与证书链），
         * 脚本这边拿到的回调签名与落雪一致：callback(err, resp, body)。
         */
        request(url, { method = 'get', timeout, headers, body, form, formData } = {}, callback) {
            ipcRenderer.invoke('sakure-cs-http-request', {
                url: String(url),
                method: String(method).toLowerCase(),
                timeout: typeof timeout === 'number' && timeout > 0 ? Math.min(timeout, 60000) : 60000,
                headers: headers || null,
                body: body ?? null,
                form: form ?? null,
                formData: formData ?? null,
            }).then(result => {
                if (result?.error) {
                    callback.call(this, new Error(result.error), null, null);
                    return;
                }
                // 落雪的 needle 把解析好的 body 同时挂在响应上与回调的第三个参数上：
                // 社区脚本要的是 `resp.body.code`，只给第三个参数等于没给。
                callback.call(this, null, result.response, result.body);
            }).catch(err => {
                callback.call(this, err instanceof Error ? err : new Error(String(err)), null, null);
            });
            // 返回一个取消函数，落雪这里是 abort
            return () => {};
        },

        /** 声明脚本自己的能力 */
        send(eventName, data) {
            return new Promise((resolve, reject) => {
                if (!eventNames.includes(eventName)) {
                    reject(new Error(`The event is not supported: ${eventName}`));
                    return;
                }
                switch (eventName) {
                    case EVENT_NAMES.inited:
                        if (isInitedApi) {
                            reject(new Error('Script is inited'));
                            return;
                        }
                        isInitedApi = true;
                        handleInit(this, data);
                        resolve();
                        break;
                    case EVENT_NAMES.updateAlert:
                        if (isShowedUpdateAlert) {
                            reject(new Error('The update alert can only be called once.'));
                            return;
                        }
                        isShowedUpdateAlert = true;
                        handleShowUpdateAlert(data, resolve, reject);
                        break;
                    default:
                        reject(new Error(`Unknown event name: ${eventName}`));
                }
            });
        },

        /** 注册事件处理器。落雪只有 request 一个事件 */
        on(eventName, handler) {
            if (!eventNames.includes(eventName)) {
                return Promise.reject(new Error(`The event is not supported: ${eventName}`));
            }
            switch (eventName) {
                case EVENT_NAMES.request:
                    events.request = handler;
                    break;
                default:
                    return Promise.reject(new Error(`The event is not supported: ${eventName}`));
            }
            return Promise.resolve();
        },

        utils: {
            crypto: {
                aesEncrypt(buffer, mode, key, iv) {
                    const cipher = createCipheriv(mode, key, iv);
                    return Buffer.concat([cipher.update(buffer), cipher.final()]);
                },
                rsaEncrypt(buffer, key) {
                    const padded = Buffer.concat([Buffer.alloc(128 - buffer.length), buffer]);
                    return publicEncrypt({ key, padding: constants.RSA_NO_PADDING }, padded);
                },
                randomBytes(size) {
                    return randomBytes(size);
                },
                md5(str) {
                    return createHash('md5').update(str).digest('hex');
                },
            },
            buffer: {
                from(...args) {
                    return Buffer.from(...args);
                },
                bufToString(buf, format) {
                    return Buffer.from(buf, 'binary').toString(format);
                },
            },
            zlib: {
                inflate(buf) {
                    return new Promise((resolve, reject) => {
                        zlib.inflate(buf, (err, data) => {
                            if (err) reject(new Error(err.message));
                            else resolve(data);
                        });
                    });
                },
                deflate(data) {
                    return new Promise((resolve, reject) => {
                        zlib.deflate(data, (err, buf) => {
                            if (err) reject(new Error(err.message));
                            else resolve(buf);
                        });
                    });
                },
            },
        },

        currentScriptInfo: {
            name: userApi.name,
            description: userApi.description,
            version: userApi.version,
            author: userApi.author,
            homepage: userApi.homepage,
            rawScript: userApi.script,
        },
        version: '2.0.0',
        env: 'desktop',
    });

    contextBridge.exposeInMainWorld('__lx_init_error_handler__', {
        sendError(errorMessage) {
            onError(errorMessage);
        },
    });

    // 脚本跑起来之前的异常要能报到主进程，否则界面上只会显示"未就绪"而无从排查
    webFrame.executeJavaScript(`(() => {
        window.addEventListener('error', (event) => {
          if (event.isTrusted) globalThis.__lx_init_error_handler__.sendError(event.message.replace(/^Uncaught\\sError:\\s/, ''))
        })
        window.addEventListener('unhandledrejection', (event) => {
          if (!event.isTrusted) return
          const message = typeof event.reason === 'string' ? event.reason : event.reason?.message ?? String(event.reason)
          globalThis.__lx_init_error_handler__.sendError(message.replace(/^Error:\\s/, ''))
        })
    })()`).catch(() => {});

    webFrame.executeJavaScript(userApi.script).catch(() => {});
};

ipcRenderer.on(EV.INIT_ENV, (event, data) => initEnv(data));
