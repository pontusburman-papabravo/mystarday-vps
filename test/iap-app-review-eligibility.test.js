'use strict';

/**
 * App Review IAP path — ordinary families stay blocked; only an exact
 * allowlisted, non-grandfathered family may become native-purchase eligible.
 * Does not mutate live VPS env or create a live review family.
 */
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { getNativePurchaseEligibility } = require('../src/lib/iap-native-purchase-gate');
const { resolveSubscriptionUiVisibility } = require('../src/lib/subscription-ui-visibility');
const {
  APPLE_PRODUCT_MONTHLY,
  APPLE_PRODUCT_YEARLY,
  PACKAGE_MONTHLY,
  PACKAGE_YEARLY,
  OFFERING_ID,
} = require('../config/iap-product-contract');
const { DEFAULT_PAYMENT_START_AT } = require('../src/lib/payment-settings');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function withEnv(overrides, fn) {
  const prev = {};
  for (const key of Object.keys(overrides)) {
    prev[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(prev)) {
        if (prev[key] === undefined) delete process.env[key];
        else process.env[key] = prev[key];
      }
    });
}

describe('App Review IAP eligibility contract', () => {
  it('product IDs and RevenueCat packages are unchanged', () => {
    assert.match(APPLE_PRODUCT_MONTHLY, /\.subscription\.monthly$/);
    assert.match(APPLE_PRODUCT_YEARLY, /\.subscription\.yearly\.v2$/);
    assert.equal(PACKAGE_MONTHLY, '$rc_monthly');
    assert.equal(PACKAGE_YEARLY, '$rc_annual');
    assert.equal(OFFERING_ID, 'default');
  });

  it('payment_start_at default is unchanged', () => {
    assert.equal(DEFAULT_PAYMENT_START_AT, '2026-10-01T00:00:00+02:00');
  });

  it('preview route remains admin-only and non-purchasable', () => {
    const routes = fs.readFileSync(path.join(__dirname, '../src/routes/index.js'), 'utf8');
    assert.match(routes, /app\.get\('\/review\/subscription-preview',\s*requireAdmin/);
    const previewJs = fs.readFileSync(path.join(__dirname, '../public/js/review-subscription-preview.js'), 'utf8');
    const executable = previewJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(executable, /window\.IAPManager/);
    assert.doesNotMatch(executable, /purchasePackage\s*\(/);
    assert.doesNotMatch(executable, /\/api\/iap\/config/);
    assert.doesNotMatch(executable, /Purchases\.configure/);
    assert.doesNotMatch(executable, /restorePurchases\s*\(/);
  });

  it('ordinary family remains purchase-blocked under READY BUT OFF', async () => {
    const familyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await withEnv(
      {
        BILLING_UI_DISABLED: 'true',
        REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true',
        REVENUECAT_SANDBOX_FAMILY_IDS: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
      async () => {
        const result = await getNativePurchaseEligibility(familyId, { checkGlobalRollout: true });
        assert.equal(result.allowed, false);
        assert.notEqual(result.reason, 'sandbox_family');
      }
    );
  });

  it('exact allowlisted family is native-purchase eligible without enabling global billing', async () => {
    const familyId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await withEnv(
      {
        BILLING_UI_DISABLED: 'true',
        REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true',
        REVENUECAT_SANDBOX_FAMILY_IDS: familyId,
      },
      async () => {
        const result = await getNativePurchaseEligibility(familyId, { checkGlobalRollout: true });
        assert.equal(result.allowed, true);
        assert.equal(result.reason, 'sandbox_family');
        const vis = await resolveSubscriptionUiVisibility(familyId, { active: false });
        assert.equal(vis.native_purchase_eligible, true);
        assert.equal(vis.subscription_ui_visible, true);
        assert.equal(vis.billing_ui_enabled, false);
      }
    );
  });
});

describe('App Review IAP — config route + grandfathered complimentary account', () => {
  test('allowlisted non-grandfathered family gets nativePurchasesEnabled and a public key', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      await withEnv(
        {
          BILLING_UI_DISABLED: 'true',
          REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true',
          REVENUECAT_IOS_PUBLIC_SDK_KEY: 'appl_review_public_key_only',
          REVENUECAT_SANDBOX_FAMILY_IDS: 'pending',
        },
        async () => {
          const appSettings = require('../db/app-settings');
          await appSettings.setPaymentEnabled(false);
          const session = await registerAndLogin(http.baseUrl);
          const { rows } = await db.query(
            `SELECT p.family_id FROM parent p WHERE LOWER(p.email) = $1`,
            [session.email.toLowerCase()]
          );
          const familyId = rows[0].family_id;
          await db.query(
            `UPDATE family SET country_code = 'IE', is_lifetime_free = false WHERE id = $1`,
            [familyId]
          );
          await db.query(`DELETE FROM family_entitlements WHERE family_id = $1`, [familyId]);
          process.env.REVENUECAT_SANDBOX_FAMILY_IDS = familyId;

          const res = await fetch(`${http.baseUrl}/api/iap/config?platform=ios`, {
            headers: { Cookie: cookieHeader(session.cookies) },
          });
          assert.equal(res.status, 200);
          const body = await res.json();
          assert.equal(body.nativePurchasesEnabled, true);
          assert.equal(body.apiKey, 'appl_review_public_key_only');
          assert.equal(body.products.monthly, APPLE_PRODUCT_MONTHLY);
          assert.equal(body.products.yearly, APPLE_PRODUCT_YEARLY);
          assert.equal(body.killSwitchBillingUi, true);
        }
      );
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('grandfathered complimentary family stays Premium without a purchase CTA path from allowlist membership', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    try {
      const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');
      const { rows } = await db.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Founding Review Family', 'active', true, '2026-01-15T00:00:00+01:00'::timestamptz, 'SE', 'EU')
         RETURNING id`
      );
      const familyId = rows[0].id;
      await db.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, source_reference, status, starts_at, granted_at
         ) VALUES ($1, 'basic', 'grandfathered', 'payment_start_cutoff', 'grandfathered', NOW(), NOW())`,
        [familyId]
      );

      await withEnv(
        {
          BILLING_UI_DISABLED: 'true',
          REVENUECAT_SANDBOX_PURCHASES_ENABLED: 'true',
          REVENUECAT_SANDBOX_FAMILY_IDS: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        },
        async () => {
          const eligibility = await getNativePurchaseEligibility(familyId, { checkGlobalRollout: true });
          assert.equal(eligibility.allowed, false, 'founding review family must not be the IAP allowlist UUID');

          const { premium } = await resolveFamilyEntitlements(familyId);
          assert.equal(premium.active, true);
          assert.equal(premium.is_grandfathered, true);

          const vis = await resolveSubscriptionUiVisibility(familyId, premium);
          assert.equal(vis.subscription_ui_visible, true, 'complimentary Premium may show status');
          assert.equal(vis.native_purchase_eligible, false);
          assert.equal(vis.billing_ui_enabled, false);
        }
      );
    } finally {
      await db.cleanup();
    }
  });
});
