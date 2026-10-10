'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const {
  LAUNCH_COHORT_EXCLUDED_COUNTRY_CODES,
  LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES,
  LAUNCH_COHORT_SLOT_LIMIT,
  LAUNCH_COHORT_OFFER_MONTHS,
  LAUNCH_COHORT_FLAG_KEY,
  launchCohortEndsAt,
  isLaunchCohortExcludedCountry,
  isLaunchCohortEligibleCountry,
} = require('../src/lib/launch-cohort-offer');
const {
  LAUNCH_COHORT_COPY_LOCALES,
  describeLaunchCohortAcquisition,
  describeLaunchCohortFamilyCopy,
} = require('../src/lib/launch-cohort-offer-copy');
const { getMarketCommercialPolicy, ENTITLEMENT } = require('../src/lib/market-commercial-policy');
const { evaluateSignupCompleteness } = require('../src/lib/market-launch-invariants');

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/locale-catalog.json'), 'utf8')
);

function local(isoZone, parts) {
  return DateTime.fromObject(parts, { zone: isoZone }).toJSDate();
}

test('launch cohort dates keep the local clock and clamp leap day', () => {
  const leapStart = local('Europe/Berlin', {
    year: 2024, month: 2, day: 29, hour: 15, minute: 30, second: 0,
  });
  const leapEnd = DateTime.fromJSDate(launchCohortEndsAt(leapStart, 'Europe/Berlin'), {
    zone: 'Europe/Berlin',
  });
  assert.equal(leapEnd.toFormat('yyyy-MM-dd HH:mm'), '2025-02-28 15:30');

  const monthEnd = local('Europe/Madrid', {
    year: 2026, month: 1, day: 31, hour: 8, minute: 5, second: 0,
  });
  const monthEndLater = DateTime.fromJSDate(launchCohortEndsAt(monthEnd, 'Europe/Madrid'), {
    zone: 'Europe/Madrid',
  });
  assert.equal(monthEndLater.toFormat('yyyy-MM-dd HH:mm'), '2027-01-31 08:05');

  const march = local('Europe/Paris', {
    year: 2026, month: 3, day: 31, hour: 23, minute: 0, second: 0,
  });
  const marchLater = DateTime.fromJSDate(launchCohortEndsAt(march, 'Europe/Paris'), {
    zone: 'Europe/Paris',
  });
  assert.equal(marchLater.toFormat('yyyy-MM-dd HH:mm'), '2027-03-31 23:00');
  assert.equal(LAUNCH_COHORT_OFFER_MONTHS, 12);
});

test('Sweden, Ireland and Canada stay on their existing commercial policy', () => {
  assert.deepEqual([...LAUNCH_COHORT_EXCLUDED_COUNTRY_CODES], ['SE', 'IE', 'CA']);
  for (const code of LAUNCH_COHORT_EXCLUDED_COUNTRY_CODES) {
    assert.equal(isLaunchCohortExcludedCountry(code), true);
    assert.equal(isLaunchCohortEligibleCountry(code), false);
  }
  assert.equal(LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES.length, 27);
  assert.equal(LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES.includes('SE'), false);
  assert.equal(LAUNCH_COHORT_FLAG_KEY, 'launch_cohort_offer_v1');
  assert.equal(LAUNCH_COHORT_SLOT_LIMIT, 25);

  const before = new Date('2026-10-02T21:00:00.000Z');
  const after = new Date('2026-10-02T22:00:00.000Z');
  const seBefore = getMarketCommercialPolicy('SE', { createdAt: before });
  const seAfter = getMarketCommercialPolicy('SE', { createdAt: after });
  assert.equal(seBefore.entitlement, ENTITLEMENT.INTRO_YEAR);
  assert.equal(seBefore.requiresBillingReady, false);
  assert.equal(seAfter.entitlement, ENTITLEMENT.TRIAL);
  assert.equal(seAfter.trialDays, 14);
  assert.equal(seAfter.requiresBillingReady, true);

  for (const code of ['IE', 'CA']) {
    const policy = getMarketCommercialPolicy(code, { createdAt: after });
    assert.equal(policy.entitlement, ENTITLEMENT.COMPLIMENTARY_UNTIL);
    assert.equal(policy.requiresBillingReady, false);
    assert.equal(policy.trialDays, 0);
  }

  const germany = getMarketCommercialPolicy('DE', { createdAt: after });
  assert.equal(germany.entitlement, ENTITLEMENT.TRIAL);
  assert.equal(germany.trialDays, 14);
  assert.equal(germany.requiresBillingReady, true);
});

test('signup without billing is only the cohort path, and never Sweden', () => {
  const openTrial = {
    marketOpen: true,
    publicBillingUsable: false,
    marketBillingReady: false,
    now: new Date('2026-10-10T12:00:00.000Z'),
  };
  const offered = evaluateSignupCompleteness({
    ...openTrial,
    countryCode: 'DE',
    launchCohortAssignable: true,
  });
  assert.equal(offered.allowed, true);
  assert.equal(offered.reason, 'launch_cohort_available');

  const full = evaluateSignupCompleteness({
    ...openTrial,
    countryCode: 'DE',
    launchCohortAssignable: false,
  });
  assert.equal(full.allowed, false);
  assert.equal(full.reason, 'billing_not_ready');

  const sweden = evaluateSignupCompleteness({
    ...openTrial,
    countryCode: 'SE',
    launchCohortAssignable: true,
  });
  assert.equal(sweden.allowed, false);
  assert.equal(sweden.reason, 'billing_not_ready');
});

test('offer copy exists for every app locale and never invents a place count', () => {
  const ids = CATALOG.locales.map((locale) => locale.id);
  for (const id of ids) {
    assert.equal(LAUNCH_COHORT_COPY_LOCALES.includes(id), true, id);
    const copy = describeLaunchCohortAcquisition(id, 7);
    assert.equal(copy.locale, id);
    assert.match(copy.headline, /25/);
    assert.match(copy.duration, /12/);
    assert.equal(typeof copy.no_payment_method, 'string');
    assert.equal(typeof copy.no_auto_charge, 'string');
    assert.equal(typeof copy.after, 'string');
    assert.match(copy.remaining, /7/);
  }

  const unknown = describeLaunchCohortAcquisition('zz-ZZ', 4);
  assert.equal(unknown.locale, 'en-GB');
  assert.match(unknown.headline, /first 25 families/);
  assert.equal(unknown.headline.includes('familjerna'), false);

  const hidden = describeLaunchCohortAcquisition('de-DE', null);
  assert.equal(hidden.remaining, null);

  const ended = describeLaunchCohortFamilyCopy(
    { expires_at: '2027-10-10T12:00:00.000Z', metadata: { time_zone: 'Europe/Berlin' } },
    'de-DE',
    { mode: 'ended', timeZone: 'Europe/Berlin' }
  );
  assert.equal(ended.ends_on, null);
  assert.match(ended.ended, /12/);
  const stored = describeLaunchCohortFamilyCopy(
    { expires_at: '2027-10-10T12:00:00.000Z', metadata: { time_zone: 'Europe/Berlin' } },
    'de-DE',
    { mode: 'stored', timeZone: 'Europe/Berlin' }
  );
  assert.equal(stored.ended, null);
  assert.equal(stored.ends_on, null);
});
