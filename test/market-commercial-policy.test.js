'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ENTITLEMENT,
  DEFAULT_TRIAL_DAYS,
  getMarketCommercialPolicy,
  trialEndsAt,
  isComputedTrialActive,
} = require('../src/lib/market-commercial-policy');
const {
  GATE_KEYS,
  COUNTRY_SPECIFIC_GATE_KEYS,
  gateKeyForCountry,
} = require('../src/lib/market-region');
const { setupTestDb } = require('./helpers/setup.js');

describe('market commercial policy table (ADR-023)', () => {
  it('Sweden is the only intro-year market and does not require billing at signup', () => {
    const se = getMarketCommercialPolicy('SE');
    assert.equal(se.entitlement, ENTITLEMENT.INTRO_YEAR);
    assert.equal(se.trialDays, 0);
    assert.equal(se.requiresBillingReady, false);
  });

  it('new markets inherit 14-day trial that requires billing ready', () => {
    assert.equal(DEFAULT_TRIAL_DAYS, 14);
    for (const code of ['IE', 'FI', 'NL', 'DE', 'GB', 'AT', 'FR', 'ES']) {
      const policy = getMarketCommercialPolicy(code);
      assert.equal(policy.entitlement, ENTITLEMENT.TRIAL, code);
      assert.equal(policy.trialDays, DEFAULT_TRIAL_DAYS);
      assert.equal(policy.requiresBillingReady, true, code);
    }
  });

  it('missing country_code follows the SE family default, not trial', () => {
    const missing = getMarketCommercialPolicy(null);
    assert.equal(missing.countryCode, 'SE');
    assert.equal(missing.entitlement, ENTITLEMENT.INTRO_YEAR);
  });

  it('is not a scattered Ireland if', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/market-commercial-policy.js'),
      'utf8'
    );
    assert.doesNotMatch(src, /countryCode === ['"]IE['"]/);
    assert.match(src, /INTRO_YEAR_COUNTRY_CODES/);
  });
});

describe('computed 14-day trial clock (A4/A5)', () => {
  const created = new Date('2026-10-01T00:00:00+01:00');

  it('trial_ends_at is created_at plus 14 calendar days in Europe/Dublin', () => {
    const ends = trialEndsAt(created, { countryCode: 'IE', timeZone: 'Europe/Dublin' });
    assert.equal(ends.toISOString(), new Date('2026-10-15T00:00:00+01:00').toISOString());
  });

  it('A4: one second before expiry the trial is still active', () => {
    const ends = trialEndsAt(created, { countryCode: 'IE', timeZone: 'Europe/Dublin' });
    assert.equal(isComputedTrialActive({
      countryCode: 'IE',
      createdAt: created,
      now: new Date(ends.getTime() - 1000),
      timeZone: 'Europe/Dublin',
    }), true);
  });

  it('A5: at expiry the computed trial is no longer active', () => {
    const ends = trialEndsAt(created, { countryCode: 'IE', timeZone: 'Europe/Dublin' });
    assert.equal(isComputedTrialActive({
      countryCode: 'IE',
      createdAt: created,
      now: ends,
      timeZone: 'Europe/Dublin',
    }), false);
  });

  it('Sweden never uses the computed trial clock', () => {
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: created,
      now: created,
      timeZone: 'Europe/Stockholm',
    }), false);
  });
});

describe('NL remains prepare-only (no market_nl_open in this PR)', () => {
  it('NL still routes through market_eu_open, which stays a bulk-EU debt key', () => {
    assert.equal(GATE_KEYS.NL, undefined);
    assert.equal(COUNTRY_SPECIFIC_GATE_KEYS.NL, undefined);
    assert.equal(gateKeyForCountry('NL'), GATE_KEYS.EU);
    assert.equal(GATE_KEYS.EU, 'market_eu_open');
  });
});

test('activation funnel country_code=IE is isolated from SE (A11)', async (t) => {
  const db = await setupTestDb();
  if (db.skip) {
    t.skip('No real TEST_DATABASE_URL');
    return;
  }
  const runtimeDb = require('../src/lib/db');
  const { getActivationFunnelCohorts } = require('../db/activation-funnel');
  try {
    await runtimeDb.query(
      `INSERT INTO family (name, subscription_status, is_lifetime_free, country_code, market_region, timezone)
       VALUES
         ('Funnel SE', 'none', false, 'SE', 'EU', 'Europe/Stockholm'),
         ('Funnel IE', 'none', false, 'IE', 'EU', 'Europe/Dublin')`
    );
    const all = await getActivationFunnelCohorts(1);
    const ieOnly = await getActivationFunnelCohorts(1, { countryCode: 'IE' });
    const seOnly = await getActivationFunnelCohorts(1, { countryCode: 'SE' });
    const allSignups = all.cohorts.reduce((sum, row) => sum + row.counts.signup, 0);
    const ieSignups = ieOnly.cohorts.reduce((sum, row) => sum + row.counts.signup, 0);
    const seSignups = seOnly.cohorts.reduce((sum, row) => sum + row.counts.signup, 0);
    assert.ok(allSignups >= 2, `expected mixed funnel, got ${allSignups}`);
    assert.ok(ieSignups >= 1, `expected IE signup, got ${ieSignups}`);
    assert.ok(seSignups >= 1, `expected SE signup, got ${seSignups}`);
    assert.ok(ieSignups < allSignups, 'IE filter must drop SE families');
    assert.equal(ieOnly.childAccessDiagnostics.window_weeks, 1);
  } finally {
    await db.cleanup();
  }
});
