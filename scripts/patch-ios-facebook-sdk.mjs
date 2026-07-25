#!/usr/bin/env node
/**
 * Wire Meta App Events (Facebook SDK) into the iOS Capacitor shell.
 * Run after `npx cap sync ios` (and after patch-capacitor-facebook-events-privacy.mjs).
 *
 * Privacy defaults (EU/GDPR):
 *   FacebookAutoLogAppEventsEnabled = false
 *   FacebookAdvertiserIDCollectionEnabled = false
 *   activateApp() only when persisted marketing consent is true
 *
 * Automatic IAP purchase logging must stay OFF in Meta App Dashboard.
 */
import fs from 'fs';
import path from 'path';

const META_APP_ID = process.env.META_APP_ID || '27941105858861495';
const META_CLIENT_TOKEN =
  process.env.META_CLIENT_TOKEN || process.env.FACEBOOK_CLIENT_TOKEN || '';
const META_DISPLAY_NAME = process.env.META_DISPLAY_NAME || '';

const appDir = path.join(process.cwd(), 'ios', 'App', 'App');
const infoPlistPath = path.join(appDir, 'Info.plist');
const appDelegatePath = path.join(appDir, 'AppDelegate.swift');
const podfilePath = path.join(process.cwd(), 'ios', 'App', 'Podfile');

function ensurePodfilePods() {
  if (!fs.existsSync(podfilePath)) return;
  let content = fs.readFileSync(podfilePath, 'utf8');
  const before = content;
  const pods = [
    {
      name: 'CapacitorFacebookEvents',
      line: "  pod 'CapacitorFacebookEvents', :path => '../../node_modules/capacitor-facebook-events'",
    },
    {
      name: 'CapacitorPluginAppTrackingTransparency',
      line: "  pod 'CapacitorPluginAppTrackingTransparency', :path => '../../node_modules/capacitor-plugin-app-tracking-transparency'",
    },
  ];
  for (const pod of pods) {
    if (content.includes(pod.name)) continue;
    if (!content.includes('def capacitor_pods')) {
      console.warn('[patch-ios-facebook-sdk] No capacitor_pods in Podfile — add', pod.name, 'manually');
      continue;
    }
    content = content.replace(
      /def capacitor_pods\n([\s\S]*?)(\nend\n)/,
      (match, body, ending) => `def capacitor_pods\n${body}${pod.line}\n${ending}`
    );
  }
  if (content !== before) {
    fs.writeFileSync(podfilePath, content);
    console.log('Ensured Meta/ATT pods in Podfile');
  }
}

