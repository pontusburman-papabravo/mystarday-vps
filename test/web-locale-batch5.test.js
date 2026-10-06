'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { WEB_LOCALE_CODES, LOCALES } = require('../config/web-locales');
const { EU_WEB_MARKET_CODES, MARKETS, marketsForLocale, campaignPath } = require('../config/web-markets');
const { CONTENT_KEYS, pathFor } = require('../config/web-content-keys');
const { pageForLocale } = require('../content/locale-pages');
const { localeMeetsSeoContract, localeSeoGaps } = require('../src/lib/locale-seo-contract');
const { renderLocaleDocument } = require('../src/lib/locale-document');
const { applyPublicSeoHead, hreflangAlternates, absolutePublicUrl } = require('../src/lib/public-seo');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { APP_DOMAIN, MAIN_DOMAIN } = require('../src/lib/domain-redirect');
const { planRows } = require('../src/lib/seo-indexing-plan');

const BATCH = ['mt', 'ga'];
const MUST_INCLUDE = {
  mt: /tfal/i,
  ga: /páist/i,
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

test('all 26 locales are seoEnabled and the 29 markets stay separate from Canada', () => {
  assert.equal(WEB_LOCALE_CODES.length, 26);
  assert.equal(EU_WEB_MARKET_CODES.length, 29);
  assert.equal(EU_WEB_MARKET_CODES.includes('CA'), false);
  assert.equal(MARKETS.CA.euWeb, false);
  const enabled = WEB_LOCALE_CODES.filter((code) => LOCALES[code].seoEnabled);
  const blocked = WEB_LOCALE_CODES.filter((code) => LOCALES[code].block === 'LOCALE_BLOCKED');
  assert.equal(enabled.length, 26);
  assert.equal(blocked.length, 0);
  for (const code of WEB_LOCALE_CODES) {
    assert.equal(localeMeetsSeoContract(code), true, `${code} ${localeSeoGaps(code).join(' ')}`);
  }
});

test('Maltese and Irish pages are real languages, and Ireland keeps both locales', () => {
  const appSitemap = buildSitemapXml({ host: APP_DOMAIN });
  const seSitemap = buildSitemapXml({ host: MAIN_DOMAIN });
  for (const code of BATCH) {
    for (const entry of CONTENT_KEYS) {
      const routePath = pathFor(entry.key, code);
      const page = pageForLocale(code, entry.key);
      const html = applyPublicSeoHead(renderLocaleDocument(code, page, routePath), routePath);
      const body = article(html);
      assert.match(html, new RegExp(`lang="${code}"`), routePath);
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
    assert.doesNotMatch(terms, /Maltese law|Irish law|liġi Maltija|dlí na hÉireann/i, code);
  }
  assert.equal(pathFor('home', 'mt'), '/mt');
  assert.equal(pathFor('home', 'ga'), '/ga');
  assert.notEqual(pathFor('visualSchedule', 'mt'), '/mt/mt');
  assert.notEqual(pathFor('visualSchedule', 'ga'), '/ga/ie');
  assert.deepEqual(marketsForLocale('ga').map((market) => market.code), ['IE']);
  assert.deepEqual(marketsForLocale('mt').map((market) => market.code), ['MT']);
  assert.deepEqual([...MARKETS.IE.locales], ['en', 'ga']);
  assert.equal(campaignPath(MARKETS.IE, 'ga'), '/ga/ie');
  assert.equal(campaignPath(MARKETS.IE, 'en'), '/en/ie');
  assert.equal(campaignPath(MARKETS.MT, 'mt'), '/mt/mt');
  assert.equal(campaignPath(MARKETS.MT, 'en'), '/en/mt');
});

test('hreflang clusters are reciprocal and market pages stay outside them', () => {
  let clusters = 0;
  for (const entry of CONTENT_KEYS) {
    const source = pathFor(entry.key, 'en') || pathFor(entry.key, 'sv');
    const rows = hreflangAlternates(source);
    assert.ok(rows.length, entry.key);
    clusters += 1;
    const tags = new Set(rows.map(([tag]) => tag));
    assert.equal(tags.has('x-default'), true, entry.key);
    for (const code of WEB_LOCALE_CODES) {
      if (!pathFor(entry.key, code)) continue;
      const expected = code === 'sv' ? 'sv-SE' : code;
      assert.equal(tags.has(expected), true, `${entry.key} missing ${expected}`);
    }
    if (entry.key === 'howItWorks') assert.equal(pathFor(entry.key, 'sv'), null);
    const sourceUrl = absolutePublicUrl(source);
    for (const [, href] of rows) {
      const target = new URL(href).pathname;
      assert.equal(SEO_INDEXABLE_PATHS.has(target), true, href);
      const back = hreflangAlternates(target);
      assert.ok(back.some(([, candidate]) => candidate === sourceUrl), `${entry.key} ${href}`);
    }
  }
  assert.equal(clusters, CONTENT_KEYS.length);
  for (const pathname of ['/ga/ie', '/en/ie', '/mt/mt', '/en/mt', '/en/ca']) {
    assert.deepEqual(hreflangAlternates(pathname), [], pathname);
    assert.equal(SEO_INDEXABLE_PATHS.has(pathname), false, pathname);
  }
});

test('the indexing plan covers every published locale and keeps market rows noindex', () => {
  const rows = planRows();
  const indexable = rows.filter((row) => row.indexable === 'true');
  const perLocale = {};
  for (const row of indexable) perLocale[row.locale] = (perLocale[row.locale] || 0) + 1;
  assert.equal(Object.keys(perLocale).length, 26);
  for (const code of BATCH) assert.equal(perLocale[code], CONTENT_KEYS.length, code);
  for (const row of indexable) {
    assert.equal(row.canonical, row.url, row.url);
    assert.equal(row.sitemap, 'yes', row.url);
    assert.equal(row.market, '', row.url);
  }
  for (const pathname of ['/mt/mt', '/ga/ie', '/en/ie', '/en/mt', '/en/ca']) {
    const row = rows.find((item) => item.url === pathname);
    assert.ok(row, pathname);
    assert.equal(row.indexable, 'false', pathname);
    assert.equal(row.sitemap, 'no', pathname);
    assert.equal(row.hreflang, '', pathname);
  }
  const sitemap = buildSitemapXml({ host: APP_DOMAIN });
  assert.equal((sitemap.match(/<loc>/g) || []).length > 0, true);
  assert.doesNotMatch(sitemap, /\/ga\/ie</);
  assert.doesNotMatch(sitemap, /\/mt\/mt</);
  assert.doesNotMatch(sitemap, /\/en\/ie</);
  assert.doesNotMatch(sitemap, /\/en\/ca</);
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

test('Malta and Ireland answer in both languages and unknown codes stay closed', async () => {
  for (const [routePath, lang, market, extra] of [
    ['/mt', 'mt', '', /tfal/i],
    ['/mt/mt', 'mt', 'MT', null],
    ['/en/mt', 'en', 'MT', null],
    ['/ga', 'ga', '', /páist/i],
    ['/ga/ie', 'ga', 'IE', null],
    ['/en/ie', 'en', 'IE', /Free until 31 December 2026/],
    ['/en/ca', 'en', 'CA', /coming soon/i],
  ]) {
    const response = await fetch(`${http.baseUrl}${routePath}`, { redirect: 'manual' });
    assert.equal(response.status, 200, routePath);
    const html = await response.text();
    assert.match(html, new RegExp(`lang="${lang}"`), routePath);
    if (market) {
      assert.match(html, /noindex, follow/, routePath);
      assert.match(html, new RegExp(`data-web-market="${market}"|data-en-market="${market}"`), routePath);
    }
    if (extra) assert.match(html, extra, routePath);
  }
  const missing = await fetch(`${http.baseUrl}/ga/leathanach-ar-iarraidh`, { redirect: 'manual' });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Níor aimsíodh an leathanach/);
  const blocked = await fetch(`${http.baseUrl}/xx`, { redirect: 'manual' });
  assert.equal(blocked.status, 404);
  assert.match(await blocked.text(), /This language is not available/);
});
