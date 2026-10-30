// customSource/http.cjs — 自定义源脚本的 HTTP 请求出口
//
// 落雪用 needle 在 preload 里直接发请求；这里把网络动作收到主进程，用 Electron 的 net 模块
// 发出，好处有三个：
//   1. 走系统代理与系统证书链（Electron 的 net 本身就是 Chromium 的网络栈）；
//   2. 请求不发生在 preload 里，脚本拿不到任何网络句柄；
//   3. 少一个依赖（needle / tunnel），也不用为 Electron 43 单独编译。

const { net } = require('electron');

// 落雪用 needle + tunnel，在 preload 里按落雪自己的"网络代理"设置手动建代理隧道。
// Sakure 没有这套手动代理设置，全应用统一走系统代理（Electron 的 net 默认就是 mode: 'system'），
// 所以这里不需要 proxy 参数——请求自动跟随系统代理与系统证书链。

/**
 * 响应体交给脚本之前的样子：能当 JSON 读就当 JSON，读不了就还是原文。
 *
 * 落雪就是这么干的（`resp.body = JSON.parse(resp.body)`，解析失败留原文），而且不看响应头说
 * 自己是什么——国内这些接口把 JSON 配成 text/plain 返回的不在少数。社区脚本是照落雪写的，
 * 这里就不自作聪明换个口径。
 *
 * 副作用是 `"12345"` 会被读成数字 12345。落雪同样如此，脚本对此有准备；替它猜"这大概是文本"
 * 才是真正会出错的那个。
 *
 * @param {Buffer} raw 响应体的原始字节
 * @returns {any}
 */
const parseBody = (raw) => {
    const text = raw.toString('utf8');
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

/**
 * 把落雪 lx.request 的参数转成 Electron net.request 的选项。
 *
 * @param {{url: string, method: string, timeout: number, headers: object|null, body: any, form: any, formData: any}} params
 */
const buildRequestOptions = (params) => {
    const options = {
        method: (params.method || 'get').toUpperCase(),
        url: params.url,
    };

    const headers = { ...(params.headers || {}) };
    let payload;

    if (params.formData != null) {
        // multipart/form-data：交给 Chromium 自己拼 boundary
        const form = new FormData();
        for (const [key, value] of Object.entries(params.formData)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
                for (const item of value) form.append(key, item);
            } else if (typeof value === 'object' && value != null && typeof value.pipe === 'function') {
                form.append(key, new Blob([value]));
            } else {
                form.append(key, String(value));
            }
        }
        payload = form;
        delete headers['content-type'];
        delete headers['Content-Type'];
    } else if (params.form != null) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params.form)) {
            if (value == null) continue;
            search.append(key, String(value));
        }
        payload = search.toString();
        if (!Object.keys(headers).some(key => key.toLowerCase() === 'content-type')) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
    } else if (params.body != null) {
        if (typeof params.body === 'string') {
            payload = params.body;
        } else if (Buffer.isBuffer(params.body)) {
            payload = params.body;
        } else {
            payload = JSON.stringify(params.body);
            if (!Object.keys(headers).some(key => key.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/json';
            }
        }
    }

    if (Object.keys(headers).length) options.headers = headers;
    if (payload !== undefined) options.data = payload;
    return options;
};

/**
 * 把响应收成给脚本的那一对东西：响应对象与响应体。
 *
 * 响应体给了两遍是有意的：落雪把它挂在响应上（`resp.body`），同时也作为回调的第三个参数
 * 交出去。写惯落雪的脚本读的是 `resp.body`——只把 body 放在第三个参数上，这些脚本拿到的
 * 就是 undefined，跟着就在它的 `.code` 上摔一跤，一个地址也问不到。
 *
 * 响应上的字段与落雪给脚本的那一套一一对应（statusCode / statusMessage / headers / bytes /
 * raw / body），脚本换到 Sakure 上不用改。
 *
 * @param {{statusCode: number, statusMessage: string, headers: object}} res Electron 的响应
 * @param {Buffer} raw 响应体的原始字节
 * @returns {{response: object, body: any}}
 */
const buildResponse = (res, raw) => {
    const headers = {};
    for (const [key, value] of Object.entries(res.headers || {})) {
        headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    const body = parseBody(raw);

    return {
        response: {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers,
            bytes: raw.length,
            raw,
            body,
        },
        body,
    };
};

/**
 * 发一个 HTTP 请求。
 *
 * 返回值与落雪 preload 给脚本的回调内容对齐：
 *   { statusCode, statusMessage, headers, bytes, raw, body }
 * body 能当 JSON 读就当 JSON，读不了就保持文本。
 *
 * @param {object} params 见 buildRequestOptions
 * @returns {Promise<{error?: string, response?: object, body?: any}>}
 */
const performRequest = async (params) => {
    let options;
    try {
        options = buildRequestOptions(params);
    } catch (err) {
        return { error: `请求参数无效: ${err.message}` };
    }

    try {
        const response = await net.request(options);
        const timeout = typeof params.timeout === 'number' && params.timeout > 0 ? params.timeout : 60000;
        const timer = setTimeout(() => response.abort(), timeout);

        const res = await new Promise((resolve, reject) => {
            response.on('response', res => resolve(res));
            response.on('abort', () => reject(new Error('请求超时')));
            response.on('error', err => reject(err));
            response.end();
        });

        clearTimeout(timer);

        const chunks = [];
        for await (const chunk of res) chunks.push(chunk);

        return buildResponse(res, Buffer.concat(chunks));
    } catch (err) {
        return { error: err?.message || String(err) };
    }
};

module.exports = { performRequest, buildRequestOptions, buildResponse };
