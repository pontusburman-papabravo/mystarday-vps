import Foundation
import Security

/// Shared widget state between main app and WidgetKit extension (R4.5c / R4.5 closure).
/// Bearer `binding_token` lives in Keychain per installation scope — never UserDefaults.
enum WidgetBridgeStore {
    static let appGroupId = "group.stjarndag.widget"
    static let keychainService = "stjarndag.widget.binding"
    static let legacyKeychainAccount = "binding_token"

    /// Active scope for the current widget timeline / intent (set by AppIntentConfiguration provider).
    static var timelineScope: String?

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func normalizeScope(_ installationId: String?) -> String {
        guard let installationId = installationId, !installationId.isEmpty else {
            return "default"
        }
        return installationId.replacingOccurrences(
            of: "[^a-zA-Z0-9._:-]",
            with: "_",
            options: .regularExpression
        )
    }

    private static func resolvedScope(_ installationId: String? = nil) -> String {
        if let explicit = installationId, !explicit.isEmpty {
            return normalizeScope(explicit)
        }
        if let timeline = timelineScope, !timeline.isEmpty {
            return normalizeScope(timeline)
        }
        if let legacy = defaults?.string(forKey: "installation_id"), !legacy.isEmpty {
            return normalizeScope(legacy)
        }
        return "default"
    }

    private static func pubKey(_ scope: String, _ suffix: String) -> String {
        "s_\(scope)_\(suffix)"
    }

    private static func keychainAccount(for scope: String) -> String {
        "binding_\(scope)"
    }

    // MARK: - Binding (app plugin + extension)

    static func saveBinding(
        token: String,
        activeChildId: String,
        viewerMode: String?,
        privacyMode: String?,
        installationId: String?
    ) throws {
        let scope = normalizeScope(installationId)
        try setKeychain(token, scope: scope)
        let d = defaults
        d?.set(activeChildId, forKey: pubKey(scope, "active_child_id"))
        d?.set(viewerMode ?? "", forKey: pubKey(scope, "viewer_mode"))
        d?.set(privacyMode ?? "standard", forKey: pubKey(scope, "privacy_mode"))
        if let installationId = installationId {
            d?.set(installationId, forKey: pubKey(scope, "installation_id"))
        }
        d?.set(ISO8601DateFormatter().string(from: Date()), forKey: pubKey(scope, "last_refresh_at"))
        d?.set(false, forKey: pubKey(scope, "pending_invalidated"))
        d?.synchronize()
        if scope == "default" {
            legacyMirrorPub(activeChildId: activeChildId, viewerMode: viewerMode, privacyMode: privacyMode)
        }
    }

    private static func legacyMirrorPub(
        activeChildId: String,
        viewerMode: String?,
        privacyMode: String?
    ) {
        let d = defaults
        d?.set(activeChildId, forKey: "active_child_id")
        d?.set(viewerMode ?? "", forKey: "viewer_mode")
        d?.set(privacyMode ?? "standard", forKey: "privacy_mode")
        d?.synchronize()
    }

    static func clearAll() {
        deleteKeychain(account: legacyKeychainAccount)
        for scope in knownBindingScopes() {
            deleteKeychain(account: keychainAccount(for: scope))
        }
        let d = defaults
        guard let dict = d?.dictionaryRepresentation() else { return }
        for key in dict.keys where key.hasPrefix("s_") || key.hasPrefix("widget_switching_")
            || key == "installation_id" || key == "active_child_id" || key == "viewer_mode"
            || key == "privacy_mode" || key == "pending_action_invalidated"
            || key.hasPrefix("wi_") {
            d?.removeObject(forKey: key)
        }
        d?.synchronize()
    }

    static func clearScope(_ installationId: String?) {
        let scope = resolvedScope(installationId)
        deleteKeychain(account: keychainAccount(for: scope))
        let d = defaults
        let suffixes = [
            "active_child_id", "viewer_mode", "privacy_mode", "installation_id", "last_refresh_at",
            "pending_invalidated", "allowed_children_json", "widget_child_display_label",
            "widget_feedback_until", "widget_feedback_stars", "widget_feedback_title",
            "widget_feedback_child_name", "widget_mode", "locked_child_id", "widget_instance_id",
            "snapshot_json",
        ]
        for suffix in suffixes {
            d?.removeObject(forKey: pubKey(scope, suffix))
        }
        d?.synchronize()
    }

