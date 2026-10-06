'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assessAppLocale } = require('../src/lib/locale-readiness');
const { assessMarket, loadStoreCatalog } = require('../src/lib/store-locale');
const { contentMapFile } = require('../src/lib/locale');

describe('app locale readiness', () => {
  it('treats Swedish and English as ready from their own resources', () => {
    assert.equal(assessAppLocale('sv-SE').ready, true);
    assert.equal(assessAppLocale('en-GB').ready, true);
    assert.equal(contentMapFile('en-GB'), 'sv-to-en.json');
    assert.equal(contentMapFile('sv-SE'), null);
  });

  it('requires real German resources and keeps the market closed', () => {
    const german = assessAppLocale('de-DE');
    assert.equal(german.ready, true, german.errors.join('; '));
    const market = assessMarket('DE');
    assert.equal(market.APP_READY, true);
    assert.equal(market.APPLE_READY, true);
    assert.equal(market.GOOGLE_READY, true);
    assert.equal(market.MARKET_READY, false);
  });

  it('reads multi-language markets from configuration', () => {
    const catalog = loadStoreCatalog();
    const byId = Object.fromEntries(catalog.markets.markets.map((market) => [market.id, market]));
    assert.deepEqual(byId.BE.requiredAppLocales, ['nl-NL', 'fr-FR', 'de-DE']);
    assert.deepEqual(byId.FI.requiredAppLocales, ['fi-FI', 'sv-SE']);
    assert.deepEqual(byId.IE.requiredAppLocales, ['en-GB']);
    assert.deepEqual(byId.IE.appLocales, ['en-GB', 'ga-IE']);
    assert.equal(assessMarket('FI').APP_READY, true);
    assert.equal(assessMarket('FI').MARKET_READY, false);
    assert.equal(assessMarket('BE').MARKET_READY, false);
  });

  it('accepts an Apple metadata fallback only when the catalog says so', () => {
    const iceland = assessMarket('IS', 'is-IS');
    assert.equal(iceland.appleFallback, 'en-GB');
    assert.equal(iceland.reasons.some((reason) => /explicit fallback/.test(reason)), false);

    const catalog = loadStoreCatalog();
    catalog.locales.appLocales['is-IS'].apple.acceptFallbackForReady = false;
    const rejected = assessMarket('IS', 'is-IS', catalog);
    assert.equal(rejected.reasons.some((reason) => /explicit fallback/.test(reason)), true);
  });

  it('does not treat an unknown locale as Swedish', () => {
    const missing = assessAppLocale('xx-XX');
    assert.equal(missing.ready, false);
    assert.match(missing.errors[0], /unknown locale/);
  });

  it('the five language packs are ready while their markets stay closed', () => {
    for (const id of ['fr-FR', 'nl-NL', 'da-DK', 'fi-FI', 'nb-NO']) {
      const result = assessAppLocale(id);
      assert.equal(result.ready, true, `${id}: ${result.errors.join('; ')}`);
    }
    for (const marketId of ['FR', 'NL', 'DK', 'FI', 'NO']) {
      const market = assessMarket(marketId);
      assert.equal(market.MARKET_READY, false, marketId);
    }
    const finland = assessMarket('FI');
    assert.equal(finland.APP_READY, true);
    assert.deepEqual(
      loadStoreCatalog().markets.markets.find((market) => market.id === 'FI').requiredAppLocales,
      ['fi-FI', 'sv-SE']
    );
  });

  it('the next language packs are ready while their markets stay closed', () => {
    const markets = { 'es-ES': 'ES', 'it-IT': 'IT', 'pt-PT': 'PT', 'pl-PL': 'PL' };
    const catalog = loadStoreCatalog();
    for (const [id, marketId] of Object.entries(markets)) {
      const result = assessAppLocale(id);
      assert.equal(result.ready, true, `${id}: ${result.errors.join('; ')}`);
      const market = assessMarket(marketId);
      assert.equal(market.APP_READY, true, id);
      assert.equal(market.APPLE_READY, true, `${id}: ${market.reasons.join('; ')}`);
      assert.equal(market.GOOGLE_READY, true, `${id}: ${market.reasons.join('; ')}`);
      assert.equal(market.MARKET_READY, false, id);
      const row = catalog.markets.markets.find((item) => item.id === marketId);
      assert.equal(row.activation, 'planned', marketId);
    }
  });

  it('the Central European packs are ready while their markets stay closed', () => {
    const markets = {
      'cs-CZ': 'CZ',
      'sk-SK': 'SK',
      'sl-SI': 'SI',
      'hr-HR': 'HR',
      'hu-HU': 'HU',
      'ro-RO': 'RO',
    };
    const catalog = loadStoreCatalog();
    for (const [id, marketId] of Object.entries(markets)) {
      const result = assessAppLocale(id);
      assert.equal(result.ready, true, `${id}: ${result.errors.join('; ')}`);
      const market = assessMarket(marketId);
      assert.equal(market.APP_READY, true, id);
      assert.equal(market.APPLE_READY, true, `${id}: ${market.reasons.join('; ')}`);
      assert.equal(market.GOOGLE_READY, true, `${id}: ${market.reasons.join('; ')}`);
      assert.equal(market.MARKET_READY, false, id);
      const row = catalog.markets.markets.find((item) => item.id === marketId);
      assert.equal(row.activation, 'planned', marketId);
    }
  });
});
