'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/meta-app-events.js'), 'utf8');
const MARKETING_SRC = fs.readFileSync(path.join(ROOT, 'public/js/marketing-events.js'), 'utf8');

function loadMeta(overrides = {}) {
  const store = new Map();
  const logged = [];
  let attStatus = overrides.attStatus || 'denied';

  const facebookPlugin = {
    configureConsent: async ({ marketingConsent, advertiserTrackingAllowed }) => {
      logged.push({
        type: 'configureConsent',
        marketingConsent: !!marketingConsent,
        advertiserTrackingAllowed: !!advertiserTrackingAllowed,
      });
    },
    setAdvertiserTrackingEnabled: async ({ enabled }) => {
      logged.push({ type: 'ate', enabled: !!enabled });
    },
    logEvent: async ({ event, params }) => {
      logged.push({ type: 'event', event, params });
    },
  };

  const window = {
    location: { hostname: overrides.hostname || 'app.example.com' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      key: (i) => Array.from(store.keys())[i] || null,
      get length() { return store.size; },
    },
    Capacitor: {
      isNativePlatform: () => overrides.native !== false,
      getPlatform: () => overrides.platform || 'ios',
      Plugins: {
        FacebookEvents: overrides.missingPlugin ? undefined : facebookPlugin,
        AppTrackingTransparency: {
          getStatus: async () => ({ status: attStatus }),
          requestPermission: async () => {
            if (overrides.attOnPrompt) attStatus = overrides.attOnPrompt;
            return { status: attStatus };
          },
        },
      },
    },
    Platform: {
      isNative: () => overrides.native !== false,
      isIOS: () => (overrides.platform || 'ios') === 'ios',
      isAndroid: () => overrides.platform === 'android',
    },
    MarketingEvents: {
      hasMarketingConsent: () => overrides.consent === true,
    },
    console,
    __META_APP_EVENTS_DEBUG__: true,
    __META_APP_EVENTS_FORCE__: overrides.force === true,
  };

  if (overrides.force) {
    window.localStorage.setItem('msd_meta_app_events_debug', '1');
  }

  const context = {
    window,
    globalThis: window,
    document: { querySelector: () => null },
    console,
  };
  vm.runInNewContext(SRC, context);
  return {
    MetaAppEvents: context.window.MetaAppEvents,
    logged,
    store,
    window,
    setConsent(next) { overrides.consent = next; },
    setAtt(next) { attStatus = next; },
  };
}

