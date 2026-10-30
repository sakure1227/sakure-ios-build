// customSource/importUrl.cjs — 通过链接导入自定义源脚本
//
// 落雪的导入方式有三种：本地文件、粘贴文本、链接。前两种由渲染层读入脚本文本后走
// store.importScript；链接这一种必须由主进程抓取——渲染层的 fetch 不带系统代理与系统
// 证书链，而 ghproxy.net、raw.githubusercontent.com 这类地址在国内网络下大概率要走代理。
//
// 抓取复用脚本自己的 HTTP 出口（http.cjs 的 performRequest，底层是 Electron 的 net），
// 链接导入与脚本运行时的请求因此走同一条网络栈、同一套代理设置。

/** 脚本文本上限：正常源脚本只有几 KB，2MB 富余，也防住链接指错时下载整个大文件。 */
const MAX_SCRIPT_BYTES = 2 * 1024 * 1024;

/** 抓取超时：脚本文件很小，20 秒足够；再久多半是网络问题。 */
const IMPORT_TIMEOUT_MS = 20000;

/**
 * 校验用户粘贴的链接。
 *
 * 抛出的错误消息直接显示在设置页，与 ipc.cjs 里其他处理器抛出的中文消息保持一致。
 *
 * @param {unknown} url 用户输入
 * @returns {string} 去掉首尾空白后的链接
 */
const parseImportUrl = (url) => {
    if (typeof url !== 'string' || !url.trim()) throw new Error('链接为空');
    const trimmed = url.trim();
    if (trimmed.length > 2048) throw new Error('链接过长');
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        throw new Error('链接格式无效');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('只支持 http/https 链接');
    }
    return trimmed;
};

/**
 * 抓取链接内容并导入为一条自定义源。
 *
 * 导入成功即返回源记录；源的启动由调用方决定（ipc.cjs 里启动失败只记日志，不影响导入结果，
 * 与 sakure-cs-import 的处理一致）。
 *
 * @param {object} options
 * @param {unknown} options.url 用户粘贴的链接
 * @param {(params: object) => Promise<{error?: string, response?: {statusCode?: number}, body?: any}>} options.request HTTP 出口
 * @param {{importScript: (script: string) => Promise<{id: string, name: string}>}} options.store 源仓库
 * @returns {Promise<{id: string, name: string}>} 导入的源记录
 */
const importSourceFromUrl = async ({ url, request, store }) => {
    const target = parseImportUrl(url);

    const result = await request({ url: target, method: 'get', timeout: IMPORT_TIMEOUT_MS });
    if (result?.error) throw new Error(`下载失败: ${result.error}`);
    const status = result?.response?.statusCode;
    if (status !== 200) throw new Error(`下载失败: HTTP ${status ?? '无响应'}`);

    // performRequest 会把响应体按 JSON 试解析；脚本不是 JSON，所以这里拿到的就是原文。
    const script = typeof result.body === 'string' ? result.body : '';
    if (!script.trim()) throw new Error('链接返回的内容为空，请确认链接指向脚本文件');
    if (Buffer.byteLength(script, 'utf8') > MAX_SCRIPT_BYTES) {
        throw new Error(`脚本过大（超过 ${MAX_SCRIPT_BYTES / 1024}KB），请检查链接是否指向脚本文件`);
    }

    // 内容不是合法脚本时（比如链接指向的是一个网页），store 会抛出「无效的自定义源文件」。
    return store.importScript(script);
};

module.exports = { parseImportUrl, importSourceFromUrl, MAX_SCRIPT_BYTES, IMPORT_TIMEOUT_MS };
