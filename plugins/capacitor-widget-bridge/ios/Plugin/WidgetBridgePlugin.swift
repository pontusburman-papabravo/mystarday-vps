import Foundation
import UIKit
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin {

    @objc func configureBinding(_ call: CAPPluginCall) {
        guard let token = call.getString("bindingToken"), !token.isEmpty else {
            call.reject("bindingToken required")
            return
        }
        guard let childId = call.getString("activeChildId"), !childId.isEmpty else {
            call.reject("activeChildId required")
            return
        }
        do {
            try WidgetBridgeStore.saveBinding(
                token: token,
                activeChildId: childId,
                viewerMode: call.getString("viewerMode"),
                privacyMode: call.getString("privacyMode"),
                installationId: call.getString("installationId")
            )
            if let base = Self.resolveApiBaseUrl(from: bridge?.viewController) {
                WidgetBridgeStore.setApiBaseUrl(base)
            }
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            call.resolve(["ok": true])
        } catch {
            call.reject("Failed to store binding", nil, error)
        }
    }

    @objc func refreshAll(_ call: CAPPluginCall) {
        WidgetBridgeStore.defaultsRefreshTimestamp()
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["ok": true])
    }

    @objc func clearBindings(_ call: CAPPluginCall) {
        WidgetBridgeStore.clearAll()
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["ok": true])
    }

    @objc func notifyChildChanged(_ call: CAPPluginCall) {
        if let childId = call.getString("activeChildId"), !childId.isEmpty {
            UserDefaults(suiteName: WidgetBridgeStore.appGroupId)?.set(childId, forKey: "active_child_id")
        }
        WidgetBridgeStore.invalidatePendingAction()
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["ok": true])
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(WidgetBridgeStore.status())
    }

    /// Remote WebView server URL for widget API (no secrets in extension plist).
    private static func resolveApiBaseUrl(from viewController: UIViewController?) -> String? {
        if let bridgeVC = viewController as? CAPBridgeViewController,
           let url = bridgeVC.webView?.url {
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            components?.path = ""
            components?.query = nil
            components?.fragment = nil
            if let base = components?.url?.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")),
               base.hasPrefix("http") {
                return base
            }
        }
        return WidgetBridgeStore.apiBaseUrl()
    }
}

extension WidgetBridgeStore {
    static func defaultsRefreshTimestamp() {
        defaults?.set(ISO8601DateFormatter().string(from: Date()), forKey: "last_refresh_at")
        defaults?.synchronize()
    }
}
