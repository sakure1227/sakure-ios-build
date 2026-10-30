// customSource/runtime.cjs — 自定义源运行时
//
// 移植自 lx-music-desktop 的 src/main/modules/userApi/（Apache-2.0）。
//
// 每个自定义源脚本跑在一个独立的隐藏 BrowserWindow 里：脚本通过 preload 注入的 `lx` API
// 与外界通信，主进程负责发请求、收结果。这样脚本拿不到 Node 环境，只能用 `lx` 提供的
// 那几个能力（HTTP 请求、加解密、压缩），沙箱边界清楚。
//
// 与落雪的差异：
//   1. 落雪用 needle + tunnel 发请求，这里用 Electron 的 net 模块（走系统代理与证书栈，
//      不引入额外依赖）；
//   2. 落雪一次只能加载一个源，这里同时维护多个源窗口，按 id 路由请求；
//   3. 落雪的协议没有"搜索"动作，这里保持一致——只有 musicUrl / lyric / pic。

const { BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// preload 与隐藏页面的 IPC 事件名（与落雪保持一致的语义，名字可自定）
const EV = {
    INIT_ENV: 'sakure-cs-init-env',
    INIT: 'sakure-cs-init',
    REQUEST: 'sakure-cs-request',
    RESPONSE: 'sakure-cs-response',
    OPEN_DEVTOOLS: 'sakure-cs-open-devtools',
    SHOW_UPDATE_ALERT: 'sakure-cs-show-update-alert',
    PROXY_UPDATE: 'sakure-cs-proxy-update',
};

// 落雪协议里支持的音乐源标识
const ALL_SOURCES = ['kw', 'kg', 'tx', 'wy', 'mg', 'local'];

// 各源支持的音质
const SUPPORT_QUALITYS = {
    kw: ['128k', '320k', 'flac', 'flac24bit'],
    kg: ['128k', '320k', 'flac', 'flac24bit'],
    tx: ['128k', '320k', 'flac', 'flac24bit'],
    wy: ['128k', '320k', 'flac', 'flac24bit'],
    mg: ['128k', '320k', 'flac', 'flac24bit'],
    local: [],
};

// 各源支持的动作。落雪只让本地源支持 lyric/pic，联网源一律只给 musicUrl——
// 这是上游协议的限制，Sakure 保持同样口径，避免社区脚本的预期错位。
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

const REQUEST_TIMEOUT = 20000;

/**
 * 问一个源时最多试几次。
 *
 * 社区源的服务端会限流：星海源在忙的时候回 503、请求太密的时候回 429，
 * 歌本身它库里没有的时候回 500。前两种过一会儿就好，第三种再试也没用。
 * 所以要重试——不然一次限流就被当成「源坏了」，用户看到的提示就错了。
 */
const REQUEST_ATTEMPTS = 3;

/** 重试之间等多久（毫秒）。 */
const RETRY_DELAY_MS = 1200;

/**
 * 两次重试之间怎么等。
 *
 * 单测里换成假的，免得真的等三秒——重试的节奏是逻辑的一部分（等多久、要不要等），
 * 但「真的睡三秒」不是。
 *
 * @param {number} ms 要等多久
 * @returns {Promise<void>}
 */
let waitBeforeRetryImpl = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const waitBeforeRetry = (ms) => waitBeforeRetryImpl(ms);

/**
 * 这次失败是不是「过一会儿就好」。
 *
 * 源在自己的错误里说明它被限流了（503/429/「请求过于频繁」「稍后重试」）——这些重试有用。
 * 「获取失败」「没有」「不存在」是这首歌它库里没有，再试一百遍也没有。
 *
 * @param {unknown} error 源抛出的错
 * @returns {boolean}
 */
const isRetryableFailure = (error) => {
    const text = error instanceof Error ? error.message : String(error ?? '');
    if (!text) return false;
    // 源常把自己的状态码带在消息里。
    if (/\b(429|503)\b/.test(text)) return true;
    return /请求过于频繁|稍后重试|服务器繁忙|too many requests|rate limit/i.test(text);
};

/** 音质从低到高（与落雪协议里四级的次序一致）。 */
const QUALITY_ORDER = ['128k', '320k', 'flac', 'flac24bit'];

/**
 * 向某个源要哪一级音质。
 *
 * 源在初始化时只声明自己能给哪几级（qualitys），要它没声明的那一级它多半不给：应用默认要 320k，
 * 而社区里常见的源只声明 128k（免费的补源大多是这一级），照 320k 去问就是白问——补源这条路的
 * 意义恰恰是「能给一个地址就行」，比音质重要。所以这里在它声明的几级里挑：能给要的那级就照要，
 * 给不了就退到不高于要的那一级里最高的一级；一样也说不通时给它声明的最低一级。
 *
 * @param {string} requested 想听的那一级
 * @param {string[]} declared 源声明的几级
 * @returns {string}
 */
const resolveAskedQuality = (requested, declared) => {
    const levels = QUALITY_ORDER.filter(level => (declared ?? []).includes(level));
    if (levels.length === 0) return requested;
    if (levels.includes(requested)) return requested;
    const rank = QUALITY_ORDER.indexOf(requested);
    const wanted = rank < 0 ? levels.length : rank;
    const notAbove = levels.filter(level => QUALITY_ORDER.indexOf(level) <= wanted);
    return notAbove.length > 0 ? notAbove[notAbove.length - 1] : levels[0];
};

/**
 * 一次请求的平台标识落在哪一层。
 *
 * 能力表是按平台查的（`sources[平台]`），但落雪的协议并不把平台放在 info 的顶层：脚本收到的那
 * 一个 request 是 `{ source, action, info }`，而 info 是 `{ type, musicInfo }`，平台是
 * `info.musicInfo.source`（mappings 层的 `buildCustomSourceRequestInfo` 就是照这个形状给的）。
 *
 * 所以这里两层都要看：info 自己带了（调试入口、手工请求）就用它，否则读歌里的那一个。只认顶层
 * 时，按落雪形状来的请求会被判成「没有源支持」，一个源也不问就返回 null——补源就整条失效了。
 *
 * @param {object} info 落雪协议的 info（{ type, musicInfo }）
 * @returns {string | null}
 */
const sourceOfRequestInfo = (info) => {
    const source = info?.source ?? info?.musicInfo?.source;
    return typeof source === 'string' && source ? source : null;
};

class CustomSourceRuntime {
    /**
     * @param {object} options
     * @param {import('./store.cjs').CustomSourceStore} options.store
     * @param {(payload: {name: string, description: string, log: string, updateUrl?: string}) => void} [options.onUpdateAlert]
     */
    constructor({ store, onUpdateAlert }) {
        this.store = store;
        this.onUpdateAlert = onUpdateAlert || (() => {});

        /** @type {Map<string, {window: BrowserWindow, ready: boolean, info: object|null}>} */
        this.sources = new Map();
        /** @type {Map<string, {resolve: Function, reject: Function, timer: NodeJS.Timeout}>} */
        this.pending = new Map();
        /** @type {Map<string, {source: string, action: string, info: object}>} */
        this.requestMeta = new Map();
    }

    /** 自定义源页面的 html 路径 */
    get rendererDir() {
        return path.join(__dirname, 'renderer');
    }

    /** 读取隐藏页面用的 html（内容固定，缓存一次） */
    async loadHtml() {
        if (this._html == null) {
            const file = path.join(this.rendererDir, 'custom-source.html');
            this._html = await fs.promises.readFile(file, 'utf8');
        }
        return this._html;
    }

    /** 启动所有启用的源；已在运行的跳过 */
    async startAll() {
        const entries = this.store.getAll().filter(entry => entry.enabled);
        for (const entry of entries) {
            await this.start(entry.id).catch(err => {
                console.error(`[customSource] 源「${entry.name}」启动失败:`, err.message);
            });
        }
    }

    /** 启动某个源 */
    async start(id) {
        if (this.sources.has(id)) return;
        const entry = this.store.getAll().find(item => item.id === id);
        if (!entry) throw new Error('自定义源不存在');

        const script = await this.store.getScript(id);
        const html = await this.loadHtml();

        const win = new BrowserWindow({
            resizable: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            roundedCorners: false,
            hasShadow: false,
            show: false,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                nodeIntegrationInWorker: false,
                sandbox: false,
                spellcheck: false,
                autoplayPolicy: 'document-user-activation-required',
                enableWebSQL: false,
                disableDialogs: true,
                webgl: false,
                images: false,
                preload: path.join(this.rendererDir, 'preload.cjs'),
            },
        });

        const state = { window: win, ready: false, info: null };
        this.sources.set(id, state);

        // 隐藏窗口不允许跳转、弹窗或新开窗口
        const denyEvents = ['will-navigate', 'will-redirect', 'will-attach-webview', 'will-prevent-unload'];
        for (const eventName of denyEvents) {
            win.webContents.on(eventName, event => event.preventDefault());
        }
        win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
            callback(webContents !== win.webContents);
        });

        win.on('closed', () => {
            this.sources.delete(id);
        });

        // preload 通过这些通道与主进程对话
        win.webContents.on('ipc-message', (_event, channel, ...args) => {
            if (channel === EV.INIT) this.handleInit(id, args[0]);
            else if (channel === EV.RESPONSE) this.handleResponse(id, args[0]);
            else if (channel === EV.OPEN_DEVTOOLS) this.openDevTools(id);
            else if (channel === EV.SHOW_UPDATE_ALERT) this.handleUpdateAlert(id, args[0]);
        });

        await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

        await new Promise(resolve => {
            const onReady = () => {
                win.webContents.off('ready-to-show', onReady);
                resolve();
            };
            win.webContents.on('ready-to-show', onReady);
            // 兜底：加载失败时不无限等待
            setTimeout(resolve, 3000);
        });

        win.webContents.send(EV.INIT_ENV, {
            ...entry,
            script,
        });
    }

    /** 停止某个源 */
    async stop(id) {
        const state = this.sources.get(id);
        if (!state) return;
        this.sources.delete(id);
        // 停掉源时，它未完成的请求要失败掉，不能留着悬着
        for (const [key, pending] of this.pending) {
            if (pending.sourceId === id) {
                clearTimeout(pending.timer);
                pending.reject(new Error('自定义源已停止'));
                this.pending.delete(key);
            }
        }
        try {
            await Promise.all([
                state.window.webContents.session.clearAuthCache(),
                state.window.webContents.session.clearStorageData(),
                state.window.webContents.session.clearCache(),
            ]);
        } catch {
            // 窗口已经没了就算了
        }
        state.window.destroy();
    }

    /** 停止全部源 */
    async stopAll() {
        await Promise.all([...this.sources.keys()].map(id => this.stop(id)));
    }

    /** 某个源是否已就绪（脚本已声明支持的能力） */
    isReady(id) {
        const state = this.sources.get(id);
        return !!(state && state.ready);
    }

    /** 某个源声明的能力 */
    getInfo(id) {
        const state = this.sources.get(id);
        return state ? state.info : null;
    }

    /** 列出全部源及其运行状态 */
    list() {
        return this.store.getAll().map(entry => ({
            ...entry,
            running: this.isReady(entry.id),
            sources: this.getInfo(entry.id)?.sources || null,
        }));
    }

    /** preload 报告脚本已初始化 */
    handleInit(id, payload) {
        const state = this.sources.get(id);
        if (!state) return;
        const { status, message, data } = payload || {};
        if (!status) {
            console.error(`[customSource] 源初始化失败:`, message);
            state.ready = false;
            state.info = { error: message || 'unknown error' };
            return;
        }
        state.ready = true;
        state.info = data;
    }

    /** preload 报告请求结果 */
    handleResponse(id, payload) {
        // preload 的 sendMessage 把内容包成 { data, status, message }，与 init 一样的形状。
        const { status, message, data } = payload || {};
        const { requestKey, result } = data || {};
        const pending = this.pending.get(requestKey);
        // 迟到的答案（比如窗口已经关了）没有人在等，丢了就是。
        if (!pending) return;
        this.pending.delete(requestKey);
        clearTimeout(pending.timer);
        if (status) pending.resolve(result);
        else pending.reject(new Error(message || '请求失败'));
    }
    /** 源请求弹出更新提示 */
    handleUpdateAlert(id, payload) {
        const entry = this.store.getAll().find(item => item.id === id);
        if (!entry || !entry.allowShowUpdateAlert) return;
        const { log, updateUrl } = payload || {};
        if (typeof log !== 'string' || !log) return;
        this.onUpdateAlert({
            name: entry.name,
            description: entry.description,
            log: log.substring(0, 1024),
            updateUrl: typeof updateUrl === 'string' && /^https?:\/\/[^\s$.?#].[^\s]*$/.test(updateUrl) ? updateUrl : undefined,
        });
    }

    /** 打开某个源的开发者工具 */
    openDevTools(id) {
        const state = this.sources.get(id);
        if (!state) return;
        state.window.webContents.openDevTools();
    }

    /**
     * 向某个源发起一次请求。
     *
     * @param {string} id 源 id
     * @param {{source: string, action: string, info: object}} data
     * @returns {Promise<any>}
     */
    request(id, data) {
        const state = this.sources.get(id);
        if (!state) return Promise.reject(new Error('自定义源未运行'));
        if (!state.ready) return Promise.reject(new Error('自定义源未就绪'));

        const requestKey = `cs__${Date.now()}_${Math.random().toString().substring(2, 10)}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestKey);
                reject(new Error('请求超时'));
            }, REQUEST_TIMEOUT);
            this.pending.set(requestKey, { resolve, reject, timer, sourceId: id });
            state.window.webContents.send(EV.REQUEST, { requestKey, data });
        });
    }

    /**
     * 让所有已就绪的、支持该动作的源依次尝试，直到有人给出结果。
     *
     * 答不上来时要说清「为什么答不上来」：用户看到的是「自定义源没能给地址」还是「压根没装源」，
     * 是两件完全不同的事——前者是源坏了（该去修源、换源），后者是没开这个功能。两种都说成
     * 「没答出来」，用户会去查错方向。所以这里把情况一起带回去。
     *
     * @param {string} action musicUrl / lyric / pic
     * @param {object} info 落雪协议里的 info 结构
     * @returns {Promise<{sourceId: string, result: any} | {sourceId: null, result: null, reason: string} | null>}
     */
    async requestFromAny(action, info) {
        const source = sourceOfRequestInfo(info);
        // 平台都不知，谁支持动作、谁不支持就无从判断；往下走只会白问一圈。
        if (!source) return { sourceId: null, result: null, reason: 'unknown-platform' };
        const entries = this.store.getAll().filter(entry => entry.enabled);
        // 装了几个源、几个声明支持这个平台、几个真的被问了——分开记，用户看到的提示才说得准。
        let installed = 0;
        let supporting = 0;
        let asked = 0;
        // 源装了但脚本还没起来（正在启动，或启动失败了）。这跟「源不接这个平台」是两回事：
        // 前者是暂时的，等一下就好；后者是这个源根本不管这个平台。混起来说，用户会去查错方向。
        let notReady = 0;
        // 源被限流了（它自己说的）。这也不是「源坏了」——过一会儿就好，要提示的是「稍后重试」。
        let rateLimited = false;
        for (const entry of entries) {
            installed++;
            if (!this.isReady(entry.id)) {
                notReady++;
                continue;
            }
            const sourceInfo = this.getInfo(entry.id);
            const declared = sourceInfo?.sources?.[source];
            if (!declared || !declared.actions?.includes(action)) continue;
            supporting++;
            // 要的音质按这个源声明的来：info 是落雪的形状（{ type, musicInfo }），type 就是音质。
            const asked_ = { ...info, type: resolveAskedQuality(info?.type, declared.qualitys) };
            for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt++) {
                try {
                    asked++;
                    const result = await this.request(entry.id, { source, action, info: asked_ });
                    if (result != null) return { sourceId: entry.id, result };
                    // 源答了但没有地址：它自己说了什么吗？（限流时有些源会回一个空壳而不是抛错）
                    break;
                } catch (err) {
                    if (isRetryableFailure(err)) {
                        rateLimited = true;
                        console.warn(`[customSource] 源「${entry.name}」被限流，稍后重试:`, err.message);
                        if (attempt < REQUEST_ATTEMPTS) {
                            await waitBeforeRetry(RETRY_DELAY_MS * attempt);
                            continue;
                        }
                        break;
                    }
                    console.warn(`[customSource] 源「${entry.name}」处理 ${action} 失败:`, err.message);
                    break;
                }
            }
        }
        if (installed === 0) return { sourceId: null, result: null, reason: 'no-source' };
        if (supporting === 0) {
            // 装着的源都还没起来：是「还没准备好」，不是「不接这个平台」。
            if (notReady > 0) return { sourceId: null, result: null, reason: 'not-ready' };
            return { sourceId: null, result: null, reason: 'unsupported-platform' };
        }
        // 源被限流：过一会儿就好，不是源坏了。该说的是「稍后重试」。
        if (rateLimited) return { sourceId: null, result: null, reason: 'rate-limited' };
        // 源被问了却没答出地址——这才是「源坏了」那一种，也是最该让用户知道的一种。
        return { sourceId: null, result: null, reason: 'no-answer' };
    }
}

module.exports = {
    CustomSourceRuntime,
    EV,
    ALL_SOURCES,
    SUPPORT_ACTIONS,
    SUPPORT_QUALITYS,
    // 单测要断言"重试了几次"与"哪些失败值得重试"，这两件事不该藏在闭包里。
    isRetryableFailure,
    setRetryWaiter: (fn) => { waitBeforeRetryImpl = fn; },
};
