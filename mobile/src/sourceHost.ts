// mobile/src/sourceHost.ts
// 音乐源在手机上的宿主。
//
// 桌面版：每个源跑在一个**隐藏 BrowserWindow** 里，preload 在那个窗口的 main world
// 暴露 `lx`（落雪协议 v2.0.0），脚本自己 `lx.on('request', handler)` 声明能力，
// 主进程用 Electron 的 net 发请求。
//
// 手机版：源跑在一个 **iframe** 里（Capacitor 的 WebView 只能开一个页面）。
// 但机制必须**一样** —— 脚本要能拿到 main world 里的 `lx`，否则它连"我会处理
// musicUrl"都说不出来，一个请求也发不出去。
//
// 所以这里造一个**宿主文档**：一个只包含「lx 实现 + 源脚本」的 HTML，
// 用 blob URL 塞进 iframe。
//
// 三件事在宿主里做：
// 1. 定义 `lx`（on/send/request/utils/currentScriptInfo）—— 与桌面那份同形。
// 2. `lx.request` 走 postMessage 到外层（手机版的桥），由原生插件发出去
//    （WebView 的 fetch 有同源策略，跨域的请求发不出去）。
// 3. 脚本的 `lx.on('request')` 处理器收到请求后，回给外层。
//
// 脚本自己**不要**在这里执行 —— 源脚本的顶层代码会调用 `lx.on(...)`，
// 所以要先有 lx，再执行脚本。

/** 落雪协议 v2.0.0 的表面：事件名、支持的源与能力。 */
const EVENT_NAMES = {
    request: 'request',
    inited: 'inited',
    updateAlert: 'updateAlert',
};

const ALL_SOURCES = ['kw', 'kg', 'tx', 'wy', 'mg', 'local'];

const SUPPORT_QUALITYS: Record<string, string[]> = {
    kw: ['128k', '320k', 'flac', 'flac24bit'],
    kg: ['128k', '320k', 'flac', 'flac24bit'],
    tx: ['128k', '320k', 'flac', 'flac24bit'],
    wy: ['128k', '320k', 'flac', 'flac24bit'],
    mg: ['128k', '320k', 'flac', 'flac24bit'],
    local: [],
};

/**
 * 每个平台支持的动作。
 *
 * `lyric` 与 `pic`（歌词与封面）**源是支持的** —— 社区源在初始化时声明
 * `actions: ['musicUrl', 'lyric', 'pic']`（见星海源 `availablePlatforms.forEach` 那行），
 * 而且宿主的请求处理（`buildResult`）本来就有这两个动作的分支。
 *
 * 之前这里只写了 `musicUrl`：宿主在 `handleInit` 里按这份清单告诉源「你不支持歌词与封面」，
 * 源于是不会接这两个动作 —— 明明它有那份能力（它自己有一个收录库），却被挡在外面。
 * 于是歌词只能从平台那边找，而平台那边未必收录了（用户听到的「歌词来源写的酷狗但没歌词」
 * 就是这个：歌在酷狗、歌词在 QQ）。
 *
 * 开放之后，源的那份歌词与封面也能用上 —— 它是**跨平台**的（源按歌名找），覆盖面比
 * 单个平台宽。
 */
const SUPPORT_ACTIONS: Record<string, string[]> = {
    kw: ['musicUrl', 'lyric', 'pic'],
    kg: ['musicUrl', 'lyric', 'pic'],
    tx: ['musicUrl', 'lyric', 'pic'],
    wy: ['musicUrl', 'lyric', 'pic'],
    mg: ['musicUrl', 'lyric', 'pic'],
    xm: ['musicUrl', 'lyric', 'pic'],
    local: ['musicUrl', 'lyric', 'pic'],
};

/**
 * 宿主文档的源码。
 *
 * @param script 源脚本正文
 * @param meta  源的元信息（name/version/...）
 * @returns 一个可以直接塞进 iframe 的 HTML 字符串
 */
