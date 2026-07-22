#!/usr/bin/env node
/**
 * Wire Meta App Events (Facebook SDK) into the iOS Capacitor shell.
 * Run after `npx cap sync ios`.
 *
 * Env:
 *   META_CLIENT_TOKEN or FACEBOOK_CLIENT_TOKEN — required for release builds
 *   META_APP_ID — defaults to 27941105858861495
 *   META_DISPLAY_NAME — optional; falls back to CFBundleDisplayName in Info.plist
 *
 * Defaults:
 *   FacebookAutoLogAppEventsEnabled = true  (install + app open only; NOT purchases)
 *   FacebookAdvertiserIDCollectionEnabled = false until ATT/marketing consent path
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
    `\\t<key>${key}</key>\\s*\\n\\s*<string>[\\s\\S]*?</string>`
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
    // Insert scheme into first CFBundleURLSchemes array if present.
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
  content = upsertPlistBool(content, 'FacebookAutoLogAppEventsEnabled', true);
  content = upsertPlistBool(content, 'FacebookAdvertiserIDCollectionEnabled', false);
  content = upsertPlistKey(
    content,
    'NSUserTrackingUsageDescription',
    'Vi använder detta för att mäta annonser och förstå vilka kampanjer som hjälper familjer hitta appen. Ingen barndata skickas.'
  );
  content = ensureFacebookUrlScheme(content, META_APP_ID);

  if (content !== before) {
    fs.writeFileSync(infoPlistPath, content);
    console.log('Patched Info.plist with Meta App Events keys');
  } else {
    console.log('Info.plist Meta App Events keys already up to date');
  }
}

const APP_DELEGATE_MARKER = 'ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)';

function patchAppDelegate() {
  if (!fs.existsSync(appDelegatePath)) {
    throw new Error(`Not found: ${appDelegatePath}`);
  }
  let content = fs.readFileSync(appDelegatePath, 'utf8');
  const before = content;

  if (!content.includes('import FBSDKCoreKit')) {
    content = content.replace(
      'import Capacitor\n',
      'import Capacitor\nimport FBSDKCoreKit\n'
    );
  }

  if (!content.includes(APP_DELEGATE_MARKER)) {
    content = content.replace(
      /func application\(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\) -> Bool \{\n\s*\/\/ Override point for customization after application launch\.\n\s*return true\n\s*\}/,
      `func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Meta App Events: auto-log install/activate only. Advertiser ID stays off until ATT/consent.
        // Keep Meta Dashboard "Automatically Log In-App Purchase Events" OFF.
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
        Settings.shared.isAutoLogAppEventsEnabled = true
        Settings.shared.isAdvertiserIDCollectionEnabled = false
        return true
    }`
    );
  }

  if (!content.includes('AppEvents.shared.activateApp()')) {
    content = content.replace(
      /func applicationDidBecomeActive\(_ application: UIApplication\) \{\n([\s\S]*?)\n    \}/,
      (match, body) => {
        if (body.includes('AppEvents.shared.activateApp()')) return match;
        return `func applicationDidBecomeActive(_ application: UIApplication) {
${body}
        AppEvents.shared.activateApp()
    }`;
      }
    );
  }

  // Forward Facebook URL opens alongside Capacitor proxy.
  if (!content.includes('ApplicationDelegate.shared.application(app, open: url')) {
    content = content.replace(
      'return ApplicationDelegateProxy.shared.application(app, open: url, options: options)',
      `let facebookHandled = ApplicationDelegate.shared.application(app, open: url, options: options)
        let capacitorHandled = ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        return facebookHandled || capacitorHandled`
    );
  }

  if (content !== before) {
    fs.writeFileSync(appDelegatePath, content);
    console.log('Patched AppDelegate.swift for Meta App Events');
  } else {
    console.log('AppDelegate.swift Meta App Events wiring already present');
  }
}

ensurePodfilePods();
patchInfoPlist();
patchAppDelegate();
