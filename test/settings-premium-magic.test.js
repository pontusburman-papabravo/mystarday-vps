'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { resolveSubscriptionUiVisibility } = require('../src/lib/subscription-ui-visibility');
const { getNativePurchaseEligibility } = require('../src/lib/iap-native-purchase-gate');

const ROOT = path.join(__dirname, '..');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function loadSubscriptionModule() {
  const code = fs.readFileSync(path.join(ROOT, 'public/js/settings-subscription.js'), 'utf8');
  return code;
}

describe('subscription UI visibility — server contract', () => {
  const prevBilling = process.env.BILLING_UI_DISABLED;
  const prevSandbox = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  const prevFlag = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;

  function restoreEnv() {
    if (prevBilling === undefined) delete process.env.BILLING_UI_DISABLED;
    else process.env.BILLING_UI_DISABLED = prevBilling;
    if (prevSandbox === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevSandbox;
    if (prevFlag === undefined) delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
    else process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = prevFlag;
  }

  it('A: billing UI off + normal family hides subscription UI', async () => {
    process.env.BILLING_UI_DISABLED = 'true';
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '11111111-1111-4111-8111-111111111111';
    process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
    const familyId = '22222222-2222-4222-8222-222222222222';
    const vis = await resolveSubscriptionUiVisibility(familyId, { active: false });
    assert.equal(vis.billing_ui_enabled, false);
    assert.equal(vis.native_purchase_eligible, false);
    assert.equal(vis.subscription_ui_visible, false);
    restoreEnv();
  });

  it('B: billing UI off + sandbox eligible family shows subscription UI', async () => {
    const familyId = '33333333-3333-4333-8333-333333333333';
    process.env.BILLING_UI_DISABLED = 'true';
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = familyId;
    process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
    const vis = await resolveSubscriptionUiVisibility(familyId, { active: false });
    assert.equal(vis.billing_ui_enabled, false);
    assert.equal(vis.native_purchase_eligible, true);
    assert.equal(vis.subscription_ui_visible, true);
    restoreEnv();
  });

  it('B2: normal family + billing UI on + payment enabled → native_purchase_eligible', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    const familyId = '66666666-6666-4666-8666-666666666666';
    delete process.env.BILLING_UI_DISABLED;
    process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '11111111-1111-4111-8111-111111111111';
    process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
    const appSettings = require('../db/app-settings');
    await appSettings.setPaymentEnabled(true);
    try {
      const vis = await resolveSubscriptionUiVisibility(familyId, { active: false });
      assert.equal(vis.billing_ui_enabled, true);
      assert.equal(vis.native_purchase_eligible, true);
      assert.equal(vis.subscription_ui_visible, true);
    } finally {
      await appSettings.setPaymentEnabled(false);
      restoreEnv();
      await db.cleanup();
    }
  });

  it('C: active premium makes subscription UI visible even when billing UI is off', async () => {
    process.env.BILLING_UI_DISABLED = 'true';
    const familyId = '44444444-4444-4444-8444-444444444444';
    const vis = await resolveSubscriptionUiVisibility(familyId, { active: true, is_grandfathered: true });
    assert.equal(vis.billing_ui_enabled, false);
    assert.equal(vis.subscription_ui_visible, true);
    restoreEnv();
  });

  it('D: grandfathered premium shows UI without activate CTA copy', () => {
    const sub = loadSubscriptionModule();
    assert.match(sub, /is_grandfathered/);
    assert.match(sub, /Premium ingår permanent/);
    assert.match(sub, /Din familj har full tillgång utan kostnad\./);
    assert.match(sub, /cta: null/);
  });
});

