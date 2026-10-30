// customSource/store.cjs — 自定义源脚本的存储与元信息解析
//
// 移植自 lx-music-desktop 的 src/main/modules/userApi/utils.ts（Apache-2.0），
// 适配 Sakure 的 electron-store 存储层。脚本正文沿用落雪的 gz_+base64(deflate) 格式，
// 这样从落雪导出的源脚本可以直接迁移过来。

const zlib = require('node:zlib');

// 脚本头块注释里允许的元信息字段与各自的最大长度
const INFO_NAMES = {
    name: 24,
    description: 36,
    author: 56,
    homepage: 1024,
    version: 36,
};

const INFO_LINE = /^\s?\*\s?@(\w+)\s(.+)$/;

/** 从脚本头块注释里解析出 @name / @description 等元信息 */
const matchScriptInfo = (scriptInfo) => {
    const lines = scriptInfo.split(/\r?\n/);
    const infos = {};
    for (const line of lines) {
        const matched = INFO_LINE.exec(line);
        if (!matched) continue;
        const key = matched[1];
        if (INFO_NAMES[key] == null) continue;
        infos[key] = matched[2].trim();
    }

    for (const [key, maxLen] of Object.entries(INFO_NAMES)) {
        const value = infos[key];
        infos[key] = !value ? '' : value.length > maxLen ? `${value.substring(0, maxLen)}...` : value;
    }
    return infos;
};

/** 解析脚本头部注释；没有合法头块时抛错 */
const parseScriptInfo = (script) => {
    const matched = /^\/\*[\S|\s]+?\*\//.exec(script);
    if (!matched) throw new Error('无效的自定义源文件');
    const info = matchScriptInfo(matched[0]);
    info.name ||= `user_api_${new Date().toLocaleString()}`;
    return info;
};

const deflateScript = (script) => new Promise((resolve, reject) => {
    zlib.deflate(Buffer.from(script, 'utf8'), (err, buf) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(`gz_${buf.toString('base64')}`);
    });
});

const inflateScript = (script) => new Promise((resolve, reject) => {
    if (!script) {
        resolve('');
        return;
    }
    if (!script.startsWith('gz_')) {
        resolve(script);
        return;
    }
    zlib.inflate(Buffer.from(script.substring(3), 'base64'), (err, buf) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(buf.toString('utf8'));
    });
});

/**
 * 自定义源脚本仓库。
 *
 * `store` 是 electron-store 实例；脚本列表存在 `userSources` 键下，
 * 每条记录形如 { id, name, description, author, homepage, version, enabled, script }。
 */
class CustomSourceStore {
    /** @param {import('electron-store').ElectronStore} store */
    constructor(store) {
        this.store = store;
        /** @type {Map<string, string>} 解压后的脚本文本，id -> script */
        this.scripts = new Map();
        /** @type {Array<object> | null} 列表缓存 */
        this.list = null;
    }

    /** 读取全部自定义源（首次读时从存储载入并解压脚本） */
    getAll() {
        if (this.list) return this.list;
        const stored = this.store.get('userSources');
        const entries = Array.isArray(stored) ? stored : [];
        this.list = [];
        for (const entry of entries) {
            if (!entry || typeof entry.id !== 'string') continue;
            const { script, ...info } = entry;
            this.scripts.set(entry.id, script || '');
            this.list.push({
                ...info,
                id: entry.id,
                enabled: entry.enabled !== false,
                allowShowUpdateAlert: entry.allowShowUpdateAlert === true,
            });
        }
        return this.list;
    }

    /** 把内存中的列表写回存储 */
    save() {
        if (!this.list) return;
        this.store.set('userSources', this.list.map(entry => ({
            ...entry,
            script: this.scripts.get(entry.id) || '',
        })));
    }

    /** 取某个源的解压后脚本正文 */
    async getScript(id) {
        const raw = this.scripts.get(id);
        if (raw == null) throw new Error('自定义源不存在');
        return inflateScript(raw);
    }

    /** 导入一个脚本；返回新脚本的元信息 */
    async importScript(scriptRaw) {
        const info = parseScriptInfo(scriptRaw);
        const script = await deflateScript(scriptRaw);
        this.getAll();
        for (const entry of this.list) {
            if (this.scripts.get(entry.id) === script) {
                throw new Error(`导入失败，脚本内容与已有的源「${entry.name}」相同`);
            }
        }
        const id = `user_api_${Math.random().toString().substring(2, 5)}_${Date.now()}`;
        const entry = {
            id,
            name: info.name,
            description: info.description,
            author: info.author,
            homepage: info.homepage,
            version: info.version,
            enabled: true,
            allowShowUpdateAlert: true,
        };
        this.list.push(entry);
        this.scripts.set(id, script);
        this.save();
        return entry;
    }

    /** 删除若干源 */
    remove(ids) {
        this.getAll();
        for (let index = this.list.length - 1; index > -1; index--) {
            if (ids.includes(this.list[index].id)) {
                this.scripts.delete(this.list[index].id);
                this.list.splice(index, 1);
            }
        }
        this.save();
    }

    /** 启用 / 停用某个源 */
    setEnabled(id, enabled) {
        const target = this.getAll().find(entry => entry.id === id);
        if (!target) return;
        target.enabled = enabled === true;
        this.save();
    }

    /** 是否允许该源弹出更新提示 */
    setAllowShowUpdateAlert(id, allow) {
        const target = this.getAll().find(entry => entry.id === id);
        if (!target) return;
        target.allowShowUpdateAlert = allow === true;
        this.save();
    }
}

module.exports = {
    CustomSourceStore,
    parseScriptInfo,
    deflateScript,
    inflateScript,
};
