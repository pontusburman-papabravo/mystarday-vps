'use strict';

/**
 * IE/FI prebilling launch access — market matrix + paid-start transition.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateSignupCompleteness, BILLING_NOT_READY_CODE } = require('../src/lib/market-launch-invariants');
const {
  isFamilyEligibleForGrandfathering,
  isFamilyEligibleForPrebillingAccess,
  isPrebillingAccessActive,
  DEFAULT_PAYMENT_START_AT,
  DEFAULT_PREBILLING_PAYMENT_START_AT,
  MARKET_PAYMENT_START_AT_KEYS,
} = require('../src/lib/payment-settings');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { enablePublicBillingForTest, disablePublicBillingForTest } = require('./helpers/public-billing');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');

const SE_START = DEFAULT_PAYMENT_START_AT;
const IE_FI_START = DEFAULT_PREBILLING_PAYMENT_START_AT;
const BEFORE = new Date('2026-09-01T00:00:00+02:00');
const ON_IE_FI_START = new Date('2026-10-15T00:00:00+02:00');
const AFTER_IE_FI = new Date('2026-10-16T00:00:00+02:00');
const AFTER_SE = new Date('2026-10-02T00:00:00+02:00');
const CREATED_LAUNCH = '2026-09-01T00:00:00+02:00';
const CREATED_SE_POST = '2026-10-02T00:00:00+02:00';
const CREATED_IE_POST = '2026-10-16T00:00:00+02:00';

function signup(countryCode, { open, billing, now, start }) {
  return evaluateSignupCompleteness({
    countryCode,
    marketOpen: open,
    publicBillingUsable: billing,
    paymentStartAt: start,
    now,
  });
}

describe('canonical payment-start keys', () => {
  it('keeps Swedish payment_start_at separate from IE/FI market keys', () => {
    assert.equal(MARKET_PAYMENT_START_AT_KEYS.IE, 'market_ie_payment_start_at');
    assert.equal(MARKET_PAYMENT_START_AT_KEYS.FI, 'market_fi_payment_start_at');
    assert.notEqual(SE_START, IE_FI_START);
  });
});

describe('Sweden signup matrix', () => {
  it('grandfather-eligible pre-cutoff with billing OFF', () => {
    const r = signup('SE', { open: true, billing: false, now: BEFORE, start: SE_START });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'grandfather_eligible');
  });

  it('post-cutoff with billing OFF is rejected', () => {
    const r = signup('SE', { open: true, billing: false, now: AFTER_SE, start: SE_START });
    assert.equal(r.allowed, false);
    assert.equal(r.code, BILLING_NOT_READY_CODE);
  });

  it('post-cutoff with billing ON is allowed', () => {
    const r = signup('SE', { open: true, billing: true, now: AFTER_SE, start: SE_START });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'billing_usable');
  });
});

describe('Ireland + Finland signup matrix', () => {
  for (const code of ['IE', 'FI']) {
    it(`${code} closed + billing OFF`, () => {
      const r = signup(code, { open: false, billing: false, now: BEFORE, start: IE_FI_START });
      assert.equal(r.allowed, false);
      assert.match(r.code, /CLOSED/);
    });

    it(`${code} closed + billing ON`, () => {
      const r = signup(code, { open: false, billing: true, now: BEFORE, start: IE_FI_START });
      assert.equal(r.allowed, false);
      assert.match(r.code, /CLOSED/);
    });

    it(`${code} open + prebilling window + billing OFF`, () => {
      const r = signup(code, { open: true, billing: false, now: BEFORE, start: IE_FI_START });
      assert.equal(r.allowed, true);
      assert.equal(r.reason, 'prebilling_launch_access');
    });

    it(`${code} open + prebilling window + billing ON`, () => {
      const r = signup(code, { open: true, billing: true, now: BEFORE, start: IE_FI_START });
      assert.equal(r.allowed, true);
      assert.equal(r.reason, 'prebilling_launch_access');
    });

    it(`${code} open + after payment_start + billing OFF`, () => {
      const r = signup(code, { open: true, billing: false, now: AFTER_IE_FI, start: IE_FI_START });
      assert.equal(r.allowed, false);
      assert.equal(r.code, BILLING_NOT_READY_CODE);
    });

    it(`${code} open + after payment_start + billing ON`, () => {
      const r = signup(code, { open: true, billing: true, now: AFTER_IE_FI, start: IE_FI_START });
      assert.equal(r.allowed, true);
      assert.equal(r.reason, 'billing_usable');
    });
  }
});

describe('eligibility isolation', () => {
  it('never grandfathers IE/FI', () => {
    for (const code of ['IE', 'FI']) {
      assert.equal(isFamilyEligibleForGrandfathering({
        countryCode: code, createdAt: CREATED_LAUNCH, paymentStartAt: SE_START,
      }), false);
      assert.equal(isFamilyEligibleForPrebillingAccess({
        countryCode: code, createdAt: CREATED_LAUNCH, paymentStartAt: IE_FI_START,
      }), true);
    }
  });

  it('never grants prebilling to Sweden', () => {
    assert.equal(isFamilyEligibleForPrebillingAccess({
      countryCode: 'SE', createdAt: CREATED_LAUNCH, paymentStartAt: IE_FI_START,
    }), false);
  });

  it('holds prebilling after cutoff only while billing is unusable', () => {
    const base = {
      countryCode: 'IE',
      createdAt: CREATED_LAUNCH,
      paymentStartAt: IE_FI_START,
    };
    assert.equal(isPrebillingAccessActive({ ...base, now: BEFORE, publicBillingUsable: false }), true);
    assert.equal(isPrebillingAccessActive({ ...base, now: ON_IE_FI_START, publicBillingUsable: false }), true);
    assert.equal(isPrebillingAccessActive({ ...base, now: AFTER_IE_FI, publicBillingUsable: false }), true);
    assert.equal(isPrebillingAccessActive({ ...base, now: ON_IE_FI_START, publicBillingUsable: true }), false);
    assert.equal(isPrebillingAccessActive({ ...base, now: AFTER_IE_FI, publicBillingUsable: true }), false);
    assert.equal(isPrebillingAccessActive({
      ...base, createdAt: CREATED_IE_POST, now: AFTER_IE_FI, publicBillingUsable: false,
    }), false);
  });
});

test('resolver + API transition matrix', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const appSettings = require('../db/app-settings');
  await appSettings.upsertSetting('payment_start_at', SE_START);
  await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
  await appSettings.upsertSetting('market_fi_payment_start_at', IE_FI_START);

  const {
    resolveFamilyEntitlements,
    grantGrandfatheredOnCreate,
    applyStoreEntitlementFromWebhook,
    syncCreatedFamilyAccessMirrors,
  } = require('../src/lib/family-entitlements');

  async function createFamily(createdAtIso, countryCode) {
    const { rows } = await db.query(
      `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
       VALUES ($1, 'none', false, $2::timestamptz, $3, 'EU')
       RETURNING id, created_at, country_code`,
      [`Prebilling ${countryCode}`, createdAtIso, countryCode]
    );
    return rows[0];
  }

  await t.test('SE grandfathered family stays permanent', async () => {
    const family = await createFamily(CREATED_LAUNCH, 'SE');
    await grantGrandfatheredOnCreate(family.id, family.created_at, { countryCode: 'SE' });
    const before = await resolveFamilyEntitlements(family.id, BEFORE);
    const after = await resolveFamilyEntitlements(family.id, AFTER_SE);
    assert.equal(before.premium.source, 'grandfathered');
    assert.equal(after.premium.source, 'grandfathered');
    assert.equal(after.premium.is_grandfathered, true);
    const fam = await db.query('SELECT is_lifetime_free FROM family WHERE id = $1', [family.id]);
    assert.equal(fam.rows[0].is_lifetime_free, true);
  });

  await t.test('SE post-cutoff family is limited until paid', async () => {
    const family = await createFamily(CREATED_SE_POST, 'SE');
    await syncCreatedFamilyAccessMirrors(family.id, family.created_at, 'SE');
    const resolved = await resolveFamilyEntitlements(family.id, AFTER_SE);
    assert.equal(resolved.premium.active, false);
    assert.equal(resolved.requires_paywall, true);
    assert.equal(resolved.access_kind, 'limited');
  });

  for (const code of ['IE', 'FI']) {
    await t.test(`${code} launch family: access before / on / after payment start`, async () => {
      const family = await createFamily(CREATED_LAUNCH, code);
      const created = await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      assert.equal(created.kind, 'prebilling');

      const before = await resolveFamilyEntitlements(family.id, BEFORE);
      assert.equal(before.premium.active, true);
      assert.equal(before.premium.source, 'prebilling');
      assert.equal(before.premium.is_grandfathered, false);
      assert.equal(before.requires_paywall, false);
      assert.ok(before.premium.expires_at);

      const onStartBillingOff = await resolveFamilyEntitlements(family.id, ON_IE_FI_START);
      assert.equal(onStartBillingOff.premium.source, 'prebilling');
      assert.equal(onStartBillingOff.requires_paywall, false);

      const afterBillingOff = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
      assert.equal(afterBillingOff.premium.source, 'prebilling');
      assert.equal(afterBillingOff.requires_paywall, false);

      const billingSnap = await enablePublicBillingForTest();
      try {
        const afterBillingOn = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
        assert.equal(afterBillingOn.premium.active, false);
        assert.equal(afterBillingOn.premium.source, 'none');
        assert.equal(afterBillingOn.requires_paywall, true);
        assert.equal(afterBillingOn.access_kind, 'limited');
      } finally {
        await disablePublicBillingForTest(billingSnap);
      }

      const fam = await db.query(
        'SELECT is_lifetime_free, subscription_status FROM family WHERE id = $1',
        [family.id]
      );
      assert.equal(fam.rows[0].is_lifetime_free, false);
      assert.equal(fam.rows[0].subscription_status, 'none');
    });

    await t.test(`${code} store entitlement wins over computed prebilling`, async () => {
      const family = await createFamily(CREATED_LAUNCH, code);
      await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      await applyStoreEntitlementFromWebhook(family.id, {
        subscriptionStatus: 'active',
        eventType: 'INITIAL_PURCHASE',
        event: { id: `evt_${code.toLowerCase()}`, period_type: 'NORMAL', store: 'APP_STORE' },
        productId: STORE_PRODUCT_MONTHLY,
        expirationAtMs: Date.now() + 7 * 86400000,
      });
      const resolved = await resolveFamilyEntitlements(family.id, BEFORE);
      assert.equal(resolved.premium.active, true);
      assert.equal(resolved.premium.source, 'apple');
      assert.equal(resolved.premium.is_grandfathered, false);
      assert.equal(resolved.access_kind, 'paid');
    });
  }

  await t.test('IE limited parent gets intentional 402 paywall, child /api/me stays open', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    process.env.RATE_LIMIT_ENABLED = 'false';
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
    }

    const pg = require('../src/lib/db');
    await pg.query(
      `INSERT INTO feature_flag (key, enabled, description)
       VALUES ('market_ie_open', true, 'prebilling matrix')
       ON CONFLICT (key) DO UPDATE SET enabled = true`
    );
    await appSettings.upsertSetting('market_ie_payment_start_at', '2026-01-01T00:00:00+02:00');
    const billingSnap = await enablePublicBillingForTest();
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const email = `prebilling-ie-${Date.now()}@example.com`;
      const registerRes = await fetch(`${http.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'IE Parent',
          email,
          password: 'testpass123',
          country_code: 'IE',
          preferred_locale: 'en-GB',
        }),
      });
      assert.equal(registerRes.status, 201, await registerRes.text());

      const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'testpass123' }),
      });
      const loginText = await loginRes.text();
      assert.equal(loginRes.status, 200, loginText);
      const loginBody = JSON.parse(loginText);
      let cookies = {};
      for (const header of getSetCookieHeaders(loginRes)) {
        cookies = mergeCookies(cookies, [header]);
      }
      const headers = {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(cookies),
        'X-CSRF-Token': loginBody.csrfToken,
      };

      const childrenRes = await fetch(`${http.baseUrl}/api/children`, { headers });
      assert.equal(childrenRes.status, 402);
      const childrenBody = await childrenRes.json();
      assert.equal(childrenBody.code, 'PREMIUM_REQUIRED');
      assert.equal(childrenBody.paywall_url, '/paywall');
      assert.equal(childrenBody.limited_account, true);

      const iapRes = await fetch(`${http.baseUrl}/api/subscription/status`, { headers });
      assert.equal(iapRes.status, 200);
      const iapBody = await iapRes.json();
      assert.equal(iapBody.requires_paywall, true);

      const childRes = await fetch(`${http.baseUrl}/api/onboarding/child`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Aoife', emoji: '🌟', birthday: '2018-05-01' }),
      });
      const childText = await childRes.text();
      assert.equal(childRes.status, 201, childText);
      const childBody = JSON.parse(childText);

      const childLoginRes = await fetch(`${http.baseUrl}/api/auth/child-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: childBody.username, pin: childBody.pin }),
      });
      assert.equal(childLoginRes.status, 200, await childLoginRes.text());
      let childCookies = {};
      for (const header of getSetCookieHeaders(childLoginRes)) {
        childCookies = mergeCookies(childCookies, [header]);
      }
      const dailyRes = await fetch(`${http.baseUrl}/api/me/daily-log`, {
        headers: { Cookie: cookieHeader(childCookies) },
      });
      assert.equal(dailyRes.status, 200, await dailyRes.text());
    } finally {
      await pg.query(
        `INSERT INTO feature_flag (key, enabled, description)
         VALUES ('market_ie_open', false, 'prebilling matrix')
         ON CONFLICT (key) DO UPDATE SET enabled = false`
      );
      await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
      await disablePublicBillingForTest(billingSnap);
      await http.close();
    }
  });

  await db.cleanup();
});
