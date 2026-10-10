'use strict';

const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DateTime } = require('luxon');
const {
  ENTITLEMENT,
  DEFAULT_TRIAL_DAYS,
  SWEDEN_TRIAL_FROM_ZONE,
  SWEDEN_TRIAL_FROM_ISO,
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

  it('Sweden trial starts at midnight Europe/Stockholm, not UTC midnight', () => {
    assert.equal(SWEDEN_TRIAL_FROM_ZONE, 'Europe/Stockholm');
    const midnight = DateTime.fromObject(
      { year: 2026, month: 10, day: 3, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: 'Europe/Stockholm' }
    );
    assert.equal(midnight.isValid, true);
    assert.equal(midnight.toFormat('ZZ'), '+02:00');
    assert.equal(new Date(SWEDEN_TRIAL_FROM_ISO).getTime(), midnight.toMillis());
    assert.equal(midnight.toUTC().toISO(), '2026-10-02T22:00:00.000Z');
    assert.notEqual(midnight.toUTC().toISO(), '2026-10-03T00:00:00.000Z');

    const before = getMarketCommercialPolicy('SE', { createdAt: new Date(midnight.toMillis() - 1) });
    assert.equal(before.entitlement, ENTITLEMENT.INTRO_YEAR);

    const atMidnight = getMarketCommercialPolicy('SE', { createdAt: midnight.toJSDate() });
    assert.equal(atMidnight.entitlement, ENTITLEMENT.TRIAL);
    assert.equal(atMidnight.trialDays, DEFAULT_TRIAL_DAYS);

    const utcMidnight = getMarketCommercialPolicy('SE', { createdAt: '2026-10-03T00:00:00.000Z' });
    assert.equal(utcMidnight.entitlement, ENTITLEMENT.TRIAL);

    const ends = trialEndsAt(midnight.toJSDate(), {
      countryCode: 'SE',
      timeZone: 'Europe/Stockholm',
      trialDays: 14,
    });
    const endsStockholm = DateTime.fromJSDate(ends, { zone: 'Europe/Stockholm' });
    assert.equal(endsStockholm.toFormat('yyyy-LL-dd HH:mm:ss'), '2026-10-17 00:00:00');
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: midnight.toJSDate(),
      now: new Date(ends.getTime() - 1000),
      timeZone: 'Europe/Stockholm',
    }), true);
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: midnight.toJSDate(),
      now: ends,
      timeZone: 'Europe/Stockholm',
    }), false);
  });

  it('Sweden stays intro year through 2 Oct 2026 and switches to a 14-day trial on 3 Oct', () => {
    const before = getMarketCommercialPolicy('SE', { createdAt: '2026-10-02T23:59:59+02:00' });
    assert.equal(before.entitlement, ENTITLEMENT.INTRO_YEAR);
    assert.equal(before.trialDays, 0);
    assert.equal(before.requiresBillingReady, false);

    const onStart = getMarketCommercialPolicy('SE', { createdAt: '2026-10-03T00:00:00+02:00' });
    assert.equal(onStart.entitlement, ENTITLEMENT.TRIAL);
    assert.equal(onStart.trialDays, DEFAULT_TRIAL_DAYS);
    assert.equal(onStart.requiresBillingReady, true);
  });

  it('Ireland is complimentary until a fixed instant, not a converting trial', () => {
    const ie = getMarketCommercialPolicy('IE');
    assert.equal(ie.entitlement, ENTITLEMENT.COMPLIMENTARY_UNTIL);
    assert.equal(ie.trialDays, 0);
    assert.equal(ie.requiresBillingReady, false);
  });

  it('new markets inherit 14-day trial that requires billing ready', () => {
    assert.equal(DEFAULT_TRIAL_DAYS, 14);
    for (const code of ['FI', 'NL', 'DE', 'GB', 'AT', 'FR', 'ES']) {
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

  it('Ireland never uses the computed trial clock', () => {
    assert.equal(isComputedTrialActive({
      countryCode: 'IE',
      createdAt: created,
      now: created,
      timeZone: 'Europe/Dublin',
    }), false);
  });

  it('trial_ends_at is created_at plus 14 calendar days in Europe/Helsinki for Finland', () => {
    const fiCreated = new Date('2026-10-01T00:00:00+03:00');
    const ends = trialEndsAt(fiCreated, { countryCode: 'FI', timeZone: 'Europe/Helsinki' });
    assert.equal(ends.toISOString(), new Date('2026-10-15T00:00:00+03:00').toISOString());
  });

  it('A4: one second before expiry the Finland trial is still active', () => {
    const fiCreated = new Date('2026-10-01T00:00:00+03:00');
    const ends = trialEndsAt(fiCreated, { countryCode: 'FI', timeZone: 'Europe/Helsinki' });
    assert.equal(isComputedTrialActive({
      countryCode: 'FI',
      createdAt: fiCreated,
      now: new Date(ends.getTime() - 1000),
      timeZone: 'Europe/Helsinki',
    }), true);
  });

  it('A5: at expiry the computed Finland trial is no longer active', () => {
    const fiCreated = new Date('2026-10-01T00:00:00+03:00');
    const ends = trialEndsAt(fiCreated, { countryCode: 'FI', timeZone: 'Europe/Helsinki' });
    assert.equal(isComputedTrialActive({
      countryCode: 'FI',
      createdAt: fiCreated,
      now: ends,
      timeZone: 'Europe/Helsinki',
    }), false);
  });

  it('Sweden registered on 1 Oct does not use the computed trial clock', () => {
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: created,
      now: created,
      timeZone: 'Europe/Stockholm',
    }), false);
  });

  it('Sweden from 3 Oct has a 14-day trial that ends on the 14th calendar day', () => {
    const seCreated = new Date('2026-10-03T00:00:00+02:00');
    const ends = trialEndsAt(seCreated, { countryCode: 'SE', timeZone: 'Europe/Stockholm', trialDays: 14 });
    assert.equal(ends.toISOString(), new Date('2026-10-17T00:00:00+02:00').toISOString());
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: seCreated,
      now: new Date(ends.getTime() - 1000),
      timeZone: 'Europe/Stockholm',
    }), true);
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: seCreated,
      now: ends,
      timeZone: 'Europe/Stockholm',
    }), false);
    assert.equal(isComputedTrialActive({
      countryCode: 'SE',
      createdAt: '2026-10-02T12:00:00+02:00',
      now: new Date('2026-10-10T12:00:00+02:00'),
      timeZone: 'Europe/Stockholm',
    }), false);
  });
});

describe('NL has its own closed gate', () => {
  it('NL uses market_nl_open and does not follow market_eu_open', () => {
    assert.equal(GATE_KEYS.NL, 'market_nl_open');
    assert.equal(COUNTRY_SPECIFIC_GATE_KEYS.NL, 'market_nl_open');
    assert.equal(gateKeyForCountry('NL'), 'market_nl_open');
    assert.notEqual(gateKeyForCountry('NL'), GATE_KEYS.EU);
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
