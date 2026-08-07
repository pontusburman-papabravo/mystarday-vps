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

    // MARK: - Widget extension (R4.5d) — never log return values

    static func hasBinding() -> Bool {
        guard let t = readKeychain(), !t.isEmpty else { return false }
        return true
    }

    static func bindingToken() -> String? {
        readKeychain()
    }

    static func activeChildId() -> String? {
        defaults?.string(forKey: "active_child_id")
    }

    static func viewerMode() -> String {
        defaults?.string(forKey: "viewer_mode") ?? ""
    }

    static func privacyMode() -> String {
        let raw = defaults?.string(forKey: "privacy_mode") ?? "standard"
        if raw == "private" || raw == "reduced" || raw == "full" { return raw }
        return raw == "standard" ? "full" : raw
    }

    static func installationId() -> String? {
        defaults?.string(forKey: "installation_id")
    }

    static func isPendingActionInvalidated() -> Bool {
        defaults?.bool(forKey: "pending_action_invalidated") ?? false
    }

    static func clearPendingActionInvalidated() {
        defaults?.set(false, forKey: "pending_action_invalidated")
        defaults?.synchronize()
    }

    static func setWidgetChildDisplayLabel(_ label: String?) {
        if let label = label, !label.isEmpty {
            defaults?.set(label, forKey: "widget_child_display_label")
        } else {
            defaults?.removeObject(forKey: "widget_child_display_label")
        }
        defaults?.synchronize()
    }

    static func widgetChildDisplayLabel() -> String? {
        defaults?.string(forKey: "widget_child_display_label")
    }

    static func setFeedback(until: Date, stars: Int, title: String, childNameForParent: String? = nil) {
        defaults?.set(until.timeIntervalSince1970, forKey: "widget_feedback_until")
        defaults?.set(stars, forKey: "widget_feedback_stars")
        defaults?.set(title, forKey: "widget_feedback_title")
        defaults?.set(childNameForParent ?? "", forKey: "widget_feedback_child_name")
        defaults?.synchronize()
    }

    static func feedbackActive() -> (stars: Int, title: String, childName: String)? {
        let until = defaults?.double(forKey: "widget_feedback_until") ?? 0
        guard until > Date().timeIntervalSince1970 else { return nil }
        let stars = defaults?.integer(forKey: "widget_feedback_stars") ?? 0
        let title = defaults?.string(forKey: "widget_feedback_title") ?? ""
        let childName = defaults?.string(forKey: "widget_feedback_child_name") ?? ""
        return (stars, title, childName)
    }

    static func setAllowedChildrenJson(_ json: String?) {
        if let json = json, !json.isEmpty {
            defaults?.set(json, forKey: "widget_allowed_children_json")
        } else {
            defaults?.removeObject(forKey: "widget_allowed_children_json")
        }
        defaults?.synchronize()
    }

    static func allowedChildrenJson() -> String? {
        defaults?.string(forKey: "widget_allowed_children_json")
    }

    static func updateBindingFromSwitch(token: String, activeChildId: String) throws {
        try setKeychain(token)
        defaults?.set(activeChildId, forKey: "active_child_id")
        defaults?.set(false, forKey: "pending_action_invalidated")
        defaults?.synchronize()
    }

    static func isSwitchInProgress() -> Bool {
        defaults?.bool(forKey: "widget_switch_in_progress") ?? false
    }

    static func setSwitchInProgress(_ value: Bool) {
        defaults?.set(value, forKey: "widget_switch_in_progress")
        defaults?.synchronize()
    }

    static func canSwitchChildren() -> Bool {
        let viewer = viewerMode()
        if viewer == "child_session" || viewer.isEmpty { return false }
        if privacyMode() == "private" || privacyMode() == "reduced" { return false }
        guard let json = allowedChildrenJson(),
              let data = json.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return false
        }
        return arr.count > 1
    }

    static func setApiBaseUrl(_ url: String) {
        defaults?.set(url, forKey: "widget_api_base_url")
        defaults?.synchronize()
    }

    static func apiBaseUrl() -> String? {
        defaults?.string(forKey: "widget_api_base_url")
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