    static func invalidatePendingAction(installationId: String? = nil) {
        let scope = resolvedScope(installationId)
        defaults?.set(true, forKey: pubKey(scope, "pending_invalidated"))
        defaults?.synchronize()
    }

    static func status() -> [String: Any] {
        let scope = resolvedScope()
        let token = readKeychain(scope: scope)
        let d = defaults
        return [
            "hasBinding": token != nil && !(token ?? "").isEmpty,
            "platform": "ios",
            "installationId": d?.string(forKey: pubKey(scope, "installation_id"))
                ?? d?.string(forKey: "installation_id"),
            "activeChildId": activeChildId(installationId: nil),
            "viewerMode": viewerMode(installationId: nil),
            "privacyMode": privacyMode(installationId: nil),
            "lastRefreshAt": d?.string(forKey: pubKey(scope, "last_refresh_at")),
        ]
    }

    // MARK: - Widget extension — never log return values

    static func hasBinding(installationId: String? = nil) -> Bool {
        guard let t = bindingToken(installationId: installationId), !t.isEmpty else { return false }
        return true
    }

    static func bindingToken(installationId: String? = nil) -> String? {
        let scope = resolvedScope(installationId)
        if let token = readKeychain(scope: scope), !token.isEmpty {
            return token
        }
        if scope != "default", let fallback = readKeychain(scope: "default"), !fallback.isEmpty {
            return fallback
        }
        return readKeychain(account: legacyKeychainAccount)
    }

    static func activeChildId(installationId: String? = nil) -> String? {
        let scope = resolvedScope(installationId)
        if let v = defaults?.string(forKey: pubKey(scope, "active_child_id")) { return v }
        if scope != "default" {
            return defaults?.string(forKey: pubKey("default", "active_child_id"))
        }
        return defaults?.string(forKey: "active_child_id")
    }

    static func viewerMode(installationId: String? = nil) -> String {
        let scope = resolvedScope(installationId)
        if let v = defaults?.string(forKey: pubKey(scope, "viewer_mode")) { return v }
        return defaults?.string(forKey: "viewer_mode") ?? ""
    }

    static func privacyMode(installationId: String? = nil) -> String {
        let scope = resolvedScope(installationId)
        let raw = defaults?.string(forKey: pubKey(scope, "privacy_mode"))
            ?? defaults?.string(forKey: "privacy_mode")
            ?? "standard"
        if raw == "private" || raw == "reduced" || raw == "full" { return raw }
        return raw == "standard" ? "full" : raw
    }

    static func installationId(forScope installationId: String? = nil) -> String? {
        let scope = resolvedScope(installationId)
        return defaults?.string(forKey: pubKey(scope, "installation_id"))
            ?? defaults?.string(forKey: "installation_id")
    }

    static func isPendingActionInvalidated(installationId: String? = nil) -> Bool {
        let scope = resolvedScope(installationId)
        return defaults?.bool(forKey: pubKey(scope, "pending_invalidated")) ?? false
    }

    static func clearPendingActionInvalidated(installationId: String? = nil) {
        let scope = resolvedScope(installationId)
        defaults?.set(false, forKey: pubKey(scope, "pending_invalidated"))
        defaults?.synchronize()
    }

    static func setWidgetChildDisplayLabel(_ label: String?, installationId: String? = nil) {
        let scope = resolvedScope(installationId)
        let key = pubKey(scope, "widget_child_display_label")
        if let label = label, !label.isEmpty {
            defaults?.set(label, forKey: key)
        } else {
            defaults?.removeObject(forKey: key)
        }
        defaults?.synchronize()
    }

    static func widgetChildDisplayLabel(installationId: String? = nil) -> String? {
        defaults?.string(forKey: pubKey(resolvedScope(installationId), "widget_child_display_label"))
    }

