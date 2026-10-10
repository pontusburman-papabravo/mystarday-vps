'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  GATE_KEYS,
  GATE_DEFAULTS,
  INDIVIDUAL_GATE_COUNTRY_CODES,
  COUNTRY_SPECIFIC_GATE_KEYS,
  gateKeyForCountry,
} = require('../src/lib/market-region');
const { LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES } = require('../src/lib/launch-cohort-offer');
const { REGISTRATION_COUNTRIES } = require('../config/market-countries');

const ROOT = path.join(__dirname, '..');

describe('individual registration gates', () => {
  it('gives every registration country its own key, default closed except SE and CA', () => {
    const keys = new Set();
    for (const entry of REGISTRATION_COUNTRIES) {
      const key = gateKeyForCountry(entry.code);
      assert.equal(keys.has(key), false, `${entry.code} shares ${key}`);
      keys.add(key);
      assert.notEqual(key, 'market_eu_open');
      if (entry.code === 'SE' || entry.code === 'CA') {
        assert.equal(GATE_DEFAULTS[key], true);
      } else {
        assert.equal(GATE_DEFAULTS[key], false);
      }
    }
    assert.equal(GATE_DEFAULTS.market_eu_open, false);
    assert.equal(Object.values(COUNTRY_SPECIFIC_GATE_KEYS).includes('market_eu_open'), false);
  });

  it('keeps the existing SE, IE, CA, FI, NO and DK flag names', () => {
    assert.equal(gateKeyForCountry('SE'), 'market_se_open');
    assert.equal(gateKeyForCountry('IE'), 'market_ie_open');
    assert.equal(gateKeyForCountry('CA'), 'market_ca_open');
    assert.equal(gateKeyForCountry('FI'), 'market_fi_open');
    assert.equal(gateKeyForCountry('NO'), 'market_no_open');
    assert.equal(gateKeyForCountry('DK'), 'market_dk_open');
    assert.equal(GATE_KEYS.EU, 'market_eu_open');
  });

  it('an unknown country fails closed and does not use market_eu_open', () => {
    assert.equal(gateKeyForCountry('AX'), 'market_other_open');
    assert.equal(GATE_DEFAULTS.market_other_open, false);
    assert.notEqual(gateKeyForCountry('AX'), GATE_KEYS.EU);
  });

  it('covers every launch-cohort country with its own closed gate', () => {
    for (const code of LAUNCH_COHORT_ELIGIBLE_COUNTRY_CODES) {
      const key = gateKeyForCountry(code);
      assert.match(key, /^market_[a-z]{2}_open$/);
      assert.notEqual(key, 'market_eu_open');
      assert.equal(GATE_DEFAULTS[key], false);
    }
    assert.equal(INDIVIDUAL_GATE_COUNTRY_CODES.includes('DE'), true);
    assert.equal(INDIVIDUAL_GATE_COUNTRY_CODES.includes('SE'), false);
  });
});

describe('signup decision is shared by every registration route', () => {
  it('email, Google and Apple call the same server gate and the same cohort bypass', () => {
    const files = [
      'src/routes/auth/register.js',
      'src/routes/auth/oauth-google.js',
      'src/routes/auth/oauth-apple.js',
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(src, /assertRegistrationMarketOpen\(/);
      assert.match(src, /cohortBypass: marketGate\.readiness && marketGate\.readiness\.reason === 'launch_cohort_available'/);
      assert.match(src, /MARKET_BILLING_NOT_READY/);
    }
  });

  it('the country picker uses signup_allowed per country and has no EU bucket', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/country-choice.js'), 'utf8');
    assert.match(src, /signup_allowed/);
    assert.doesNotMatch(src, /gateMap\.EU/);
    assert.doesNotMatch(src, /market_eu_open/);
  });
});
