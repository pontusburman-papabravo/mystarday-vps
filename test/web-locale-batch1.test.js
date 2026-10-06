'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { WEB_LOCALE_CODES, LOCALES } = require('../config/web-locales');
const { EU_WEB_MARKET_CODES, MARKETS, marketsForLocale, campaignPath } = require('../config/web-markets');
const { CONTENT_KEYS, pathFor, localeAlternates } = require('../config/web-content-keys');
const { pageForLocale } = require('../content/locale-pages');
const { localeMeetsSeoContract, localeSeoGaps } = require('../src/lib/locale-seo-contract');
const { renderLocaleDocument } = require('../src/lib/locale-document');
const { applyPublicSeoHead, hreflangAlternates, absolutePublicUrl } = require('../src/lib/public-seo');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { APP_DOMAIN, MAIN_DOMAIN } = require('../src/lib/domain-redirect');
const { localeReadiness, planRows } = require('../src/lib/seo-indexing-plan');

const BATCH = ['de', 'fr', 'es', 'it', 'pl'];
const MUST_INCLUDE = {
  de: /Kind/,
  fr: /enfant/,
  es: /niño|niños/,
  it: /bambino|bambini/,
  pl: /dziec/i,
};
const ENGLISH_LEAKS = [
  /How it works/,
  /Create an account/,
  /Get My Starday/,
  /coming soon/i,
  /This page is not available/,
  /Privacy Policy/,
  /Terms of Service/,
  /visual schedule/i,
];

function article(html) {
  const match = html.match(/<article[\s\S]*<\/article>/);
  return match ? match[0] : html;
}

