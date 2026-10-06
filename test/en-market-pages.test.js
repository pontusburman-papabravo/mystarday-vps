'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  createDomainRedirect,
  MAIN_DOMAIN,
  APP_DOMAIN,
} = require('../src/lib/domain-redirect');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { buildRobotsTxt } = require('../src/lib/seo-pages');
const {
  applyPublicSeoHead,
  absolutePublicUrl,
  hreflangAlternates,
  isEnglishContentIndexable,
} = require('../src/lib/public-seo');
const {
  EN_MARKET_PAGES,
  FREE_PERIOD,
  renderEnMarketPage,
  legacyCountryCampaignPath,
} = require('../src/lib/en-market-landing');
const {
  APPLE_APP_STORE_IE_URL,
  APPLE_APP_STORE_CA_URL,
  getIrelandPlayStoreUrl,
} = require('../config/store-links');

const EN_HTML = fs.readFileSync(path.join(__dirname, '../public/en.html'), 'utf8');

function runRedirect(host, url = '/') {
  const middleware = createDomainRedirect();
  let status;
  let location;
  const req = { headers: { host }, originalUrl: url, method: 'GET' };
  const res = {
    redirect(code, loc) {
      status = code;
      location = loc;
    },
  };
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { status, location, nextCalled };
}

test('neutral /en is the English product page, not an Ireland page', () => {
  assert.equal(isEnglishContentIndexable('/en'), true);
  assert.match(EN_HTML, /<h1>Not just another family calendar\.<\/h1>/);
  assert.match(EN_HTML, /Currently available in selected markets/);
  assert.match(EN_HTML, /href="\/en\/ie"/);
  assert.match(EN_HTML, /href="\/en\/ca"/);
  assert.doesNotMatch(EN_HTML, /Now in Ireland/);
  assert.doesNotMatch(EN_HTML, /Welcome Ireland/);
  assert.doesNotMatch(EN_HTML, /Available now in Ireland/);
  assert.doesNotMatch(EN_HTML, /Made for families in Ireland/);
  const alternates = hreflangAlternates('/en');
  assert.ok(alternates.length > 0);
  assert.equal(alternates.some((pair) => pair[1].endsWith('/en/ie')), false);
  assert.equal(alternates.some((pair) => pair[1].endsWith('/en/ca')), false);
});

test('campaign paths map to IE and CA and keep other query params', () => {
  assert.equal(legacyCountryCampaignPath({ country: 'ie' }), '/en/ie');
  assert.equal(legacyCountryCampaignPath({ market: 'CA' }), '/en/ca');
  assert.equal(
    legacyCountryCampaignPath({ country: 'CA', utm_source: 'meta', utm_campaign: 'canada_launch' }),
    '/en/ca?utm_source=meta&utm_campaign=canada_launch',
  );
  assert.equal(legacyCountryCampaignPath({ country: 'GB' }), null);
  assert.equal(legacyCountryCampaignPath({}), null);
});

test('Ireland and Canada campaign pages are noindex and self-canonical', () => {
  for (const code of ['IE', 'CA']) {
    const market = EN_MARKET_PAGES[code];
    assert.equal(isEnglishContentIndexable(market.path), false);
    assert.deepEqual(hreflangAlternates(market.path), []);
    const html = applyPublicSeoHead(renderEnMarketPage(code), market.path);
    assert.match(html, /name="robots" content="noindex, follow"/);
    assert.match(html, new RegExp(`rel="canonical" href="${absolutePublicUrl(market.path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.doesNotMatch(html, /rel="canonical" href="[^"]*utm_/);
    assert.doesNotMatch(html, /hreflang="en-IE"/);
    assert.doesNotMatch(html, /hreflang="en-CA"/);
    assert.match(html, new RegExp(FREE_PERIOD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, new RegExp(`<h1>${market.h1}</h1>`));
    assert.match(html, /href="\/en\/visual-schedule-app"/);
    assert.match(html, /aria-label="Language"/);
    assert.match(html, /aria-label="Market"/);
  }
  const ie = renderEnMarketPage('IE');
  const ca = renderEnMarketPage('CA');
  assert.match(ie, /Ireland/);
  assert.match(ie, new RegExp(APPLE_APP_STORE_IE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(ie, new RegExp(getIrelandPlayStoreUrl().replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(ie, /Google Play — coming soon/);
  assert.match(ca, /Canada/);
  assert.match(ca, new RegExp(APPLE_APP_STORE_CA_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(ca, /Google Play — coming soon/);
  assert.doesNotMatch(ca, /play\.google\.com/);
  assert.match(ca, /data-en-market="CA"/);
  assert.match(ie, /data-en-market="IE"/);
});

test('campaign pages stay out of the sitemap and robots.txt', () => {
  const sitemap = buildSitemapXml({ host: APP_DOMAIN });
  assert.match(sitemap, /\/en</);
  assert.doesNotMatch(sitemap, /\/en\/ie/);
  assert.doesNotMatch(sitemap, /\/en\/ca/);
  const robots = buildRobotsTxt({ host: APP_DOMAIN });
  assert.doesNotMatch(robots, /Disallow: \/en\/ie/);
  assert.doesNotMatch(robots, /Disallow: \/en\/ca/);
  const swedish = runRedirect(MAIN_DOMAIN, '/en/ca?utm_source=test');
  assert.equal(swedish.status, 301);
  assert.equal(swedish.location, `https://${APP_DOMAIN}/en/ca?utm_source=test`);
});

test('English market routes answer and keep UTM off the canonical URL', async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xx';
  }
  const { createApp } = require('../app');
  const { listenApp } = require('./helpers/http');
  const http = await listenApp(createApp);
  try {
    const neutral = await fetch(`${http.baseUrl}/en`, { redirect: 'manual' });
    assert.equal(neutral.status, 200);
    const neutralHtml = await neutral.text();
    assert.match(neutralHtml, /Currently available in selected markets/);
    assert.doesNotMatch(neutralHtml, /Now in Ireland/);
    assert.doesNotMatch(neutralHtml, /name="robots" content="noindex/);

    const ieRedirect = await fetch(`${http.baseUrl}/en?country=IE&utm_source=google`, { redirect: 'manual' });
    assert.equal(ieRedirect.status, 302);
    assert.equal(ieRedirect.headers.get('location'), '/en/ie?utm_source=google');

    for (const code of ['ie', 'ca']) {
      const res = await fetch(`${http.baseUrl}/en/${code}?utm_source=test`, { redirect: 'manual' });
      assert.equal(res.status, 200, code);
      const body = await res.text();
      assert.match(body, /name="robots" content="noindex, follow"/);
      assert.match(body, new RegExp(`rel="canonical" href="${absolutePublicUrl(`/en/${code}`).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
      assert.doesNotMatch(body, /utm_source/);
      assert.match(body, new RegExp(`data-en-market="${code.toUpperCase()}"`));
    }
  } finally {
    await http.close();
  }
});
