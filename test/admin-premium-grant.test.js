'use strict';

/**
 * Admin Premium grant/revoke — merge gate for Family Hub write path.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp, cookieHeader, getSetCookieHeaders, mergeCookies } = require('./helpers/http.js');
const { registerAndLogin } = require('./helpers/auth-session.js');
const { STORE_PRODUCT_MONTHLY } = require('../config/iap-product-contract');
const {
  snapshotBillingEnv,
  restoreBillingEnv,
  disablePublicBillingForTest,
} = require('./helpers/public-billing');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

const POST_CUTOFF = '2026-11-10T08:00:00+02:00';
const PRE_CUTOFF = '2026-05-01T08:00:00+02:00';
const INTRO_START = '2026-09-14T08:00:00+02:00';

async function createFamilyDirect(db, createdAtIso, countryCode = 'SE') {
  const marketRegion = countryCode === 'GB' ? 'UK' : (countryCode === 'US' ? 'US' : 'EU');
  const { rows } = await db.query(
    `INSERT INTO family (name, subscription_status, is_lifetime_free, created_at, country_code, market_region)
     VALUES ('AdminGrantFam', 'none', false, $1::timestamptz, $2, $3)
     RETURNING id, created_at, country_code`,
    [createdAtIso, countryCode, marketRegion]
  );
  return rows[0];
}

async function loginAsAdmin(baseUrl, db, session) {
  await db.query('UPDATE parent SET is_admin = true WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, password: session.password }),
  });
  if (loginRes.status !== 200) {
    throw new Error(`admin re-login failed ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginBody = JSON.parse(await loginRes.text());
  let cookies = {};
  for (const header of getSetCookieHeaders(loginRes)) {
    cookies = mergeCookies(cookies, [header]);
  }
  const parent = await db.query('SELECT id FROM parent WHERE LOWER(email) = $1', [
    session.email.toLowerCase(),
  ]);
  return { ...session, cookies, csrfToken: loginBody.csrfToken, adminId: parent.rows[0].id };
}

function headers(session, extra = {}) {
  return {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(session.cookies),
    'X-CSRF-Token': session.csrfToken,
    ...extra,
  };
}

async function activeAdminCount(db, familyId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS c FROM family_entitlements
     WHERE family_id = $1 AND source = 'admin' AND revoked_at IS NULL`,
    [familyId]
  );
  return rows[0].c;
}

describe('admin premium grant source contracts', () => {
  test('write path does not call RevenueCat promotional entitlements', () => {
    const lib = fs.readFileSync(path.join(__dirname, '../src/lib/family-entitlements.js'), 'utf8');
    const route = fs.readFileSync(path.join(__dirname, '../src/routes/admin/family-premium-grant.js'), 'utf8');
    assert.doesNotMatch(lib, /promotional/i);
    assert.doesNotMatch(route, /revenuecat/i);
    assert.match(route, /grantAdminPremium/);
    assert.match(route, /revokeAdminPremium/);
    assert.match(route, /req\.user\.id/);
  });

  test('admin unique migration has down() and live-over-expired cleanup', () => {
    const mig = require('../migrations/1810490000000_family_entitlements_admin_unique');
    assert.equal(typeof mig.up, 'function');
    assert.equal(typeof mig.down, 'function');
    assert.equal(typeof mig.dedupeActiveAdminEntitlements, 'function');
    const src = fs.readFileSync(
      path.join(__dirname, '../migrations/1810490000000_family_entitlements_admin_unique.js'),
      'utf8'
    );
    assert.match(src, /expires_at IS NULL OR expires_at > NOW\(\)/);
    assert.match(src, /WHERE source = 'admin'/);
    assert.match(src, /idx_family_entitlements_admin_unique/);
    assert.doesNotMatch(src, /WHERE source = 'grandfathered'/);
    assert.doesNotMatch(src, /WHERE source = 'intro_year'/);
  });

  test('permanent grant schema is a discriminated union that forbids expiresAt', () => {
    const { AdminPremiumGrantSchema } = require('../src/lib/schemas');
    const ok = AdminPremiumGrantSchema.safeParse({
      type: 'permanent',
      reason: 'support without end',
    });
    assert.equal(ok.success, true);

    const withExpires = AdminPremiumGrantSchema.safeParse({
      type: 'permanent',
      reason: 'support without end',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(withExpires.success, false);

    const missingExpires = AdminPremiumGrantSchema.safeParse({
      type: 'temporary',
      reason: 'week of support',
    });
    assert.equal(missingExpires.success, false);

    const unknownKey = AdminPremiumGrantSchema.safeParse({
      type: 'permanent',
      reason: 'support without end',
      adminId: 'not-from-body',
    });
    assert.equal(unknownKey.success, false);
  });
});

test('admin premium grant/revoke DB + HTTP merge gate', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }

  const {
    grantAdminPremium,
    revokeAdminPremium,
    resolveFamilyEntitlements,
    grantGrandfatheredOnCreate,
    applyStoreEntitlementFromWebhook,
  } = require('../src/lib/family-entitlements');

  const unique = await db.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_family_entitlements_admin_unique'`
  );
  if (unique.rowCount === 0) {
    const mig = require('../migrations/1810490000000_family_entitlements_admin_unique');
    const client = await db.pool.connect();
    try {
      await mig.up(client);
    } finally {
      client.release();
    }
  }

  await t.test('unique index exists and second active insert fails', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    await grantAdminPremium(family.id, {
      expiresAt: new Date(Date.now() + 86400000),
      permanent: false,
      adminId: null,
      reason: 'unique index probe',
    });
    await assert.rejects(
      () => db.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, source_reference, status, starts_at, expires_at, metadata
         ) VALUES ($1, 'basic', 'admin', 'temporary', 'active', NOW(), NOW() + INTERVAL '2 days', '{}'::jsonb)`,
        [family.id]
      ),
      (err) => err && err.code === '23505'
    );
    assert.equal(await activeAdminCount(db, family.id), 1);
  });

  await t.test('dedupe keeps oldest live admin row among two unrevoked live grants', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP INDEX IF EXISTS idx_family_entitlements_admin_unique');
      const older = await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, status, granted_at, metadata
         ) VALUES ($1, 'basic', 'admin', 'active', NOW() - INTERVAL '2 days', '{"reason":"old"}'::jsonb)
         RETURNING id`,
        [family.id]
      );
      const newer = await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, status, granted_at, metadata
         ) VALUES ($1, 'basic', 'admin', 'active', NOW() - INTERVAL '1 hour', '{"reason":"new"}'::jsonb)
         RETURNING id`,
        [family.id]
      );
      await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, status, granted_at, metadata
         ) VALUES ($1, 'basic', 'intro_year', 'active', NOW() - INTERVAL '3 days', '{"reason":"intro"}'::jsonb)`,
        [family.id]
      );
      const mig = require('../migrations/1810490000000_family_entitlements_admin_unique');
      await mig.dedupeActiveAdminEntitlements(client);
      const active = await client.query(
        `SELECT id FROM family_entitlements
         WHERE family_id = $1 AND source = 'admin' AND revoked_at IS NULL`,
        [family.id]
      );
      assert.equal(active.rowCount, 1);
      assert.equal(active.rows[0].id, older.rows[0].id);
      const intro = await client.query(
        `SELECT revoked_at FROM family_entitlements
         WHERE family_id = $1 AND source = 'intro_year'`,
        [family.id]
      );
      assert.equal(intro.rows[0].revoked_at, null);
      const newerRow = await client.query(
        `SELECT revoked_at FROM family_entitlements WHERE id = $1`,
        [newer.rows[0].id]
      );
      assert.ok(newerRow.rows[0].revoked_at);
    } finally {
      try { await client.query('ROLLBACK'); } catch { /* not in a txn */ }
      client.release();
    }
  });

  await t.test('dedupe keeps live admin over a newer expired unrevoked row; resolver source unchanged', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP INDEX IF EXISTS idx_family_entitlements_admin_unique');
      const live = await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, status, granted_at, expires_at, metadata
         ) VALUES (
           $1, 'basic', 'admin', 'active', NOW() - INTERVAL '10 days',
           NOW() + INTERVAL '20 days', '{"reason":"still live"}'::jsonb
         ) RETURNING id`,
        [family.id]
      );
      const expiredNewer = await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, status, granted_at, expires_at, metadata
         ) VALUES (
           $1, 'basic', 'admin', 'active', NOW() - INTERVAL '1 hour',
           NOW() - INTERVAL '1 day', '{"reason":"expired newer"}'::jsonb
         ) RETURNING id`,
        [family.id]
      );
      await client.query(
        `INSERT INTO family_entitlements (
           family_id, entitlement_key, source, status, starts_at, expires_at, granted_at, metadata
         ) VALUES (
           $1, 'basic', 'intro_year', 'active', NOW() - INTERVAL '1 day',
           NOW() + INTERVAL '300 days', NOW() - INTERVAL '30 days', '{"reason":"intro"}'::jsonb
         )`,
        [family.id]
      );
      const before = await resolveFamilyEntitlements(family.id, new Date(), { client });
      assert.equal(before.premium.active, true);
      assert.equal(before.premium.source, 'admin');
      assert.equal(before.premium.entitlement_row_id, live.rows[0].id);

      const mig = require('../migrations/1810490000000_family_entitlements_admin_unique');
      await mig.dedupeActiveAdminEntitlements(client);

      const unrevoked = await client.query(
        `SELECT id, expires_at FROM family_entitlements
         WHERE family_id = $1 AND source = 'admin' AND revoked_at IS NULL`,
        [family.id]
      );
      assert.equal(unrevoked.rowCount, 1);
      assert.equal(unrevoked.rows[0].id, live.rows[0].id);
      const expired = await client.query(
        `SELECT revoked_at FROM family_entitlements WHERE id = $1`,
        [expiredNewer.rows[0].id]
      );
      assert.ok(expired.rows[0].revoked_at);
      const intro = await client.query(
        `SELECT revoked_at FROM family_entitlements
         WHERE family_id = $1 AND source = 'intro_year'`,
        [family.id]
      );
      assert.equal(intro.rows[0].revoked_at, null);

      const after = await resolveFamilyEntitlements(family.id, new Date(), { client });
      assert.equal(after.premium.active, true);
      assert.equal(after.premium.source, 'admin');
      assert.equal(after.premium.entitlement_row_id, live.rows[0].id);
    } finally {
      try { await client.query('ROLLBACK'); } catch { /* not in a txn */ }
      client.release();
    }
  });

  await t.test('temporary and permanent grants', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    const temp = await grantAdminPremium(family.id, {
      expiresAt,
      permanent: false,
      adminId: null,
      reason: 'support week',
    });
    assert.equal(temp.applied, true);
    assert.equal(temp.premium.source, 'admin');
    assert.ok(temp.premium.expires_at);

    const permFam = await createFamilyDirect(db, POST_CUTOFF);
    const perm = await grantAdminPremium(permFam.id, {
      permanent: true,
      expiresAt: new Date(Date.now() + 86400000),
      adminId: null,
      reason: 'permanent support',
    });
    assert.equal(perm.applied, true);
    assert.equal(perm.premium.source, 'admin');
    assert.equal(perm.premium.expires_at, null);
  });

  await t.test('lifetime skip temporary and permanent without extra admin row', async () => {
    const family = await createFamilyDirect(db, PRE_CUTOFF);
    await grantGrandfatheredOnCreate(family.id, family.created_at, { countryCode: 'SE' });
    const before = await db.query(
      `SELECT id, starts_at, expires_at, revoked_at FROM family_entitlements
       WHERE family_id = $1 AND source = 'grandfathered' AND revoked_at IS NULL`,
      [family.id]
    );
    const temp = await grantAdminPremium(family.id, {
      expiresAt: new Date(Date.now() + 86400000),
      permanent: false,
      adminId: null,
      reason: 'should skip temp',
    });
    const perm = await grantAdminPremium(family.id, {
      permanent: true,
      adminId: null,
      reason: 'should skip perm',
    });
    assert.equal(temp.skipped, true);
    assert.equal(temp.reason, 'grandfathered_immutable');
    assert.equal(perm.skipped, true);
    assert.equal(perm.reason, 'grandfathered_immutable');
    assert.equal(await activeAdminCount(db, family.id), 0);
    const after = await db.query(
      `SELECT id, starts_at, expires_at, revoked_at FROM family_entitlements
       WHERE family_id = $1 AND source = 'grandfathered' AND revoked_at IS NULL`,
      [family.id]
    );
    assert.equal(after.rows[0].id, before.rows[0].id);
    assert.equal(String(after.rows[0].starts_at), String(before.rows[0].starts_at));
    assert.equal(after.rows[0].expires_at, before.rows[0].expires_at);
  });

  await t.test('intro_year coexists; admin wins; revoke and expiry restore intro_year', async () => {
    const family = await createFamilyDirect(db, INTRO_START);
    const activeNow = new Date('2026-10-01T12:00:00+02:00');
    await resolveFamilyEntitlements(family.id, activeNow);
    const introBefore = await db.query(
      `SELECT id, starts_at, expires_at, revoked_at, status FROM family_entitlements
       WHERE family_id = $1 AND source = 'intro_year' AND revoked_at IS NULL`,
      [family.id]
    );
    assert.equal(introBefore.rowCount, 1);

    const expiresAt = new Date('2026-12-01T00:00:00+02:00');
    await grantAdminPremium(family.id, {
      expiresAt,
      permanent: false,
      adminId: null,
      reason: 'overlap intro',
    });
    let resolved = await resolveFamilyEntitlements(family.id, activeNow);
    assert.equal(resolved.premium.source, 'admin');
    assert.equal(resolved.premium.active, true);

    const introDuring = await db.query(
      `SELECT id, starts_at, expires_at, revoked_at, status FROM family_entitlements
       WHERE family_id = $1 AND source = 'intro_year' AND revoked_at IS NULL`,
      [family.id]
    );
    assert.equal(introDuring.rows[0].id, introBefore.rows[0].id);
    assert.equal(String(introDuring.rows[0].starts_at), String(introBefore.rows[0].starts_at));
    assert.equal(String(introDuring.rows[0].expires_at), String(introBefore.rows[0].expires_at));
    assert.equal(introDuring.rows[0].revoked_at, null);

    await revokeAdminPremium(family.id, { reason: 'done' });
    resolved = await resolveFamilyEntitlements(family.id, activeNow);
    assert.equal(resolved.premium.source, 'intro_year');
    assert.equal(resolved.premium.active, true);

    await grantAdminPremium(family.id, {
      expiresAt: new Date('2026-10-15T00:00:00+02:00'),
      permanent: false,
      adminId: null,
      reason: 'short grant',
    });
    resolved = await resolveFamilyEntitlements(family.id, new Date('2026-11-01T12:00:00+02:00'));
    assert.equal(resolved.premium.source, 'intro_year');
    const introAfter = await db.query(
      `SELECT id, starts_at, expires_at, revoked_at FROM family_entitlements
       WHERE family_id = $1 AND source = 'intro_year' AND revoked_at IS NULL`,
      [family.id]
    );
    assert.equal(introAfter.rows[0].id, introBefore.rows[0].id);
    assert.equal(String(introAfter.rows[0].starts_at), String(introBefore.rows[0].starts_at));
  });

  await t.test('store rows survive admin grant/revoke and webhook does not delete admin', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const expFuture = Date.now() + 30 * 86400000;
    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'active',
      eventType: 'INITIAL_PURCHASE',
      event: { id: 'evt_apple_admin', period_type: 'NORMAL', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: expFuture,
    });
    await grantAdminPremium(family.id, {
      expiresAt: new Date(expFuture),
      permanent: false,
      adminId: null,
      reason: 'admin over apple',
    });
    let resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.source, 'admin');
    const apple = await db.query(
      `SELECT revoked_at FROM family_entitlements
       WHERE family_id = $1 AND source = 'apple' AND revoked_at IS NULL`,
      [family.id]
    );
    assert.equal(apple.rowCount, 1);

    await applyStoreEntitlementFromWebhook(family.id, {
      subscriptionStatus: 'expired',
      eventType: 'EXPIRATION',
      event: { id: 'evt_apple_exp', store: 'APP_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: Date.now() - 1000,
    });
    assert.equal(await activeAdminCount(db, family.id), 1);
    resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.source, 'admin');

    await revokeAdminPremium(family.id, { reason: 'revoke after apple' });
    const appleAfter = await db.query(
      `SELECT source, revoked_at IS NULL AS live FROM family_entitlements
       WHERE family_id = $1 AND source IN ('apple', 'admin')`,
      [family.id]
    );
    const adminLive = appleAfter.rows.filter((r) => r.source === 'admin' && r.live);
    assert.equal(adminLive.length, 0);

    const gFam = await createFamilyDirect(db, POST_CUTOFF);
    await applyStoreEntitlementFromWebhook(gFam.id, {
      subscriptionStatus: 'active',
      eventType: 'INITIAL_PURCHASE',
      event: { id: 'evt_google_admin', period_type: 'NORMAL', store: 'PLAY_STORE' },
      productId: STORE_PRODUCT_MONTHLY,
      expirationAtMs: expFuture,
    });
    await grantAdminPremium(gFam.id, {
      permanent: true,
      adminId: null,
      reason: 'admin over google',
    });
    await revokeAdminPremium(gFam.id, { reason: 'back to google' });
    resolved = await resolveFamilyEntitlements(gFam.id);
    assert.equal(resolved.premium.source, 'google');
    assert.equal(resolved.premium.active, true);
  });

  await t.test('revoke is admin-only, idempotent, and syncs mirrors from resolver', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    await grantAdminPremium(family.id, {
      permanent: true,
      adminId: null,
      reason: 'revoke target',
    });
    const first = await revokeAdminPremium(family.id, { reason: 'first revoke' });
    assert.equal(first.revoked, true);
    const giftInsert = await db.query(
      `INSERT INTO family_entitlements (
         family_id, entitlement_key, source, status, starts_at, expires_at, metadata
       ) VALUES ($1, 'basic', 'gift', 'gift', NOW(), NOW() + INTERVAL '10 days', '{}'::jsonb)
       RETURNING id, revoked_at`,
      [family.id]
    );
    const second = await revokeAdminPremium(family.id, { reason: 'second revoke' });
    assert.equal(second.revoked, false);
    const gift = await db.query('SELECT revoked_at FROM family_entitlements WHERE id = $1', [
      giftInsert.rows[0].id,
    ]);
    assert.equal(gift.rows[0].revoked_at, null);
    const resolved = await resolveFamilyEntitlements(family.id);
    assert.equal(resolved.premium.source, 'gift');
    const famRow = await db.query('SELECT subscription_status, is_lifetime_free FROM family WHERE id = $1', [
      family.id,
    ]);
    assert.equal(famRow.rows[0].subscription_status, 'active');
    assert.equal(famRow.rows[0].is_lifetime_free, false);
  });

  await t.test('two concurrent grants never leave two active admin rows', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const expiresAt = new Date(Date.now() + 86400000);
    const results = await Promise.allSettled([
      grantAdminPremium(family.id, {
        expiresAt,
        permanent: false,
        adminId: null,
        reason: 'race a',
      }),
      grantAdminPremium(family.id, {
        expiresAt,
        permanent: false,
        adminId: null,
        reason: 'race b',
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    assert.ok(fulfilled.length >= 1);
    assert.equal(await activeAdminCount(db, family.id), 1);
  });

  await t.test('grant/revoke race leaves at most one active admin row', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const expiresAt = new Date(Date.now() + 86400000);
    await Promise.allSettled([
      grantAdminPremium(family.id, {
        expiresAt,
        permanent: false,
        adminId: null,
        reason: 'race grant',
      }),
      revokeAdminPremium(family.id, { reason: 'race revoke' }),
    ]);
    assert.ok((await activeAdminCount(db, family.id)) <= 1);
    const resolved = await resolveFamilyEntitlements(family.id);
    if ((await activeAdminCount(db, family.id)) === 1) {
      assert.equal(resolved.premium.source, 'admin');
      assert.equal(resolved.premium.active, true);
    } else {
      assert.notEqual(resolved.premium.source, 'admin');
    }
  });

  await t.test('payment audit and admin audit on grant/revoke with actor', async () => {
    const family = await createFamilyDirect(db, POST_CUTOFF);
    const actor = crypto.randomUUID();
    await db.query(
      `INSERT INTO parent (id, family_id, email, password_hash, name, is_admin, verified, onboarding_completed)
       VALUES ($1, $2, $3, 'x', 'Admin Actor', true, true, true)`,
      [actor, family.id, `actor-${actor}@example.com`]
    );
    await grantAdminPremium(family.id, {
      expiresAt: new Date(Date.now() + 86400000),
      permanent: false,
      adminId: actor,
      reason: 'audited temp grant',
    });
    await grantAdminPremium(family.id, {
      permanent: true,
      adminId: actor,
      reason: 'audited perm grant',
    });
    await revokeAdminPremium(family.id, { adminId: actor, reason: 'audited revoke' });

    const pay = await db.query(
      `SELECT event_type, admin_id, reason, metadata FROM payment_audit_log
       WHERE family_id = $1 AND event_type LIKE 'admin_grant%'
       ORDER BY received_at ASC`,
      [family.id]
    );
    const types = pay.rows.map((r) => r.event_type);
    assert.ok(types.includes('admin_grant_temporary'));
    assert.ok(types.includes('admin_grant_permanent'));
    assert.ok(types.includes('admin_grant_revoked'));
    for (const row of pay.rows) {
      assert.equal(row.admin_id, actor);
      assert.ok(row.reason);
      const blob = JSON.stringify(row.metadata || {});
      assert.doesNotMatch(blob, /access_token|csrf_token|JWT|receipt/i);
    }

    const adminLog = await db.query(
      `SELECT action, admin_id, metadata FROM admin_audit_log
       WHERE target_family_id = $1 AND action LIKE 'premium_grant%'
       ORDER BY created_at ASC`,
      [family.id]
    );
    assert.ok(adminLog.rowCount >= 3);
    for (const row of adminLog.rows) {
      assert.equal(row.admin_id, actor);
    }
  });

  await t.test('HTTP auth, CSRF, validation, grant, billing-off, mirrors', async () => {
    delete require.cache[require.resolve('../app')];
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const parentSession = await registerAndLogin(http.baseUrl);
      const adminSession = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const target = await createFamilyDirect(db, POST_CUTOFF);

      const unauth = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/overview`);
      assert.equal(unauth.status, 401);

      const parentGet = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/overview`, {
        headers: { Cookie: cookieHeader(parentSession.cookies) },
      });
      assert.equal(parentGet.status, 403);

      const noCsrf = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader(adminSession.cookies),
        },
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          reason: 'missing csrf',
        }),
      });
      assert.equal(noCsrf.status, 403);
      const noCsrfBody = JSON.parse(await noCsrf.text());
      assert.equal(noCsrfBody.code, 'CSRF_MISSING');

      const parentPost = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(parentSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          reason: 'parent cannot grant',
        }),
      });
      assert.equal(parentPost.status, 403);

      const badUuid = await fetch(`${http.baseUrl}/api/admin/families/not-a-uuid/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          reason: 'bad uuid',
        }),
      });
      assert.equal(badUuid.status, 400);

      const missingFam = await fetch(
        `${http.baseUrl}/api/admin/families/${crypto.randomUUID()}/premium-grant`,
        {
          method: 'POST',
          headers: headers(adminSession),
          body: JSON.stringify({
            type: 'temporary',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            reason: 'missing family',
          }),
        }
      );
      assert.equal(missingFam.status, 404);

      const noReason = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      assert.equal(noReason.status, 400);

      const blankReason = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          reason: '   ',
        }),
      });
      assert.equal(blankReason.status, 400);

      const badExpires = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: 'not-a-date',
          reason: 'bad expires',
        }),
      });
      assert.equal(badExpires.status, 400);

      const pastExpires = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() - 86400000).toISOString(),
          reason: 'past expires',
        }),
      });
      assert.equal(pastExpires.status, 400);

      const permWithExpires = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'permanent',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          reason: 'permanent plus expires forbidden',
        }),
      });
      assert.equal(permWithExpires.status, 400);

      const injectedAdmin = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          reason: 'inject admin id',
          adminId: crypto.randomUUID(),
        }),
      });
      assert.equal(injectedAdmin.status, 400);

      const granted = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'temporary',
          expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
          reason: 'http temporary grant',
        }),
      });
      const grantedText = await granted.text();
      assert.equal(granted.status, 200, grantedText);
      const grantedBody = JSON.parse(grantedText);
      assert.equal(grantedBody.applied, true);
      assert.equal(grantedBody.premium.source, 'admin');
      assert.equal(grantedBody.requires_paywall, false);

      const audit = await db.query(
        `SELECT admin_id, reason, metadata FROM payment_audit_log
         WHERE family_id = $1 AND event_type = 'admin_grant_temporary'
         ORDER BY received_at DESC LIMIT 1`,
        [target.id]
      );
      assert.equal(audit.rows[0].admin_id, adminSession.adminId);
      assert.equal(audit.rows[0].reason, 'http temporary grant');
      assert.notEqual(audit.rows[0].admin_id, JSON.parse(grantedText).adminId || 'from-body');

      const overview = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/overview`, {
        headers: { Cookie: cookieHeader(adminSession.cookies) },
      });
      assert.equal(overview.status, 200);
      const overviewBody = JSON.parse(await overview.text());
      assert.equal(overviewBody.premium.source, 'admin');
      assert.ok(Array.isArray(overviewBody.entitlements));

      const revoked = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant/revoke`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({ reason: 'http revoke' }),
      });
      assert.equal(revoked.status, 200);
      const revokedBody = JSON.parse(await revoked.text());
      assert.equal(revokedBody.revoked, true);
      assert.notEqual(revokedBody.premium.source, 'admin');
      const famRow = await db.query(
        'SELECT subscription_status, is_lifetime_free FROM family WHERE id = $1',
        [target.id]
      );
      if (revokedBody.premium.active) {
        assert.equal(famRow.rows[0].subscription_status, 'active');
      } else {
        assert.ok(['expired', 'none'].includes(famRow.rows[0].subscription_status));
      }
      assert.equal(famRow.rows[0].is_lifetime_free, false);

      const billingSnap = snapshotBillingEnv();
      process.env.BILLING_UI_DISABLED = 'true';
      const appSettings = require('../db/app-settings');
      await appSettings.setPaymentEnabled(false);
      await appSettings.setIapPaidRolloutReady(false);
      try {
        const billingFam = await createFamilyDirect(db, POST_CUTOFF);
        const billingGrant = await fetch(
          `${http.baseUrl}/api/admin/families/${billingFam.id}/premium-grant`,
          {
            method: 'POST',
            headers: headers(adminSession),
            body: JSON.stringify({
              type: 'permanent',
              reason: 'billing off still grants',
            }),
          }
        );
        const billingText = await billingGrant.text();
        assert.equal(billingGrant.status, 200, billingText);
        const billingBody = JSON.parse(billingText);
        assert.equal(billingBody.applied, true);
        assert.equal(billingBody.premium.active, true);
        assert.equal(billingBody.premium.source, 'admin');
        assert.equal(billingBody.requires_paywall, false);
        const mirrors = await db.query(
          `SELECT f.subscription_status, fs.tier
           FROM family f
           LEFT JOIN family_subscriptions fs ON fs.family_id = f.id
           WHERE f.id = $1`,
          [billingFam.id]
        );
        assert.equal(mirrors.rows[0].subscription_status, 'active');
        assert.equal(mirrors.rows[0].tier, 'paid');
      } finally {
        await disablePublicBillingForTest(billingSnap);
        restoreBillingEnv(billingSnap);
      }
    } finally {
      await http.close();
    }
  });

  await t.test('HTTP Hub: active intro_year stays Premium Aktiv after admin revoke', async () => {
    const { setLifetimeFreeUntil } = require('../src/lib/payment-settings');
    await setLifetimeFreeUntil('2020-01-01T00:00:00+02:00');
    delete require.cache[require.resolve('../app')];
    const { createApp } = require('../app');
    const http = await listenApp(createApp);
    try {
      const adminSession = await loginAsAdmin(http.baseUrl, db, await registerAndLogin(http.baseUrl));
      const target = await createFamilyDirect(db, '2026-01-15T08:00:00+02:00');
      await resolveFamilyEntitlements(target.id);

      const before = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/overview`, {
        headers: { Cookie: cookieHeader(adminSession.cookies) },
      });
      const beforeText = await before.text();
      assert.equal(before.status, 200, beforeText);
      const beforeBody = JSON.parse(beforeText);
      assert.equal(beforeBody.premium.active, true);
      assert.equal(beforeBody.premium.source, 'intro_year');

      const granted = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({
          type: 'permanent',
          reason: 'temporary overlap with live intro year',
        }),
      });
      const grantedText = await granted.text();
      assert.equal(granted.status, 200, grantedText);
      const grantedBody = JSON.parse(grantedText);
      assert.equal(grantedBody.premium.active, true);
      assert.equal(grantedBody.premium.source, 'admin');

      const revoked = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/premium-grant/revoke`, {
        method: 'POST',
        headers: headers(adminSession),
        body: JSON.stringify({ reason: 'restore intro year' }),
      });
      const revokedText = await revoked.text();
      assert.equal(revoked.status, 200, revokedText);
      const revokedBody = JSON.parse(revokedText);
      assert.equal(revokedBody.premium.active, true);
      assert.equal(revokedBody.premium.source, 'intro_year');

      const after = await fetch(`${http.baseUrl}/api/admin/families/${target.id}/overview`, {
        headers: { Cookie: cookieHeader(adminSession.cookies) },
      });
      const afterBody = JSON.parse(await after.text());
      assert.equal(afterBody.premium.active, true);
      assert.equal(afterBody.premium.source, 'intro_year');
      const intro = (afterBody.entitlements || []).find((row) => row.source === 'intro_year');
      assert.ok(intro);
      assert.equal(intro.active, true);
      assert.equal(intro.effective, true);
    } finally {
      await http.close();
      await setLifetimeFreeUntil('2026-09-14T00:00:00+02:00');
    }
  });

  await db.cleanup();
});
