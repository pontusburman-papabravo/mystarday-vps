import UIKit
import Capacitor
import FBSDKCoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Meta App Events — privacy-safe defaults (EU/GDPR).
        // AutoLog + advertiser ID OFF until marketing consent is persisted and applied by the plugin.
        // Keep Meta Dashboard "Automatically Log In-App Purchase Events" OFF.
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)

        // Fail-closed: missing/corrupt keys → false. Native-persisted only (not JS localStorage).
        let marketingConsent = UserDefaults.standard.object(forKey: "msd_meta_marketing_consent") as? Bool ?? false
        let advertiserTracking = UserDefaults.standard.object(forKey: "msd_meta_advertiser_tracking") as? Bool ?? false
        Settings.shared.isAutoLogAppEventsEnabled = marketingConsent
        Settings.shared.isAdvertiserIDCollectionEnabled = marketingConsent && advertiserTracking
        Settings.shared.isAdvertiserTrackingEnabled = marketingConsent && advertiserTracking
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        // activateApp ONLY when marketing consent is already active — never on first start without consent.
        if Settings.shared.isAutoLogAppEventsEnabled {
            AppEvents.shared.activateApp()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        let facebookHandled = ApplicationDelegate.shared.application(app, open: url, options: options)
        let capacitorHandled = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        return facebookHandled || capacitorHandled
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
