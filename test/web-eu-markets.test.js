'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  WEB_LOCALE_CODES,
  LOCALES,
} = require('../config/web-locales');
const {
  EU_WEB_MARKET_CODES,
  MARKETS,
  campaignPath,
  marketPublicEntries,
  marketForPublicPath,
  marketCommercialFacts,
} = require('../config/web-markets');
const { CONTENT_KEYS, contentByPath } = require('../config/web-content-keys');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const {
  hreflangAlternates,
  isInternationalContentIndexable,
  absolutePublicUrl,
  applyPublicSeoHead,
} = require('../src/lib/public-seo');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { APP_DOMAIN } = require('../src/lib/domain-redirect');
const { publicNotFoundKind } = require('../src/lib/web-routing');
const { localeSwitchTarget } = require('../src/lib/locale-switch');
const { legacyCountryCampaignPath } = require('../src/lib/en-market-landing');
const { planRows, toCsv, localeReadiness } = require('../src/lib/seo-indexing-plan');

const SEPARATION = [
  ['fr', 'FR'],
  ['fr', 'BE'],
  ['de', 'AT'],
  ['de', 'DE'],
  ['nl', 'BE'],
  ['nl', 'NL'],
  ['sv', 'FI'],
  ['en', 'IE'],
];

test('the public web configures 26 locales and 29 EU/EEA markets', () => {
  assert.equal(WEB_LOCALE_CODES.length, 26);
  assert.equal(new Set(WEB_LOCALE_CODES).size, 26);
  assert.equal(Object.keys(LOCALES).length, 26);
  assert.equal(EU_WEB_MARKET_CODES.length, 29);
  assert.equal(new Set(EU_WEB_MARKET_CODES).size, 29);
  assert.equal(MARKETS.CA.euWeb, false);
  assert.equal(Object.values(MARKETS).filter((market) => market.euWeb).length, 29);
  for (const code of EU_WEB_MARKET_CODES) {
    const market = MARKETS[code];
    assert.equal(market.webAvailable, true, code);
    assert.equal(market.marketingActive, code === 'IE', code);
    assert.equal(market.defaultLocale, market.locales[0], code);
    assert.ok(market.locales.includes('en'), code);
    assert.ok(market.campaignLocales.includes('en'), code);
  }
  assert.equal(MARKETS.IE.marketingActive, true);
  assert.equal(MARKETS.CA.marketingActive, true);
  assert.equal(MARKETS.NL.marketingActive, false);
  assert.equal(MARKETS.SE.marketingActive, false);
  assert.equal(LOCALES.sv.pathPrefix, '');
  assert.equal(LOCALES.sv.host, 'se');
  assert.deepEqual([...LOCALES.sv.hreflang], ['sv-SE']);
  assert.deepEqual([...LOCALES.en.hreflang], ['en']);
  for (const code of WEB_LOCALE_CODES) {
    const locale = LOCALES[code];
    if (locale.seoEnabled) {
      assert.equal(locale.publicWeb, true, code);
      assert.equal(locale.block, null, code);
    } else {
      assert.equal(locale.publicWeb, false, code);
      assert.equal(locale.block, 'LOCALE_BLOCKED', code);
    }
  }
});

test('locale and market stay separate, including when the letters match', () => {
  for (const [localeCode, marketCode] of SEPARATION) {
    const market = MARKETS[marketCode];
    assert.ok(market.locales.includes(localeCode), `${localeCode} ${marketCode}`);
    assert.notEqual(typeof localeCode, 'undefined');
    const assumed = localeCode.toUpperCase();
    if (assumed !== marketCode) {
      assert.notEqual(assumed, market.code);
    }
  }
  assert.equal(campaignPath(MARKETS.FI, 'sv'), null);
  assert.equal(marketPublicEntries(MARKETS.FI).includes('/sv/fi'), false);
  assert.ok(marketPublicEntries(MARKETS.SE).includes('/'));
  assert.ok(marketPublicEntries(MARKETS.SE).includes('/en/se'));
  assert.equal(LOCALES.sv.pathPrefix === '/sv', false);
});