describe('MetaAppEvents privacy gate', () => {
  it('exposes track helpers + consent revoke', () => {
    const { MetaAppEvents } = loadMeta({ force: true, consent: false });
    assert.equal(typeof MetaAppEvents.trackRegistrationCompleted, 'function');
    assert.equal(typeof MetaAppEvents.onConsentGranted, 'function');
    assert.equal(typeof MetaAppEvents.onConsentRevoked, 'function');
  });

  it('1) fresh install without consent sends no Meta events', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true, consent: false, platform: 'ios' });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    await MetaAppEvents._internal.applyNativeConsentConfig({ allowAttPrompt: true });
    assert.equal(logged.filter((e) => e.type === 'event').length, 0);
    const cfg = logged.filter((e) => e.type === 'configureConsent');
    assert.ok(cfg.length >= 1);
    assert.equal(cfg[cfg.length - 1].marketingConsent, false);
  });

  it('2) app open path without consent does not enable AutoLog', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true, consent: false });
    await MetaAppEvents.onConsentGranted();
    await new Promise((r) => setTimeout(r, 15));
    const cfg = logged.filter((e) => e.type === 'configureConsent');
    assert.ok(cfg.every((c) => c.marketingConsent === false));
  });

  it('3) ATT authorized without marketing consent sends nothing', async () => {
    const { MetaAppEvents, logged } = loadMeta({
      force: true,
      consent: false,
      platform: 'ios',
      attStatus: 'authorized',
    });
    await MetaAppEvents.trackFirstScheduleSaved({ flow: 'wizard' });
    const result = await MetaAppEvents._internal.applyNativeConsentConfig({ allowAttPrompt: false });
    assert.equal(result.metaEventsAllowed, false);
    assert.equal(result.advertiserTrackingAllowed, false);
    assert.equal(logged.filter((e) => e.type === 'event').length, 0);
  });

  it('4) marketing consent on Android enables App Events', async () => {
    const { MetaAppEvents, logged } = loadMeta({
      force: true,
      consent: true,
      platform: 'android',
    });
    await MetaAppEvents.onConsentGranted();
    await new Promise((r) => setTimeout(r, 20));
    const cfg = logged.filter((e) => e.type === 'configureConsent');
    assert.ok(cfg.some((c) => c.marketingConsent === true));
    await MetaAppEvents.trackRegistrationCompleted({ method: 'google' });
    assert.equal(logged.filter((e) => e.event === 'fb_mobile_complete_registration').length, 1);
  });

  it('5) iOS marketing consent + denied ATT allows events without advertiser ID', async () => {
    const { MetaAppEvents, logged } = loadMeta({
      force: true,
      consent: true,
      platform: 'ios',
      attStatus: 'denied',
    });
    const result = await MetaAppEvents._internal.applyNativeConsentConfig({ allowAttPrompt: false });
    assert.equal(result.metaEventsAllowed, true);
    assert.equal(result.advertiserTrackingAllowed, false);
    const cfg = logged.find((e) => e.type === 'configureConsent');
    assert.equal(cfg.marketingConsent, true);
    assert.equal(cfg.advertiserTrackingAllowed, false);
    await MetaAppEvents.trackFirstScheduleSaved({ flow: 'wizard' });
    assert.equal(logged.filter((e) => e.event === 'fb_mobile_tutorial_completion').length, 1);
  });

  it('6) iOS marketing consent + ATT authorized allows advertiser tracking', async () => {
    const { MetaAppEvents, logged } = loadMeta({
      force: true,
      consent: true,
      platform: 'ios',
      attStatus: 'authorized',
    });
    const result = await MetaAppEvents._internal.applyNativeConsentConfig({ allowAttPrompt: false });
    assert.equal(result.advertiserTrackingAllowed, true);
    const cfg = logged.find((e) => e.type === 'configureConsent');
    assert.equal(cfg.advertiserTrackingAllowed, true);
  });

  it('7) revoked consent stops AutoLog and manual events', async () => {
    const ctx = loadMeta({ force: true, consent: true, platform: 'android' });
    await ctx.MetaAppEvents.onConsentGranted();
    await ctx.MetaAppEvents.trackChildAccessCompleted({ flow: 'child_login' });
    assert.equal(ctx.logged.filter((e) => e.event === 'child_access_completed').length, 1);

    ctx.setConsent(false);
    ctx.MetaAppEvents.onConsentRevoked();
    await new Promise((r) => setTimeout(r, 20));
    const after = ctx.logged.filter((e) => e.type === 'configureConsent').pop();
    assert.equal(after.marketingConsent, false);

    await ctx.MetaAppEvents.trackFirstStarEarned({ flow: 'child_complete' });
    assert.equal(ctx.logged.filter((e) => e.event === 'first_star_earned').length, 0);
  });

  it('8) granting consent does not backfill install/open in JS layer', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true, consent: false, platform: 'ios' });
    await MetaAppEvents._internal.applyNativeConsentConfig({ allowAttPrompt: true });
    const before = logged.filter((e) => e.type === 'configureConsent');
    assert.equal(before[before.length - 1].marketingConsent, false);

    const granted = loadMeta({ force: true, consent: true, platform: 'ios', attStatus: 'denied' });
    await granted.MetaAppEvents.onConsentGranted();
    await new Promise((r) => setTimeout(r, 20));
    const cfg = granted.logged.filter((e) => e.type === 'configureConsent');
    assert.ok(cfg.some((c) => c.marketingConsent === true));
    // JS never calls activateApp — native handles on next foreground/cold start only.
    assert.doesNotMatch(
      fs.readFileSync(path.join(ROOT, 'public/js/meta-app-events.js'), 'utf8'),
      /\.activateApp\(/
    );
  });

  it('9) native defaults in repo are privacy-safe without JS', () => {
    const plist = fs.readFileSync(path.join(ROOT, 'ios/App/App/Info.plist'), 'utf8');
    assert.match(plist, /FacebookAutoLogAppEventsEnabled<\/key>\s*<false\/>/);
    assert.match(plist, /FacebookAdvertiserIDCollectionEnabled<\/key>\s*<false\/>/);

    const delegate = fs.readFileSync(path.join(ROOT, 'ios/App/App/AppDelegate.swift'), 'utf8');
    assert.match(delegate, /msd_meta_marketing_consent/);
    assert.match(delegate, /object\(forKey: "msd_meta_marketing_consent"\) as\? Bool \?\? false/);
    assert.match(delegate, /if Settings\.shared\.isAutoLogAppEventsEnabled \{\s*AppEvents\.shared\.activateApp\(\)/);
    // Must not call activateApp() outside the consent gate.
    const becomeActive = delegate.slice(
      delegate.indexOf('func applicationDidBecomeActive'),
      delegate.indexOf('func applicationWillTerminate')
    );
    assert.match(becomeActive, /isAutoLogAppEventsEnabled/);
    assert.equal((becomeActive.match(/activateApp\(\)/g) || []).length, 1);

    const iosPatch = fs.readFileSync(path.join(ROOT, 'scripts/patch-ios-facebook-sdk.mjs'), 'utf8');
    assert.match(iosPatch, /FacebookAutoLogAppEventsEnabled', false/);

    const androidPatch = fs.readFileSync(path.join(ROOT, 'scripts/patch-android-facebook-sdk.mjs'), 'utf8');
    assert.match(androidPatch, /AutoLogAppEventsEnabled', 'false'/);

    const pluginJava = fs.readFileSync(
      path.join(ROOT, 'scripts/android/FacebookEventsPlugin.java.patched'),
      'utf8'
    );
    assert.match(pluginJava, /isMarketingConsentPersisted\(\)/);
    assert.match(pluginJava, /prefs\.contains\(KEY_MARKETING\)/);
    assert.doesNotMatch(pluginJava, /configureConsent[\s\S]{0,400}activateApp\(/);
    assert.doesNotMatch(pluginJava, /setAutoLogAppEventsEnabled\(true\);\s*\n\s*FacebookSdk\.setAdvertiserIDCollectionEnabled\(true\)/);

    const iosSwift = fs.readFileSync(path.join(ROOT, 'scripts/ios/FacebookEvents.swift.patched'), 'utf8');
    assert.match(iosSwift, /object\(forKey: FacebookEvents\.marketingConsentKey\) as\? Bool \?\? false/);
    assert.doesNotMatch(iosSwift, /configureConsent[\s\S]{0,400}activateApp\(/);
  });

  it('10) app works without Client Token / Meta SDK plugin', async () => {
    const { MetaAppEvents, logged } = loadMeta({
      force: true,
      consent: true,
      missingPlugin: true,
    });
    assert.doesNotThrow(() => MetaAppEvents.onConsentGranted());
    await assert.doesNotReject(() => MetaAppEvents.trackRegistrationCompleted({ method: 'email' }));
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(logged.length, 0);
  });

  it('CompleteRegistration once after consent; Meta errors never throw', async () => {
    const { MetaAppEvents, logged, window } = loadMeta({ force: true, consent: true, platform: 'ios', attStatus: 'denied' });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    assert.equal(logged.filter((e) => e.event === 'fb_mobile_complete_registration').length, 1);

    window.Capacitor.Plugins.FacebookEvents.logEvent = async () => { throw new Error('native boom'); };
    await assert.doesNotReject(() => MetaAppEvents.trackFirstStarEarned({ flow: 'child_complete' }));
  });

  it('strips forbidden PII params', () => {
    const { MetaAppEvents } = loadMeta({ force: true, consent: true });
    const cleaned = MetaAppEvents._internal.sanitizeParams({
      email: 'a@b.c',
      family_id: 'fam-1',
      childId: 'child-1',
      flow: 'wizard',
    });
    assert.equal(cleaned.email, undefined);
    assert.equal(cleaned.family_id, undefined);
    assert.equal(cleaned.childId, undefined);
    assert.equal(cleaned.flow, 'wizard');
  });

  it('does not send on local host unless explicitly enabled', async () => {
    const { MetaAppEvents, logged } = loadMeta({ hostname: 'localhost', consent: true, native: true });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    assert.equal(logged.filter((e) => e.type === 'event').length, 0);
  });
});

describe('Meta App Events wiring contracts', () => {
  function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  }

  it('marketing-events uses MetaAppEvents on native', () => {
    assert.match(MARKETING_SRC, /MetaAppEvents\.trackRegistrationCompleted/);
  });

  it('consent layers call grant and revoke hooks', () => {
    const appConsent = read('public/js/app-consent.js');
    assert.match(appConsent, /MetaAppEvents\.onConsentGranted/);
    assert.match(appConsent, /MetaAppEvents\.onConsentRevoked/);
    const cookie = read('public/js/cookie-banner.js');
    assert.match(cookie, /MetaAppEvents\.onConsentGranted/);
    assert.match(cookie, /MetaAppEvents\.onConsentRevoked/);
  });

  it('child-login only emits via server meta_milestones', () => {
    const src = read('public/js/child-login.js');
    assert.match(src, /MetaAppEvents\.handleServerMilestones/);
  });

  it('handoff preview does not call child access Meta event', () => {
    const handoff = read('public/js/onboarding-activation.js');
    assert.doesNotMatch(handoff, /trackChildAccessCompleted/);
  });

  it('privacy plugin patch is wired into cap sync and verify step', () => {
    const pkg = read('package.json');
    assert.match(pkg, /patch-capacitor-facebook-events-privacy\.mjs/);
    assert.match(pkg, /verify-capacitor-facebook-events-privacy\.mjs/);
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/ios/FacebookEvents.swift.patched')));
    assert.ok(fs.existsSync(path.join(ROOT, 'scripts/android/FacebookEventsPlugin.java.patched')));
  });

  it('verify script passes on patched plugin', () => {
    const { spawnSync } = require('node:child_process');
    // --apply first: CI npm ci installs upstream plugin without our privacy patch.
    const r = spawnSync(
      process.execPath,
      ['scripts/verify-capacitor-facebook-events-privacy.mjs', '--apply'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      }
    );
    assert.equal(r.status, 0, (r.stderr || r.stdout || '').trim());
  });
});
