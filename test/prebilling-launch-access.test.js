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

  for (const mod of [
    '../src/lib/db',
    '../db/app-settings',
    '../src/lib/billing-ui',
    '../db/family-entitlements',
    '../src/lib/payment-settings',
    '../src/lib/payment-audit',
    '../src/lib/family-entitlements',
  ]) {
    delete require.cache[require.resolve(mod)];
  }

  const runtimeDb = require('../src/lib/db');
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
    const { rows } = await runtimeDb.query(
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
    const fam = await runtimeDb.query('SELECT is_lifetime_free FROM family WHERE id = $1', [family.id]);
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

      const fam = await runtimeDb.query(
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

    await t.test(`${code} cancellation keeps paid until expiry, then returns to prebilling in-window`, async () => {
      const family = await createFamily(CREATED_LAUNCH, code);
      await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      await applyStoreEntitlementFromWebhook(family.id, {
        subscriptionStatus: 'active',
        eventType: 'INITIAL_PURCHASE',
        event: { id: `evt_${code.toLowerCase()}_buy`, period_type: 'NORMAL', store: 'APP_STORE' },
        productId: STORE_PRODUCT_MONTHLY,
        expirationAtMs: Date.now() + 7 * 86400000,
      });

      await applyStoreEntitlementFromWebhook(family.id, {
        subscriptionStatus: 'active',
        eventType: 'CANCELLATION',
        event: { id: `evt_${code.toLowerCase()}_cancel`, period_type: 'NORMAL', store: 'APP_STORE' },
        productId: STORE_PRODUCT_MONTHLY,
        expirationAtMs: Date.now() + 3 * 86400000,
      });
      const cancelled = await resolveFamilyEntitlements(family.id, BEFORE);
      assert.equal(cancelled.premium.source, 'apple');
      assert.equal(cancelled.access_kind, 'paid');
      assert.equal(cancelled.premium.is_grandfathered, false);

      await applyStoreEntitlementFromWebhook(family.id, {
        subscriptionStatus: 'expired',
        eventType: 'EXPIRATION',
        event: { id: `evt_${code.toLowerCase()}_exp`, period_type: 'NORMAL', store: 'APP_STORE' },
        productId: STORE_PRODUCT_MONTHLY,
        expirationAtMs: Date.now() - 1000,
      });
      const expiredInWindow = await resolveFamilyEntitlements(family.id, BEFORE);
      assert.equal(expiredInWindow.premium.source, 'prebilling');
      assert.equal(expiredInWindow.access_kind, 'prebilling');
      assert.equal(expiredInWindow.requires_paywall, false);
      assert.equal(expiredInWindow.premium.is_grandfathered, false);

      const heldAfterCutoff = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
      assert.equal(heldAfterCutoff.premium.source, 'prebilling');
      assert.equal(heldAfterCutoff.requires_paywall, false);

      const billingSnap = await enablePublicBillingForTest();
      try {
        const afterPaidStart = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
        assert.equal(afterPaidStart.premium.active, false);
        assert.equal(afterPaidStart.premium.source, 'none');
        assert.equal(afterPaidStart.access_kind, 'limited');
        assert.equal(afterPaidStart.requires_paywall, true);
        const fam = await runtimeDb.query(
          'SELECT is_lifetime_free FROM family WHERE id = $1',
          [family.id]
        );
        assert.equal(fam.rows[0].is_lifetime_free, false);
      } finally {
        await disablePublicBillingForTest(billingSnap);
      }
    });

    await t.test(`${code} family created after paid-start never gets computed prebilling`, async () => {
      const family = await createFamily(CREATED_IE_POST, code);
      const created = await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      assert.equal(created.kind, 'limited');
      const resolved = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
      assert.equal(resolved.premium.active, false);
      assert.equal(resolved.access_kind, 'limited');
      assert.equal(resolved.requires_paywall, true);
      assert.notEqual(resolved.premium.source, 'prebilling');
      assert.notEqual(resolved.premium.source, 'grandfathered');
    });
  }

  await t.test('SE grandfather skip on store webhook is unchanged', async () => {
    const family = await createFamily(CREATED_LAUNCH, 'SE');
    await grantGrandfatheredOnCreate(family.id, family.created_at, { countryCode: 'SE' });
    const result = await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'expired',
      eventType: 'EXPIRATION',
      event: { id: 'evt_se_skip', period_type: 'NORMAL', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: Date.now() - 1000,
    });
    assert.equal(result.skipped, true);
    const resolved = await resolveFamilyEntitlements(family.id, AFTER_SE);
    assert.equal(resolved.premium.source, 'grandfathered');
    assert.equal(resolved.access_kind, 'grandfathered');
  });

  await db.cleanup();
});

describe('transition surfaces are explicit product policy', () => {
  const {
    isLimitedAccountPath,
    isChildLimitedAccountPath,
  } = require('../src/middleware/require-premium');
  const fs = require('node:fs');
  const path = require('node:path');

  it('parent restore + subscription status stay reachable after expiry', () => {
    assert.equal(isLimitedAccountPath('/api/iap/sync'), true);
    assert.equal(isLimitedAccountPath('/api/subscription/status'), true);
    assert.equal(isLimitedAccountPath('/api/auth/refresh'), true);
    assert.equal(isLimitedAccountPath('/api/children'), false);
    assert.equal(isLimitedAccountPath('/api/schedules'), false);
  });

  it('child first-star /api/me stays reachable; messages do not', () => {
    assert.equal(isChildLimitedAccountPath('/api/me/daily-log'), true);
    assert.equal(isChildLimitedAccountPath('/api/me/daily-log-items/x/complete'), true);
    assert.equal(isChildLimitedAccountPath('/api/subscription/status'), true);
    assert.equal(isChildLimitedAccountPath('/api/me/rewards'), false);
    assert.equal(isChildLimitedAccountPath('/api/me/garden'), false);
    assert.equal(isChildLimitedAccountPath('/api/messages'), false);
    assert.equal(isChildLimitedAccountPath('/api/children'), false);
    assert.equal(isChildLimitedAccountPath('/api/iap/sync'), false);
    assert.equal(isChildLimitedAccountPath('/api/family/delete-account'), false);
  });

  it('402/503 codes are declared, not accidental raw middleware', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/middleware/require-premium.js'), 'utf8');
    assert.match(src, /code: 'PREMIUM_REQUIRED'/);
    assert.match(src, /paywall_url: '\/paywall'/);
    assert.match(src, /limited_account: true/);
    assert.match(src, /status\(503\)/);
    const iap = fs.readFileSync(path.join(__dirname, '../src/routes/iap.js'), 'utf8');
    assert.match(iap, /RC_NOT_CONFIGURED/);
    assert.match(iap, /status\(503\)/);
    const status = fs.readFileSync(path.join(__dirname, '../src/routes/subscription.js'), 'utf8');
    assert.match(status, /access_kind/);
    assert.match(status, /requires_paywall/);
    assert.match(status, /upgrade_url/);
  });
});
