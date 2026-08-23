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
    assert.match(sub, /Premium permanent/);
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

  it('settings-subscription gates on subscription_ui_visible', () => {
    assert.match(SUB, /subscription_ui_visible/);
    assert.match(SUB, /native_purchase_eligible/);
    assert.doesNotMatch(SUB, /REVENUECAT_SANDBOX_FAMILY_IDS/);
    assert.doesNotMatch(SUB, /localStorage/);
  });
});

test('I: native purchase gate contract unchanged for non-sandbox family', async () => {
  const prevSandbox = process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  const prevFlag = process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
  process.env.REVENUECAT_SANDBOX_FAMILY_IDS = '11111111-1111-4111-8111-111111111111';
  process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = 'true';
  const r = await getNativePurchaseEligibility('22222222-2222-4222-8222-222222222222');
  assert.deepEqual(r, { allowed: false, reason: 'not_sandbox_family' });
  if (prevSandbox === undefined) delete process.env.REVENUECAT_SANDBOX_FAMILY_IDS;
  else process.env.REVENUECAT_SANDBOX_FAMILY_IDS = prevSandbox;
  if (prevFlag === undefined) delete process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED;
  else process.env.REVENUECAT_SANDBOX_PURCHASES_ENABLED = prevFlag;
});
