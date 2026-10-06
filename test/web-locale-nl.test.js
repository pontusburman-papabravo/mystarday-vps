'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { LOCALES } = require('../config/web-locales');
const {
  MARKETS,
  marketForPublicPath,
  campaignPath,
  marketsForLocale,
  localeMarketQueryPath,
  marketCommercialFacts,
  playUrlForMarket,
} = require('../config/web-markets');
const {
  contentByPath,
  pathFor,
  localeAlternates,
  indexablePathsForLocale,
} = require('../config/web-content-keys');
const { localeMeetsSeoContract, localeSeoGaps } = require('../src/lib/locale-seo-contract');
const { localeSwitchTarget } = require('../src/lib/locale-switch');
const { renderLocaleDocument } = require('../src/lib/locale-document');
const { pageFor } = require('../content/nl/pages');
const { publicNotFoundKind } = require('../src/lib/web-routing');
const {
  applyPublicSeoHead,
  absolutePublicUrl,
  hreflangAlternates,
  isInternationalContentIndexable,
} = require('../src/lib/public-seo');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { APP_DOMAIN, MAIN_DOMAIN, createDomainRedirect } = require('../src/lib/domain-redirect');
const {
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  getPlayStoreUrl,
} = require('../config/store-links');

const NL_INDEXABLE = [
  '/nl',
  '/nl/hoe-het-werkt',
  '/nl/visueel-schema',
  '/nl/ochtendroutine-kinderen',
  '/nl/weekplanning-met-pictogrammen',
  '/nl/routines-neurodiverse-kinderen',
  '/nl/beloningssysteem-kinderen',
  '/nl/bronnen',
  '/nl/faq',
  '/nl/privacy',
  '/nl/voorwaarden',
];

const ALT_FILE = fs.readFileSync(path.join(__dirname, '../public/js/public-locale-alternates.js'), 'utf8');

function hreflangMap(pathname) {
  return Object.fromEntries(hreflangAlternates(pathname));
}

function indexableCopy(html) {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join('\n');
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  return `${visible}\n${ld}`.replace(/\s+/g, ' ').trim();
}

function withoutLanguageSwitcher(html) {
  return String(html).replace(/<nav\b[^>]*data-public-lang-switcher="1"[\s\S]*?<\/nav>/gi, ' ');
}

function assertDutchCopy(html, label) {
  const text = indexableCopy(withoutLanguageSwitcher(html));
  assert.doesNotMatch(text, /[åäöÅÄÖ]/, `${label} has Swedish letters`);
  assert.doesNotMatch(text, /\b(och|inte|stjärn|morgonrutin|veckoschema|belöning|så fungerar|integritetspolicy)\b/i, `${label} has Swedish`);
  assert.doesNotMatch(text, /\b(How it works|Privacy Policy|Terms of Service|Visual schedule|morning routine|Sign up|Learn more|coming soon|14-day trial|Click here|Read more|Available now|Get started|Not just another|Create an account|This page is not available)\b/, `${label} has English`);
  assert.doesNotMatch(text, /__([A-Z0-9_]+)__|\bTODO\b|\bFIXME\b|lorem ipsum|\{\{[^}]+\}\}|placeholder/i, `${label} has a placeholder`);
}

test('locale registry enables English and Dutch, and keeps market separate', () => {
  assert.equal(LOCALES.en.enabled, true);
  assert.equal(LOCALES.en.seoEnabled, true);
  assert.equal(LOCALES.en.htmlLang, 'en');
  assert.equal(LOCALES.nl.enabled, true);
  assert.equal(LOCALES.nl.publicWeb, true);
  assert.equal(LOCALES.nl.seoEnabled, true);
  assert.equal(LOCALES.nl.htmlLang, 'nl');
  assert.equal(LOCALES.nl.nativeName, 'Nederlands');
  assert.deepEqual([...LOCALES.nl.hreflang], ['nl']);
  assert.equal(LOCALES.en.defaultPublic, true);
  assert.equal(MARKETS.IE.defaultLocale, 'en');
  assert.deepEqual([...MARKETS.IE.locales], ['en', 'ga']);
  assert.deepEqual([...MARKETS.CA.campaignLocales], ['en']);
  assert.deepEqual([...MARKETS.NL.locales], ['nl', 'en']);
  assert.equal(MARKETS.NL.defaultLocale, 'nl');
  assert.deepEqual([...MARKETS.NL.campaignLocales], ['nl', 'en']);
  assert.equal(MARKETS.NL.webAvailable, true);
  assert.equal(MARKETS.NL.marketingActive, false);
  assert.equal(localeMeetsSeoContract('en'), true);
  assert.equal(localeMeetsSeoContract('nl'), true);
  assert.deepEqual(localeSeoGaps('en'), []);
  assert.deepEqual(localeSeoGaps('nl'), []);
  assert.equal(localeMeetsSeoContract('ga'), false);
  assert.equal(localeMeetsSeoContract('de'), true);
});

