'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isFamilyEligibleForGrandfathering,
  isFamilyEligibleForIntroYear,
  isFamilyBeforePaymentStart,
  DEFAULT_LIFETIME_FREE_UNTIL,
  introYearExpiresAt,
} = require('../src/lib/payment-settings');

const cutoff = new Date(DEFAULT_LIFETIME_FREE_UNTIL);
const before = '2026-09-13T23:59:59+02:00';
const onCutoff = '2026-09-14T00:00:00+02:00';
const after = '2026-09-14T00:00:01+02:00';

describe('isFamilyEligibleForGrandfathering (worldwide by date)', () => {
  it('SE through 13 Sep → eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE',
      createdAt: before,
      lifetimeFreeUntil: cutoff,
    }), true);
  });

  it('SE from 14 Sep → not eligible (intro year)', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE',
      createdAt: onCutoff,
      lifetimeFreeUntil: cutoff,
    }), false);
  });

  it('IE/FI/NO before cutoff → eligible (not SE-only)', () => {
    for (const countryCode of ['IE', 'FI', 'NO']) {
      assert.equal(isFamilyEligibleForGrandfathering({
        countryCode,
        createdAt: before,
        lifetimeFreeUntil: cutoff,
      }), true, countryCode);
    }
  });

  it('unknown stored country before cutoff → eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'XX',
      createdAt: before,
      lifetimeFreeUntil: cutoff,
    }), true);
  });

  it('isFamilyBeforePaymentStart remains date-only helper', () => {
    assert.equal(isFamilyBeforePaymentStart(before, cutoff), true);
    assert.equal(isFamilyBeforePaymentStart(onCutoff, cutoff), false);
    assert.equal(isFamilyBeforePaymentStart(after, cutoff), false);
  });
});

describe('intro year', () => {
  it('starts at the lifetime cutoff instant', () => {
    assert.equal(isFamilyEligibleForIntroYear({
      createdAt: onCutoff,
      lifetimeFreeUntil: cutoff,
    }), true);
    assert.equal(isFamilyEligibleForIntroYear({
      createdAt: before,
      lifetimeFreeUntil: cutoff,
    }), false);
  });

  it('expires one calendar year after created_at', () => {
    const exp = introYearExpiresAt(onCutoff);
    assert.equal(exp.toISOString(), new Date('2027-09-14T00:00:00+02:00').toISOString());
  });
});