describe('subscription UI visibility — HTTP status', () => {
  const prevBilling = process.env.BILLING_UI_DISABLED;
  const prevSandbox = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  const prevFlag = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;

  function restoreEnv() {
    if (prevBilling === undefined) delete process.env.BILLING_UI_DISABLED;
    else process.env.BILLING_UI_DISABLED = prevBilling;
    if (prevSandbox === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
    else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevSandbox;
    if (prevFlag === undefined) delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
    else process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = prevFlag;
  }

  test('C/H: billing UI on + sandbox visibility without allowlist leak', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const secretId = '55555555-5555-4555-8555-555555555555';
    delete process.env.BILLING_UI_DISABLED;
    process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';

    const appSettings = require('../db/app-settings');
    await appSettings.setPaymentEnabled(true);

    const { createApp } = require('../app');
    const http = await listenApp(createApp);

    try {
      const session = await registerAndLogin(http.baseUrl);

      const billingOnRes = await fetch(`${http.baseUrl}/api/subscription/status`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(billingOnRes.status, 200);
      const billingOnBody = await billingOnRes.json();
      assert.equal(billingOnBody.billing_ui_enabled, true);
      assert.equal(billingOnBody.subscription_ui_visible, true);

      const meRes = await fetch(`${http.baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(meRes.status, 200);
      const me = await meRes.json();
      const familyId = me.familyId || me.family_id;
      assert.ok(familyId, 'expected family id from /api/auth/me');
      process.env.REVENUECAT_SANDBOX_FAMILY_IDS = `${secretId},${familyId}`;

      const sandboxRes = await fetch(`${http.baseUrl}/api/subscription/status`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(sandboxRes.status, 200);
      const sandboxBody = await sandboxRes.json();
      assert.equal(sandboxBody.native_purchase_eligible, true);
      assert.equal(sandboxBody.subscription_ui_visible, true);

      const raw = JSON.stringify(sandboxBody);
      assert.equal(raw.includes(secretId), false);
      assert.equal(raw.includes('REVENUECAT_SANDBOX_FAMILY_IDS'), false);
      assert.equal(Array.isArray(sandboxBody.sandbox_family_ids), false);
    } finally {
      await appSettings.setPaymentEnabled(false);
      restoreEnv();
      await http.close();
      await db.cleanup();
    }
  });
});

describe('settings premium magic — client wiring', () => {
  const HUBS = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-page-hubs.js'), 'utf8');
  const SUB = loadSubscriptionModule();

  it('E: eligible no-premium copy includes Aktivera Premium /paywall', () => {
    assert.match(SUB, /Aktivera Premium/);
    assert.match(SUB, /href: '\/paywall'/);
  });

  it('F/G: magic settings hub has premium group wired with server visibility fetch', () => {
    assert.match(HUBS, /PREMIUM_SETTINGS_GROUP/);
    assert.match(HUBS, /refreshSubscriptionMenuVisibility/);
    assert.match(HUBS, /subscription_ui_visible/);
    assert.match(HUBS, /id: 'premium'/);
    assert.match(HUBS, /data-settings-group="' \+ g\.id/);
    assert.match(HUBS, /tagChild\('prenumeration', 'premium'\)/);
    assert.match(HUBS, /showSettingsGroup\('premium'\)/);
    assert.match(HUBS, /SettingsSubscription\.render/);
    assert.match(HUBS, /returnToSettingsMenu/);
  });

  it('J: existing settings groups remain in base menu', () => {
    assert.match(HUBS, /SETTINGS_GROUPS_BASE/);
    assert.match(HUBS, /settings\.groups\.profile\.title/);
    assert.match(HUBS, /settings\.groups\.family\.title/);
    assert.match(HUBS, /settings\.groups\.appearance\.title/);
    assert.match(HUBS, /settings\.groups\.app\.title/);
  });

  // Regression: restoring purchases while Premium is already active left the
  // subscription card visually unchanged with zero feedback, making the button
  // look broken ("nothing happens"). A success alert was missing entirely — only
  // the failure paths showed one.
  it('restore purchases shows success feedback (not silent) when already active', () => {
    assert.match(SUB, /Köpet är återställt\. Premium är aktivt\./);
  });

  // Feedback uses the app's shared branded toast (toast.js) instead of a bare
  // browser alert() — falls back to alert() only when toast.js isn't loaded.
  it('restore/manage feedback uses showToast/showSuccessToast, not a bare alert()', () => {
    assert.match(SUB, /function notify\(/);
    assert.match(SUB, /window\.showSuccessToast/);
    assert.match(SUB, /window\.showToast\(msg, true\)/);
    assert.match(SUB, /notify\(t\('settings\.subscription\.restoreSuccess'/);
    assert.match(SUB, /notify\(result\.ok && !result\.active/);
  });

  it('settings-subscription gates on subscription_ui_visible', () => {
    assert.match(SUB, /subscription_ui_visible/);
    assert.match(SUB, /native_purchase_eligible/);
    assert.match(SUB, /await IAPManager\.init\(\)/);
    assert.match(SUB, /iapPurchaseReady/);
    assert.doesNotMatch(SUB, /REVENUECAT_SANDBOX_FAMILY_IDS/);
    assert.doesNotMatch(SUB, /localStorage/);
  });

  it('subscription-ui-visibility aligns with IAP config global rollout gate', () => {
    const vis = fs.readFileSync(path.join(ROOT, 'src/lib/subscription-ui-visibility.js'), 'utf8');
    assert.match(vis, /checkGlobalRollout:\s*true/);
  });
});

function loadSettingsSubscriptionHarness(options) {
  const callOrder = [];
  const mountEl = {
    innerHTML: '',
    closest() {
      return { classList: { add() {}, remove() {} } };
    },
  };
  const sandbox = {
    console,
    document: {
      readyState: 'loading',
      getElementById(id) {
        return id === 'subscriptionMount' ? mountEl : null;
      },
      addEventListener() {},
    },
    Auth: {
      api: async () => options.status,
    },
    Platform: {
      isNative() {
        return options.native !== false;
      },
    },
    IAPManager: {
      init: async () => {
        callOrder.push('init');
        if (options.initDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, options.initDelayMs));
        }
      },
      canPurchase() {
        callOrder.push('canPurchase');
        return options.canPurchase !== false;
      },
      restorePurchases: async () => ({ ok: false }),
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(ROOT, 'public/js/settings-subscription.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'settings-subscription.js' });
  return { sandbox, mountEl, callOrder };
}

describe('settings premium — IAP init sequencing', () => {
  it('eligible native family awaits IAPManager.init before canPurchase', async () => {
    const { sandbox, mountEl, callOrder } = loadSettingsSubscriptionHarness({
      native: true,
      canPurchase: true,
      status: {
        subscription_ui_visible: true,
        native_purchase_eligible: true,
        billing_ui_enabled: true,
        premium: { active: false },
      },
    });
    const result = await sandbox.SettingsSubscription.render(mountEl);
    assert.equal(result.visible, true);
    assert.deepEqual(callOrder, ['init', 'canPurchase']);
    assert.match(mountEl.innerHTML, /Återställ köp/);
    assert.match(mountEl.innerHTML, /Hantera abonnemang/);
  });

  // Regression: an active native (Apple/Google) subscription rendered "Hantera
  // abonnemang" twice — once as the primary CTA link (from describePremium()'s
  // default active-plan branch) and once as the manageSubscriptionBtn button in
  // the iapPurchaseReady block below it, both pointing at the exact same action.
  // Discovered during physical-device App Store sandbox E2E testing, right after
  // a real sandbox purchase completed.
  it('active native (apple) subscription renders "Hantera abonnemang" exactly once', async () => {
    const { sandbox, mountEl } = loadSettingsSubscriptionHarness({
      native: true,
      canPurchase: true,
      status: {
        subscription_ui_visible: true,
        native_purchase_eligible: true,
        billing_ui_enabled: false,
        premium: {
          active: true,
          source: 'apple',
          status: 'active',
          plan: 'yearly',
          is_grandfathered: false,
          trial: false,
          expires_at: '2026-08-29T14:37:57.000Z',
        },
      },
    });
    const result = await sandbox.SettingsSubscription.render(mountEl);
    assert.equal(result.visible, true);
    const manageMatches = mountEl.innerHTML.match(/Hantera abonnemang/g) || [];
    assert.equal(manageMatches.length, 1, `expected exactly one "Hantera abonnemang", got ${manageMatches.length}`);
    assert.doesNotMatch(mountEl.innerHTML, /id="subscriptionPrimaryCta"/);
    assert.match(mountEl.innerHTML, /id="manageSubscriptionBtn"/);
    assert.match(mountEl.innerHTML, /Återställ köp/);
  });

  it('ineligible native family does not call IAPManager.init', async () => {
    const { sandbox, mountEl, callOrder } = loadSettingsSubscriptionHarness({
      native: true,
      canPurchase: true,
      status: {
        subscription_ui_visible: true,
        native_purchase_eligible: false,
        billing_ui_enabled: true,
        premium: { active: true, is_grandfathered: true },
      },
    });
    const result = await sandbox.SettingsSubscription.render(mountEl);
    assert.equal(result.visible, true);
    assert.deepEqual(callOrder, []);
    assert.doesNotMatch(mountEl.innerHTML, /Återställ köp/);
  });
});

test('I: native purchase gate contract unchanged for non-sandbox family', async () => {
  const prevSandbox = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  const prevFlag = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
  process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '11111111-1111-4111-8111-111111111111';
  process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
  const familyId = '22222222-2222-4222-8222-222222222222';
  const withoutRollout = await getNativePurchaseEligibility(familyId);
  assert.deepEqual(withoutRollout, { allowed: false, reason: 'not_sandbox_family' });
  const iapConfig = fs.readFileSync(path.join(ROOT, 'src/routes/iap.js'), 'utf8');
  assert.match(iapConfig, /checkGlobalRollout:\s*true/);
  if (prevSandbox === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevSandbox;
  if (prevFlag === undefined) delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
  else process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = prevFlag;
});