test('content routes and market routes do not share a path', () => {
  assert.equal(marketForPublicPath('/en/ie').market.code, 'IE');
  assert.equal(marketForPublicPath('/en/ca').market.code, 'CA');
  assert.equal(marketForPublicPath('/nl/nl').market.code, 'NL');
  assert.equal(marketForPublicPath('/nl/nl').locale.code, 'nl');
  assert.equal(contentByPath('/en/ie'), null);
  assert.equal(contentByPath('/en/ca'), null);
  assert.equal(contentByPath('/nl/nl'), null);
  assert.equal(contentByPath('/en/morning-routine-children').key, 'morningRoutine');
  assert.equal(contentByPath('/nl/visueel-schema').key, 'visualSchedule');
  assert.equal(marketForPublicPath('/en/nl').market.code, 'NL');
  assert.equal(marketForPublicPath('/nl/ie'), null);
  assert.equal(campaignPath(MARKETS.NL, 'en'), '/en/nl');
  for (const market of Object.values(MARKETS)) {
    for (const localeCode of market.campaignLocales) {
      const reserved = campaignPath(market, localeCode);
      assert.equal(contentByPath(reserved), null, reserved);
    }
  }
  assert.deepEqual(NL_INDEXABLE, indexablePathsForLocale('nl'));
  assert.equal(publicNotFoundKind('/xx'), 'unknown-locale');
  assert.equal(publicNotFoundKind('/nl/ie'), 'unknown-locale-path');
  assert.equal(publicNotFoundKind('/en'), null);
  assert.equal(publicNotFoundKind('/random'), null);
});

test('language switch follows contentKey and falls back to the language home', () => {
  assert.equal(localeSwitchTarget('/en/visual-schedule-app', 'nl'), '/nl/visueel-schema');
  assert.equal(localeSwitchTarget('/nl/visueel-schema', 'en'), '/en/visual-schedule-app');
  assert.equal(localeSwitchTarget('/nl/visueel-schema', 'sv'), '/bildschema-app');
  assert.equal(localeSwitchTarget('/en/how-it-works', 'nl'), '/nl/hoe-het-werkt');
  assert.equal(localeSwitchTarget('/en/how-it-works', 'sv'), '/');
  assert.equal(localeSwitchTarget('/en/ie', 'nl'), '/nl');
  assert.equal(localeSwitchTarget('/nl/nl', 'en'), '/en');
  assert.equal(pathFor('visualSchedule', 'nl'), '/nl/visueel-schema');
  assert.equal(localeMarketQueryPath('/nl', { country: 'NL', utm_source: 'google' }), '/nl/nl?utm_source=google');
  assert.equal(localeMarketQueryPath('/en', { country: 'NL' }), '/en/nl');
  assert.equal(localeMarketQueryPath('/nl', { country: 'IE' }), null);
  assert.equal(localeMarketQueryPath('/nl', { country: 'BE' }), '/nl/be');
  const nlMarkets = marketsForLocale('nl').map((market) => market.code);
  const enMarkets = marketsForLocale('en').map((market) => market.code);
  assert.deepEqual(nlMarkets, ['BE', 'NL']);
  assert.ok(enMarkets.includes('IE'));
  assert.ok(enMarkets.includes('CA'));
  assert.ok(enMarkets.includes('AT'));
});