test('every market has a public entry and market pages stay out of the index', () => {
  const sitemap = buildSitemapXml({ host: APP_DOMAIN });
  for (const code of EU_WEB_MARKET_CODES) {
    const entries = marketPublicEntries(MARKETS[code]);
    assert.ok(entries.length >= 1, code);
    const routed = entries.filter((pathname) => pathname !== '/');
    assert.ok(routed.length >= 1, code);
    for (const pathname of routed) {
      const hit = marketForPublicPath(pathname);
      assert.equal(hit.market.code, code, pathname);
      assert.equal(contentByPath(pathname), null, pathname);
      assert.equal(SEO_INDEXABLE_PATHS.has(pathname), false, pathname);
      assert.equal(isInternationalContentIndexable(pathname), false, pathname);
      assert.deepEqual(hreflangAlternates(pathname), [], pathname);
      assert.equal(sitemap.includes(`${pathname}<`), false, pathname);
    }
  }
  assert.equal(SEO_INDEXABLE_PATHS.has('/en/ie'), false);
  assert.equal(SEO_INDEXABLE_PATHS.has('/en/ca'), false);
  assert.equal(SEO_INDEXABLE_PATHS.has('/nl/nl'), false);
  const contentUrls = CONTENT_KEYS.length * WEB_LOCALE_CODES.length * EU_WEB_MARKET_CODES.length;
  assert.ok(SEO_INDEXABLE_PATHS.size < contentUrls);
});

test('an unpublished locale cannot enter the sitemap, and hreflang stays on language documents', () => {
  const readiness = localeReadiness();
  const blocked = readiness.filter((row) => row.blocking.startsWith('LOCALE_BLOCKED'));
  const expectedBlocked = WEB_LOCALE_CODES.filter((code) => !LOCALES[code].seoEnabled);
  assert.equal(blocked.length, expectedBlocked.length);
  for (const row of blocked) {
    assert.equal(row.seoEnabled, false, row.locale);
    assert.equal(row.urlCount, 0, row.locale);
    assert.equal(LOCALES[row.locale].publicWeb, false);
  }
  for (const row of readiness.filter((item) => item.seoEnabled)) {
    assert.equal(row.complete, true, row.locale);
    assert.ok(row.urlCount > 0, row.locale);
  }
  const clusterPaths = ['/en', '/nl', '/bildschema-app', '/en/visual-schedule-app', '/nl/visueel-schema'];
  for (const pathname of clusterPaths) {
    const rows = hreflangAlternates(pathname);
    assert.ok(rows.some(([tag]) => tag === 'en'), pathname);
    const xDefault = pathname === '/en' || pathname === '/nl'
      ? absolutePublicUrl('/en')
      : absolutePublicUrl('/en/visual-schedule-app');
    assert.ok(rows.some(([tag, href]) => tag === 'x-default' && href === xDefault), pathname);
    for (const [tag, href] of rows) {
      if (tag === 'x-default') continue;
      const target = new URL(href).pathname;
      assert.equal(SEO_INDEXABLE_PATHS.has(target), true, `${pathname} -> ${tag}`);
      assert.equal(marketForPublicPath(target), null, `${pathname} -> ${tag}`);
      const back = hreflangAlternates(target);
      assert.ok(back.some(([, candidate]) => candidate === href), `${tag} self`);
      assert.ok(back.some(([, candidate]) => candidate === absolutePublicUrl(pathname)), `${pathname} reciprocal`);
    }
  }
  assert.equal(publicNotFoundKind('/ga'), 'unknown-locale');
  assert.equal(publicNotFoundKind('/ga/ie'), 'unknown-locale');
  assert.equal(publicNotFoundKind('/sv'), 'unknown-locale');
  assert.equal(localeSwitchTarget('/en/visual-schedule-app', 'de'), '/de/visueller-tagesplan');
  assert.equal(localeSwitchTarget('/en/visual-schedule-app', 'ga'), null);
  assert.equal(legacyCountryCampaignPath({ country: 'AT' }), '/en/at');
  assert.equal(legacyCountryCampaignPath({ country: 'IE' }), '/en/ie');
  assert.equal(legacyCountryCampaignPath({ country: 'GB' }), null);
  const facts = marketCommercialFacts('AT');
  assert.equal(facts.complimentary, false);
  assert.equal(facts.registrationOpenByDefault, false);
});

