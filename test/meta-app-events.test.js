'use strict';

const { describe, it, beforeEach } = require('node:test');
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
  const facebookPlugin = {
    setAdvertiserTrackingEnabled: async ({ enabled }) => {
      logged.push({ type: 'ate', enabled });
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
    },
    Capacitor: {
      isNativePlatform: () => overrides.native !== false,
      getPlatform: () => overrides.platform || 'ios',
      Plugins: {
        FacebookEvents: overrides.missingPlugin ? undefined : facebookPlugin,
        AppTrackingTransparency: {
          getStatus: async () => ({ status: overrides.attStatus || 'authorized' }),
          requestPermission: async () => ({ status: overrides.attStatus || 'authorized' }),
        },
      },
    },
    Platform: {
      isNative: () => overrides.native !== false,
      isIOS: () => (overrides.platform || 'ios') === 'ios',
      isAndroid: () => overrides.platform === 'android',
    },
    MarketingEvents: {
      hasMarketingConsent: () => overrides.consent !== false,
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
    document: {
      querySelector: () => null,
    },
    console,
  };
  vm.runInNewContext(SRC, context);
  return {
    MetaAppEvents: context.window.MetaAppEvents,
    logged,
    store,
    window,
  };
}

describe('MetaAppEvents abstraction', () => {
  beforeEach(() => {
    // no shared state between loads
  });

  it('exposes the required track helpers', () => {
    const { MetaAppEvents } = loadMeta();
    assert.equal(typeof MetaAppEvents.trackRegistrationCompleted, 'function');
    assert.equal(typeof MetaAppEvents.trackFirstScheduleSaved, 'function');
    assert.equal(typeof MetaAppEvents.trackChildAccessCompleted, 'function');
    assert.equal(typeof MetaAppEvents.trackFirstStarEarned, 'function');
  });

  it('CompleteRegistration fires once after registration', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    const events = logged.filter((e) => e.type === 'event');
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'fb_mobile_complete_registration');
    assert.equal(events[0].params.fb_registration_method, 'email');
  });

  it('TutorialCompletion fires for first schedule save', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true });
    await MetaAppEvents.trackFirstScheduleSaved({ flow: 'wizard' });
    const events = logged.filter((e) => e.type === 'event');
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'fb_mobile_tutorial_completion');
    assert.equal(events[0].params.flow, 'wizard');
  });

  it('child_access_completed only via verified milestone handle', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true });
    MetaAppEvents.handleServerMilestones({});
    MetaAppEvents.handleServerMilestones({ child_access_completed: false });
    assert.equal(logged.filter((e) => e.type === 'event').length, 0);

    MetaAppEvents.handleServerMilestones({ child_access_completed: true, flow: 'child_login' });
    await new Promise((r) => setTimeout(r, 20));
    const events = logged.filter((e) => e.type === 'event' && e.event === 'child_access_completed');
    assert.equal(events.length, 1);
    assert.equal(events[0].params.flow, 'child_login');
  });

  it('preview/test mode does not send child_access_completed without server flag', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true });
    // Parent preview / handoff must not invent the event client-side.
    assert.equal(typeof MetaAppEvents.trackChildAccessCompleted, 'function');
    MetaAppEvents.handleServerMilestones({ preview: true, source: 'handoff_film' });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(logged.filter((e) => e.event === 'child_access_completed').length, 0);
  });

  it('first_star_earned is idempotent', async () => {
    const { MetaAppEvents, logged } = loadMeta({ force: true });
    MetaAppEvents.handleServerMilestones({ first_star_earned: true, flow: 'child_complete' });
    MetaAppEvents.handleServerMilestones({ first_star_earned: true, flow: 'child_complete' });
    await MetaAppEvents.trackFirstStarEarned({ flow: 'child_complete' });
    await new Promise((r) => setTimeout(r, 20));
    const events = logged.filter((e) => e.event === 'first_star_earned');
    assert.equal(events.length, 1);
  });

  it('Meta errors never throw into the caller', async () => {
    const { MetaAppEvents, window } = loadMeta({ force: true });
    window.Capacitor.Plugins.FacebookEvents.logEvent = async () => {
      throw new Error('native boom');
    };
    await assert.doesNotReject(() => MetaAppEvents.trackRegistrationCompleted({ method: 'apple' }));
  });

  it('does not send on local host unless explicitly enabled', async () => {
    const { MetaAppEvents, logged } = loadMeta({ hostname: 'localhost', consent: true, native: true });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'email' });
    assert.equal(logged.filter((e) => e.type === 'event').length, 0);
  });

  it('does not send without marketing consent', async () => {
    const { MetaAppEvents, logged } = loadMeta({ consent: false, force: true });
    // force enables host, but consent still required
    await MetaAppEvents.trackFirstScheduleSaved({ flow: 'wizard' });
    assert.equal(logged.filter((e) => e.type === 'event').length, 0);
  });

  it('strips forbidden PII/identifier params', () => {
    const { MetaAppEvents } = loadMeta({ force: true });
    const cleaned = MetaAppEvents._internal.sanitizeParams({
      email: 'a@b.c',
      family_id: 'fam-1',
      childId: 'child-1',
      activity_name: 'Borsta tänderna',
      flow: 'wizard',
      platform: 'ios',
    });
    assert.equal(cleaned.email, undefined);
    assert.equal(cleaned.family_id, undefined);
    assert.equal(cleaned.childId, undefined);
    assert.equal(cleaned.activity_name, undefined);
    assert.equal(cleaned.flow, 'wizard');
  });

  it('skips entirely when not native', async () => {
    const { MetaAppEvents, logged } = loadMeta({ native: false, force: true });
    await MetaAppEvents.trackRegistrationCompleted({ method: 'google' });
    assert.equal(logged.length, 0);
  });
});

