'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  loadStoreCatalog,
  resolveStoreLocales,
  assessMarket,
  effectiveListing,
} = require('../src/lib/store-locale');
const { getMarketCommercialPolicy } = require('../src/lib/market-commercial-policy');
const { COUNTRY_DEFAULTS } = require('../src/lib/market-config');

const NOW = new Date('2026-10-06T12:00:00Z');

describe('store locale catalog', () => {
  it('keeps Icelandic on Google and falls Apple back to en-GB', () => {
    const resolved = resolveStoreLocales('is-IS');
    assert.equal(resolved.apple.direct, null);
    assert.equal(resolved.apple.fallback, 'en-GB');
    assert.equal(resolved.apple.locale, 'en-GB');
    assert.equal(resolved.google.direct, 'is-IS');
    assert.equal(resolved.google.fallback, null);
  });

  it('maps German to itself and Norwegian to store codes', () => {
    const german = resolveStoreLocales('de-DE');
    assert.equal(german.apple.locale, 'de-DE');
    assert.equal(german.google.locale, 'de-DE');
    const norwegian = resolveStoreLocales('nb-NO');
    assert.equal(norwegian.apple.locale, 'no');
    assert.equal(norwegian.google.locale, 'no-NO');
  });

  it('combines market, app locale, and store locales without changing commercial policy', () => {
    const cases = [
      ['DE', 'de-DE', 'de-DE', 'de-DE'],
      ['BE', 'fr-FR', 'fr-FR', 'fr-FR'],
      ['BE', 'nl-NL', 'nl-NL', 'nl-NL'],
      ['FI', 'sv-SE', 'sv', 'sv-SE'],
      ['IS', 'is-IS', 'en-GB', 'is-IS'],
    ];
    for (const [market, appLocale, apple, google] of cases) {
      const assessed = assessMarket(market, appLocale);
      assert.equal(assessed.appLocale, appLocale);
      assert.equal(assessed.appleLocale, apple);
      assert.equal(assessed.googleLocale, google);
      const policy = getMarketCommercialPolicy(market, { createdAt: NOW });
      assert.equal(policy.countryCode, market);
      assert.equal(policy.locale, undefined);
    }
    const sweden = getMarketCommercialPolicy('SE', { createdAt: NOW });
    const ireland = getMarketCommercialPolicy('IE', { createdAt: NOW });
    const canada = getMarketCommercialPolicy('CA', { createdAt: NOW });
    assert.equal(sweden.entitlement, 'trial');
    assert.equal(sweden.trialDays, 14);
    assert.equal(ireland.entitlement, 'complimentary_until');
    assert.equal(canada.entitlement, 'complimentary_until');
    assert.equal(COUNTRY_DEFAULTS.SE.currency, 'SEK');
    assert.equal(COUNTRY_DEFAULTS.IE.currency, 'EUR');
    assert.equal(COUNTRY_DEFAULTS.CA.currency, 'CAD');
    assert.equal(COUNTRY_DEFAULTS.FI.currency, 'EUR');
    assert.equal(assessMarket('DE').MARKET_READY, false);
    assert.equal(assessMarket('SE').MARKET_READY, true);
    assert.equal(assessMarket('IE').MARKET_READY, true);
    assert.equal(assessMarket('CA').MARKET_READY, true);
  });

  it('puts the Ireland complimentary sentences only on the Ireland override', () => {
    const catalog = loadStoreCatalog();
    const ireland = catalog.markets.markets.find((market) => market.id === 'IE');
    const canada = catalog.markets.markets.find((market) => market.id === 'CA');
    const ieListing = effectiveListing('apple', 'en-GB', ireland, catalog);
    const caListing = effectiveListing('apple', 'en-GB', canada, catalog);
    assert.match(ieListing.description, /Ireland until 31 December 2026/);
    assert.doesNotMatch(caListing.description, /Ireland/);
    assert.match(ieListing.description, /stdeula/);
  });

  it('does not mark a planned language store-ready when screenshots are missing', () => {
    const germany = assessMarket('DE', 'de-DE');
    assert.equal(germany.APP_READY, false);
    assert.equal(germany.APPLE_READY, false);
    assert.equal(germany.GOOGLE_READY, false);
    assert.equal(germany.MARKET_READY, false);
    assert.ok(germany.reasons.some((reason) => /not a public app locale|not activated|screenshot set de-DE missing|listing de-DE missing/.test(reason)));
  });
});