export const buildSourceHostHtml = (script: string, meta: Record<string, unknown>): string => {
    // 源脚本与元信息要进到宿主里：它们是数据，不能拼进 JS 字面量（引号、
    // 换行、反斜杠都会出事），所以走 JSON 编码后放进一个 script 标签。
    const payload = JSON.stringify({ script, meta });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sakure Source</title>
<style>html,body{margin:0;padding:0;background:transparent;}</style>
</head>
<body>
<script>
(function () {
  'use strict';

  var PAYLOAD = ${payload};
  var EVENT_NAMES = ${JSON.stringify(EVENT_NAMES)};
  var ALL_SOURCES = ${JSON.stringify(ALL_SOURCES)};
  var SUPPORT_QUALITYS = ${JSON.stringify(SUPPORT_QUALITYS)};
  var SUPPORT_ACTIONS = ${JSON.stringify(SUPPORT_ACTIONS)};

  /**
   * md5(str) —— RFC 1321 的纯 JS 实现，输出小写十六进制。
   *
   * 与桌面那份（Node 的 createHash('md5').update(str).digest('hex')）同形：同样的输入
   * 同样的输出，所以同一个源脚本在两边算出的签名一致。
   *
   * 浏览器没有 MD5（WebCrypto 也不提供），只能自己算。这段是标准算法，不含任何
   *  Sakure 自己的东西。
   */
  var md5Hex = function (str) {
    // 按 UTF-8 编码取字节（与 Node 的 update(str) 默认 utf8 一致）。
    var bytes = new TextEncoder().encode(str);
    var bitLen = bytes.length * 8;
    // 填充：0x80，然后补 0 到 56 mod 64，最后 8 字节是长度（小端）。
    var padded = new Uint8Array(((bytes.length + 8) >>> 6) * 64 + 64);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    var view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, bitLen >>> 0, true);
    view.setUint32(padded.length - 4, Math.floor(bitLen / 4294967296), true);

    // K[i] = floor(abs(sin(i + 1)) * 2^32) —— 直接算，不抄表（抄表容易抄错一行）。
    var K = [];
    for (var ki = 0; ki < 64; ki++) {
      K.push(Math.floor(Math.abs(Math.sin(ki + 1)) * 4294967296));
    }
    // 每轮的位移量。
    var S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];

    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    var M = new Int32Array(16);
    var rotl = function (x, s) { return ((x << s) | (x >>> (32 - s))) >>> 0; };

    for (var off = 0; off < padded.length; off += 64) {
      for (var mi = 0; mi < 16; mi++) M[mi] = view.getInt32(off + mi * 4, true);
      var A = a0, B = b0, C = c0, D = d0;
      for (var j = 0; j < 64; j++) {
        var F, g;
        if (j < 16) { F = (B & C) | ((~B) & D); g = j; }
        else if (j < 32) { F = (D & B) | ((~D) & C); g = (5 * j + 1) % 16; }
        else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
        else { F = C ^ (B | (~D)); g = (7 * j) % 16; }
        F = (F + A + K[j] + M[g]) | 0;
        // 四个变量轮换：新的 a 是旧的 d。**必须先用 temp 存住旧的 d** ——
        // 直接写 A = D; D = C; ... 会让后面的赋值读到已被覆盖的值，算出错误的结果。
        // （这段注释在宿主 HTML 的模板字符串里，不能出现反引号。）
        var tmp = D;
        D = C;
        C = B;
        B = (B + rotl(F, S[j])) | 0;
        A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }

    // 输出：四个 32 位字，各自按**小端**（MD5 的规定）写成 8 位十六进制。
    //
    // 小端这件事很容易写错：把 a/b/c/d 直接 toString(16) 拼起来是**大端**语义，
    // 算出来的值与标准 MD5 差一个字节序（MD5("") 会得到 d98c1dd4… 而不是
    // d41d8cd9…）。所以这里显式地把每个字拆成 4 个字节、低位在前。
    var out = '';
    var words = [a0, b0, c0, d0];
    for (var w = 0; w < 4; w++) {
      var word = words[w] >>> 0;
      for (var byteIndex = 0; byteIndex < 4; byteIndex++) {
        var byte = (word >>> (byteIndex * 8)) & 0xff;
        out += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return out;
  };

  var isInitedApi = false;
  var isShowedUpdateAlert = false;
  var requestHandler = null;
  var requestSeq = 0;
  var pending = {};

  /** 给外层发消息（外层是手机的桥，它知道这个源是谁）。 */
  var post = function (kind, payload) {
    try {
      parent.postMessage({ __sakureSource: true, kind: kind, payload: payload }, '*');
    } catch (error) {
      // 外层没了：这个源也就没用了，安静地结束。
    }
  };

  /** 校验歌词结果，限制长度（与桌面那份一样：脚本可能塞入异常大的内容）。 */
  var verifyLyricInfo = function (info) {
    if (!info || typeof info !== 'object' || typeof info.lyric !== 'string') throw new Error('failed');
    if (info.lyric.length > 51200) throw new Error('failed');
    return {
      lyric: info.lyric,
      tlyric: typeof info.tlyric === 'string' && info.tlyric.length < 5120 ? info.tlyric : null,
      rlyric: typeof info.rlyric === 'string' && info.rlyric.length < 5120 ? info.rlyric : null,
      lxlyric: typeof info.lxlyric === 'string' && info.lxlyric.length < 8192 ? info.lxlyric : null,
    };
  };

  /** 主进程回传的结果转成落雪协议的结果结构。 */
  var buildResult = function (action, data, response) {
    if (action === 'musicUrl') {
      if (typeof response !== 'string' || response.length > 2048 || !/^https?:/.test(response)) throw new Error('failed');
      return { source: data.source, action: data.action, data: { type: data.info.type, url: response } };
    }
    if (action === 'lyric') {
      return { source: data.source, action: data.action, data: verifyLyricInfo(response) };
    }
    if (action === 'pic') {
      if (typeof response !== 'string' || response.length > 2048 || !/^https?:/.test(response)) throw new Error('failed');
      return { source: data.source, action: data.action, data: response };
    }
    throw new Error('unsupported action: ' + action);
  };

  /** 脚本声明自己的能力。 */
  var handleInit = function (info) {
    if (!info) {
      post('init-error', 'Missing required parameter init info');
      return;
    }
    var sourceInfo = { sources: {} };
    try {
      for (var i = 0; i < ALL_SOURCES.length; i++) {
        var source = ALL_SOURCES[i];
        var userSource = info.sources ? info.sources[source] : null;
        if (!userSource || userSource.type !== 'music') continue;
        var qualitys = SUPPORT_QUALITYS[source] || [];
        var actions = SUPPORT_ACTIONS[source] || [];
        sourceInfo.sources[source] = {
          type: 'music',
          actions: actions.filter(function (a) { return (userSource.actions || []).indexOf(a) >= 0; }),
          qualitys: qualitys.filter(function (q) { return (userSource.qualitys || []).indexOf(q) >= 0; }),
        };
      }
    } catch (error) {
      post('init-error', error && error.message ? error.message : String(error));
      return;
    }
    post('init', sourceInfo);
  };

  /** 外层把一个请求转给脚本的处理器。 */
  var handleRequest = function (data) {
    if (!requestHandler) {
      post('response', { requestKey: data.requestKey, ok: false, message: 'Request event is not defined' });
      return;
    }
    try {
      Promise.resolve(requestHandler.call(null, {
        source: data.source,
        action: data.action,
        info: data.info,
      })).then(function (response) {
        post('response', { requestKey: data.requestKey, ok: true, result: buildResult(data.action, data, response) });
      }).catch(function (err) {
        post('response', { requestKey: data.requestKey, ok: false, message: (err && err.message) || String(err) });
      });
    } catch (err) {
      post('response', { requestKey: data.requestKey, ok: false, message: (err && err.message) || String(err) });
    }
  };

  /** 落雪协议给脚本的表面。 */
  var lx = {
    EVENT_NAMES: EVENT_NAMES,

    /**
     * 发一个 HTTP 请求。真正的网络动作由外层（原生插件）做 ——
     * WebView 的 fetch 有同源策略，跨域的请求它发不出去。
     * 回调签名与落雪一致：callback(err, resp, body)。
     */
    request: function (url, options, callback) {
      options = options || {};
      var requestKey = 'r' + (++requestSeq);
      var timeout = typeof options.timeout === 'number' && options.timeout > 0
        ? Math.min(options.timeout, 60000)
        : 60000;
      pending[requestKey] = callback;
      post('http', {
        requestKey: requestKey,
        url: String(url),
        method: String(options.method || 'get').toLowerCase(),
        timeout: timeout,
        headers: options.headers || null,
        body: options.body == null ? null : options.body,
        form: options.form || null,
      });
      return function () {};
    },

    /** 声明脚本自己的能力。 */
    send: function (eventName, data) {
      return new Promise(function (resolve, reject) {
        if (EVENT_NAMES.request !== eventName
          && EVENT_NAMES.inited !== eventName
          && EVENT_NAMES.updateAlert !== eventName) {
          reject(new Error('The event is not supported: ' + eventName));
          return;
        }
        if (EVENT_NAMES.inited === eventName) {
          if (isInitedApi) {
            reject(new Error('Script is inited'));
            return;
          }
          isInitedApi = true;
          handleInit(data);
          resolve();
          return;
        }
        if (EVENT_NAMES.updateAlert === eventName) {
          if (isShowedUpdateAlert) {
            reject(new Error('The update alert can only be called once.'));
            return;
          }
          isShowedUpdateAlert = true;
          var log = data && data.log ? String(data.log) : '';
          if (log.length > 1024) log = log.substring(0, 1024) + '...';
          post('update-alert', { log: log, updateUrl: (data && data.updateUrl) || '' });
          resolve();
          return;
        }
        reject(new Error('Unknown event name: ' + eventName));
      });
    },

    /** 注册事件处理器。落雪只有 request 一个事件。 */
    on: function (eventName, handler) {
      if (EVENT_NAMES.request !== eventName) {
        return Promise.reject(new Error('The event is not supported: ' + eventName));
      }
      requestHandler = handler;
      return Promise.resolve();
    },

    utils: {
      crypto: {
        aesEncrypt: function (buffer, mode, key, iv) {
          return Promise.reject(new Error('aesEncrypt is not available on mobile'));
        },
        rsaEncrypt: function (buffer, key) {
          return Promise.reject(new Error('rsaEncrypt is not available on mobile'));
        },
        randomBytes: function (size) {
          var out = new Uint8Array(size);
          crypto.getRandomValues(out);
          return out;
        },
        /**
         * md5(str) —— 与桌面那份同形：输入字符串，输出小写十六进制。
         *
         * 桌面上是 Node 的 createHash('md5').update(str).digest('hex')。浏览器没有
         * MD5（WebCrypto 也不提供），所以这里用一份纯 JS 实现（RFC 1321）。
         *
         * 为什么值得补：不少社区源用它算签名。不补的话，这些源在手机上会直接报错——
         * 星海源恰好不用（它只用 buffer），但换个源就未必了。
         */
        md5: function (str) {
          return Promise.resolve(md5Hex(String(str)));
        },
      },
      buffer: {
        /**
         * Buffer.from 的等价物（浏览器里没有 Buffer，但有 TextEncoder/TextDecoder）。
         * 支持落雪那几种用法：from(str, 'utf-8')、from(str, 'base64')、
         * from(str, 'hex')、from(arrayBuffer)。
         */
        from: function (value, encoding) {
          var enc = (encoding || 'utf8').toLowerCase().replace('-', '');
          if (value instanceof ArrayBuffer) return new Uint8Array(value);
          if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
          var text = String(value);
          if (enc === 'base64') {
            var binary = atob(text);
            var out = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
            return out;
          }
          if (enc === 'hex') {
            var hexOut = new Uint8Array(Math.floor(text.length / 2));
            for (var j = 0; j < hexOut.length; j++) hexOut[j] = parseInt(text.substr(j * 2, 2), 16);
            return hexOut;
          }
          return new TextEncoder().encode(text);
        },
        /** Buffer 的 toString：'utf-8' / 'base64' / 'hex'。 */
        bufToString: function (buf, format) {
          var bytes = buf instanceof ArrayBuffer
            ? new Uint8Array(buf)
            : (ArrayBuffer.isView(buf) ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : new Uint8Array(0));
          var enc = (format || 'utf-8').toLowerCase().replace('-', '');
          if (enc === 'base64') {
            var binary = '';
            for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary);
          }
          if (enc === 'hex') {
            var hex = '';
            for (var j = 0; j < bytes.length; j++) hex += bytes[j].toString(16).padStart(2, '0');
            return hex;
          }
          return new TextDecoder('utf-8').decode(bytes);
        },
      },
      zlib: {
        inflate: function () {
          return Promise.reject(new Error('zlib is not available on mobile'));
        },
        deflate: function () {
          return Promise.reject(new Error('zlib is not available on mobile'));
        },
      },
    },

    currentScriptInfo: {
      name: PAYLOAD.meta.name,
      description: PAYLOAD.meta.description,
      version: PAYLOAD.meta.version,
      author: PAYLOAD.meta.author,
      homepage: PAYLOAD.meta.homepage,
      rawScript: PAYLOAD.script,
    },
    version: '2.0.0',
    env: 'mobile',
  };

  // 脚本跑起来之前的异常要能报出去，否则界面上只会显示「未就绪」而无从排查。
  window.addEventListener('error', function (event) {
    if (!event.isTrusted) return;
    var message = event.message || 'unknown error';
    post('init-error', message.replace(/^Uncaught\\sError:\\s/, ''));
  });
  window.addEventListener('unhandledrejection', function (event) {
    if (event.isTrusted) return;
    var reason = event.reason;
    var message = typeof reason === 'string' ? reason : (reason && reason.message) || String(reason);
    post('init-error', message.replace(/^Error:\\s/, ''));
  });

  // 外层来的消息：http 的回包、要转给脚本的请求。
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || !data.__sakureSourceHost) return;
    if (data.kind === 'http-result') {
      var callback = pending[data.requestKey];
      if (!callback) return;
      delete pending[data.requestKey];
      if (data.error) {
        callback.call(null, new Error(data.error), null, null);
        return;
      }
      // 落雪的 needle 把解析好的 body 同时挂在响应上与回调的第三个参数上：
      // 社区脚本要的是 resp.body.code，只给第三个参数等于没给。
      callback.call(null, null, data.response, data.body);
      return;
    }
    if (data.kind === 'request') {
      handleRequest(data.payload);
    }
  });

  // lx 挂好之后才跑脚本（脚本的顶层代码会调 lx.on）。
  globalThis.lx = lx;
  globalThis.__lx_init_error_handler__ = {
    sendError: function (message) { post('init-error', message); },
  };

  try {
    // eslint-disable-next-line no-new-func
    var run = new Function(PAYLOAD.script);
    run();
  } catch (error) {
    post('init-error', (error && error.message) || String(error));
  }
})();
</script>
</body>
</html>`;
};
