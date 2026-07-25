import UIKit
import AppTrackingTransparency
import FBSDKCoreKit

/// Presents App Tracking Transparency once per install and applies Meta SDK settings
/// based on ATT + persisted marketing consent. Fail-closed until ATT is resolved.
final class AttTrackingCoordinator {

    static let shared = AttTrackingCoordinator()
    static let attStatusDefaultsKey = "msd_att_authorization_status"

    private let marketingConsentKey = "msd_meta_marketing_consent"
    private let advertiserTrackingKey = "msd_meta_advertiser_tracking"

    private var promptScheduled = false
    private var pendingWorkItem: DispatchWorkItem?

    private init() {}

    func schedulePromptIfNeeded(application: UIApplication, window: UIWindow?) {
        guard !promptScheduled else {
            debugLog("att_skipped", ["reason": "already_scheduled"])
            return
        }

        if #available(iOS 14.5, *) {
            let current = ATTrackingManager.trackingAuthorizationStatus
            debugLog("att_status_read", ["status": statusLabel(current)])

            guard current == .notDetermined else {
                applyMetaSettingsForCurrentAttStatus()
                return
            }

            guard application.applicationState == .active else {
                debugLog("att_deferred", ["reason": "app_not_active"])
                return
            }

            guard presentationViewController(from: window) != nil else {
                debugLog("att_deferred", ["reason": "no_view_controller"])
                scheduleRetry(application: application, window: window)
                return
            }

            promptScheduled = true
            let work = DispatchWorkItem { [weak self] in
                self?.requestIfStillEligible(application: application, window: window)
            }
            pendingWorkItem = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6, execute: work)
        } else {
            applyMetaSettingsForCurrentAttStatus()
        }
    }

    func applicationDidEnterBackground() {
        pendingWorkItem?.cancel()
        pendingWorkItem = nil
        if #available(iOS 14.5, *) {
            if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
                promptScheduled = false
            }
        }
    }

    /// Force Meta SDK fail-closed defaults at process start (before any tracking).
    func applyStartupPrivacyDefaults() {
        Settings.shared.isAutoLogAppEventsEnabled = false
        Settings.shared.isAdvertiserIDCollectionEnabled = false
        Settings.shared.isAdvertiserTrackingEnabled = false
        debugLog("meta_startup_defaults", [
            "auto_log": false,
            "advertiser_tracking": false,
        ])
    }

    /// Reconcile Meta SDK flags from ATT status + persisted marketing consent.
    func applyMetaSettingsForCurrentAttStatus() {
        if #available(iOS 14.5, *) {
            let attStatus = ATTrackingManager.trackingAuthorizationStatus
            persistAttStatus(attStatus)

            if attStatus == .notDetermined {
                Settings.shared.isAutoLogAppEventsEnabled = false
                Settings.shared.isAdvertiserIDCollectionEnabled = false
                Settings.shared.isAdvertiserTrackingEnabled = false
                UserDefaults.standard.set(false, forKey: advertiserTrackingKey)
                debugLog("meta_settings_applied", [
                    "reason": "att_not_determined",
                    "auto_log": false,
                    "advertiser_tracking": false,
                ])
                return
            }

            let marketing = UserDefaults.standard.object(forKey: marketingConsentKey) as? Bool ?? false
            let advertiserAllowed = marketing && attStatus == .authorized

            Settings.shared.isAutoLogAppEventsEnabled = marketing
            Settings.shared.isAdvertiserIDCollectionEnabled = advertiserAllowed
            Settings.shared.isAdvertiserTrackingEnabled = advertiserAllowed
            UserDefaults.standard.set(advertiserAllowed, forKey: advertiserTrackingKey)

            debugLog("meta_settings_applied", [
                "marketing_consent": marketing,
                "att_status": statusLabel(attStatus),
                "auto_log": marketing,
                "advertiser_tracking": advertiserAllowed,
            ])
            return
        }

        let marketing = UserDefaults.standard.object(forKey: marketingConsentKey) as? Bool ?? false
        let advertiser = UserDefaults.standard.object(forKey: advertiserTrackingKey) as? Bool ?? false
        Settings.shared.isAutoLogAppEventsEnabled = marketing
        Settings.shared.isAdvertiserIDCollectionEnabled = marketing && advertiser
        Settings.shared.isAdvertiserTrackingEnabled = marketing && advertiser
    }

    private func requestIfStillEligible(application: UIApplication, window: UIWindow?) {
        guard #available(iOS 14.5, *) else { return }

        guard application.applicationState == .active else {
            promptScheduled = false
            schedulePromptIfNeeded(application: application, window: window)
            return
        }

        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else {
            applyMetaSettingsForCurrentAttStatus()
            return
        }

        guard presentationViewController(from: window) != nil else {
            promptScheduled = false
            schedulePromptIfNeeded(application: application, window: window)
            return
        }

        debugLog("att_request_attempted", [:])

        ATTrackingManager.requestTrackingAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.persistAttStatus(status)
                self.applyMetaSettingsForCurrentAttStatus()
                self.debugLog("att_request_completed", [
                    "status": self.statusLabel(status),
                    "advertiser_tracking_enabled": Settings.shared.isAdvertiserTrackingEnabled,
                ])
            }
        }
    }

    private func scheduleRetry(application: UIApplication, window: UIWindow?) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.schedulePromptIfNeeded(application: application, window: window)
        }
    }

    private func presentationViewController(from window: UIWindow?) -> UIViewController? {
        guard let root = window?.rootViewController else { return nil }
        var top = root
        while let presented = top.presentedViewController {
            top = presented
        }
        guard top.isViewLoaded, top.view.window != nil else { return nil }
        return top
    }

    @available(iOS 14.5, *)
    private func persistAttStatus(_ status: ATTrackingManager.AuthorizationStatus) {
        UserDefaults.standard.set(statusLabel(status), forKey: Self.attStatusDefaultsKey)
    }

    @available(iOS 14.5, *)
    private func statusLabel(_ status: ATTrackingManager.AuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorized: return "authorized"
        @unknown default: return "unknown"
        }
    }

    private func debugLog(_ event: String, _ detail: [String: Any]) {
        #if DEBUG
        var payload: [String: Any] = [
            "component": "AttTrackingCoordinator",
            "event": event,
        ]
        detail.forEach { payload[$0.key] = $0.value }
        if let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
           let json = String(data: data, encoding: .utf8) {
            print("[MSD_ATT] \(json)")
        }
        #endif
    }
}
