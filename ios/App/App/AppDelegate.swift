import UIKit
import Capacitor
import FBSDKCoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Fail-closed before Facebook SDK initializes (no IDFA / AutoLog until ATT resolves).
        AttTrackingCoordinator.shared.applyStartupPrivacyDefaults()

        // Meta App Events — keep Meta Dashboard "Automatically Log In-App Purchase Events" OFF.
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)

        AttTrackingCoordinator.shared.applyMetaSettingsForCurrentAttStatus()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        AttTrackingCoordinator.shared.applicationDidEnterBackground()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        AttTrackingCoordinator.shared.schedulePromptIfNeeded(application: application, window: window)

        if Settings.shared.isAutoLogAppEventsEnabled {
            AppEvents.shared.activateApp()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        let facebookHandled = ApplicationDelegate.shared.application(app, open: url, options: options)
        let capacitorHandled = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        return facebookHandled || capacitorHandled
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
