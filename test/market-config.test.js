'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getMarketConfig,
  resolveMarketDefaults,
  COUNTRY_DEFAULTS,
} = require('../src/lib/market-config');
const { MARKET_REGIONS } = require('../src/lib/market-region');
const { DEFAULT_LOCALE } = require('../src/lib/locale');

describe('resolveMarketDefaults', () => {
  it('uses explicit country row when present', () => {
    assert.equal(resolveMarketDefaults('IE', MARKET_REGIONS.EU).timezone, 'Europe/Dublin');
  });

  it('uses EU region defaults for unknown EU countries (e.g. DE)', () => {
    const d = resolveMarketDefaults('DE', MARKET_REGIONS.EU);
    assert.equal(d.timezone, 'Europe/Stockholm');
    assert.equal(d.currency, 'EUR');
    assert.equal(d.localeSupported, true);
  });

  it('does not give OTHER markets EU Stockholm defaults', () => {
    const d = resolveMarketDefaults('XX', MARKET_REGIONS.OTHER);
    assert.equal(d.timezone, 'UTC');
    assert.notEqual(d.timezone, 'Europe/Stockholm');
  });
});

describe('getMarketConfig locale metadata', () => {
  it('NO/DK defaultLocale is future metadata — localeSupported false', () => {
    assert.equal(COUNTRY_DEFAULTS.NO.localeSupported, false);
    assert.equal(COUNTRY_DEFAULTS.NO.defaultLocale, 'nb-NO');
    assert.equal(COUNTRY_DEFAULTS.DK.localeSupported, false);
    assert.equal(COUNTRY_DEFAULTS.DK.defaultLocale, 'da-DK');
    assert.equal(getMarketConfig({ countryCode: 'NO' }).localeSupported, false);
    assert.equal(getMarketConfig({ countryCode: 'DK' }).localeSupported, false);
  });

  it('IE without locale uses global pre-auth default (sv-SE) while defaultLocale stays en-GB', () => {
    const cfg = getMarketConfig({ countryCode: 'IE' });
    assert.equal(cfg.locale, DEFAULT_LOCALE);
    assert.equal(cfg.defaultLocale, 'en-GB');
    assert.notEqual(cfg.locale, cfg.defaultLocale,
      'intentional: registration always chooses language explicitly');
  });
});

describe('getMarketConfig timezone contract', () => {
  it('IE config timezone is Europe/Dublin', () => {
    assert.equal(getMarketConfig({ countryCode: 'IE' }).timezone, 'Europe/Dublin');
  });

  it('FI config timezone is Europe/Helsinki with EUR', () => {
    const cfg = getMarketConfig({ countryCode: 'FI' });
    assert.equal(cfg.timezone, 'Europe/Helsinki');
    assert.equal(cfg.currency, 'EUR');
    assert.equal(cfg.defaultLocale, 'en-GB');
    assert.equal(cfg.localeSupported, true);
  });

  it('SE config timezone is Europe/Stockholm', () => {
    assert.equal(getMarketConfig({ countryCode: 'SE' }).timezone, 'Europe/Stockholm');
  });
});
