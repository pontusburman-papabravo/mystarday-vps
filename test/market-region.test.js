'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  deriveMarketRegion,
  resolveRegistrationCountry,
  isKnownRegistrationCountryCode,
  gateKeyForCountry,
  MARKET_REGIONS,
  GATE_KEYS,
} = require('../src/lib/market-region');

describe('market-region derivation', () => {
  it('SE maps to EU', () => {
    assert.equal(deriveMarketRegion('SE'), MARKET_REGIONS.EU);
  });

  it('DE maps to EU', () => {
    assert.equal(deriveMarketRegion('DE'), MARKET_REGIONS.EU);
  });

  it('GB maps to UK', () => {
    assert.equal(deriveMarketRegion('GB'), MARKET_REGIONS.UK);
  });

  it('US maps to US', () => {
    assert.equal(deriveMarketRegion('US'), MARKET_REGIONS.US);
  });

  it('ZZ maps to OTHER', () => {
    assert.equal(deriveMarketRegion('ZZ'), MARKET_REGIONS.OTHER);
  });

  it('lowercase normalizes to uppercase region', () => {
    assert.equal(deriveMarketRegion('se'), MARKET_REGIONS.EU);
    assert.equal(deriveMarketRegion('gb'), MARKET_REGIONS.UK);
  });

  it('bogus code maps to OTHER', () => {
    assert.equal(deriveMarketRegion('XX'), MARKET_REGIONS.OTHER);
  });
});

describe('gateKeyForCountry', () => {
  it('SE uses market_se_open', () => {
    assert.equal(gateKeyForCountry('SE'), GATE_KEYS.SE);
  });

  it('DE uses market_eu_open', () => {
    assert.equal(gateKeyForCountry('DE'), GATE_KEYS.EU);
  });

  it('GB uses market_uk_open', () => {
    assert.equal(gateKeyForCountry('GB'), GATE_KEYS.UK);
  });
});

describe('resolveRegistrationCountry', () => {
  it('defaults legacy clients to SE/EU', () => {
    const row = resolveRegistrationCountry({});
    assert.equal(row.country_code, 'SE');
    assert.equal(row.market_region, MARKET_REGIONS.EU);
    assert.equal(row.country_selection_source, 'legacy_default');
  });

  it('stores explicit country at registration', () => {
    const row = resolveRegistrationCountry({
      countryCodeRaw: 'DE',
      localeExplicitlyChosen: true,
    });
    assert.equal(row.country_code, 'DE');
    assert.equal(row.market_region, MARKET_REGIONS.EU);
    assert.equal(row.country_selection_source, 'registration');
  });
});

describe('isKnownRegistrationCountryCode', () => {
  it('accepts SE and rejects bogus', () => {
    assert.equal(isKnownRegistrationCountryCode('SE'), true);
    assert.equal(isKnownRegistrationCountryCode('XX'), false);
  });
});
