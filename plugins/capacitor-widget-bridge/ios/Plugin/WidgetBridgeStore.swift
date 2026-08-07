import Foundation
import Security

/// Shared widget state between main app and WidgetKit extension (R4.5c).
/// Bearer `binding_token` lives in Keychain only — never UserDefaults.
enum WidgetBridgeStore {
    static let appGroupId = "group.stjarndag.widget"
    static let keychainService = "stjarndag.widget.binding"
    static let keychainAccount = "binding_token"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func saveBinding(
        token: String,
        activeChildId: String,
        viewerMode: String?,
        privacyMode: String?,
        installationId: String?
    ) throws {
        try setKeychain(token)
        let d = defaults
        d?.set(activeChildId, forKey: "active_child_id")
        d?.set(viewerMode ?? "", forKey: "viewer_mode")
        d?.set(privacyMode ?? "standard", forKey: "privacy_mode")
        if let installationId = installationId {
            d?.set(installationId, forKey: "installation_id")
        }
        d?.set(ISO8601DateFormatter().string(from: Date()), forKey: "last_refresh_at")
        d?.synchronize()
    }

    static func clearAll() {
        deleteKeychain()
        let d = defaults
        d?.removeObject(forKey: "active_child_id")
        d?.removeObject(forKey: "viewer_mode")
        d?.removeObject(forKey: "privacy_mode")
        d?.removeObject(forKey: "installation_id")
        d?.removeObject(forKey: "last_refresh_at")
        d?.removeObject(forKey: "pending_action_invalidated")
        d?.synchronize()
    }

    static func invalidatePendingAction() {
        defaults?.set(true, forKey: "pending_action_invalidated")
        defaults?.synchronize()
    }

    static func status() -> [String: Any] {
        let token = readKeychain()
        let d = defaults
        return [
            "hasBinding": token != nil && !(token ?? "").isEmpty,
            "platform": "ios",
            "installationId": d?.string(forKey: "installation_id"),
            "activeChildId": d?.string(forKey: "active_child_id"),
            "viewerMode": d?.string(forKey: "viewer_mode"),
            "privacyMode": d?.string(forKey: "privacy_mode"),
            "lastRefreshAt": d?.string(forKey: "last_refresh_at"),
        ]
    }

    private static func setKeychain(_ value: String) throws {
        deleteKeychain()
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecAttrAccessGroup as String: appGroupId,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            throw NSError(domain: "WidgetBridgeStore", code: Int(status), userInfo: nil)
        }
    }

    private static func readKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecAttrAccessGroup as String: appGroupId,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func deleteKeychain() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecAttrAccessGroup as String: appGroupId,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
