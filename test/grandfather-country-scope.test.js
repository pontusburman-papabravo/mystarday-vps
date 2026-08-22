'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFamilyEligibleForGrandfathering,
  isFamilyBeforePaymentStart,
  DEFAULT_PAYMENT_START_AT,
} = require('../src/lib/payment-settings');

const cutoff = new Date(DEFAULT_PAYMENT_START_AT);

describe('isFamilyEligibleForGrandfathering', () => {
  it('SE pre-cutoff → eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE',
      createdAt: '2026-09-01T00:00:00+02:00',
      paymentStartAt: cutoff,
    }), true);
  });

  it('SE post-cutoff → not eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE',
      createdAt: '2026-11-01T00:00:00+02:00',
      paymentStartAt: cutoff,
    }), false);
  });

  it('IE pre-cutoff → not eligible (Swedish cutoff is not worldwide)', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'IE',
      createdAt: '2026-09-01T00:00:00+02:00',
      paymentStartAt: cutoff,
    }), false);
  });

  it('IE post-cutoff → not eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'IE',
      createdAt: '2026-11-01T00:00:00+02:00',
      paymentStartAt: cutoff,
    }), false);
  });

  it('NO pre-cutoff → not eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'NO',
      createdAt: '2026-09-01T00:00:00+02:00',
      paymentStartAt: cutoff,
    }), false);
  });

  it('isFamilyBeforePaymentStart remains date-only helper', () => {
    assert.equal(isFamilyBeforePaymentStart('2026-09-01T00:00:00+02:00', cutoff), true);
    assert.equal(isFamilyBeforePaymentStart('2026-11-01T00:00:00+02:00', cutoff), false);
  });
});
