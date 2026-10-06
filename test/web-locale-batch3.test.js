'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { WEB_LOCALE_CODES, LOCALES } = require('../config/web-locales');
const { EU_WEB_MARKET_CODES, marketsForLocale, campaignPath } = require('../config/web-markets');
const { CONTENT_KEYS, pathFor, localeAlternates } = require('../config/web-content-keys');
const { pageForLocale } = require('../content/locale-pages');
const { localeMeetsSeoContract, localeSeoGaps } = require('../src/lib/locale-seo-contract');
const { renderLocaleDocument } = require('../src/lib/locale-document');
const { applyPublicSeoHead, hreflangAlternates, absolutePublicUrl } = require('../src/lib/public-seo');
const { SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { APP_DOMAIN, MAIN_DOMAIN } = require('../src/lib/domain-redirect');
const { planRows } = require('../src/lib/seo-indexing-plan');

const BATCH = ['cs', 'sk', 'sl', 'hr', 'hu'];
const MUST_INCLUDE = {
  cs: /dít|dět/i,
  sk: /dieť|deti/i,
  sl: /otrok/i,
  hr: /dijet|djec/i,
  hu: /gyerek/i,
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

test('batch 3 locales are published and later languages stay blocked', () => {
  assert.equal(WEB_LOCALE_CODES.length, 26);
  assert.equal(EU_WEB_MARKET_CODES.length, 29);
  const enabled = WEB_LOCALE_CODES.filter((code) => LOCALES[code].seoEnabled);
  for (const code of [...BATCH, 'sv', 'en', 'nl', 'da', 'pt']) {
    assert.equal(enabled.includes(code), true, code);
  }
  for (const code of BATCH) {
    assert.equal(localeMeetsSeoContract(code), true, localeSeoGaps(code).join(' '));
    assert.equal(LOCALES[code].block, null);
  }
  assert.equal(localeMeetsSeoContract('ga'), false);
  assert.equal(localeMeetsSeoContract('ro'), false);
});

test('batch 3 pages are in the language, in the sitemap, and keep market pages out', () => {
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
    for (const market of marketsForLocale(code)) {
      const routePath = campaignPath(market, code);
      const page = pageForLocale(code, `market-${market.code}`);
      const html = applyPublicSeoHead(renderLocaleDocument(code, page, routePath), routePath);
      assert.match(html, new RegExp(`data-web-market="${market.code}"`), routePath);
      assert.match(html, /noindex, follow/, routePath);
      assert.equal(SEO_INDEXABLE_PATHS.has(routePath), false, routePath);
      assert.deepEqual(hreflangAlternates(routePath), [], routePath);
    }
  }
});

test('visual-schedule hreflang includes batch 3 and letter pairs stay apart', () => {
  const rows = hreflangAlternates('/en/visual-schedule-app');
  for (const code of BATCH) assert.ok(rows.some(([tag]) => tag === code), code);
  const alternates = localeAlternates().find((row) => row.key === 'visualSchedule');
  for (const code of BATCH) assert.equal(alternates[code], pathFor('visualSchedule', code));
  assert.equal(pathFor('home', 'cs'), '/cs');
  assert.notEqual(pathFor('visualSchedule', 'cs'), '/cs/cz');
  assert.notEqual(pathFor('visualSchedule', 'sl'), '/sl/si');
});

test('indexing plan lists batch 3 and keeps cz si separate from the language homes', () => {
  const rows = planRows();
  for (const code of BATCH) {
    const content = rows.filter((row) => row.locale === code && row.content_key && !row.market);
    assert.equal(content.length, CONTENT_KEYS.length, code);
    for (const row of content) {
      assert.equal(row.indexable, 'true', row.url);
      assert.equal(row.canonical, row.url, row.url);
      assert.equal(row.sitemap, 'yes', row.url);
    }
  }
  for (const pathname of ['/cs/cz', '/sk/sk', '/sl/si', '/hr/hr', '/hu/hu']) {
    const row = rows.find((item) => item.url === pathname);
    assert.ok(row, pathname);
    assert.equal(row.indexable, 'false', pathname);
    assert.equal(row.hreflang, '', pathname);
  }
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

test('batch 3 routes answer in their language and same-letter markets stay noindex', async () => {
  for (const [routePath, lang, market] of [
    ['/cs', 'cs', ''],
    ['/cs/cz', 'cs', 'CZ'],
    ['/sk', 'sk', ''],
    ['/sk/sk', 'sk', 'SK'],
    ['/sl', 'sl', ''],
    ['/sl/si', 'sl', 'SI'],
    ['/hr', 'hr', ''],
    ['/hr/hr', 'hr', 'HR'],
    ['/hu', 'hu', ''],
    ['/hu/hu', 'hu', 'HU'],
  ]) {
    const response = await fetch(`${http.baseUrl}${routePath}`, { redirect: 'manual' });
    assert.equal(response.status, 200, routePath);
    const html = await response.text();
    assert.match(html, new RegExp(`lang="${lang}"`), routePath);
    if (!market) assert.match(html, MUST_INCLUDE[lang], routePath);
    if (market) assert.match(html, /noindex, follow/, routePath);
  }
  const missing = await fetch(`${http.baseUrl}/cs/tahle-stranka-chybi`, { redirect: 'manual' });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Stránka nebyla nalezena/);
  const blocked = await fetch(`${http.baseUrl}/ga`, { redirect: 'manual' });
  assert.equal(blocked.status, 404);
});
