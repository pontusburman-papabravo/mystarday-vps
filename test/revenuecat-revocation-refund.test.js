'use strict';

/**
 * RevenueCat has NO "REVOCATION" and NO "REFUND" webhook event `type`
 * (verified against https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).
 *
 * A store-side refund/revocation is represented via the REASON on an existing,
 * already-handled event type:
 *   - CANCELLATION with cancel_reason = 'CUSTOMER_SUPPORT'
 *   - EXPIRATION with expiration_reason = 'CUSTOMER_SUPPORT' (the event that actually
 *     removes access — this is the "revocation" moment)
 *   - REFUND_REVERSED — a prior refund was clawed back; access is restored
 *
 * This file tests that revocation/refund scenarios flow correctly through the
 * existing fail-closed, idempotent, ordering-protected webhook pipeline — there is
 * no separate "REVOCATION" code path to test in isolation, by design.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const {
  resolveSubscriptionStatus,
  isRefundOrRevocationReason,
  processRevenueCatEvent,
} = require('../src/lib/revenuecat-webhook-process');
const { applyIapWebhookTestEnv, TEST_APP_ID, POST_PAYMENT_START_TEST_CREATED_AT } = require('./support/iap-webhook-test-env');
const {
  STORE_PRODUCT_MONTHLY,
  GOOGLE_PRODUCT_MONTHLY,
} = require('../config/iap-product-contract');

applyIapWebhookTestEnv();

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const WEBHOOK_AUTH = 'Bearer revenuecat-static-webhook-secret';

function buildEventPayload(overrides = {}) {
  const now = Date.now();
  const event = {
    id: overrides.id || `evt_${crypto.randomUUID()}`,
    type: overrides.type || 'RENEWAL',
    app_user_id: overrides.app_user_id,
    original_app_user_id: overrides.original_app_user_id,
    aliases: overrides.aliases,
    expiration_at_ms: overrides.expiration_at_ms ?? (now + 86_400_000),
    environment: overrides.environment || 'LIVE',
    product_id: overrides.product_id || STORE_PRODUCT_MONTHLY,
    entitlement_ids: overrides.entitlement_ids || ['basic'],
    app_id: overrides.app_id ?? TEST_APP_ID,
    event_timestamp_ms: overrides.event_timestamp_ms ?? now,
    store: overrides.store || 'APP_STORE',
    cancel_reason: overrides.cancel_reason,
    expiration_reason: overrides.expiration_reason,
  };
  if (overrides.id !== undefined) event.id = overrides.id;
  return JSON.stringify({ api_version: '1.0', event });
}

async function seedTestFamily(db, { subscriptionStatus = 'active', rcCustomerId = null } = {}) {
  const familyId = crypto.randomUUID();
  await db.query(
    `INSERT INTO family (id, name, is_lifetime_free, subscription_status, rc_customer_id, created_at)
     VALUES ($1, 'Revocation Test Family', false, $2, $3, $4::timestamptz)`,
    [familyId, subscriptionStatus, rcCustomerId, POST_PAYMENT_START_TEST_CREATED_AT]
  );
  return familyId;
}

async function postWebhook(http, body) {
  return fetch(`${http.baseUrl}/api/iap/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: WEBHOOK_AUTH,
    },
    body,
  });
}

describe('RevenueCat event contract — no REVOCATION/REFUND type exists', () => {
  test('resolveSubscriptionStatus has no REVOCATION or REFUND case (dead/fictitious event types removed)', () => {
    assert.equal(resolveSubscriptionStatus('REVOCATION', null), null);
    assert.equal(resolveSubscriptionStatus('REFUND', null), null);
  });

  test('isRefundOrRevocationReason detects CUSTOMER_SUPPORT on either reason field', () => {
    assert.equal(isRefundOrRevocationReason({ cancel_reason: 'CUSTOMER_SUPPORT' }), true);
    assert.equal(isRefundOrRevocationReason({ expiration_reason: 'CUSTOMER_SUPPORT' }), true);
    assert.equal(isRefundOrRevocationReason({ cancel_reason: 'UNSUBSCRIBE' }), false);
    assert.equal(isRefundOrRevocationReason({ expiration_reason: 'BILLING_ERROR' }), false);
    assert.equal(isRefundOrRevocationReason({}), false);
  });
});

describe('RevenueCat revocation (EXPIRATION + expiration_reason=CUSTOMER_SUPPORT)', () => {
  test('active store entitlement → revocation EXPIRATION → no store Premium (Apple)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });

      const body = buildEventPayload({
        type: 'EXPIRATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
        store: 'APP_STORE',
        product_id: STORE_PRODUCT_MONTHLY,
      });
      const res = await postWebhook(http, body);
      assert.equal(res.status, 200);

      const { rows } = await db.query(
        'SELECT subscription_status FROM family WHERE id = $1',
        [familyId]
      );
      assert.equal(rows[0].subscription_status, 'expired', 'revoked (refunded) Apple entitlement must no longer grant Premium');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('active store entitlement → revocation EXPIRATION → no store Premium (Google)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });

      const body = buildEventPayload({
        type: 'EXPIRATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
        store: 'PLAY_STORE',
        product_id: GOOGLE_PRODUCT_MONTHLY,
      });
      const res = await postWebhook(http, body);
      assert.equal(res.status, 200);

      const { rows } = await db.query(
        'SELECT subscription_status FROM family WHERE id = $1',
        [familyId]
      );
      assert.equal(rows[0].subscription_status, 'expired', 'revoked (refunded) Google entitlement must no longer grant Premium — same behavior as Apple');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('duplicate revocation event id does not re-apply or double-log', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });
      const eventId = `evt_revocation_${crypto.randomUUID()}`;
      const body = buildEventPayload({
        id: eventId,
        type: 'EXPIRATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
      });

      const first = await postWebhook(http, body);
      assert.equal(first.status, 200);
      const firstJson = await first.json();
      assert.notEqual(firstJson.duplicate, true);

      const second = await postWebhook(http, body);
      assert.equal(second.status, 200);
      const secondJson = await second.json();
      assert.equal(secondJson.duplicate, true, 'retried revocation webhook must be recognized as a duplicate');

      const { rows: logRows } = await db.query(
        'SELECT COUNT(*)::int AS count FROM iap_webhook_log WHERE revenuecat_event_id = $1',
        [eventId]
      );
      assert.equal(logRows[0].count, 1, 'exactly one webhook log row for the revocation event id — no corrupt/duplicate state');

      const { rows } = await db.query(
        'SELECT subscription_status FROM family WHERE id = $1',
        [familyId]
      );
      assert.equal(rows[0].subscription_status, 'expired');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('stale revocation event arriving after a newer RENEWAL is ignored (event ordering)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'none' });
      const baseTs = Date.now();

      // Newer RENEWAL arrives first (e.g. the customer resubscribed after the refund).
      const renewalBody = buildEventPayload({
        type: 'RENEWAL',
        app_user_id: familyId,
        event_timestamp_ms: baseTs,
        expiration_at_ms: baseTs + 30 * 86_400_000,
      });
      const renewalRes = await postWebhook(http, renewalBody);
      assert.equal(renewalRes.status, 200);

      // A late/out-of-order revocation webhook for an *older* event timestamp then arrives.
      const staleRevocationBody = buildEventPayload({
        type: 'EXPIRATION',
        app_user_id: familyId,
        event_timestamp_ms: baseTs - 60_000,
        expiration_at_ms: baseTs - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
      });
      const staleRes = await postWebhook(http, staleRevocationBody);
      assert.equal(staleRes.status, 200);
      const staleJson = await staleRes.json();
      assert.equal(staleJson.skipped, 'skipped_stale', 'out-of-order revocation must not override the newer RENEWAL state');

      const { rows } = await db.query(
        'SELECT subscription_status FROM family WHERE id = $1',
        [familyId]
      );
      assert.equal(rows[0].subscription_status, 'active', 'newer RENEWAL wins over a stale revocation webhook');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('grandfathered family receiving a revocation webhook keeps Premium (grandfathering is immutable)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    for (const mod of ['../src/lib/db', '../db/family-entitlements', '../src/lib/family-entitlements', '../src/lib/revenuecat-webhook-process']) {
      try { delete require.cache[require.resolve(mod)]; } catch (_) { /* not loaded yet */ }
    }
    try {
      const { resolveFamilyEntitlements, grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');
      const { processRevenueCatEvent: processEvent } = require('../src/lib/revenuecat-webhook-process');

      const { rows } = await db.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Grandfathered Revocation Family', 'none', false, '2026-04-01T00:00:00+02:00'::timestamptz, 'SE', 'EU')
         RETURNING id, created_at`
      );
      const family = rows[0];
      await grantGrandfatheredOnCreate(family.id, family.created_at);

      const dbModule = require('../src/lib/db');
      const event = {
        id: `evt_gf_revocation_${crypto.randomUUID()}`,
        type: 'EXPIRATION',
        app_user_id: family.id,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
        environment: 'LIVE',
        product_id: STORE_PRODUCT_MONTHLY,
        entitlement_ids: ['basic'],
        app_id: TEST_APP_ID,
        event_timestamp_ms: Date.now(),
        store: 'APP_STORE',
      };
      const result = await processEvent(dbModule, event);
      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'grandfathered', 'a revocation webhook must never even reach grandfathered families\' entitlement state');

      const { premium } = await resolveFamilyEntitlements(family.id);
      assert.equal(premium.active, true);
      assert.equal(premium.is_grandfathered, true);
      assert.equal(premium.source, 'grandfathered');
    } finally {
      await db.cleanup();
    }
  });
});

describe('RevenueCat refund (CANCELLATION/EXPIRATION + cancel_reason/expiration_reason=CUSTOMER_SUPPORT)', () => {
  test('active Apple subscription → refund EXPIRATION → access removed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });
      const body = buildEventPayload({
        type: 'EXPIRATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
        store: 'APP_STORE',
      });
      const res = await postWebhook(http, body);
      assert.equal(res.status, 200);
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'expired');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('active Google subscription → refund EXPIRATION → access removed', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });
      const body = buildEventPayload({
        type: 'EXPIRATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
        store: 'PLAY_STORE',
        product_id: GOOGLE_PRODUCT_MONTHLY,
      });
      const res = await postWebhook(http, body);
      assert.equal(res.status, 200);
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'expired');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('a refunded-but-not-yet-expired CANCELLATION keeps access until expiration_at_ms (per RevenueCat semantics)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });
      const body = buildEventPayload({
        type: 'CANCELLATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() + 86_400_000,
        cancel_reason: 'CUSTOMER_SUPPORT',
      });
      const res = await postWebhook(http, body);
      assert.equal(res.status, 200);
      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'active', 'RevenueCat: a refund does not necessarily deactivate auto-renewal — check status via expiration, not cancellation');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('duplicate refund event id is idempotent (no double state change, no double audit row)', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });
      const eventId = `evt_refund_dup_${crypto.randomUUID()}`;
      const body = buildEventPayload({
        id: eventId,
        type: 'EXPIRATION',
        app_user_id: familyId,
        expiration_at_ms: Date.now() - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
      });

      await postWebhook(http, body);
      await postWebhook(http, body);
      const third = await postWebhook(http, body);
      const thirdJson = await third.json();
      assert.equal(thirdJson.duplicate, true);

      const { rows: auditRows } = await db.query(
        `SELECT COUNT(*)::int AS count FROM payment_audit_log WHERE family_id = $1 AND external_event_id = $2`,
        [familyId, eventId]
      );
      assert.equal(auditRows[0].count, 1, 'refund must be audited exactly once, even after webhook retries');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });

  test('grandfathered family remains grandfathered through a refund webhook', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real TEST_DATABASE_URL');
      return;
    }
    for (const mod of ['../src/lib/db', '../db/family-entitlements', '../src/lib/family-entitlements', '../src/lib/revenuecat-webhook-process']) {
      try { delete require.cache[require.resolve(mod)]; } catch (_) { /* not loaded yet */ }
    }
    try {
      const { resolveFamilyEntitlements, grantGrandfatheredOnCreate } = require('../src/lib/family-entitlements');
      const { processRevenueCatEvent: processEvent } = require('../src/lib/revenuecat-webhook-process');

      const { rows } = await db.query(
        `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
         VALUES ('Grandfathered Refund Family', 'none', false, '2026-03-01T00:00:00+02:00'::timestamptz, 'SE', 'EU')
         RETURNING id, created_at`
      );
      const family = rows[0];
      await grantGrandfatheredOnCreate(family.id, family.created_at);

      const dbModule = require('../src/lib/db');
      const event = {
        id: `evt_gf_refund_${crypto.randomUUID()}`,
        type: 'CANCELLATION',
        app_user_id: family.id,
        expiration_at_ms: Date.now() - 1000,
        cancel_reason: 'CUSTOMER_SUPPORT',
        environment: 'LIVE',
        product_id: STORE_PRODUCT_MONTHLY,
        entitlement_ids: ['basic'],
        app_id: TEST_APP_ID,
        event_timestamp_ms: Date.now(),
        store: 'APP_STORE',
      };
      const result = await processEvent(dbModule, event);
      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'grandfathered');

      const { premium } = await resolveFamilyEntitlements(family.id);
      assert.equal(premium.active, true);
      assert.equal(premium.is_grandfathered, true);
    } finally {
      await db.cleanup();
    }
  });

  test('event ordering protections apply to refund events like any other event', async (t) => {
    const db = await setupTestDb();
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }
    process.env.REVENUECAT_WEBHOOK_SECRET = WEBHOOK_AUTH;
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const familyId = await seedTestFamily(db, { subscriptionStatus: 'active' });
      const baseTs = Date.now();

      // Refund/expiration lands first.
      const refundBody = buildEventPayload({
        type: 'EXPIRATION',
        app_user_id: familyId,
        event_timestamp_ms: baseTs,
        expiration_at_ms: baseTs - 1000,
        expiration_reason: 'CUSTOMER_SUPPORT',
      });
      await postWebhook(http, refundBody);

      // An older, out-of-order RENEWAL webhook (retried/delayed) must not resurrect access.
      const staleRenewalBody = buildEventPayload({
        type: 'RENEWAL',
        app_user_id: familyId,
        event_timestamp_ms: baseTs - 60_000,
        expiration_at_ms: baseTs + 30 * 86_400_000,
      });
      const staleRes = await postWebhook(http, staleRenewalBody);
      const staleJson = await staleRes.json();
      assert.equal(staleJson.skipped, 'skipped_stale');

      const { rows } = await db.query('SELECT subscription_status FROM family WHERE id = $1', [familyId]);
      assert.equal(rows[0].subscription_status, 'expired', 'a stale RENEWAL must not undo a newer refund/expiration');
    } finally {
      await http.close();
      await db.cleanup();
    }
  });
});