test('batch 1 locales are published and the rest of the registry stays blocked', () => {
  assert.equal(WEB_LOCALE_CODES.length, 26);
  assert.equal(EU_WEB_MARKET_CODES.length, 29);
  const enabled = WEB_LOCALE_CODES.filter((code) => LOCALES[code].seoEnabled);
  const blocked = localeReadiness().filter((row) => row.blocking.startsWith('LOCALE_BLOCKED'));
  for (const code of ['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'sv']) {
    assert.equal(enabled.includes(code), true, code);
  }
  assert.equal(blocked.length, WEB_LOCALE_CODES.length - enabled.length);
  for (const code of BATCH) {
    assert.equal(localeMeetsSeoContract(code), true, localeSeoGaps(code).join(' '));
    assert.equal(LOCALES[code].block, null);
  }
  assert.equal(localeMeetsSeoContract('ga'), true);
});

test('batch 1 pages are in the language, in the sitemap, and keep market pages out', () => {
  const appSitemap = buildSitemapXml({ host: APP_DOMAIN });
  const seSitemap = buildSitemapXml({ host: MAIN_DOMAIN });
  for (const code of BATCH) {
    for (const entry of CONTENT_KEYS) {
      const routePath = pathFor(entry.key, code);
      const page = pageForLocale(code, entry.key);
      const html = applyPublicSeoHead(renderLocaleDocument(code, page, routePath), routePath);
      const body = article(html);
      assert.match(html, new RegExp(`lang="${code}"`), routePath);
      assert.match(html, new RegExp(`<h1>${page.h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`), routePath);
      assert.match(body, MUST_INCLUDE[code], routePath);
      for (const leak of ENGLISH_LEAKS) assert.doesNotMatch(body, leak, `${routePath} ${leak}`);
      assert.doesNotMatch(body, /stjärn|morgonrutin|veckoschema|förälder/, routePath);
      assert.match(appSitemap, new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`), routePath);
      assert.doesNotMatch(seSitemap, new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`), routePath);
      assert.equal(SEO_INDEXABLE_PATHS.has(routePath), true, routePath);
      const canonical = absolutePublicUrl(routePath);
      assert.match(html, new RegExp(`rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), routePath);
    }
    const privacy = pageForLocale(code, 'privacy').body;
    const terms = pageForLocale(code, 'terms').body;
    for (const marker of ['Papa Bravo', 'IMY', 'Neon', 'Resend', 'Cloudflare']) {
      assert.match(privacy, new RegExp(marker), code);
    }
    assert.match(terms, /Papa Bravo/);
    assert.match(terms, /\b59\b/);
    assert.match(terms, /\b590\b/);
    for (const market of marketsForLocale(code)) {
      const routePath = campaignPath(market, code);
      const page = pageForLocale(code, `market-${market.pathSegment}`);
      const html = applyPublicSeoHead(renderLocaleDocument(code, page, routePath), routePath);
      assert.match(html, new RegExp(`data-web-market="${market.code}"`), routePath);
      assert.match(html, /noindex, follow/, routePath);
      assert.equal(SEO_INDEXABLE_PATHS.has(routePath), false, routePath);
      assert.deepEqual(hreflangAlternates(routePath), [], routePath);
      assert.doesNotMatch(appSitemap, new RegExp(`${routePath}<`), routePath);
    }
  }
});

test('visual-schedule hreflang is reciprocal across the published languages', () => {
  const rows = hreflangAlternates('/en/visual-schedule-app');
  for (const code of ['en', 'sv-SE', 'nl', ...BATCH]) {
    assert.ok(rows.some(([tag]) => tag === code), code);
  }
  assert.ok(rows.some(([tag, href]) => tag === 'x-default' && href === absolutePublicUrl('/en/visual-schedule-app')));
  for (const [tag, href] of rows) {
    if (tag === 'x-default') continue;
    const back = hreflangAlternates(new URL(href).pathname);
    assert.ok(back.some(([, candidate]) => candidate === href), tag);
  }
  const alternates = localeAlternates().find((row) => row.key === 'visualSchedule');
  for (const code of BATCH) assert.equal(alternates[code], pathFor('visualSchedule', code));
});

test('indexing plan lists batch 1 content and keeps new market rows noindex', () => {
  const rows = planRows();
  for (const code of BATCH) {
    const content = rows.filter((row) => row.locale === code && row.content_key && !row.market);
    assert.equal(content.length, CONTENT_KEYS.length, code);
    for (const row of content) {
      assert.equal(row.indexable, 'true', row.url);
      assert.equal(row.sitemap, 'yes', row.url);
      assert.equal(row.canonical, row.url, row.url);
      assert.ok(row.hreflang.includes(code), row.url);
    }
  }
  for (const pathname of ['/de/de', '/de/at', '/fr/fr', '/fr/be', '/es/es', '/it/it', '/pl/pl']) {
    const row = rows.find((item) => item.url === pathname);
    assert.ok(row, pathname);
    assert.equal(row.indexable, 'false', pathname);
    assert.equal(row.hreflang, '', pathname);
  }
  assert.ok(rows.some((row) => row.locale === 'ga' && row.content_key === 'home'));
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

test('batch 1 routes answer in their language and unknown tails stay local', async () => {
  for (const [routePath, lang, market] of [
    ['/de', 'de', ''],
    ['/de/visueller-tagesplan', 'de', ''],
    ['/de/de', 'de', 'DE'],
    ['/de/at', 'de', 'AT'],
    ['/fr', 'fr', ''],
    ['/fr/fr', 'fr', 'FR'],
    ['/es', 'es', ''],
    ['/es/es', 'es', 'ES'],
    ['/it', 'it', ''],
    ['/it/it', 'it', 'IT'],
    ['/pl', 'pl', ''],
    ['/pl/pl', 'pl', 'PL'],
  ]) {
    const response = await fetch(`${http.baseUrl}${routePath}`, { redirect: 'manual' });
    assert.equal(response.status, 200, routePath);
    const html = await response.text();
    assert.match(html, new RegExp(`lang="${lang}"`), routePath);
    if (!market) assert.match(html, MUST_INCLUDE[lang], routePath);
    if (market) {
      assert.match(html, new RegExp(`data-web-market="${market}"`), routePath);
      assert.match(html, /noindex, follow/, routePath);
    } else {
      assert.doesNotMatch(html, /name="robots" content="noindex/, routePath);
    }
  }

  const missing = await fetch(`${http.baseUrl}/de/diese-seite-fehlt`, { redirect: 'manual' });
  assert.equal(missing.status, 404);
  const missingHtml = await missing.text();
  assert.match(missingHtml, /lang="de"/);
  assert.match(missingHtml, /Seite nicht gefunden/);
  assert.match(missingHtml, /noindex, follow/);

  const blocked = await fetch(`${http.baseUrl}/xx`, { redirect: 'manual' });
  assert.equal(blocked.status, 404);
  assert.match(await blocked.text(), /This language is not available/);

  const toMarket = await fetch(`${http.baseUrl}/de?country=AT&utm_source=google`, { redirect: 'manual' });
  assert.equal(toMarket.status, 302);
  assert.equal(toMarket.headers.get('location'), '/de/at?utm_source=google');
});
