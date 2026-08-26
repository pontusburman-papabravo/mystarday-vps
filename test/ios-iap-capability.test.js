'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PBXPROJ = path.join(ROOT, 'ios/App/App.xcodeproj/project.pbxproj');
const ENTITLEMENTS = path.join(ROOT, 'ios/App/App/App.entitlements');
const PODFILE = path.join(ROOT, 'ios/App/Podfile');

// App target id (not the WidgetRoutine extension) — see PBXNativeTarget "App".
const APP_TARGET_ID = '504EC3031FED79650016851F';
const WIDGET_TARGET_ID = 'R45D01011FED79650016851';

test('App target declares the In-App Purchase capability (Xcode SystemCapabilities bookkeeping)', () => {
  const src = fs.readFileSync(PBXPROJ, 'utf8');
  const attrsBlock = src.match(/TargetAttributes = \{([\s\S]*?)\n\t{4}\};\n\t{3}\};/);
  assert.ok(attrsBlock, 'TargetAttributes block should be present');

  const appAttrs = src.match(
    new RegExp(`${APP_TARGET_ID} = \\{([\\s\\S]*?)\\n\\t{5}\\};`)
  );
  assert.ok(appAttrs, 'App target attributes block should be present');
  assert.match(
    appAttrs[1],
    /com\.apple\.InAppPurchase\s*=\s*\{\s*enabled\s*=\s*1;/,
    'App target must declare com.apple.InAppPurchase SystemCapabilities'
  );
});

test('WidgetRoutine target does not declare the In-App Purchase capability (not a purchasing surface)', () => {
  const src = fs.readFileSync(PBXPROJ, 'utf8');
  const widgetAttrs = src.match(
    new RegExp(`${WIDGET_TARGET_ID} = \\{([\\s\\S]*?)\\n\\t{5}\\};`)
  );
  assert.ok(widgetAttrs, 'WidgetRoutine target attributes block should be present');
  assert.doesNotMatch(widgetAttrs[1], /com\.apple\.InAppPurchase/);
});

test('App.entitlements has no invalid/hallucinated in-app-purchase entitlement key', () => {
  const src = fs.readFileSync(ENTITLEMENTS, 'utf8');
  // Apple: there is no valid entitlement for In-App Purchase. In-app purchase is
  // available to any app with an explicit (non-wildcard) App ID — it must never be
  // added to the .entitlements plist.
  assert.doesNotMatch(src, /com\.apple\.developer\.in-app-purchase/);
  assert.doesNotMatch(src, /com\.apple\.InAppPurchase/);
});

test('App.entitlements has no Apple external-purchase-link entitlement (not requested/opted-in)', () => {
  const src = fs.readFileSync(ENTITLEMENTS, 'utf8');
  // The EU DMA "external purchase" / "external purchase link" entitlements are a
  // distinct, opt-in mechanism unrelated to standard StoreKit/RevenueCat IAP and
  // must not be silently introduced.
  assert.doesNotMatch(src, /storekit-external-purchase/);
});

test('App.entitlements Sign in with Apple entitlement is unchanged', () => {
  const src = fs.readFileSync(ENTITLEMENTS, 'utf8');
  assert.match(src, /com\.apple\.developer\.applesignin/);
});

test('bundle identifiers and code signing config are unchanged by the IAP capability edit', () => {
  const src = fs.readFileSync(PBXPROJ, 'utf8');
  assert.match(src, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/);
  assert.match(src, /CODE_SIGN_STYLE = Automatic;/);
  // Two PRODUCT_BUNDLE_IDENTIFIER lines for the App target (Debug + Release).
  const appBundleIdMatches = src.match(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+; \/\/ pragma: allowlist secret/g) || [];
  assert.equal(appBundleIdMatches.length, 2, 'App target bundle id should appear exactly twice (Debug/Release)');
});

test('Podfile lists RevenuecatPurchasesCapacitor pod matching the installed npm plugin', () => {
  const podfile = fs.readFileSync(PODFILE, 'utf8');
  assert.match(podfile, /pod 'RevenuecatPurchasesCapacitor', :path => '\.\.\/\.\.\/node_modules\/@revenuecat\/purchases-capacitor'/);
});

test('project.pbxproj still parses as balanced OpenStep plist (brace/paren sanity)', () => {
  const src = fs.readFileSync(PBXPROJ, 'utf8');
  const open = (src.match(/\{/g) || []).length;
  const close = (src.match(/\}/g) || []).length;
  assert.equal(open, close, 'braces must balance');
  const openP = (src.match(/\(/g) || []).length;
  const closeP = (src.match(/\)/g) || []).length;
  assert.equal(openP, closeP, 'parentheses must balance');
});

test('scripts/verify-iap-native-capacitor.mjs passes against the current repo state', () => {
  const out = execFileSync('node', [path.join(ROOT, 'scripts/verify-iap-native-capacitor.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.doesNotMatch(out, /FAIL:/);
  assert.match(out, /In-App Purchase capability on App target/);
});
