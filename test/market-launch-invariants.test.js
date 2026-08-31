'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateSignupCompleteness,
  BILLING_NOT_READY_CODE,
} = require('../src/lib/market-launch-invariants');
const { isFamilyEligibleForGrandfathering } = require('../src/lib/payment-settings');
const { GATE_DEFAULTS } = require('../src/lib/market-region');
const { normalizeLocale, parseAcceptLanguage, resolvePreAuthLocale } = require('../src/lib/locale');
const { COUNTRY_DEFAULTS } = require('../src/lib/market-config');
const { resolveLegalRoutes } = require('../src/lib/legal-routing');
const { isLimitedAccountPath } = require('../src/middleware/require-premium');
const fs = require('node:fs');
const path = require('node:path');

const CUTOFF = '2026-10-01T00:00:00+02:00';
const BEFORE = new Date('2026-09-01T00:00:00+02:00');
const AFTER = new Date('2026-10-02T00:00:00+02:00');

describe('signup completeness invariant', () => {
  it('closed IE cannot public-signup', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'IE',
      marketOpen: false,
      publicBillingUsable: true,
      paymentStartAt: CUTOFF,
      now: BEFORE,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.code, 'MARKET_IE_CLOSED');
  });

  it('closed FI cannot public-signup', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'FI',
      marketOpen: false,
      publicBillingUsable: true,
      paymentStartAt: CUTOFF,
      now: BEFORE,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.code, 'MARKET_FI_CLOSED');
  });

  it('open IE without billing is rejected (no 402 deadlock)', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'IE',
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: CUTOFF,
      now: BEFORE,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.code, BILLING_NOT_READY_CODE);
  });

  it('open FI without billing is rejected (no 402 deadlock)', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'FI',
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: CUTOFF,
      now: BEFORE,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.code, BILLING_NOT_READY_CODE);
  });

  it('open IE with billing can complete signup', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'IE',
      marketOpen: true,
      publicBillingUsable: true,
      paymentStartAt: CUTOFF,
      now: BEFORE,
    });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'billing_usable');
  });

  it('SE before cutoff can signup even if billing is off (grandfather)', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'SE',
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: CUTOFF,
      now: BEFORE,
    });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'grandfather_eligible');
  });

  it('SE after cutoff without billing is rejected like other paywall markets', () => {
    const r = evaluateSignupCompleteness({
      countryCode: 'SE',
      marketOpen: true,
      publicBillingUsable: false,
      paymentStartAt: CUTOFF,
      now: AFTER,
    });
    assert.equal(r.allowed, false);
    assert.equal(r.code, BILLING_NOT_READY_CODE);
  });
});

describe('Sweden grandfather isolation', () => {
  it('IE and FI are never grandfather-eligible', () => {
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'IE', createdAt: BEFORE, paymentStartAt: CUTOFF,
    }), false);
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'FI', createdAt: BEFORE, paymentStartAt: CUTOFF,
    }), false);
    assert.equal(isFamilyEligibleForGrandfathering({
      countryCode: 'SE', createdAt: BEFORE, paymentStartAt: CUTOFF,
    }), true);
  });

  it('gate defaults keep IE/FI closed and SE open', () => {
    assert.equal(GATE_DEFAULTS.market_se_open, true);
    assert.equal(GATE_DEFAULTS.market_ie_open, false);
    assert.equal(GATE_DEFAULTS.market_fi_open, false);
  });
});

describe('Finland Swedish locale fallback', () => {
  it('fi and fi-FI normalize to sv-SE — no Finnish locale is created', () => {
    assert.equal(normalizeLocale('fi'), 'sv-SE');
    assert.equal(normalizeLocale('fi-FI'), 'sv-SE');
    assert.equal(normalizeLocale('fi_FI'), 'sv-SE');
    assert.equal(parseAcceptLanguage('fi-FI,sv;q=0.8'), 'sv-SE');
    assert.equal(resolvePreAuthLocale({ acceptLanguage: 'fi-FI' }), 'sv-SE');
  });

  it('FI defaultLocale is Swedish', () => {
    assert.equal(COUNTRY_DEFAULTS.FI.defaultLocale, 'sv-SE');
    assert.equal(COUNTRY_DEFAULTS.FI.timezone, 'Europe/Helsinki');
    assert.equal(COUNTRY_DEFAULTS.FI.currency, 'EUR');
  });

  it('IE defaultLocale remains English', () => {
    assert.equal(COUNTRY_DEFAULTS.IE.defaultLocale, 'en-GB');
    assert.equal(COUNTRY_DEFAULTS.IE.timezone, 'Europe/Dublin');
    assert.equal(COUNTRY_DEFAULTS.IE.currency, 'EUR');
  });
});

describe('legal + limited-account recovery', () => {
  it('IE English and FI Swedish legal routes are live', () => {
    const ie = resolveLegalRoutes({ countryCode: 'IE', marketRegion: 'EU', locale: 'en-GB' });
    const fi = resolveLegalRoutes({ countryCode: 'FI', marketRegion: 'EU', locale: 'sv-SE' });
    assert.equal(ie.status, 'live');
    assert.equal(ie.privacy, '/en/eea/privacy');
    assert.equal(fi.status, 'live');
    assert.equal(fi.privacy, '/privacy');
  });

  it('limited accounts can reach delete-account, IAP, and subscription', () => {
    assert.equal(isLimitedAccountPath('/api/family/delete-account'), true);
    assert.equal(isLimitedAccountPath('/api/iap/sync'), true);
    assert.equal(isLimitedAccountPath('/api/subscription/status'), true);
    assert.equal(isLimitedAccountPath('/api/children'), false);
  });
});

describe('public EEA pages are not internal-status markers', () => {
  it('does not publish “not externally legally verified” on live EEA HTML', () => {
    const files = [
      'public/en/eea-privacy.html',
      'public/en/eea-terms.html',
      'public/en/eea-child-privacy.html',
    ];
    for (const rel of files) {
      const html = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
      assert.doesNotMatch(html, /not externally legally verified/i, rel);
      assert.doesNotMatch(html, /Internal compliance sign-off/i, rel);
    }
  });

  it('paywall display path does not embed EUR target prices', () => {
    const paywall = fs.readFileSync(path.join(__dirname, '../public/js/paywall.js'), 'utf8');
    const logic = fs.readFileSync(path.join(__dirname, '../public/js/iap-native-client-logic.js'), 'utf8');
    assert.doesNotMatch(paywall, /5\.99/);
    assert.doesNotMatch(paywall, /59\.99/);
    assert.doesNotMatch(logic, /5\.99/);
    assert.match(logic, /priceString/);
  });

  it('landing market state is driven by registration-gates', () => {
    const js = fs.readFileSync(path.join(__dirname, '../public/js/landing-market-state.js'), 'utf8');
    assert.match(js, /\/api\/market\/registration-gates/);
    assert.match(js, /signup_allowed/);
    assert.match(js, /english_available/);
  });
});
