// customSource/ipc.cjs — 自定义源模块的 IPC 接口
//
// 渲染层通过 window.electron.customSource.* 访问这里的接口。

const { ipcMain, shell, clipboard } = require('electron');
const fs = require('node:fs');
const { CustomSourceStore } = require('./store.cjs');
const { CustomSourceRuntime } = require('./runtime.cjs');
const { performRequest } = require('./http.cjs');
const { importSourceFromUrl } = require('./importUrl.cjs');

/**
 * 注册自定义源的全部 IPC 通道。
 *
 * @param {object} options
 * @param {import('electron-store').ElectronStore} options.store
 * @param {(payload: object) => void} [options.onUpdateAlert]
 */
const registerCustomSourceIpc = ({ store, onUpdateAlert }) => {
    const sourceStore = new CustomSourceStore(store);
    const runtime = new CustomSourceRuntime({
        store: sourceStore,
        onUpdateAlert,
    });

    // 自定义源脚本发出的 HTTP 请求
    ipcMain.handle('sakure-cs-http-request', async (_event, params) => performRequest(params || {}));

    // 列表与状态
    ipcMain.handle('sakure-cs-list', () => runtime.list());

    // 导入脚本（脚本正文或文件路径）
    ipcMain.handle('sakure-cs-import', async (_event, payload) => {
        const script = typeof payload === 'string' ? payload : payload?.script;
        if (typeof script !== 'string' || !script.trim()) {
            throw new Error('脚本内容为空');
        }
        const entry = await sourceStore.importScript(script);
        await runtime.start(entry.id).catch(err => {
            console.error(`[customSource] 源「${entry.name}」启动失败:`, err.message);
        });
        return entry;
    });

    // 通过链接导入：主进程负责抓取（走系统代理），渲染层只给链接
    ipcMain.handle('sakure-cs-import-url', async (_event, payload) => {
        const entry = await importSourceFromUrl({
            url: typeof payload === 'string' ? payload : payload?.url,
            request: performRequest,
            store: sourceStore,
        });
        await runtime.start(entry.id).catch(err => {
            console.error(`[customSource] 源「${entry.name}」启动失败:`, err.message);
        });
        return entry;
    });

    // 删除
    ipcMain.handle('sakure-cs-remove', async (_event, ids) => {
        const list = Array.isArray(ids) ? ids : [ids];
        for (const id of list) await runtime.stop(id).catch(() => {});
        sourceStore.remove(list);
        return runtime.list();
    });

    // 启用 / 停用
    ipcMain.handle('sakure-cs-set-enabled', async (_event, { id, enabled }) => {
        sourceStore.setEnabled(id, enabled === true);
        if (enabled === true) {
            await runtime.start(id).catch(err => {
                console.error('[customSource] 启动失败:', err.message);
            });
        } else {
            await runtime.stop(id).catch(() => {});
        }
        return runtime.list();
    });

    // 是否允许该源弹更新提示
    ipcMain.handle('sakure-cs-set-allow-update-alert', async (_event, { id, allow }) => {
        sourceStore.setAllowShowUpdateAlert(id, allow === true);
        return runtime.list();
    });

    // 打开开发者工具
    ipcMain.handle('sakure-cs-open-devtools', (_event, id) => {
        runtime.openDevTools(id);
        return true;
    });

    // 手动向某个源发一次请求（调试用）
    ipcMain.handle('sakure-cs-request', async (_event, { id, source, action, info }) => {
        return runtime.request(id, { source, action, info });
    });

    // 供渲染层调用：让所有可用源依次尝试，直到有人给出结果
    ipcMain.handle('sakure-cs-request-from-any', async (_event, { action, info }) => {
        return runtime.requestFromAny(action, info);
    });

    // 打开源的主页
    ipcMain.handle('sakure-cs-open-homepage', (_event, url) => {
        if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url);
        return true;
    });

    // 剪贴板里的文本：用来导入用户复制来的脚本
    ipcMain.handle('sakure-cs-read-clipboard', () => {
        try {
            return clipboard.readText();
        } catch {
            return '';
        }
    });

    // 读取用户选中的脚本文件
    ipcMain.handle('sakure-cs-read-file', (_event, filePath) => {
        if (typeof filePath !== 'string' || !filePath) return '';
        try {
            const stat = fs.statSync(filePath);
            // 一个脚本不会很大；过大的文件多半是选错了。
            if (!stat.isFile() || stat.size > 5 * 1024 * 1024) return '';
            return fs.readFileSync(filePath, 'utf8');
        } catch {
            return '';
        }
    });

    // 应用退出前停掉全部源窗口
    ipcMain.on('sakure-cs-dispose', () => {
        runtime.stopAll().catch(() => {});
    });

    return { runtime, store: sourceStore };
};

module.exports = { registerCustomSourceIpc };
