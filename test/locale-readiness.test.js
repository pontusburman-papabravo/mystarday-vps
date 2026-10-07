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

  it('the Baltic and Hellenic packs are ready while their markets stay closed', () => {
    const markets = {
      'bg-BG': 'BG',
      'el-GR': 'GR',
      'et-EE': 'EE',
      'lt-LT': 'LT',
      'lv-LV': 'LV',
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
      if (id === 'el-GR') {
        assert.equal(market.appleFallback, null);
        assert.equal(market.appleScreenshotOrigin, 'native_locale');
      } else {
        assert.equal(market.appleFallback, 'en-GB');
        assert.equal(market.appleScreenshotOrigin, 'explicit_fallback');
      }
      assert.equal(market.googleScreenshotOrigin, 'native_locale');
    }
    const cyprus = assessMarket('CY');
    assert.equal(cyprus.APP_READY, true);
    assert.equal(cyprus.MARKET_READY, false);
    assert.equal(catalog.markets.markets.find((item) => item.id === 'CY').activation, 'planned');
    assert.equal(assessMarket('SE').MARKET_READY, true);
    assert.equal(assessMarket('IE').MARKET_READY, true);
    assert.equal(assessMarket('CA').MARKET_READY, true);
  });

  it('keeps Icelandic, Irish, and Maltese content-ready and hidden', () => {
    const { selectableLocaleOptions, firstRunLocales } = require('../src/lib/locale');
    const hidden = ['is-IS', 'ga-IE', 'mt-MT'];
    const selectable = selectableLocaleOptions().map((locale) => locale.id);
    const firstRun = firstRunLocales().map((locale) => locale.id);
    for (const id of hidden) {
      assert.equal(selectable.includes(id), false, id);
      assert.equal(firstRun.includes(id), false, id);
      const app = assessAppLocale(id);
      assert.equal(app.ready, false, id);
      const contentErrors = app.errors.filter((error) => (
        !/not public or enabled/.test(error) && !/iOS language .+ is not declared/.test(error)
      ));
      assert.deepEqual(contentErrors, [], id);
    }
    const iceland = assessMarket('IS');
    assert.equal(iceland.APP_READY, false);
    assert.equal(iceland.APPLE_READY, true, iceland.reasons.join('; '));
    assert.equal(iceland.appleLocale, 'en-GB');
    assert.equal(iceland.appleFallback, 'en-GB');
    assert.equal(iceland.appleScreenshotOrigin, 'explicit_fallback');
    assert.equal(iceland.GOOGLE_READY, true, iceland.reasons.join('; '));
    assert.equal(iceland.googleLocale, 'is-IS');
    assert.equal(iceland.googleFallback, null);
    assert.equal(iceland.googleScreenshotOrigin, 'native_locale');
    assert.equal(iceland.MARKET_READY, false);
    const malta = assessMarket('MT');
    assert.equal(malta.APP_READY, false);
    assert.equal(malta.APPLE_READY, true, malta.reasons.join('; '));
    assert.equal(malta.GOOGLE_READY, true, malta.reasons.join('; '));
    assert.equal(malta.appleScreenshotOrigin, 'explicit_fallback');
    assert.equal(malta.googleLocale, 'en-GB');
    assert.equal(malta.googleFallback, 'en-GB');
    assert.equal(malta.googleScreenshotOrigin, 'explicit_fallback');
    assert.equal(malta.MARKET_READY, false);
    const irish = assessMarket('IE', 'ga-IE');
    assert.equal(irish.APP_READY, false);
    assert.equal(irish.APPLE_READY, true, irish.reasons.join('; '));
    assert.equal(irish.GOOGLE_READY, true, irish.reasons.join('; '));
    assert.equal(irish.appleScreenshotOrigin, 'explicit_fallback');
    assert.equal(irish.googleScreenshotOrigin, 'explicit_fallback');
    assert.equal(irish.appleFallback, 'en-GB');
    assert.equal(irish.googleFallback, 'en-GB');
    const ireland = assessMarket('IE');
    assert.equal(ireland.APP_READY, true);
    assert.equal(ireland.MARKET_READY, true);
    assert.equal(ireland.appLocale, 'en-GB');
    assert.equal(assessMarket('SE').MARKET_READY, true);
    assert.equal(assessMarket('CA').MARKET_READY, true);
    const catalog = loadStoreCatalog();
    const ie = catalog.markets.markets.find((market) => market.id === 'IE');
    assert.deepEqual(ie.requiredAppLocales, ['en-GB']);
    assert.equal(ie.activation, 'live');
    assert.equal(catalog.markets.markets.find((market) => market.id === 'IS').activation, 'planned');
    assert.equal(catalog.markets.markets.find((market) => market.id === 'MT').activation, 'planned');
  });
});