function escapePlistString(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function upsertPlistKey(content, key, value) {
  const escaped = escapePlistString(value);
  const block = `\t<key>${key}</key>\n\t<string>${escaped}</string>`;
  const existing = new RegExp(
    `\\t<key>${key}</key>\\s*\\n\\s*<string>[\\s\\S]*?</string>(?:\\s*<!-- pragma: allowlist secret -->)?`
  );
  if (existing.test(content)) {
    return content.replace(existing, block);
  }
  const closingDict = content.lastIndexOf('</dict>');
  if (closingDict === -1) throw new Error('Could not find </dict> in Info.plist');
  return content.slice(0, closingDict) + block + '\n' + content.slice(closingDict);
}

function upsertPlistBool(content, key, boolValue) {
  const block = `\t<key>${key}</key>\n\t<${boolValue ? 'true' : 'false'}/>`;
  const existing = new RegExp(
    `\\t<key>${key}</key>\\s*\\n\\s*<(?:true|false)/>`
  );
  if (existing.test(content)) {
    return content.replace(existing, block);
  }
  const closingDict = content.lastIndexOf('</dict>');
  if (closingDict === -1) throw new Error('Could not find </dict> in Info.plist');
  return content.slice(0, closingDict) + block + '\n' + content.slice(closingDict);
}

function ensureFacebookUrlScheme(content, appId) {
  const scheme = `fb${appId}`;
  if (content.includes(`<string>${scheme}</string>`)) return content;

  const urlTypesBlock =
    `\t<key>CFBundleURLTypes</key>\n` +
    `\t<array>\n` +
    `\t\t<dict>\n` +
    `\t\t\t<key>CFBundleURLSchemes</key>\n` +
    `\t\t\t<array>\n` +
    `\t\t\t\t<string>${escapePlistString(scheme)}</string>\n` +
    `\t\t\t</array>\n` +
    `\t\t</dict>\n` +
    `\t</array>`;

  if (content.includes('<key>CFBundleURLTypes</key>')) {
    const schemesArray = /(<key>CFBundleURLSchemes<\/key>\s*<array>)/;
    if (schemesArray.test(content)) {
      return content.replace(
        schemesArray,
        `$1\n\t\t\t\t<string>${escapePlistString(scheme)}</string>`
      );
    }
  }

  const closingDict = content.lastIndexOf('</dict>');
  if (closingDict === -1) throw new Error('Could not find </dict> in Info.plist');
  return content.slice(0, closingDict) + urlTypesBlock + '\n' + content.slice(closingDict);
}

function patchInfoPlist() {
  if (!fs.existsSync(infoPlistPath)) {
    throw new Error(`Not found: ${infoPlistPath}`);
  }
  let content = fs.readFileSync(infoPlistPath, 'utf8');
  const before = content;

  content = upsertPlistKey(content, 'FacebookAppID', META_APP_ID);
  const displayName = META_DISPLAY_NAME || (content.match(/<key>CFBundleDisplayName<\/key>\s*<string>([\s\S]*?)<\/string>/) || [])[1] || 'App';
  content = upsertPlistKey(content, 'FacebookDisplayName', displayName);
  if (META_CLIENT_TOKEN) {
    content = upsertPlistKey(content, 'FacebookClientToken', META_CLIENT_TOKEN);
  } else {
    console.warn(
      '[patch-ios-facebook-sdk] META_CLIENT_TOKEN not set — FacebookClientToken not written. ' +
        'Set META_CLIENT_TOKEN before release builds (Meta App Dashboard → Settings → Advanced).'
    );
  }
  content = upsertPlistBool(content, 'FacebookAutoLogAppEventsEnabled', false);
  content = upsertPlistBool(content, 'FacebookAdvertiserIDCollectionEnabled', false);
  content = upsertPlistKey(
    content,
    'NSUserTrackingUsageDescription',
    'Din tillåtelse hjälper oss att mäta vilka annonser som leder till att Min Stjärndag installeras och används.' // pragma: allowlist secret
  );
  content = ensureFacebookUrlScheme(content, META_APP_ID);

  if (content !== before) {
    fs.writeFileSync(infoPlistPath, content);
    console.log('Patched Info.plist with privacy-safe Meta App Events keys');
  } else {
    console.log('Info.plist Meta App Events keys already up to date');
  }
}

const PRIVACY_SAFE_APP_DELEGATE = `import UIKit
import Capacitor
import FBSDKCoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        AttTrackingCoordinator.shared.applyStartupPrivacyDefaults()
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
`;

function patchAppDelegate() {
  if (!fs.existsSync(appDelegatePath)) {
    throw new Error(`Not found: ${appDelegatePath}`);
  }
  const before = fs.readFileSync(appDelegatePath, 'utf8');
  const alreadySafe =
    before.includes('AttTrackingCoordinator.shared') &&
    before.includes('if Settings.shared.isAutoLogAppEventsEnabled');
  if (alreadySafe) {
    console.log('AppDelegate.swift already privacy-safe for Meta App Events');
    return;
  }
  if (
    before.includes('msd_meta_marketing_consent') &&
    before.includes('if Settings.shared.isAutoLogAppEventsEnabled')
  ) {
    // Upgrade legacy bool(forKey:) reads to fail-closed object(forKey:) as? Bool.
    const upgraded = before
      .replace(
        /UserDefaults\.standard\.bool\(forKey: "msd_meta_marketing_consent"\)/g,
        'UserDefaults.standard.object(forKey: "msd_meta_marketing_consent") as? Bool ?? false'
      )
      .replace(
        /UserDefaults\.standard\.bool\(forKey: "msd_meta_advertiser_tracking"\)/g,
        'UserDefaults.standard.object(forKey: "msd_meta_advertiser_tracking") as? Bool ?? false'
      );
    if (upgraded !== before) {
      fs.writeFileSync(appDelegatePath, upgraded);
      console.log('Upgraded AppDelegate.swift consent reads to fail-closed');
      return;
    }
  }
  fs.writeFileSync(appDelegatePath, PRIVACY_SAFE_APP_DELEGATE);
  console.log('Wrote privacy-safe AppDelegate.swift for Meta App Events');
}

ensurePodfilePods();
patchInfoPlist();
patchAppDelegate();