test('Dutch hreflang comes from content identity and market pages stay out', () => {
  const nl = hreflangMap('/nl/visueel-schema');
  const en = hreflangMap('/en/visual-schedule-app');
  const sv = hreflangMap('/bildschema-app');
  assert.equal(nl['nl'], absolutePublicUrl('/nl/visueel-schema'));
  assert.equal(nl['en'], absolutePublicUrl('/en/visual-schedule-app'));
  assert.equal(nl['en-IE'], undefined);
  assert.equal(nl['en-CA'], undefined);
  assert.equal(nl['sv-SE'], absolutePublicUrl('/bildschema-app'));
  assert.equal(nl['x-default'], nl['en']);
  assert.equal(en['nl'], nl['nl']);
  assert.equal(sv['nl'], nl['nl']);
  assert.equal(en['x-default'], nl['x-default']);
  assert.deepEqual(hreflangAlternates('/nl/nl'), []);
  assert.deepEqual(hreflangAlternates('/en/ie'), []);
  assert.equal(isInternationalContentIndexable('/nl/visueel-schema'), true);
  assert.equal(isInternationalContentIndexable('/nl/nl'), false);
  const home = hreflangMap('/nl');
  assert.equal(home['nl'], absolutePublicUrl('/nl'));
  assert.equal(home['x-default'], absolutePublicUrl('/en'));
  assert.equal(home['en'].endsWith('/en/ie'), false);
  const generated = localeAlternates();
  assert.match(ALT_FILE, /window\.PUBLIC_LOCALE_ALTERNATES/);
  assert.equal(ALT_FILE.includes(JSON.stringify(generated, null, 2)), true);
});

