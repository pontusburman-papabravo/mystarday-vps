'use strict';

/**
 * Finland with the free offer on and billing off:
 * families 1–25 register and receive Premium; family 26 follows the
 * ordinary billing rule and gets no account. Opening Germany does not
 * open Austria or France. Public offer copy stays hidden while the
 * country gate is closed.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { DateTime } = require('luxon');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { disablePublicBillingForTest } = require('./helpers/public-billing');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

function uniqueEmail(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}@example.com`;
}

async function setFlag(pg, key, enabled) {
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'country-gate test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

async function seedCohort(pg, countryCode, enabled) {
  await pg.query(
    `INSERT INTO market_launch_cohort_config (country_code, enabled, slot_limit, assigned_count)
     VALUES ($1, $2, 25, 0)
     ON CONFLICT (country_code) DO UPDATE
       SET enabled = EXCLUDED.enabled`,
    [countryCode, enabled]
  );
}

async function register(baseUrl, countryCode, name) {
  const email = uniqueEmail(countryCode.toLowerCase());
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password: 'testpass123',
      country_code: countryCode,
      preferred_locale: 'fi-FI',
    }),
  });
  const text = await res.text();
  return { status: res.status, email, body: text ? JSON.parse(text) : null };
}

test('Finland 1-25 get Premium, family 26 does not, and DE does not open AT or FR', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { resolveFamilyEntitlements } = require('../src/lib/family-entitlements');
  const { createApp } = require('../app');
  await disablePublicBillingForTest();
  await setFlag(pg, 'launch_cohort_offer_v1', true);
  await setFlag(pg, 'market_eu_open', true);
  await setFlag(pg, 'market_fi_open', false);
  await setFlag(pg, 'market_de_open', false);
  await setFlag(pg, 'market_at_open', false);
  await setFlag(pg, 'market_fr_open', false);
  await seedCohort(pg, 'FI', true);
  await seedCohort(pg, 'DE', true);
  await seedCohort(pg, 'AT', true);

  const http = await listenApp(createApp);
  try {
    const closedOffer = await fetch(`${http.baseUrl}/api/market/launch-cohort-offer?country_code=FI&locale=fi-FI`);
    const closedBody = await closedOffer.json();
    assert.equal(closedBody.show, false);
    assert.equal(closedBody.slots_remaining, null);

    const closedGates = await fetch(`${http.baseUrl}/api/market/registration-gates`);
    const closedGateBody = await closedGates.json();
    assert.equal(closedGateBody.signup_allowed.FI, false);
    assert.equal(closedGateBody.market_eu_open, true);
    assert.equal(closedGateBody.signup_allowed.DE, false);
    assert.equal(closedGateBody.signup_allowed.AT, false);
    assert.equal(closedGateBody.signup_allowed.FR, false);

    const blocked = await register(http.baseUrl, 'FI', 'Stängd');
    assert.equal(blocked.status, 403, JSON.stringify(blocked.body));
    assert.equal(blocked.body.code, 'MARKET_FI_CLOSED');
    const blockedParent = await pg.query('SELECT id FROM parent WHERE LOWER(email) = $1', [blocked.email]);
    assert.equal(blockedParent.rows.length, 0);

    await setFlag(pg, 'market_fi_open', true);
    await setFlag(pg, 'market_de_open', true);

    const openGates = await fetch(`${http.baseUrl}/api/market/registration-gates`);
    const openGateBody = await openGates.json();
    assert.equal(openGateBody.signup_allowed.FI, true);
    assert.equal(openGateBody.market_fi_open, true);
    assert.equal(openGateBody.signup_allowed.DE, true);
    assert.equal(openGateBody.signup_allowed.AT, false);
    assert.equal(openGateBody.signup_allowed.FR, false);
    assert.equal(openGateBody.public_billing_usable, false);
    assert.equal(openGateBody.signup_allowed.IE, false);
    assert.equal(openGateBody.signup_allowed.SE, false);
    assert.equal(openGateBody.signup_allowed.CA, true);
    assert.equal(openGateBody.market_ca_open, true);
    assert.equal(openGateBody.market_ie_open, false);

    const liveOffer = await fetch(`${http.baseUrl}/api/market/launch-cohort-offer?country_code=FI&locale=fi-FI`);
    const liveOfferBody = await liveOffer.json();
    assert.equal(liveOfferBody.show, true);
    assert.equal(liveOfferBody.slots_remaining, 25);

    const hiddenDe = await fetch(`${http.baseUrl}/api/market/launch-cohort-offer?country_code=AT&locale=de-DE`);
    const hiddenDeBody = await hiddenDe.json();
    assert.equal(hiddenDeBody.show, false);
    assert.equal(hiddenDeBody.slots_remaining, null);

    const created = [];
    for (let n = 1; n <= 25; n += 1) {
      const row = await register(http.baseUrl, 'FI', `Familj ${n}`);
      assert.equal(row.status, 201, `family ${n}: ${JSON.stringify(row.body)}`);
      created.push(row.email);
    }

    const fullOffer = await fetch(`${http.baseUrl}/api/market/launch-cohort-offer?country_code=FI&locale=fi-FI`);
    const fullOfferBody = await fullOffer.json();
    assert.equal(fullOfferBody.show, false);
    assert.equal(fullOfferBody.slots_remaining, null);
    const fullGates = await fetch(`${http.baseUrl}/api/market/registration-gates`);
    const fullGateBody = await fullGates.json();
    assert.equal(fullGateBody.signup_allowed.FI, false);

    const families = await pg.query(
      `SELECT f.id, f.subscription_status, e.source, g.slot_number, g.granted_at, g.expires_at AS grant_expires
       FROM parent p
       JOIN family f ON f.id = p.family_id
       JOIN family_entitlements e ON e.family_id = f.id AND e.source = 'launch_cohort' AND e.revoked_at IS NULL
       JOIN family_launch_cohort_grant g ON g.family_id = f.id
       WHERE LOWER(p.email) = ANY($1::text[])
       ORDER BY g.slot_number`,
      [created]
    );
    assert.equal(families.rows.length, 25);
    const slots = families.rows.map((row) => Number(row.slot_number));
    assert.deepEqual(slots, Array.from({ length: 25 }, (_, i) => i + 1));
    for (const row of families.rows) {
      assert.equal(row.subscription_status, 'none');
      assert.equal(row.source, 'launch_cohort');
      const access = await resolveFamilyEntitlements(row.id);
      assert.equal(access.premium.active, true);
      assert.equal(access.premium.source, 'launch_cohort');
      const end = DateTime.fromJSDate(new Date(row.grant_expires), { zone: 'Europe/Helsinki' });
      const start = DateTime.fromJSDate(new Date(row.granted_at), { zone: 'Europe/Helsinki' });
      assert.equal(end.toFormat('yyyy-LL-dd HH:mm'), start.plus({ months: 12 }).toFormat('yyyy-LL-dd HH:mm'));
    }

    const twentySixth = await register(http.baseUrl, 'FI', 'Familj 26');
    assert.equal(twentySixth.status, 403, JSON.stringify(twentySixth.body));
    assert.equal(twentySixth.body.code, 'MARKET_BILLING_NOT_READY');
    const leftover = await pg.query('SELECT id FROM parent WHERE LOWER(email) = $1', [twentySixth.email]);
    assert.equal(leftover.rows.length, 0);
    const count = await pg.query(
      `SELECT assigned_count FROM market_launch_cohort_config WHERE country_code = 'FI'`
    );
    assert.equal(Number(count.rows[0].assigned_count), 25);

    const austria = await register(http.baseUrl, 'AT', 'Wien');
    assert.equal(austria.status, 403);
    assert.notEqual(austria.body.code, undefined);
    const france = await register(http.baseUrl, 'FR', 'Paris');
    assert.equal(france.status, 403);
    const germany = await register(http.baseUrl, 'DE', 'Berlin');
    assert.equal(germany.status, 201, JSON.stringify(germany.body));
    const deFamily = await pg.query(
      `SELECT e.source FROM parent p
       JOIN family_entitlements e ON e.family_id = p.family_id AND e.revoked_at IS NULL
       WHERE LOWER(p.email) = $1`,
      [germany.email]
    );
    assert.equal(deFamily.rows[0].source, 'launch_cohort');

    const first = families.rows[0];
    await pg.query(
      `UPDATE family_launch_cohort_grant
          SET starts_at = '2025-01-01T10:00:00Z', expires_at = '2026-01-01T10:00:00Z'
        WHERE family_id = $1`,
      [first.id]
    );
    await pg.query(
      `UPDATE family_entitlements
          SET starts_at = '2025-01-01T10:00:00Z', expires_at = '2026-01-01T10:00:00Z'
        WHERE family_id = $1 AND source = 'launch_cohort'`,
      [first.id]
    );
    const expired = await resolveFamilyEntitlements(first.id, new Date('2026-06-01T12:00:00Z'));
    assert.equal(expired.premium.active, false);
    assert.notEqual(expired.access_kind, 'trial');
    assert.notEqual(expired.premium.source, 'trial');
    const audit = await pg.query(
      `SELECT amount_minor, currency, store
         FROM payment_audit_log
        WHERE family_id = $1 AND event_type = 'launch_cohort_granted'`,
      [first.id]
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].amount_minor, null);
    assert.equal(audit.rows[0].currency, null);
    assert.equal(audit.rows[0].store, null);
  } finally {
    await http.close();
    await db.cleanup();
  }
});

test('concurrent registrations at the last Finland place leave exactly one winner', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { createApp } = require('../app');
  await disablePublicBillingForTest();
  await setFlag(pg, 'launch_cohort_offer_v1', true);
  await setFlag(pg, 'market_fi_open', true);
  await setFlag(pg, 'market_eu_open', true);
  await seedCohort(pg, 'FI', true);
  await pg.query(
    `UPDATE market_launch_cohort_config SET assigned_count = 24 WHERE country_code = 'FI'`
  );

  const http = await listenApp(createApp);
  try {
    // The app pool allows five connections. Three in-flight registrations
    // still race the last place without exhausting that pool.
    const attempts = await Promise.all(
      Array.from({ length: 3 }, (_, i) => register(http.baseUrl, 'FI', `Race ${i + 1}`))
    );
    const won = attempts.filter((row) => row.status === 201);
    const lost = attempts.filter((row) => row.status === 403);
    assert.equal(won.length, 1, JSON.stringify(attempts.map((row) => ({ status: row.status, code: row.body && row.body.code }))));
    assert.equal(lost.length, 2, JSON.stringify(attempts.map((row) => ({ status: row.status, code: row.body && row.body.code }))));
    for (const row of lost) {
      assert.equal(row.body.code, 'MARKET_BILLING_NOT_READY');
      const parent = await pg.query('SELECT id FROM parent WHERE LOWER(email) = $1', [row.email]);
      assert.equal(parent.rows.length, 0);
    }
    const winner = await pg.query(
      `SELECT e.source FROM parent p
       JOIN family_entitlements e ON e.family_id = p.family_id AND e.revoked_at IS NULL
       WHERE LOWER(p.email) = $1`,
      [won[0].email]
    );
    assert.equal(winner.rows[0].source, 'launch_cohort');
    const count = await pg.query(
      `SELECT assigned_count FROM market_launch_cohort_config WHERE country_code = 'FI'`
    );
    assert.equal(Number(count.rows[0].assigned_count), 25);
    const parents = await pg.query(
      `SELECT COUNT(*)::int AS n FROM parent WHERE LOWER(email) = ANY($1::text[])`,
      [attempts.map((row) => row.email)]
    );
    assert.equal(parents.rows[0].n, 1);
  } finally {
    await http.close();
    await db.cleanup();
  }
});
