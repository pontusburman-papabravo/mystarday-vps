'use strict';

/**
 * Release scope gate: Widget + Meta App Events are PAUSED for the next native
 * release. Core app functionality + RevenueCat/IAP, Apple Sign-In, Google
 * Sign-In, Push, Camera and Adult Biometric must remain intact.
 *
 * android/ is generated (gitignored) — the absence checks below are best-effort
 * when it exists on disk (e.g. after `npm run cap:sync:android` in this run)
 * and always assert the canonical capacitor.config.ts source of truth.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const capTs = fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8');

function includePluginsBlock(platform) {
  const re = new RegExp(`${platform}:\\s*\\{[\\s\\S]*?includePlugins:\\s*\\[([\\s\\S]*?)\\]`);
  const m = capTs.match(re);
  assert.ok(m, `${platform} includePlugins block must exist`);
  return m[1];
}

describe('Release scope: Widget + Meta paused, core/IAP/auth intact', () => {
  it('capacitor.config.ts excludes capacitor-facebook-events on both platforms', () => {
    assert.doesNotMatch(includePluginsBlock('ios'), /['"]capacitor-facebook-events['"]/);
    assert.doesNotMatch(includePluginsBlock('android'), /['"]capacitor-facebook-events['"]/);
  });

  it('capacitor.config.ts excludes capacitor-widget-bridge on both platforms', () => {
    assert.doesNotMatch(includePluginsBlock('ios'), /['"]capacitor-widget-bridge['"]/);
    assert.doesNotMatch(includePluginsBlock('android'), /['"]capacitor-widget-bridge['"]/);
  });

  it('RevenueCat purchases-capacitor remains on both platforms', () => {
    assert.match(includePluginsBlock('ios'), /['"]@revenuecat\/purchases-capacitor['"]/);
    assert.match(includePluginsBlock('android'), /['"]@revenuecat\/purchases-capacitor['"]/);
  });

  it('Apple Sign-In remains iOS-only; Google Sign-In remains Android-only', () => {
    assert.match(includePluginsBlock('ios'), /['"]@capacitor-community\/apple-sign-in['"]/);
    assert.doesNotMatch(includePluginsBlock('android'), /apple-sign-in/);
    assert.match(includePluginsBlock('android'), /['"]@codetrix-studio\/capacitor-google-auth['"]/);
    assert.doesNotMatch(includePluginsBlock('ios'), /capacitor-google-auth/);
  });

  it('Push, Camera and Adult Biometric remain on both platforms', () => {
    for (const platform of ['ios', 'android']) {
      const block = includePluginsBlock(platform);
      assert.match(block, /['"]@capacitor\/push-notifications['"]/);
      assert.match(block, /['"]@capacitor\/camera['"]/);
      assert.match(block, /['"]capacitor-adult-biometric['"]/);
    }
  });

  it('cap:sync:android no longer runs Meta or widget patch/verify steps', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const chain = pkg.scripts['cap:sync:android'];
    for (const forbidden of [
      'patch-capacitor-facebook-events-privacy.mjs',
      'verify-capacitor-facebook-events-privacy.mjs',
      'patch-android-facebook-sdk.mjs',
      'patch-android-widget.mjs',
      'verify-widget-bridge-native.mjs',
    ]) {
      assert.doesNotMatch(chain, new RegExp(forbidden.replace(/\./g, '\\.')));
    }
    assert.match(chain, /verify-meta-native-release\.mjs --android/);
    assert.match(chain, /verify-android-native\.mjs/);
    assert.match(chain, /verify-android-release-hardening\.mjs/);
  });

  it('reusable widget + Meta source stays in the repo (npm deps + plugin sources)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies['capacitor-facebook-events'], 'Meta plugin source dependency retained');
    assert.ok(pkg.dependencies['capacitor-widget-bridge'], 'widget plugin source dependency retained');
    assert.ok(
      fs.existsSync(path.join(ROOT, 'plugins/capacitor-widget-bridge/android/src/main/java')),
      'widget Android source retained'
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, 'plugins/capacitor-widget-bridge/ios/Plugin')),
      'widget iOS source retained'
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, 'ios/App/WidgetRoutine')),
      'WidgetRoutine iOS extension source retained'
    );
  });

  it('verify-widget-bridge-native gate passes (source retained, plugin excluded from release)', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/verify-widget-bridge-native.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /excludes capacitor-widget-bridge from Android includePlugins/);
    assert.match(r.stdout, /excludes capacitor-widget-bridge from iOS includePlugins/);
  });

  it('verify-meta-native-release --android passes (NO-META-native gate)', () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/verify-meta-native-release.mjs'), '--android'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });

  it('verify-meta-native-release --ios passes (no Meta native SDK)', () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/verify-meta-native-release.mjs'), '--ios'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, META_CLIENT_TOKEN: '' } }
    );
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });

  it('verify-ios-no-att-meta-release passes (asserts widget-bridge absence too)', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/verify-ios-no-att-meta-release.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    // The WidgetBridge-specific message only prints once ios/App/App/capacitor.config.json
    // exists, which requires `npx cap sync ios` + `pod install` (Mac/CocoaPods only — not
    // available on Linux CI runners). Assert it when the generated file is present; the
    // status===0 exit code above is the environment-agnostic absence gate otherwise.
    if (fs.existsSync(path.join(ROOT, 'ios/App/App/capacitor.config.json'))) {
      assert.match(r.stdout, /no WidgetBridge plugin/);
    }
  });

  it('verify-iap-native-capacitor still passes — RevenueCat unaffected by the pause', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/verify-iap-native-capacitor.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });

  it('iOS Podfile has no CapacitorWidgetBridge or CapacitorFacebookEvents pod, but keeps RevenueCat + Adult Biometric', () => {
    const podfile = fs.readFileSync(path.join(ROOT, 'ios/App/Podfile'), 'utf8');
    assert.doesNotMatch(podfile, /CapacitorWidgetBridge/);
    assert.doesNotMatch(podfile, /CapacitorFacebookEvents/);
    assert.match(podfile, /RevenuecatPurchasesCapacitor/);
    assert.match(podfile, /CapacitorAdultBiometric/);
  });

  it('WidgetRoutine.appex stays excluded from the App archive (existing release-hold, unaffected)', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/verify-ios-widget-release-hold.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  });
});
