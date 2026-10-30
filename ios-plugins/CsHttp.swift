import Capacitor
import Foundation

/// CsHttp —— iOS 版的 HTTP 请求插件。
///
/// ## 为什么需要它
///
/// WKWebView 里的 `fetch` 受同源策略管：手机版的页面来自 `capacitor://localhost`，
/// 而音乐源要问各家平台的接口（酷我、酷狗、QQ、网易云……），那些都不是本应用的域。
/// 浏览器的同源策略会把这些请求挡掉 —— 实测在真机上 `fetch('https://search.kuwo.cn/…')`
/// 报 `Failed to fetch`。
///
/// 原生没有这个限制。桌面上这件事由 Electron 的 `net` 模块做（走系统代理与证书链）；
/// iOS 上是这里。
///
/// ## 与 Android 版的契约保持一致
///
/// JS 那边（`mobile/src/bridge.ts`、`mobile/src/mobileFetchPatch.ts`）对返回值的要求：
///
/// - `status` —— HTTP 状态码（网络层失败时是 0）；
/// - `headers` —— 响应头（**不含** `Set-Cookie`，那是浏览器的禁止头）；
/// - `setCookie` —— `Set-Cookie` 单独一个字段（多个用 `, ` 连起来）；
/// - `data` —— 正文（文本）；
/// - `dataBase64` / `base64` —— 正文的 base64（二进制正文用）。
///
/// ## 重定向要自己跟
///
/// QQ 音乐登录靠 302 一路换 cookie（`ptqrlogin` → `check_sig` → `authorize`），
/// 中途每一跳的 `Set-Cookie` 都要收着。`URLSession` 自动跟重定向时只留最后一跳的
/// 响应头，前面那几跳的 cookie 就丢了 —— 换票链会断在这里。
///
/// 所以那边传 `followRedirects: false`，这里按 `location` 一步步自己走。
@objc(CsHttp)
public class CsHttp: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CsHttpPlugin"
    public let jsName = "CsHttp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func request(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), !urlString.isEmpty else {
            call.reject("no url")
            return
        }
        let method = call.getString("method", "GET")
        let body = call.getString("body")
        let responseType = call.getString("responseType", "text")
        let timeout = call.getInt("timeout", 20000)
        let headers = call.getObject("headers")
        let followRedirects = call.getBool("followRedirects", true)

        // 网络活，别堵着主线程（Capacitor 的插件方法默认跑在主线程上）。
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.performRequest(
                urlString: urlString,
                method: method,
                body: body,
                responseType: responseType,
                timeout: timeout,
                headers: headers,
                followRedirects: followRedirects,
                call: call
            )
        }
    }

    private func performRequest(
        urlString: String,
        method: String,
        body: String?,
        responseType: String,
        timeout: Int,
        headers: JSObject?,
        followRedirects: Bool,
        redirectCount: Int = 0,
        call: CAPPluginCall
    ) {
        guard let url = URL(string: urlString) else {
            resolveFailure(call, message: "bad url: \(urlString)")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = TimeInterval(timeout) / 1000.0
        // 音乐源的服务器常要一个像浏览器的 UA，不给会拒。
        request.setValue(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
                + "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            forHTTPHeaderField: "User-Agent"
        )
        if let headers = headers {
            headers.keys.forEach { key in
                // Capacitor 8 的 `JSObject` 就是 `[String: JSValue]`（JSValue 是个空协议，
                // String / Bool / Int… 都符合它）—— **没有** `string(forKey:)` 那个方法
                // （那是更老版本的写法）。直接按 String 取。
                if let value = headers[key] as? String {
                    request.setValue(value, forHTTPHeaderField: key)
                }
            }
        }
        if let body = body, method.uppercased() != "GET" {
            request.httpBody = body.data(using: .utf8)
        }

        let configuration = URLSessionConfiguration.default
        // cookie 不让系统自动管：QQ 登录那条换票链的每一跳都要自己收 `Set-Cookie`。
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        let delegate = RedirectSuppressor(followRedirects: followRedirects)
        let session = URLSession(configuration: configuration, delegate: delegate, delegateQueue: nil)

        let task = session.dataTask(with: request) { [weak self] data, response, error in
            defer { session.finishTasksAndInvalidate() }

            if let error = error {
                self?.resolveFailure(call, message: error.localizedDescription)
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                self?.resolveFailure(call, message: "no response")
                return
            }

            // 手动跟重定向：自己按 `location` 一步步走，把每一跳的 `Set-Cookie` 收着。
            if followRedirects,
               let location = httpResponse.value(forHTTPHeaderField: "Location"),
               let nextUrl = URL(string: location, relativeTo: url)?.absoluteURL,
               httpResponse.statusCode >= 300, httpResponse.statusCode < 400,
               redirectCount < 10 {
                var nextHeaders = JSObject()
                if let headers = headers {
                    headers.keys.forEach { key in
                        // 同上：`JSObject` 是 `[String: JSValue]`，按 String 取。
                        if let value = headers[key] as? String {
                            nextHeaders[key] = value
                        }
                    }
                }
                self?.performRequest(
                    urlString: nextUrl.absoluteString,
                    method: method,
                    body: body,
                    responseType: responseType,
                    timeout: timeout,
                    headers: nextHeaders,
                    followRedirects: followRedirects,
                    redirectCount: redirectCount + 1,
                    call: call
                )
                return
            }

            var result = JSObject()
            result["status"] = httpResponse.statusCode

            // 响应头（**不含** `Set-Cookie` —— 那是浏览器的禁止头）。
            var responseHeaders = JSObject()
            for (key, value) in httpResponse.allHeaderFields {
                guard let name = key as? String, let text = value as? String else { continue }
                if name.caseInsensitiveCompare("Set-Cookie") == .orderedSame { continue }
                responseHeaders[name] = text
            }
            result["headers"] = responseHeaders

            // ★ `Set-Cookie` 单独一个字段。
            //
            // 它在 `allHeaderFields` 里（跟 Android 的 `HttpURLConnection` 相反 ——
            // 那边是**过滤掉**它，所以 Android 版要靠 `getHeaderField` 另取一次）。
            // 同一个头可能有多个值，`allHeaderFields` 里已经合在一起了。
            //
            // 放在单独的字段里（不放进 `headers`）：`Set-Cookie` 是浏览器的禁止头，
            // JS 那边用 `Headers` 造出来的响应里放不进它。
            result["setCookie"] = CsHttp.collectSetCookies(from: httpResponse)

            let bytes = data ?? Data()
            if responseType == "arraybuffer" || responseType == "blob" {
                let base64 = bytes.base64EncodedString()
                // 两个字段名都给（跟 Android 版一样）：渲染层里走 `fetch` 的那条路读
                // `base64`，直接调本插件的那条路读 `dataBase64`。只给一个的话，另一条
                // 路拿到的正文是空的 —— 二维码就是那张空的图，报「gave no image」。
                result["dataBase64"] = base64
                result["base64"] = base64
                result["data"] = ""
            } else {
                result["data"] = String(data: bytes, encoding: .utf8) ?? ""
            }

            call.resolve(result)
        }
        task.resume()
    }

    /// 把这次回答的 `Set-Cookie` 收成一段（多个用 `, ` 连起来）。
    ///
    /// **是 `static`** —— 它不依赖任何实例状态。写成实例方法的话，闭包里就得写
    /// `self?.collectSetCookies(...)`（`self` 是 `[weak self]` 的可选值），
    /// 而 Swift 6 的闭包捕获语义还要求显式写 `self.` —— 两样加起来很容易写错。
    /// 纯函数就该是 `static`。
    private static func collectSetCookies(from response: HTTPURLResponse) -> String {
        var values: [String] = []
        for (key, value) in response.allHeaderFields {
            guard let name = key as? String, let text = value as? String else { continue }
            guard name.caseInsensitiveCompare("Set-Cookie") == .orderedSame else { continue }
            values.append(text)
        }
        return values.joined(separator: ", ")
    }

    private func resolveFailure(_ call: CAPPluginCall, message: String) {
        var failed = JSObject()
        failed["status"] = 0
        failed["headers"] = JSObject()
        failed["data"] = ""
        failed["error"] = message
        call.resolve(failed)
    }
}

/// 决定要不要跟重定向。
///
/// `URLSession` 的默认行为是自动跟。QQ 登录那条换票链要求**自己**跟（每一跳的
/// `Set-Cookie` 都要收着），所以这里用一个 delegate 把自动跟随关掉。
private final class RedirectSuppressor: NSObject, URLSessionTaskDelegate {
    private let followRedirects: Bool

    init(followRedirects: Bool) {
        self.followRedirects = followRedirects
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(self.followRedirects ? request : nil)
    }
}
