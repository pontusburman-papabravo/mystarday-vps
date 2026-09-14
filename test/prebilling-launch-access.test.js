'use strict';

/**
 * IE/FI prebilling launch access — market matrix + paid-start transition.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateSignupCompleteness } = require('../src/lib/market-launch-invariants');
const {
  isFamilyEligibleForGrandfathering,
  isFamilyEligibleForPrebillingAccess,
  isPrebillingAccessActive,
  DEFAULT_PAYMENT_START_AT,
  MARKET_PAYMENT_START_AT_KEYS,
} = require('../src/lib/payment-settings');
const { setupTestDb } = require('./helpers/setup.js');
const { enablePublicBillingForTest, disablePublicBillingForTest } = require('./helpers/public-billing');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');

const SE_START = DEFAULT_PAYMENT_START_AT;
const IE_FI_START = '2026-10-15T00:00:00+02:00';
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
    lifetimeFreeUntil: '2026-09-14T00:00:00+02:00',
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
  it('grandfather-eligible pre-lifetime-cutoff with billing OFF', () => {
    const r = signup('SE', { open: true, billing: false, now: BEFORE, start: SE_START });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'grandfather_eligible');
  });

  it('post-lifetime-cutoff with billing OFF is intro year', () => {
    const r = signup('SE', { open: true, billing: false, now: AFTER_SE, start: SE_START });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'intro_year');
  });

  it('post-lifetime-cutoff with billing ON is still intro year', () => {
    const r = signup('SE', { open: true, billing: true, now: AFTER_SE, start: SE_START });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'intro_year');
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

    it(`${code} open + before lifetime cutoff + billing OFF`, () => {
      const r = signup(code, { open: true, billing: false, now: BEFORE, start: IE_FI_START });
      assert.equal(r.allowed, true);
      assert.equal(r.reason, 'grandfather_eligible');
    });

    it(`${code} open + before lifetime cutoff + billing ON`, () => {
      const r = signup(code, { open: true, billing: true, now: BEFORE, start: IE_FI_START });
      assert.equal(r.allowed, true);
      assert.equal(r.reason, 'grandfather_eligible');
    });

    it(`${code} open + after payment_start + billing OFF`, () => {
      const r = signup(code, { open: true, billing: false, now: AFTER_IE_FI, start: IE_FI_START });
      assert.equal(r.allowed, false);
      assert.equal(r.code, 'MARKET_BILLING_NOT_READY');
    });

    it(`${code} open + after payment_start + billing ON`, () => {
      const r = signup(code, { open: true, billing: true, now: AFTER_IE_FI, start: IE_FI_START });
      assert.equal(r.allowed, true);
      assert.equal(r.reason, 'trial');
    });
  }
});

describe('eligibility isolation', () => {
  it('grandfathers IE/FI registered before lifetime cutoff', () => {
    for (const code of ['IE', 'FI']) {
      assert.equal(isFamilyEligibleForGrandfathering({
        countryCode: code, createdAt: CREATED_LAUNCH, lifetimeFreeUntil: '2026-09-14T00:00:00+02:00',
      }), true);
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
    '../src/lib/iap-paid-rollout',
    '../src/lib/market-launch-invariants',
    '../db/family-entitlements',
    '../src/lib/payment-settings',
    '../src/lib/market-commercial-policy',
    '../src/lib/payment-audit',
    '../src/lib/family-entitlements',
  ]) {
    delete require.cache[require.resolve(mod)];
  }

  const runtimeDb = require('../src/lib/db');
  const appSettings = require('../db/app-settings');
  await appSettings.upsertSetting('payment_start_at', SE_START);
  await appSettings.upsertSetting('lifetime_free_until', '2026-09-14T00:00:00+02:00');
  await appSettings.upsertSetting('market_ie_payment_start_at', IE_FI_START);
  await appSettings.upsertSetting('market_fi_payment_start_at', IE_FI_START);

  const {
    resolveFamilyEntitlements,
    grantGrandfatheredOnCreate,
    applyStoreEntitlementFromWebhook,
    syncCreatedFamilyAccessMirrors,
  } = require('../src/lib/family-entitlements');

  async function createFamily(createdAtIso, countryCode) {
    const timezone = countryCode === 'IE'
      ? 'Europe/Dublin'
      : countryCode === 'FI'
        ? 'Europe/Helsinki'
        : 'Europe/Stockholm';
    const { rows } = await runtimeDb.query(
      `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region, timezone)
       VALUES ($1, 'none', false, $2::timestamptz, $3, 'EU', $4)
       RETURNING id, created_at, country_code, timezone`,
      [`Prebilling ${countryCode}`, createdAtIso, countryCode, timezone]
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

  await t.test('SE post-cutoff family gets intro year', async () => {
    const family = await createFamily(CREATED_SE_POST, 'SE');
    await syncCreatedFamilyAccessMirrors(family.id, family.created_at, 'SE');
    const resolved = await resolveFamilyEntitlements(family.id, AFTER_SE);
    assert.equal(resolved.premium.active, true);
    assert.equal(resolved.premium.source, 'intro_year');
    assert.equal(resolved.requires_paywall, false);
    assert.equal(resolved.access_kind, 'intro_year');
  });

  for (const code of ['IE', 'FI']) {
    await t.test(`${code} launch family registered before 14 Sep is grandfathered forever`, async () => {
      const family = await createFamily(CREATED_LAUNCH, code);
      const created = await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      assert.equal(created.kind, 'grandfathered');

      const before = await resolveFamilyEntitlements(family.id, BEFORE);
      assert.equal(before.premium.active, true);
      assert.equal(before.premium.source, 'grandfathered');
      assert.equal(before.premium.is_grandfathered, true);
      assert.equal(before.requires_paywall, false);

      const afterBillingOff = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
      assert.equal(afterBillingOff.premium.source, 'grandfathered');
      assert.equal(afterBillingOff.requires_paywall, false);

      const billingSnap = await enablePublicBillingForTest();
      try {
        const afterBillingOn = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
        assert.equal(afterBillingOn.premium.active, true);
        assert.equal(afterBillingOn.premium.source, 'grandfathered');
        assert.equal(afterBillingOn.requires_paywall, false);
        assert.equal(afterBillingOn.access_kind, 'grandfathered');
      } finally {
        await disablePublicBillingForTest(billingSnap);
      }

      const fam = await runtimeDb.query(
        'SELECT is_lifetime_free, subscription_status FROM family WHERE id = $1',
        [family.id]
      );
      assert.equal(fam.rows[0].is_lifetime_free, true);
    });

    await t.test(`${code} store webhook skips grandfathered launch families`, async () => {
      const family = await createFamily(CREATED_LAUNCH, code);
      await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      const result = await applyStoreEntitlementFromWebhook(family.id, {
        subscriptionStatus: 'active',
        eventType: 'INITIAL_PURCHASE',
        event: { id: `evt_${code.toLowerCase()}`, period_type: 'NORMAL', store: 'APP_STORE' },
        productId: STORE_PRODUCT_MONTHLY,
        expirationAtMs: Date.now() + 7 * 86400000,
      });
      assert.equal(result.skipped, true);
      const resolved = await resolveFamilyEntitlements(family.id, BEFORE);
      assert.equal(resolved.premium.source, 'grandfathered');
      assert.equal(resolved.access_kind, 'grandfathered');
    });

    await t.test(`${code} family created after lifetime cutoff gets 14-day trial, not intro year`, async () => {
      const family = await createFamily(CREATED_IE_POST, code);
      const created = await syncCreatedFamilyAccessMirrors(family.id, family.created_at, code);
      assert.equal(created.kind, 'trial');
      const resolved = await resolveFamilyEntitlements(family.id, AFTER_IE_FI);
      assert.equal(resolved.premium.active, true);
      assert.equal(resolved.access_kind, 'trial');
      assert.equal(resolved.requires_paywall, false);
      assert.equal(resolved.premium.source, 'trial');
      const intro = await runtimeDb.query(
        `SELECT 1 FROM family_entitlements WHERE family_id = $1 AND source = 'intro_year' AND revoked_at IS NULL`,
        [family.id]
      );
      assert.equal(intro.rowCount, 0);
      const { trialEndsAt } = require('../src/lib/market-commercial-policy');
      const ends = trialEndsAt(family.created_at, {
        countryCode: code,
        timeZone: family.timezone,
      });
      const almost = new Date(ends.getTime() - 1000);
      const stillTrial = await resolveFamilyEntitlements(family.id, almost);
      assert.equal(stillTrial.access_kind, 'trial');
      assert.equal(stillTrial.requires_paywall, false);
      const expired = await resolveFamilyEntitlements(family.id, ends);
      assert.equal(expired.premium.active, false);
      assert.equal(expired.requires_paywall, true);
      assert.equal(expired.access_kind, 'limited');
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