describe('Meta App Events wiring contracts', () => {
  function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  }

  it('marketing-events uses MetaAppEvents on native and Pixel on web', () => {
    assert.match(MARKETING_SRC, /MetaAppEvents\.trackRegistrationCompleted/);
    assert.match(MARKETING_SRC, /isNativeApp/);
    assert.match(MARKETING_SRC, /CompleteRegistration/);
  });

  it('child-login only emits via server meta_milestones', () => {
    const src = read('public/js/child-login.js');
    assert.match(src, /MetaAppEvents\.handleServerMilestones/);
    assert.doesNotMatch(src, /trackChildAccessCompleted\(\s*\{/);
  });

  it('onboarding/handoff preview does not call child access Meta event directly', () => {
    const handoff = read('public/js/onboarding-activation.js');
    assert.doesNotMatch(handoff, /trackChildAccessCompleted/);
    assert.doesNotMatch(handoff, /child_access_completed/);
    const deprecated = read('src/routes/onboarding.js');
    const block = deprecated.slice(
      deprecated.indexOf("router.post('/child-access-complete'"),
      deprecated.indexOf("router.post('/complete'")
    );
    assert.match(block, /deprecated: true/);
    assert.doesNotMatch(block, /meta_milestones/);
  });

  it('server returns meta_milestones for verified first writes', () => {
    const onboarding = read('src/routes/onboarding.js');
    assert.match(onboarding, /tutorial_completion/);
    assert.match(onboarding, /recordActivationMilestone/);

    const childLogin = read('src/routes/auth/child-login.js');
    assert.match(childLogin, /child_access_completed/);
    assert.match(childLogin, /recordActivationMilestone/);

    const childSelf = read('src/routes/daily-logs/child-self.js');
    assert.match(childSelf, /first_star_earned/);
    assert.match(childSelf, /maybeRecordFirstCompletion/);
  });

  it('native config scripts pin Meta App ID and keep IAP auto-log note', () => {
    const ios = read('scripts/patch-ios-facebook-sdk.mjs');
    const android = read('scripts/patch-android-facebook-sdk.mjs');
    assert.match(ios, /27941105858861495/);
    assert.match(android, /27941105858861495/);
    assert.match(ios, /In-App Purchase/);
    assert.match(android, /IAP auto-log OFF/);
  });
});