test('the indexing plan matches the committed CSV and keeps market rows noindex', () => {
  const csvPath = path.join(__dirname, '../docs/seo/seo-indexing-plan.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  assert.equal(csv, toCsv());
  const rows = planRows();
  const markets = rows.filter((row) => row.market);
  assert.ok(markets.length >= 29);
  for (const row of markets) {
    assert.equal(row.indexable, 'false', row.url);
    assert.equal(row.sitemap, 'no', row.url);
    assert.equal(row.hreflang, '', row.url);
    assert.equal(row.priority, 'low', row.url);
  }
  const high = rows.filter((row) => row.priority === 'high');
  assert.ok(high.some((row) => row.locale === 'en' && row.content_key === 'home'));
  assert.ok(high.some((row) => row.locale === 'nl' && row.content_key === 'visualSchedule'));
  assert.equal(high.some((row) => row.market), false);
});

let http;

before(async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const { listenApp } = require('./helpers/http');
  http = await listenApp(createApp);
});

after(async () => {
  if (http) await http.close();
});

test('market routes answer for all 29 markets without sending anyone to Ireland', async () => {
  for (const code of EU_WEB_MARKET_CODES) {
    const pathname = marketPublicEntries(MARKETS[code]).find((entry) => entry.startsWith('/en/'));
    const response = await fetch(`${http.baseUrl}${pathname}`, { redirect: 'manual' });
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, /<html lang="en"/, pathname);
    assert.match(html, new RegExp(`data-en-market="${code}"`), pathname);
    assert.match(html, /name="robots" content="noindex, follow"/, pathname);
    assert.match(html, /<h1>[^<]+<\/h1>/, pathname);
    assert.match(html, /name="description" content="[^"]+"/, pathname);
    assert.doesNotMatch(html, /rel="alternate" hreflang=/, pathname);
    assert.doesNotMatch(html, /__PLACEHOLDER__/, pathname);
    if (code !== 'IE') {
      assert.doesNotMatch(html, /Free until 31 December 2026/, pathname);
      assert.doesNotMatch(html, /0-day trial/, pathname);
      assert.match(html, /no free period through 31 December 2026/, pathname);
    }
  }

  const austria = await fetch(`${http.baseUrl}/en?country=AT&utm_source=google`, { redirect: 'manual' });
  assert.equal(austria.status, 302);
  assert.equal(austria.headers.get('location'), '/en/at?utm_source=google');

  const closed = await fetch(`${http.baseUrl}/ga`, { redirect: 'manual' });
  assert.equal(closed.status, 404);
  const closedHtml = await closed.text();
  assert.match(closedHtml, /This language is not available/);
  assert.doesNotMatch(closedHtml, /rel="canonical"/);

  const belgium = await fetch(`${http.baseUrl}/nl/be`, { redirect: 'manual' });
  assert.equal(belgium.status, 200);
  const belgiumHtml = await belgium.text();
  assert.match(belgiumHtml, /lang="nl"/);
  assert.match(belgiumHtml, /data-web-market="BE"/);
  assert.match(belgiumHtml, /name="robots" content="noindex, follow"/);
  assert.match(belgiumHtml, /België/);
  assert.doesNotMatch(belgiumHtml, /[åäöÅÄÖ]/);

  const ireland = await fetch(`${http.baseUrl}/en/ie`, { redirect: 'manual' });
  assert.equal(ireland.status, 200);
  const irelandHtml = await ireland.text();
  assert.match(irelandHtml, /Free until 31 December 2026/);
  assert.match(irelandHtml, /data-en-market="IE"/);

  const canada = await fetch(`${http.baseUrl}/en/ca`, { redirect: 'manual' });
  assert.equal(canada.status, 200);
  const canadaHtml = await canada.text();
  assert.match(canadaHtml, /Google Play — coming soon/);
  assert.doesNotMatch(canadaHtml, /play\.google\.com/);

  const neutral = await fetch(`${http.baseUrl}/en`, { redirect: 'manual' });
  assert.equal(neutral.status, 200);
  const neutralHtml = await neutral.text();
  assert.doesNotMatch(neutralHtml, /name="robots" content="noindex/);

  const dutch = await fetch(`${http.baseUrl}/nl/nl`, { redirect: 'manual' });
  assert.equal(dutch.status, 200);
  const dutchHtml = await dutch.text();
  assert.match(dutchHtml, /data-web-market="NL"/);
  assert.match(dutchHtml, /staan standaard niet open/);
});
