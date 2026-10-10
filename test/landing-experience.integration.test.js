'use strict';

/**
 * The public landing payload reads the real cohort ledger.
 * It does not include family names, and a closed country has no place count.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');
const { listenApp } = require('./helpers/http.js');
const { disablePublicBillingForTest } = require('./helpers/public-billing');

process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.RATE_LIMIT_ENABLED = 'false';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
}

async function setFlag(pg, key, enabled) {
  await pg.query(
    `INSERT INTO feature_flag (key, enabled, description)
     VALUES ($1, $2, 'landing experience test')
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [key, enabled]
  );
}

async function seedCohort(pg, countryCode, enabled, assigned) {
  await pg.query(
    `INSERT INTO market_launch_cohort_config (country_code, enabled, slot_limit, assigned_count)
     VALUES ($1, $2, 25, $3)
     ON CONFLICT (country_code) DO UPDATE
       SET enabled = EXCLUDED.enabled,
           assigned_count = EXCLUDED.assigned_count`,
    [countryCode, enabled, assigned]
  );
}

async function landing(baseUrl, country, locale) {
  const res = await fetch(
    `${baseUrl}/api/market/landing-experience?country_code=${country}&locale=${encodeURIComponent(locale)}`
  );
  const body = await res.json();
  return { status: res.status, body };
}

test('landing experience follows the country gate and the cohort ledger', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  const pg = require('../src/lib/db');
  const { createApp } = require('../app');
  await disablePublicBillingForTest();
  await setFlag(pg, 'launch_cohort_offer_v1', true);
  await setFlag(pg, 'market_fi_open', false);
  await setFlag(pg, 'market_de_open', false);
  await seedCohort(pg, 'FI', true, 7);
  await seedCohort(pg, 'DE', true, 0);

  const http = await listenApp(createApp);
  try {
    const closed = await landing(http.baseUrl, 'FI', 'sv-SE');
    assert.equal(closed.status, 200);
    assert.equal(closed.body.status, 'coming_soon');
    assert.equal(closed.body.launch_cohort.slots_remaining, null);
    assert.equal(closed.body.launch_cohort.slots_assigned, null);
    assert.equal(Object.prototype.hasOwnProperty.call(closed.body, 'family_name'), false);

    await setFlag(pg, 'market_fi_open', true);
    const swedish = await landing(http.baseUrl, 'FI', 'sv-SE');
    const english = await landing(http.baseUrl, 'FI', 'en-GB');
    assert.equal(swedish.body.country_code, 'FI');
    assert.equal(english.body.country_code, 'FI');
    assert.equal(swedish.body.launch_cohort.slots_assigned, 7);
    assert.equal(english.body.launch_cohort.slots_assigned, 7);
    assert.equal(swedish.body.launch_cohort.slots_remaining, 18);
    assert.equal(english.body.status, 'launch_cohort');
    assert.notEqual(swedish.body.copy.cta, english.body.copy.cta);

    await seedCohort(pg, 'FI', true, 24);
    const oneLeft = await landing(http.baseUrl, 'FI', 'en-GB');
    assert.equal(oneLeft.body.launch_cohort.slots_remaining, 1);

    await seedCohort(pg, 'FI', true, 25);
    const full = await landing(http.baseUrl, 'FI', 'en-GB');
    assert.equal(full.body.launch_cohort.slots_remaining, 0);
    assert.equal(full.body.status, 'full_unavailable');

    await setFlag(pg, 'launch_cohort_offer_v1', false);
    const flagOff = await landing(http.baseUrl, 'FI', 'en-GB');
    assert.equal(flagOff.body.launch_cohort.phase, 'hidden');
    assert.equal(flagOff.body.launch_cohort.slots_remaining, null);

    await setFlag(pg, 'launch_cohort_offer_v1', true);
    await seedCohort(pg, 'FI', false, 7);
    const countryOff = await landing(http.baseUrl, 'FI', 'en-GB');
    assert.equal(countryOff.body.launch_cohort.phase, 'hidden');
    assert.equal(countryOff.body.launch_cohort.slots_assigned, null);

    const germany = await landing(http.baseUrl, 'DE', 'en-GB');
    assert.equal(germany.body.status, 'coming_soon');
    assert.equal(germany.body.launch_cohort.slots_remaining, null);
    assert.doesNotMatch(JSON.stringify(germany.body.copy), /59/);

    const sweden = await landing(http.baseUrl, 'SE', 'en-GB');
    assert.equal(sweden.body.country_code, 'SE');
    assert.equal(sweden.body.commercial.entitlement, 'trial');
    assert.match(sweden.body.commercial.monthly_price, /59/);
    assert.equal(sweden.body.launch_cohort.slots_remaining, null);

    const canada = await landing(http.baseUrl, 'CA', 'fr-FR');
    assert.equal(canada.body.commercial.entitlement, 'complimentary_until');
    assert.equal(canada.body.copy_fallback, true);
    assert.equal(canada.body.commercial.monthly_price, null);
    assert.equal(canada.body.stores.android, 'unavailable');
  } finally {
    await http.close();
    await db.cleanup();
  }
});