    static func setFeedback(
        until: Date,
        stars: Int,
        title: String,
        childNameForParent: String? = nil,
        installationId: String? = nil
    ) {
        let scope = resolvedScope(installationId)
        defaults?.set(until.timeIntervalSince1970, forKey: pubKey(scope, "widget_feedback_until"))
        defaults?.set(stars, forKey: pubKey(scope, "widget_feedback_stars"))
        defaults?.set(title, forKey: pubKey(scope, "widget_feedback_title"))
        defaults?.set(childNameForParent ?? "", forKey: pubKey(scope, "widget_feedback_child_name"))
        defaults?.synchronize()
    }

    static func feedbackActive(installationId: String? = nil) -> (stars: Int, title: String, childName: String)? {
        let scope = resolvedScope(installationId)
        let until = defaults?.double(forKey: pubKey(scope, "widget_feedback_until")) ?? 0
        guard until > Date().timeIntervalSince1970 else { return nil }
        let stars = defaults?.integer(forKey: pubKey(scope, "widget_feedback_stars")) ?? 0
        let title = defaults?.string(forKey: pubKey(scope, "widget_feedback_title")) ?? ""
        let childName = defaults?.string(forKey: pubKey(scope, "widget_feedback_child_name")) ?? ""
        return (stars, title, childName)
    }

    static func setAllowedChildrenJson(_ json: String?, installationId: String? = nil) {
        let scope = resolvedScope(installationId)
        let key = pubKey(scope, "allowed_children_json")
        if let json = json, !json.isEmpty {
            defaults?.set(json, forKey: key)
        } else {
            defaults?.removeObject(forKey: key)
        }
        defaults?.synchronize()
    }

    static func allowedChildrenJson(installationId: String? = nil) -> String? {
        let scope = resolvedScope(installationId)
        return defaults?.string(forKey: pubKey(scope, "allowed_children_json"))
    }

    static func updateBindingFromSwitch(
        token: String,
        activeChildId: String,
        installationId: String? = nil
    ) throws {
        let scope = resolvedScope(installationId)
        try setKeychain(token, scope: scope)
        defaults?.set(activeChildId, forKey: pubKey(scope, "active_child_id"))
        defaults?.set(false, forKey: pubKey(scope, "pending_invalidated"))
        defaults?.synchronize()
    }

    static func isSwitchInProgress(installationId: String? = nil) -> Bool {
        let key = switchKey(installationId)
        return defaults?.bool(forKey: key) ?? false
    }

    static func setSwitchInProgress(_ value: Bool, installationId: String? = nil) {
        let key = switchKey(installationId)
        defaults?.set(value, forKey: key)
        defaults?.synchronize()
    }

    private static func switchKey(_ installationId: String?) -> String {
        let id = resolvedScope(installationId)
        return "widget_switching_" + id
    }

