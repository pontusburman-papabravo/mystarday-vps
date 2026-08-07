import UIKit
import FBSDKCoreKit

/// Applies Meta SDK privacy settings from persisted marketing consent only.
/// My Starday does not perform Apple-defined cross-app tracking (no IDFA / no ATT).
final class AttTrackingCoordinator {

    static let shared = AttTrackingCoordinator()

    private let marketingConsentKey = "msd_meta_marketing_consent"

    private init() {}

    func schedulePromptIfNeeded(application: UIApplication, window: UIWindow?) {
        // No App Tracking Transparency — we do not track across apps/websites.
        applyMetaSettingsForCurrentAttStatus()
    }

    func applicationDidEnterBackground() {
        // no-op (legacy hook for AppDelegate)
    }

    func applyStartupPrivacyDefaults() {
        Settings.shared.isAutoLogAppEventsEnabled = false
        Settings.shared.isAdvertiserIDCollectionEnabled = false
        Settings.shared.isAdvertiserTrackingEnabled = false
    }

    func applyMetaSettingsForCurrentAttStatus() {
        let marketing = UserDefaults.standard.object(forKey: marketingConsentKey) as? Bool ?? false
        Settings.shared.isAutoLogAppEventsEnabled = marketing
        Settings.shared.isAdvertiserIDCollectionEnabled = false
        Settings.shared.isAdvertiserTrackingEnabled = false
    }
}
