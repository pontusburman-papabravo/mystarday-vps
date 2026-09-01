'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  civilDateMidnightInZone,
  parseMarketPaymentStartInstant,
} = require('../src/lib/zoned-civil-time');
const {
  isFamilyBeforePaymentStart,
  isPrebillingLaunchWindowOpen,
  paymentStartTimeZoneForCountry,
} = require('../src/lib/payment-settings');

describe('market payment-start civil midnight', () => {
  it('maps Ireland and Finland to their IANA zones', () => {
    assert.equal(paymentStartTimeZoneForCountry('IE'), 'Europe/Dublin');
    assert.equal(paymentStartTimeZoneForCountry('FI'), 'Europe/Helsinki');
    assert.equal(paymentStartTimeZoneForCountry('SE'), 'Europe/Stockholm');
    assert.equal(paymentStartTimeZoneForCountry(null), null);
  });

  it('interprets Ireland civil midnight as Dublin local midnight', () => {
    const instant = civilDateMidnightInZone('2026-10-15', 'Europe/Dublin');
    assert.ok(instant);
    // 2026-10-15 Ireland is IST (UTC+1)
    assert.equal(instant.toISOString(), '2026-10-14T23:00:00.000Z');
  });

  it('interprets Finland civil midnight as Helsinki local midnight', () => {
    const instant = civilDateMidnightInZone('2026-10-15', 'Europe/Helsinki');
    assert.ok(instant);
    // 2026-10-15 Finland is EEST (UTC+3)
    assert.equal(instant.toISOString(), '2026-10-14T21:00:00.000Z');
  });

  it('DST: Dublin spring-forward civil midnight is unambiguous', () => {
    const before = civilDateMidnightInZone('2026-03-29', 'Europe/Dublin');
    const after = civilDateMidnightInZone('2026-03-30', 'Europe/Dublin');
    assert.equal(before.toISOString(), '2026-03-29T00:00:00.000Z');
    assert.equal(after.toISOString(), '2026-03-29T23:00:00.000Z');
  });

  it('DST: Helsinki spring-forward civil midnight is unambiguous', () => {
    const before = civilDateMidnightInZone('2026-03-29', 'Europe/Helsinki');
    const after = civilDateMidnightInZone('2026-03-30', 'Europe/Helsinki');
    assert.equal(before.toISOString(), '2026-03-28T22:00:00.000Z');
    assert.equal(after.toISOString(), '2026-03-29T21:00:00.000Z');
  });

  it('absolute ISO instants stay absolute', () => {
    const parsed = parseMarketPaymentStartInstant('2026-10-15T00:00:00+02:00', 'Europe/Dublin');
    assert.equal(parsed.configured, true);
    assert.equal(parsed.representation, 'absolute');
    assert.equal(parsed.instant.toISOString(), '2026-10-14T22:00:00.000Z');
  });

  it('missing or invalid start fails closed', () => {
    assert.equal(parseMarketPaymentStartInstant(null, 'Europe/Dublin').configured, false);
    assert.equal(parseMarketPaymentStartInstant('', 'Europe/Dublin').configured, false);
    assert.equal(parseMarketPaymentStartInstant('not-a-date', 'Europe/Dublin').invalid, true);
    assert.equal(isFamilyBeforePaymentStart('2026-09-01T00:00:00Z', null), false);
    assert.equal(isPrebillingLaunchWindowOpen('IE', new Date(), null), false);
  });

  it('exact cutoff is not before start; one second before is', () => {
    const cutoff = civilDateMidnightInZone('2026-10-15', 'Europe/Dublin');
    const before = new Date(cutoff.getTime() - 1000);
    const after = new Date(cutoff.getTime() + 1000);
    assert.equal(isFamilyBeforePaymentStart(before, cutoff), true);
    assert.equal(isFamilyBeforePaymentStart(cutoff, cutoff), false);
    assert.equal(isFamilyBeforePaymentStart(after, cutoff), false);
    assert.equal(isPrebillingLaunchWindowOpen('IE', before, cutoff), true);
    assert.equal(isPrebillingLaunchWindowOpen('IE', cutoff, cutoff), false);
    assert.equal(isPrebillingLaunchWindowOpen('IE', after, cutoff), false);
  });
});
