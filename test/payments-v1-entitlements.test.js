'use strict';

/**
 * PAYMENTS V1 — release-blocking entitlement, webhook, gift, and admin tests (spec §45).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const appSettings = require('../db/app-settings');
const {
  resolveFamilyEntitlements,
  grantAdminPremium,
  applyStoreEntitlementFromWebhook,
  emptyPremium,
} = require('../src/lib/family-entitlements');
const { redeemGiftCode, generateGiftCode, hashGiftCode, fingerprintGiftCode } = require('../src/lib/gift-cards');
const { processRevenueCatEvent } = require('../src/lib/revenuecat-webhook-process');
const { applyIapWebhookTestEnv, TEST_APP_ID } = require('./support/iap-webhook-test-env');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');

applyIapWebhookTestEnv();

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function setPaymentStart(iso) {
  await appSettings.upsertSetting('payment_start_at', iso);
}

async function createFamilyDirect(db, createdAtIso) {
  const { rows } = await db.query(
    `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at)
     VALUES ('Testfamilj', 'none', false, $1::timestamptz)
     RETURNING id, created_at`,
    [createdAtIso]
  );
  return rows[0];
}

async function insertGiftCard(db, code, overrides = {}) {
  const codeHash = hashGiftCode(code);
  const fingerprint = fingerprintGiftCode(code);
  const orderRes = await db.query(
    `INSERT INTO gift_orders (
       public_id, status_token_hash, purchaser_email, quantity,
       unit_price_minor, total_amount_minor, payment_status, status
     )
     VALUES ($1, $2, 'buyer@example.com', 1, 59000, 59000, 'paid', 'paid')
     RETURNING id`,
    [crypto.randomUUID(), crypto.randomUUID()]
  );
  const cardRes = await db.query(
    `INSERT INTO gift_cards (
       order_id, code_hash, code_fingerprint, design_key,
       scheduled_delivery_at, original_scheduled_delivery_at,
       delivered_at, redemption_expires_at, status, premium_months
     )
     VALUES ($1, $2, $3, 'neutral', NOW(), NOW(), NOW(), NOW() + INTERVAL '12 months', 'delivered', 12)
     RETURNING id`,
    [orderRes.rows[0].id, codeHash, fingerprint]
  );
  return { orderId: orderRes.rows[0].id, cardId: cardRes.rows[0].id };
}

test('payments v1 entitlements + gifts + webhook', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  await setPaymentStart('2026-10-01T00:00:00+02:00');

  await t.test('1 family before cutoff → grandfathered forever', async () => {
    const family = await createFamilyDirect(db, '2026-09-01T00:00:00+02:00');
    const { grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');
    await grantGrandfatheredOnCreate(family.id, family.created_at);
    const { premium } = await resolveFamilyEntitlements(family.id);
    assert.equal(premium.active, true);
    assert.equal(premium.is_grandfathered, true);
    assert.equal(premium.source, 'grandfathered');
  });

  await t.test('2 family after cutoff → no access before valid entitlement', async () => {
    const family = await createFamilyDirect(db, '2026-11-01T00:00:00+02:00');
    const { syncAllLegacyMirrors } = require('../src/lib/family-entitlements');
    await syncAllLegacyMirrors(family.id, emptyPremium());
    const { premium, requires_paywall } = await resolveFamilyEntitlements(family.id);
    assert.equal(premium.active, false);
    assert.equal(requires_paywall, true);
  });

  await t.test('3–6 store trial/active/grace/expired', async () => {
    const family = await createFamilyDirect(db, '2026-11-05T00:00:00+02:00');
    const expFuture = Date.now() + 7 * 86400000;

    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'active',
      eventType: 'INITIAL_PURCHASE',
      event: { id: 'evt_trial', period_type: 'TRIAL', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: expFuture,
    });
    let resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.active, true);
    assert.equal(resolved.premium.trial, true);

    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'active',
      eventType: 'RENEWAL',
      event: { id: 'evt_active', period_type: 'NORMAL', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: expFuture,
    });
    resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.active, true);
    assert.equal(resolved.premium.trial, false);

    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'grace_period',
      eventType: 'BILLING_ISSUE',
      event: { id: 'evt_grace', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: expFuture,
    });
    resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.active, true);
    assert.equal(resolved.premium.status, 'grace_period');

    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'expired',
      eventType: 'EXPIRATION',
      event: { id: 'evt_exp', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: Date.now() - 1000,
    });
    resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.active, false);
  });

  await t.test('7 grandfather + expired store → still access', async () => {
    const family = await createFamilyDirect(db, '2026-05-01T00:00:00+02:00');
    const { grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');
    await grantGrandfatheredOnCreate(family.id, family.created_at);
    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'expired',
      eventType: 'EXPIRATION',
      event: { id: 'evt_exp2', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: Date.now() - 1000,
    });
    const { premium } = await resolveFamilyEntitlements(family.id);
    assert.equal(premium.active, true);
    assert.equal(premium.is_grandfathered, true);
  });

  await t.test('8 admin temporary grant → correct expiry', async () => {
    const family = await createFamilyDirect(db, '2026-11-10T00:00:00+02:00');
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    await grantAdminPremium(family.id, {
      expiresAt,
      permanent: false,
      adminId: null,
      reason: 'support test',
    });
    const { premium } = await resolveFamilyEntitlements(family.id);
    assert.equal(premium.active, true);
    assert.equal(premium.source, 'admin');
    assert.ok(premium.expires_at);
  });

  await t.test('14–18 gift redeem validations', async () => {
    const family = await createFamilyDirect(db, '2026-11-15T00:00:00+02:00');
    const code = generateGiftCode();
    await insertGiftCard(db, code);

    const ok = await redeemGiftCode(family.id, code, { ipAddress: '127.0.0.1' });
    assert.equal(ok.ok, true);

    const dup = await redeemGiftCode(family.id, code, { ipAddress: '127.0.0.1' });
    assert.equal(dup.ok, false);
    assert.equal(dup.code, 'ALREADY_REDEEMED');

    const family2 = await createFamilyDirect(db, '2026-11-16T00:00:00+02:00');
    const expiredCode = generateGiftCode();
    const codeHash = hashGiftCode(expiredCode);
    const orderRes = await db.query(
      `INSERT INTO gift_orders (public_id, status_token_hash, purchaser_email, quantity, unit_price_minor, total_amount_minor, payment_status, status)
       VALUES ($1, $2, 'x@example.com', 1, 59000, 59000, 'paid', 'paid') RETURNING id`,
      [crypto.randomUUID(), crypto.randomUUID()]
    );
    await db.query(
      `INSERT INTO gift_cards (order_id, code_hash, code_fingerprint, scheduled_delivery_at, original_scheduled_delivery_at, delivered_at, redemption_expires_at, status)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW(), NOW() - INTERVAL '1 day', 'expired')`,
      [orderRes.rows[0].id, codeHash, fingerprintGiftCode(expiredCode)]
    );
    const expired = await redeemGiftCode(family2.id, expiredCode, { ipAddress: '127.0.0.2' });
    assert.equal(expired.code, 'EXPIRED');
  });

  await t.test('13 webhook cannot remove grandfathering', async () => {
    const family = await createFamilyDirect(db, '2026-04-01T00:00:00+02:00');
    const { grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');
    await grantGrandfatheredOnCreate(family.id, family.created_at);

    const dbModule = require('../src/lib/db');
    const event = {
      id: `evt_${crypto.randomUUID()}`,
      type: 'EXPIRATION',
      app_user_id: family.id,
      expiration_at_ms: Date.now() - 1000,
      environment: 'LIVE',
      product_id: STORE_PRODUCT_MONTHLY,
      entitlement_ids: ['basic'],
      app_id: TEST_APP_ID,
      event_timestamp_ms: Date.now(),
      store: 'APP_STORE',
    };
    const result = await processRevenueCatEvent(dbModule, event);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'grandfathered');

    const { premium } = await resolveFamilyEntitlements(family.id);
    assert.equal(premium.is_grandfathered, true);
  });

  await t.test('25 admin grant logged (append-only audit)', async () => {
    const family = await createFamilyDirect(db, '2026-11-20T00:00:00+02:00');
    await grantAdminPremium(family.id, {
      expiresAt: new Date(Date.now() + 86400000),
      permanent: false,
      adminId: null,
      reason: 'audit test',
    });
    const audit = await db.query(
      `SELECT event_type FROM payment_audit_log WHERE family_id = $1 ORDER BY received_at DESC LIMIT 1`,
      [family.id]
    );
    assert.equal(audit.rows[0].event_type, 'admin_grant_temporary');
  });

  await t.test('33 expired family limited API gate', async () => {
    await setPaymentStart('2020-01-01T00:00:00+02:00');
    delete require.cache[require.resolve('../app')];
    delete require.cache[require.resolve('../src/lib/db')];
    const { createApp } = require('../app');
    const { listenApp } = require('./helpers/http.js');
    const http = await listenApp(createApp);
    try {
      const session = await registerAndLogin(http.baseUrl);
      const blocked = await fetch(`${http.baseUrl}/api/children`, {
        headers: { Cookie: cookieHeader(session.cookies) },
      });
      assert.equal(blocked.status, 402);
      const body = JSON.parse(await blocked.text());
      assert.equal(body.code, 'PREMIUM_REQUIRED');
    } finally {
      await http.close();
      await setPaymentStart('2026-10-01T00:00:00+02:00');
    }
  });

  await db.cleanup();
});
