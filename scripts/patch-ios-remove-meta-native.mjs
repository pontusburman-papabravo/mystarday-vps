#!/usr/bin/env node
/**
 * iOS 1.4 NO-TRACKING: strip Meta/Facebook native SDK wiring after cap sync.
 * Run after patch-ios-podfile.mjs on every cap:sync:ios.
 *
 * - Removes CapacitorFacebookEvents from Podfile if cap sync reintroduced it
 * - Removes Facebook SDK plist keys and fb* URL scheme from Info.plist
 * - Ensures AppDelegate.swift has no FBSDKCoreKit dependency
 *
 * Android Meta integration is unchanged (cap:sync:android still uses patch-android-facebook-sdk.mjs).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const podfilePath = path.join(ROOT, 'ios', 'App', 'Podfile');
const infoPlistPath = path.join(ROOT, 'ios', 'App', 'App', 'Info.plist');
const appDelegatePath = path.join(ROOT, 'ios', 'App', 'App', 'AppDelegate.swift');

const META_POD_RE =
  /^\s*pod 'CapacitorFacebookEvents'.*\n/m;

const FACEBOOK_PLIST_KEYS = [
  'FacebookAppID',
  'FacebookDisplayName',
  'FacebookClientToken',
  'FacebookAutoLogAppEventsEnabled',
  'FacebookAdvertiserIDCollectionEnabled',
];

const CAPACITOR_ONLY_APP_DELEGATE = `import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
`;

function stripMetaPod(content) {
  if (!META_POD_RE.test(content)) return content;
  return content.replace(META_POD_RE, '');
}

function stripPlistKey(content, key) {
  return content.replace(
    new RegExp(`\\t<key>${key}</key>\\s*\\n\\s*<(?:string>[\\s\\S]*?</string>|true|false)/>\\s*\\n`, 'g'),
    ''
  );
}

function stripFacebookUrlScheme(content) {
  return content.replace(
    /\t<key>CFBundleURLTypes<\/key>\s*\n\t<array>\s*\n\t\t<dict>\s*\n\t\t\t<key>CFBundleURLSchemes<\/key>\s*\n\t\t\t<array>\s*\n\t\t\t\t<string>fb[\d]+<\/string>\s*\n\t\t\t<\/array>\s*\n\t\t<\/dict>\s*\n\t<\/array>\s*\n/g,
    ''
  );
}

function patchPodfile() {
  if (!fs.existsSync(podfilePath)) return;
  let content = fs.readFileSync(podfilePath, 'utf8');
  const stripped = stripMetaPod(content);
  if (stripped !== content) {
    fs.writeFileSync(podfilePath, stripped);
    console.log('[patch-ios-remove-meta-native] Removed CapacitorFacebookEvents from Podfile');
  }
}

function patchInfoPlist() {
  if (!fs.existsSync(infoPlistPath)) return;
  let content = fs.readFileSync(infoPlistPath, 'utf8');
  const before = content;
  for (const key of FACEBOOK_PLIST_KEYS) {
    content = stripPlistKey(content, key);
  }
  content = stripFacebookUrlScheme(content);
  if (content !== before) {
    fs.writeFileSync(infoPlistPath, content);
    console.log('[patch-ios-remove-meta-native] Removed Facebook SDK keys from Info.plist');
  }
}

function patchAppDelegate() {
  if (!fs.existsSync(appDelegatePath)) return;
  const before = fs.readFileSync(appDelegatePath, 'utf8');
  if (
    before.includes('FBSDKCoreKit') ||
    before.includes('AttTrackingCoordinator') ||
    before.includes('ApplicationDelegate.shared') ||
    before.includes('AppEvents.shared')
  ) {
    fs.writeFileSync(appDelegatePath, CAPACITOR_ONLY_APP_DELEGATE);
    console.log('[patch-ios-remove-meta-native] Wrote Capacitor-only AppDelegate.swift (no Meta native SDK)');
  }
}

patchPodfile();
patchInfoPlist();
patchAppDelegate();
console.log('[patch-ios-remove-meta-native] iOS Meta native SDK stripped');