test('indexable Dutch pages are Dutch, self-canonical, and campaign pages are noindex', () => {
  for (const routePath of NL_INDEXABLE) {
    const key = contentByPath(routePath).key;
    const html = applyPublicSeoHead(renderLocaleDocument('nl', pageFor(key), routePath), routePath);
    assert.match(html, /<html lang="nl"/, routePath);
    assert.match(html, /property="og:locale" content="nl_NL"/, routePath);
    assert.match(html, new RegExp(`rel="canonical" href="${absolutePublicUrl(routePath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), routePath);
    assert.doesNotMatch(html, /name="robots" content="noindex/, routePath);
    assert.match(html, /rel="alternate" hreflang="nl"/, routePath);
    assert.match(html, /<h1>[^<]+<\/h1>/, routePath);
    assert.match(html, /name="description" content="[^"]+"/, routePath);
    assertDutchCopy(html, routePath);
    assert.doesNotMatch(html, /data-en-market=/, routePath);
  }
  const home = renderLocaleDocument('nl', pageFor('home'), '/nl');
  assert.match(home, /Nu beschikbaar op een paar markten/);
  assert.doesNotMatch(home, /Nu beschikbaar in Nederland/);
  assert.match(home, new RegExp(`href="${absolutePublicUrl('/en').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-locale-switch="en"`));
  assert.match(home, /aria-label="Markt"/);
  assert.match(home, /href="\/nl\/nl"/);
  const guide = renderLocaleDocument('nl', pageFor('visualSchedule'), '/nl/visueel-schema');
  assert.match(guide, new RegExp(`href="${absolutePublicUrl('/en/visual-schedule-app').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-locale-switch="en"`));
  assert.match(guide, new RegExp(`href="${absolutePublicUrl('/bildschema-app').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-locale-switch="sv"`));
  assert.doesNotMatch(guide, /href="\/nl\/visueel-schema"/);

  const facts = marketCommercialFacts('NL');
  assert.equal(facts.complimentary, false);
  assert.equal(facts.registrationOpenByDefault, false);
  assert.equal(facts.trialDays, 14);
  const marketHtml = applyPublicSeoHead(renderLocaleDocument('nl', pageFor('market-nl'), '/nl/nl'), '/nl/nl');
  assert.match(marketHtml, /lang="nl"/);
  assert.match(marketHtml, /data-en-market="NL"/);
  assert.match(marketHtml, /data-web-market="NL"/);
  assert.match(marketHtml, /name="robots" content="noindex, follow"/);
  assert.match(marketHtml, new RegExp(`rel="canonical" href="${absolutePublicUrl('/nl/nl').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.doesNotMatch(marketHtml, /rel="alternate" hreflang=/);
  assert.match(marketHtml, /staan standaard niet open/);
  assert.match(marketHtml, /geen gratisperiode tot en met 31 december 2026/);
  assert.match(marketHtml, new RegExp(APPLE_APP_STORE_GEO_NEUTRAL_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(marketHtml, new RegExp(getPlayStoreUrl().replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(marketHtml, /apps\.apple\.com\/nl\//);
  assert.doesNotMatch(marketHtml, /gl=IE/);
  assert.doesNotMatch(marketHtml, /coming soon/i);
  assert.equal(playUrlForMarket(MARKETS.NL), getPlayStoreUrl());
  assertDutchCopy(marketHtml, '/nl/nl');

  const appSitemap = buildSitemapXml({ host: APP_DOMAIN });
  const seSitemap = buildSitemapXml({ host: MAIN_DOMAIN });
  for (const routePath of NL_INDEXABLE) {
    assert.match(appSitemap, new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`), routePath);
    assert.doesNotMatch(seSitemap, new RegExp(`${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`), routePath);
  }
  assert.doesNotMatch(appSitemap, /\/nl\/nl/);
  assert.doesNotMatch(appSitemap, /\/en\/ie/);
  assert.doesNotMatch(appSitemap, /\/en\/ca/);
  assert.match(appSitemap, /\/en</);
  assert.match(appSitemap, /\/nl</);
});

test('landing analytics keeps locale and market apart', () => {
  const events = fs.readFileSync(path.join(__dirname, '../public/js/landing-events.js'), 'utf8');
  function view(pathname, attr) {
    const posts = [];
    const sandbox = {
      console,
      Math,
      Date,
      URLSearchParams,
      fetch(_url, opts) {
        posts.push(JSON.parse(opts.body));
        return Promise.resolve({ ok: true });
      },
      localStorage: {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = String(value); },
      },
      location: { pathname, search: '' },
      document: {
        readyState: 'complete',
        querySelectorAll() { return []; },
        documentElement: { getAttribute() { return attr || null; } },
        addEventListener() {},
      },
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(events, sandbox, { filename: 'landing-events.js' });
    return posts.find((body) => body.event_type === 'landing_view');
  }
  const neutral = view('/en');
  assert.equal(neutral.metadata.locale, 'en');
  assert.equal(neutral.metadata.market, undefined);
  assert.equal(neutral.metadata.landing_path, '/en');
  const ireland = view('/en/ie');
  assert.equal(ireland.metadata.locale, 'en');
  assert.equal(ireland.metadata.market, 'IE');
  const canada = view('/en/ca');
  assert.equal(canada.metadata.locale, 'en');
  assert.equal(canada.metadata.market, 'CA');
  const dutch = view('/nl');
  assert.equal(dutch.metadata.locale, 'nl');
  assert.equal(dutch.metadata.market, undefined);
  assert.equal(dutch.metadata.country, undefined);
  const netherlands = view('/nl/nl', 'NL');
  assert.equal(netherlands.metadata.locale, 'nl');
  assert.equal(netherlands.metadata.market, 'NL');
  assert.equal(netherlands.metadata.country, 'NL');
});

test('public language switcher resolves Dutch and English content keys', () => {
  const posts = [];
  const sandbox = {
    console,
    location: { pathname: '/en/visual-schedule-app', search: '' },
    document: {
      documentElement: { hasAttribute() { return false; } },
      querySelector() { return null; },
      addEventListener(name, fn) { if (name === 'DOMContentLoaded') posts.push(fn); },
      createElement() {
        return { style: {}, setAttribute() {}, appendChild() {} };
      },
      body: { appendChild() {} },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(ALT_FILE, sandbox, { filename: 'public-locale-alternates.js' });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../public/js/public-lang-switcher.js'), 'utf8'),
    sandbox,
    { filename: 'public-lang-switcher.js' },
  );
  assert.equal(sandbox.PublicLangSwitcher.targetFor('nl'), '/nl/visueel-schema');
  assert.equal(sandbox.PublicLangSwitcher.targetFor('sv'), '/bildschema-app');
  sandbox.location.pathname = '/nl/bronnen';
  assert.equal(sandbox.PublicLangSwitcher.targetFor('en'), '/en/resources');
  sandbox.location.pathname = '/en/ie';
  assert.equal(sandbox.PublicLangSwitcher.targetFor('nl'), '/nl');
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

test('locale routes answer, and unknown locale or market does not render the wrong site', async () => {
  const neutral = await fetch(`${http.baseUrl}/en`, { redirect: 'manual' });
  assert.equal(neutral.status, 200);
  const neutralHtml = await neutral.text();
  assert.match(neutralHtml, /data-locale-switch="nl"/);
  assert.doesNotMatch(neutralHtml, /name="robots" content="noindex/);

  const nl = await fetch(`${http.baseUrl}/nl`, { redirect: 'manual' });
  assert.equal(nl.status, 200);
  const nlHtml = await nl.text();
  assert.match(nlHtml, /<html lang="nl"/);
  assert.match(nlHtml, new RegExp(`rel="canonical" href="${absolutePublicUrl('/nl').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.doesNotMatch(nlHtml, /name="robots" content="noindex/);
  assert.match(nlHtml, /hreflang="nl"/);
  assertDutchCopy(nlHtml, 'GET /nl');

  const guide = await fetch(`${http.baseUrl}/nl/visueel-schema?utm_source=test`, { redirect: 'manual' });
  assert.equal(guide.status, 200);
  const guideHtml = await guide.text();
  assert.match(guideHtml, /lang="nl"/);
  assert.match(guideHtml, new RegExp(`rel="canonical" href="${absolutePublicUrl('/nl/visueel-schema').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.doesNotMatch(guideHtml, /utm_source/);
  assert.match(guideHtml, new RegExp(`href="${absolutePublicUrl('/en/visual-schedule-app').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-locale-switch="en"`));
  assertDutchCopy(guideHtml, 'GET /nl/visueel-schema');

  const pillars = [
    '/nl/hoe-het-werkt',
    '/nl/ochtendroutine-kinderen',
    '/nl/weekplanning-met-pictogrammen',
  ];
  for (const routePath of pillars) {
    const res = await fetch(`${http.baseUrl}${routePath}`, { redirect: 'manual' });
    assert.equal(res.status, 200, routePath);
    const body = await res.text();
    assert.match(body, /lang="nl"/, routePath);
    assert.doesNotMatch(body, /name="robots" content="noindex/, routePath);
    assertDutchCopy(body, routePath);
  }

  for (const [routePath, market] of [['/en/ie', 'IE'], ['/en/ca', 'CA'], ['/nl/nl', 'NL']]) {
    const res = await fetch(`${http.baseUrl}${routePath}?utm_source=test`, { redirect: 'manual' });
    assert.equal(res.status, 200, routePath);
    const body = await res.text();
    assert.match(body, /name="robots" content="noindex, follow"/, routePath);
    assert.match(body, new RegExp(`data-en-market="${market}"`), routePath);
    assert.match(body, new RegExp(`rel="canonical" href="${absolutePublicUrl(routePath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), routePath);
    assert.doesNotMatch(body, /utm_source/, routePath);
  }

  const toNl = await fetch(`${http.baseUrl}/nl?country=NL&utm_source=google`, { redirect: 'manual' });
  assert.equal(toNl.status, 302);
  assert.equal(toNl.headers.get('location'), '/nl/nl?utm_source=google');

  const unknownLocale = await fetch(`${http.baseUrl}/xx`, { redirect: 'manual' });
  assert.equal(unknownLocale.status, 404);
  const unknownHtml = await unknownLocale.text();
  assert.match(unknownHtml, /This language is not available/);
  assert.doesNotMatch(unknownHtml, /Not just another family calendar/);
  assert.match(unknownHtml, /noindex, follow/);

  const badMarket = await fetch(`${http.baseUrl}/nl/ie`, { redirect: 'manual' });
  assert.equal(badMarket.status, 404);
  const badHtml = await badMarket.text();
  assert.match(badHtml, /lang="nl"/);
  assert.match(badHtml, /Pagina niet gevonden/);
  assert.doesNotMatch(badHtml, /data-en-market="IE"/);
  assert.match(badHtml, /noindex, follow/);

  const wrongCampaign = await fetch(`${http.baseUrl}/en/gb`, { redirect: 'manual' });
  assert.equal(wrongCampaign.status, 404);
  const wrongHtml = await wrongCampaign.text();
  assert.match(wrongHtml, /This page is not available/);
  assert.doesNotMatch(wrongHtml, /data-web-market="GB"/);

  const englishNetherlands = await fetch(`${http.baseUrl}/en/nl`, { redirect: 'manual' });
  assert.equal(englishNetherlands.status, 200);
  const englishNlHtml = await englishNetherlands.text();
  assert.match(englishNlHtml, /data-web-market="NL"/);
  assert.match(englishNlHtml, /name="robots" content="noindex, follow"/);

  const swedishHost = createDomainRedirect();
  let status;
  let location;
  swedishHost(
    { headers: { host: MAIN_DOMAIN }, originalUrl: '/nl/visueel-schema?utm_source=test', method: 'GET' },
    { redirect(code, loc) { status = code; location = loc; } },
    () => { status = 0; },
  );
  assert.equal(status, 301);
  assert.equal(location, `https://${APP_DOMAIN}/nl/visueel-schema?utm_source=test`);

  const sitemapRes = await fetch(`${http.baseUrl}/sitemap.xml`, { headers: { host: APP_DOMAIN } });
  assert.equal(sitemapRes.status, 200);
  const sitemap = await sitemapRes.text();
  assert.match(sitemap, /\/nl</);
  assert.match(sitemap, /\/nl\/visueel-schema/);
  assert.doesNotMatch(sitemap, /\/nl\/nl/);
  assert.doesNotMatch(sitemap, /\/en\/ie/);
  assert.doesNotMatch(sitemap, /\/en\/ca/);
});