    static func canSwitchChildren(installationId: String? = nil) -> Bool {
        let scope = resolvedScope(installationId)
        if widgetMode(installationId: installationId) == "personal" { return false }
        if isPersonalLocked(installationId: installationId) { return false }
        let viewer = viewerMode(installationId: installationId)
        if viewer == "child_session" || viewer.isEmpty { return false }
        if privacyMode(installationId: installationId) == "private"
            || privacyMode(installationId: installationId) == "reduced" { return false }
        guard let json = allowedChildrenJson(installationId: installationId),
              let data = json.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return false
        }
        return arr.count > 1 && widgetMode(installationId: installationId) == "family"
    }

    // MARK: - Per-widget instance config (R4.5 closure)

    static func setWidgetMode(_ mode: String, installationId: String) {
        let scope = resolvedScope(installationId)
        defaults?.set(mode, forKey: pubKey(scope, "widget_mode"))
        defaults?.synchronize()
    }

    static func widgetMode(installationId: String? = nil) -> String {
        defaults?.string(forKey: pubKey(resolvedScope(installationId), "widget_mode")) ?? ""
    }

    static func setLockedChildId(_ childId: String?, installationId: String) {
        let scope = resolvedScope(installationId)
        let key = pubKey(scope, "locked_child_id")
        if let childId = childId, !childId.isEmpty {
            defaults?.set(childId, forKey: key)
        } else {
            defaults?.removeObject(forKey: key)
        }
        defaults?.synchronize()
    }

    static func lockedChildId(installationId: String? = nil) -> String? {
        defaults?.string(forKey: pubKey(resolvedScope(installationId), "locked_child_id"))
    }

    static func isPersonalLocked(installationId: String? = nil) -> Bool {
        widgetMode(installationId: installationId) == "personal"
            && lockedChildId(installationId: installationId) != nil
    }

    static func setWidgetInstanceId(_ instanceId: String, installationId: String) {
        let scope = resolvedScope(installationId)
        defaults?.set(instanceId, forKey: pubKey(scope, "widget_instance_id"))
        defaults?.synchronize()
    }

    static func widgetInstanceId(installationId: String? = nil) -> String? {
        defaults?.string(forKey: pubKey(resolvedScope(installationId), "widget_instance_id"))
    }

    static func clearPresentationCache(installationId: String? = nil) {
        let scope = resolvedScope(installationId)
        let d = defaults
        d?.removeObject(forKey: pubKey(scope, "snapshot_json"))
        d?.removeObject(forKey: pubKey(scope, "widget_child_display_label"))
        d?.removeObject(forKey: pubKey(scope, "widget_feedback_until"))
        d?.removeObject(forKey: pubKey(scope, "widget_feedback_stars"))
        d?.removeObject(forKey: pubKey(scope, "widget_feedback_title"))
        d?.removeObject(forKey: pubKey(scope, "widget_feedback_child_name"))
        d?.synchronize()
    }

    static func migrateLegacyBindingIfNeeded(targetInstallationId: String) {
        let scope = normalizeScope(targetInstallationId)
        guard scope != "default" else { return }
        if hasBinding(installationId: targetInstallationId) { return }
        guard let token = readKeychain(account: legacyKeychainAccount)
            ?? readKeychain(scope: "default"),
              !token.isEmpty else { return }
        let active = activeChildId(installationId: "default") ?? activeChildId()
        let viewer = viewerMode(installationId: "default")
        let privacy = privacyMode(installationId: "default")
        try? saveBinding(
            token: token,
            activeChildId: active ?? "",
            viewerMode: viewer,
            privacyMode: privacy,
            installationId: targetInstallationId
        )
    }

    static func setApiBaseUrl(_ url: String) {
        defaults?.set(url, forKey: "widget_api_base_url")
        defaults?.synchronize()
    }

    static func apiBaseUrl() -> String? {
        defaults?.string(forKey: "widget_api_base_url")
    }

    // MARK: - Keychain

    private static func setKeychain(_ value: String, scope: String) throws {
        let account = scope == "default" ? legacyKeychainAccount : keychainAccount(for: scope)
        deleteKeychain(account: account)
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: appGroupId,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            throw NSError(domain: "WidgetBridgeStore", code: Int(status), userInfo: nil)
        }
    }

    private static func readKeychain(scope: String) -> String? {
        readKeychain(account: keychainAccount(for: scope))
    }

    private static func readKeychain(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: appGroupId,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func deleteKeychain(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: appGroupId,
        ]
        SecItemDelete(query as CFDictionary)
    }

    /// Scopes that have stored widget UserDefaults keys (for logout keychain sweep).
    private static func knownBindingScopes() -> [String] {
        guard let dict = defaults?.dictionaryRepresentation() else { return [] }
        var scopes = Set<String>()
        for key in dict.keys where key.hasPrefix("s_") {
            let rest = String(key.dropFirst(2))
            guard let firstUnderscore = rest.firstIndex(of: "_") else { continue }
            let scope = String(rest[..<firstUnderscore])
            if !scope.isEmpty { scopes.insert(scope) }
        }
        if dict["installation_id"] != nil {
            scopes.insert("default")
        }
        return Array(scopes)
    }
}
