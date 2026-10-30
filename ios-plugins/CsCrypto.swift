import Capacitor
import CryptoKit
import Foundation
import Security

/// CsCrypto —— iOS 版的凭据加密插件。
///
/// ## 为什么需要它
///
/// 登录凭据（网易云的 `MUSIC_U`、QQ 的 `access_token`、酷狗的 `token`）就是账号本身。
/// 存明文的话，拿到 IPA 或应用数据的人就拿到了用户的账号。
///
/// ## 怎么做的
///
/// 密钥存在**钥匙串（Keychain）**里，用 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`：
/// 解锁后可用、且**不迁移到别的设备**（备份到另一台 iPhone 时不会带过去）。
/// 密钥本身由 iOS 生成与管理，磁盘上只有密文。
///
/// - 加密：AES-256-GCM，随机 12 字节 IV。GCM 自带认证标签，密文被改过就解不开。
/// - 存盘格式：`iv(base64).cipherText(base64)`，密文里已经含 GCM 的 tag。
///
/// ## 与 Android 版的契约一致
///
/// JS 那边（`mobile/src/mobileCredentials.ts`）用的是同一套形状：
///
/// - `hasKey({alias})` → `{ exists }`；
/// - `getOrCreateKey({alias})` → `{ key, created }`；
/// - `encrypt({alias, plainText})` → `{ iv, cipherText }`；
/// - `decrypt({alias, iv, cipherText})` → `{ plainText }`。
///
/// 注意 `getOrCreateKey` 返回的 `key` 是**空字符串** —— 密钥的字节拿不出来
/// （它在钥匙串里），这里只回报「有没有」。JS 那边也只用到 `created`。
@objc(CsCrypto)
public class CsCrypto: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CsCryptoPlugin"
    public let jsName = "CsCrypto"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hasKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOrCreateKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "encrypt", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "decrypt", returnType: CAPPluginReturnPromise)
    ]

    private static let service = "top.izuna.sakure.login"

    /// 系统里有没有这个 alias 的密钥。
    @objc func hasKey(_ call: CAPPluginCall) {
        let alias = call.getString("alias", "sakure_login_v1")
        var result = JSObject()
        result["exists"] = Self.keyExists(alias: alias)
        call.resolve(result)
    }

    /// 拿密钥；没有就生成一个。
    @objc func getOrCreateKey(_ call: CAPPluginCall) {
        let alias = call.getString("alias", "sakure_login_v1")
        let existed = Self.keyExists(alias: alias)
        let error = Self.createKeyIfNeeded(alias: alias)
        if let error = error {
            call.reject(error)
            return
        }
        var result = JSObject()
        // 密钥的字节拿不出来（它在钥匙串里），这里只回报「有没有」。
        result["key"] = ""
        result["created"] = !existed
        call.resolve(result)
    }

    @objc func encrypt(_ call: CAPPluginCall) {
        let alias = call.getString("alias", "sakure_login_v1")
        guard let plainText = call.getString("plainText") else {
            call.reject("no plainText")
            return
        }
        do {
            let key = try Self.loadOrCreateKey(alias: alias)
            let sealed = try AES.GCM.seal(
                Data(plainText.utf8),
                using: SymmetricKey(data: key),
                authenticating: Data()
            )
            // `sealed.combined` = nonce(12) || ciphertext || tag(16)
            //
            // 存盘格式跟 Android 版**一模一样**：`iv(base64).cipherText(base64)`。
            // 这里把 nonce 拆出来当 iv，剩下的（密文 + tag）当 cipherText ——
            // 这样两个平台存出来的密文形状一致，JS 侧那套逻辑不用分平台。
            let combined = sealed.combined ?? Data()
            let nonce = sealed.nonce.withUnsafeBytes { Data($0) }
            let cipherText = combined.count >= nonce.count
                ? combined.subdata(in: nonce.count..<combined.count)
                : combined

            var result = JSObject()
            result["iv"] = nonce.base64EncodedString()
            result["cipherText"] = cipherText.base64EncodedString()
            call.resolve(result)
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func decrypt(_ call: CAPPluginCall) {
        let alias = call.getString("alias", "sakure_login_v1")
        guard let ivString = call.getString("iv"), let cipherTextString = call.getString("cipherText") else {
            call.reject("no iv or cipherText")
            return
        }
        do {
            let key = try Self.loadOrCreateKey(alias: alias)
            let iv = Data(base64Encoded: ivString) ?? Data()
            let cipherText = Data(base64Encoded: cipherTextString) ?? Data()
            // GCM 的 nonce **必须恰好 12 字节** —— 长度不对时 `Nonce(data:)` 会抛，
            // 但那时候错误信息很难看出是哪一步坏了。这里先自己拦一道，
            // 报一句人话。
            guard iv.count == 12 else {
                call.reject("iv must be 12 bytes, got \(iv.count)")
                return
            }
            guard cipherText.count >= 16 else {
                call.reject("cipherText too short (needs at least the 16-byte tag)")
                return
            }
            // 密文的**最后 16 字节**就是 GCM 的认证标签（跟 Android 版的格式一样：
            // 那边 `cipherText` 里已经含 tag 了）。
            //
            // `suffix(16)` 返回的是 `Data.SubSequence`，`SealedBox` 要的是 `Data`
            // —— 显式转一下，别指望编译器替我们做这个转换。
            let tag = Data(cipherText.suffix(16))
            let sealed = try AES.GCM.SealedBox(
                nonce: try AES.GCM.Nonce(data: iv),
                ciphertext: cipherText,
                tag: tag
            )
            let opened = try AES.GCM.open(sealed, using: SymmetricKey(data: key), authenticating: Data())

            var result = JSObject()
            result["plainText"] = String(data: opened, encoding: .utf8) ?? ""
            call.resolve(result)
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    // MARK: - 钥匙串

    private static func keyExists(alias: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: alias,
            kSecReturnData as String: false,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// 密钥在钥匙串里；没有就生成一个。
    private static func createKeyIfNeeded(alias: String) -> String? {
        if keyExists(alias: alias) { return nil }
        let raw = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: alias,
            // 解锁后可用、且不跟着备份迁移到别的设备。
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: raw
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecDuplicateItem { return nil }
        guard status == errSecSuccess else {
            return "SecItemAdd failed: \(status)"
        }
        return nil
    }

    private static func loadOrCreateKey(alias: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: alias,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data {
            return data
        }
        if let error = createKeyIfNeeded(alias: alias) {
            throw NSError(domain: "CsCrypto", code: Int(status), userInfo: [NSLocalizedDescriptionKey: error])
        }
        var retry: CFTypeRef?
        let retryStatus = SecItemCopyMatching(query as CFDictionary, &retry)
        if retryStatus == errSecSuccess, let data = retry as? Data {
            return data
        }
        throw NSError(
            domain: "CsCrypto",
            code: Int(retryStatus),
            userInfo: [NSLocalizedDescriptionKey: "Could not load the keychain key"]
        )
    }
}
