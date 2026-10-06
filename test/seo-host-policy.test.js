'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  createDomainRedirect,
  MAIN_DOMAIN,
  APP_DOMAIN,
} = require('../src/lib/domain-redirect');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { buildRobotsTxt, SEO_INDEXABLE_PATHS } = require('../src/lib/seo-pages');
const {
  applyPublicSeoHead,
  absolutePublicUrl,
  hreflangAlternates,
  isEnglishContentIndexable,
  englishOrigin,
  swedishOrigin,
} = require('../src/lib/public-seo');

function runRedirect(host, url = '/', method = 'GET') {
  const middleware = createDomainRedirect();
  let status;
  let location;
  const req = { headers: { host }, originalUrl: url, method };
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

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('English host redirects', () => {
  test('Swedish /en redirects to the English host and keeps the country query', () => {
    const { status, location, nextCalled } = runRedirect(MAIN_DOMAIN, '/en?country=CA');
    assert.equal(nextCalled, false);
    assert.equal(status, 301);
    assert.equal(location, `https://${APP_DOMAIN}/en?country=CA`);
  });

  test('Swedish /en subpaths redirect and trailing slashes are stripped', () => {
    const { status, location } = runRedirect(`www.${MAIN_DOMAIN}`, '/en/morning-routine-children/?country=IE');
    assert.equal(status, 301);
    assert.equal(location, `https://${APP_DOMAIN}/en/morning-routine-children?country=IE`);
  });

  test('English host /en is not redirected again', () => {
    const { nextCalled, status } = runRedirect(APP_DOMAIN, '/en?country=CA');
    assert.equal(nextCalled, true);
    assert.equal(status, undefined);
  });

  test('English host root goes to /en and keeps the query', () => {
    const { status, location } = runRedirect(APP_DOMAIN, '/?country=IE');
    assert.equal(status, 301);
    assert.equal(location, `https://${APP_DOMAIN}/en?country=IE`);
  });

  test('Swedish indexable pages on the English host redirect to the Swedish host', () => {
    const { status, location } = runRedirect(APP_DOMAIN, '/faq?utm_source=ads');
    assert.equal(status, 301);
    assert.equal(location, `https://${MAIN_DOMAIN}/faq?utm_source=ads`);
  });

  test('app, auth and POST paths are not redirected', () => {
    for (const url of ['/login', '/dashboard', '/home', '/en/login', '/en/register', '/child-login']) {
      const { nextCalled } = runRedirect(APP_DOMAIN, url);
      assert.equal(nextCalled, true, url);
    }
    const post = runRedirect(MAIN_DOMAIN, '/en', 'POST');
    assert.equal(post.nextCalled, true);
  });
});

describe('canonical and hreflang', () => {
  test('Swedish and English documents canonicalise to their own hosts without a query', () => {
    assert.equal(absolutePublicUrl('/bildschema-app'), `${swedishOrigin()}/bildschema-app`);
    assert.equal(absolutePublicUrl('/en/morning-routine-children'), `${englishOrigin()}/en/morning-routine-children`);
    const html = applyPublicSeoHead('<html><head><title>x</title></head><body></body></html>', '/en?country=CA', { indexable: true });
    assert.match(html, new RegExp(`rel="canonical" href="${englishOrigin()}/en"`));
    assert.doesNotMatch(html, /country=/);
  });

  test('homepage hreflang is reciprocal and points at one English document', () => {
    const sv = hreflangAlternates('/');
    const en = hreflangAlternates('/en');
    const svMap = Object.fromEntries(sv);
    const enMap = Object.fromEntries(en);
    assert.equal(svMap['sv-SE'], `${swedishOrigin()}/`);
    assert.equal(svMap['en'], `${englishOrigin()}/en`);
    assert.equal(svMap['nl'], `${englishOrigin()}/nl`);
    assert.equal(svMap['en-IE'], undefined);
    assert.equal(svMap['en-CA'], undefined);
    assert.equal(svMap['x-default'], `${englishOrigin()}/en`);
    assert.equal(enMap['sv-SE'], svMap['sv-SE']);
    assert.equal(enMap['en'], svMap['en']);
    assert.equal(enMap['nl'], svMap['nl']);
    assert.equal(enMap['x-default'], svMap['x-default']);
  });

  test('mixed-language English mirrors are noindex and absent from hreflang', () => {
    assert.equal(isEnglishContentIndexable('/en/educators-and-therapists'), false);
    assert.equal(SEO_INDEXABLE_PATHS.has('/en/educators-and-therapists'), false);
    assert.deepEqual(hreflangAlternates('/pedagoger-och-terapeuter'), []);
    const html = applyPublicSeoHead('<html><head><title>x</title></head></html>', '/en/educators-and-therapists', { indexable: false });
    assert.match(html, /noindex, follow/);
    assert.doesNotMatch(html, /hreflang=/);
  });
});

describe('language of important English guides', () => {
  const pages = [
    ['public/en/morning-routine-children.html', 'Morgonrutin för barn'],
    ['public/en/weekly-schedule-visual-support.html', 'Veckoschema med bildstöd'],
    ['public/en/routines-neurodiverse-children.html', 'Rutiner för barn med NPF'],
    ['public/en/visual-schedule-app.html', 'Bildschema-app: gör ditt eget'],
    ['public/en/reward-system-children.html', 'Belöningssystem för barn'],
    ['public/en/alternative-visual-schedule-board.html', 'Alternativ till bildschematavla'],
  ];

  for (const [rel, swedishH1] of pages) {
    test(`${rel} is English`, () => {
      const html = read(rel);
      assert.match(html, /<html lang="en">/);
      assert.doesNotMatch(html, new RegExp(swedishH1));
      assert.doesNotMatch(html, /14-day trial/i);
      assert.doesNotMatch(html, /Try free for 14 days/i);
    });
  }

  test('Swedish homepage stays Swedish', () => {
    const html = read('public/index.html');
    assert.match(html, /<html lang="sv">/);
    assert.match(html, /<title>Bildschema-app för barn – rutiner, bildstöd &amp; belöningar \|/);
    assert.match(html, /Visuella scheman och stjärnor som hjälper barn att klara vardagen/);
  });
});

describe('sitemap and robots hosts', () => {
  test('default sitemap has no redirects, noindex mirrors, or private app routes', () => {
    const xml = buildSitemapXml();
    assert.doesNotMatch(xml, /\/login/);
    assert.doesNotMatch(xml, /\/home</);
    assert.doesNotMatch(xml, /\/dashboard/);
    assert.doesNotMatch(xml, /\/en\/educators-and-therapists/);
    assert.doesNotMatch(xml, /\/en\/thank-you/);
    assert.match(xml, new RegExp(`${swedishOrigin().replace(/[.]/g, '\\.')}/bildschema-app`));
    assert.match(xml, new RegExp(`${englishOrigin().replace(/[.]/g, '\\.')}/en/morning-routine-children`));
    assert.doesNotMatch(xml, new RegExp(`${swedishOrigin().replace(/[.]/g, '\\.')}/en/`));
    assert.doesNotMatch(xml, new RegExp(`${englishOrigin().replace(/[.]/g, '\\.')}/faq`));
  });

  test('robots.txt names the sitemap for the host that is asked', () => {
    const se = buildRobotsTxt({ host: MAIN_DOMAIN });
    const app = buildRobotsTxt({ host: APP_DOMAIN });
    assert.match(se, new RegExp(`Sitemap: ${swedishOrigin()}/sitemap\\.xml`));
    assert.match(app, new RegExp(`Sitemap: ${englishOrigin()}/sitemap\\.xml`));
    assert.match(se, /Disallow: \/login/);
    assert.match(se, /Disallow: \/home/);
    assert.doesNotMatch(se, /Disallow: \/bildschema-app/);
    assert.doesNotMatch(app, /Disallow: \/en$/m);
  });

  test('host-scoped sitemaps do not mix languages', () => {
    const se = buildSitemapXml({ host: MAIN_DOMAIN });
    const app = buildSitemapXml({ host: APP_DOMAIN });
    assert.doesNotMatch(se, new RegExp(englishOrigin().replace(/[.]/g, '\\.')));
    assert.doesNotMatch(app, new RegExp(swedishOrigin().replace(/[.]/g, '\\.')));
  });

  test('empty news archive is noindex and is not a hreflang target', () => {
    assert.equal(isEnglishContentIndexable('/en/news/archive'), false);
    assert.equal(SEO_INDEXABLE_PATHS.has('/en/news/archive'), false);
    assert.equal(SEO_INDEXABLE_PATHS.has('/nyheter/arkiv'), false);
    assert.deepEqual(hreflangAlternates('/en/news/archive'), []);
    assert.deepEqual(hreflangAlternates('/nyheter/arkiv'), []);
    const app = buildSitemapXml({ host: APP_DOMAIN });
    const se = buildSitemapXml({ host: MAIN_DOMAIN });
    assert.doesNotMatch(app, /news\/archive/);
    assert.doesNotMatch(se, /nyheter\/arkiv/);
    const html = applyPublicSeoHead('<html><head><title>x</title></head></html>', '/en/news/archive', { indexable: false });
    assert.match(html, /noindex, follow/);
    assert.doesNotMatch(html, /hreflang=/);
    assert.doesNotMatch(read('public/nyheter-arkiv.html'), /hreflang=/);
    assert.doesNotMatch(read('public/en/news-archive.html'), /hreflang=/);
  });

  test('Swedish educator page links to the English host directly', () => {
    const html = read('public/pedagoger-och-terapeuter.html');
    assert.match(html, /href="__EN_SITE_URL__\/en"/);
    assert.doesNotMatch(html, /href="\/en"/);
  });
});

describe('public commercial copy', () => {
  test('Swedish public pages do not say the app is free with no payment', () => {
    const files = [
      'public/index.html',
      'public/faq.html',
      'public/pricing-info.html',
      'public/terms.html',
      'public/pedagoger-och-terapeuter.html',
    ];
    for (const rel of files) {
      const html = read(rel);
      assert.doesNotMatch(html, /Ingen betalning krävs/, rel);
      assert.doesNotMatch(html, /Appen är kostnadsfri/, rel);
      assert.doesNotMatch(html, /Appen kostar inget/, rel);
      assert.doesNotMatch(html, /Basic är gratis/, rel);
    }
    assert.match(read('public/terms.html'), /14 dagar/);
    assert.match(read('public/terms.html'), /59 kr per månad/);
    assert.match(read('public/pricing-info.html'), /590 kr per år/);
  });

  test('English public offer pages do not claim a 14-day trial', () => {
    const files = [
      'public/en.html',
      'public/en-faq.html',
      'public/en-pricing.html',
      'public/en-terms.html',
    ];
    for (const rel of files) {
      const html = read(rel);
      assert.doesNotMatch(html, /14-day trial/i, rel);
      assert.doesNotMatch(html, /Try free for 14 days/i, rel);
      assert.doesNotMatch(html, /No card required/, rel);
      assert.match(html, /31 December 2026/, rel);
      assert.match(html, /No payment required during the free period|No payment is required during the free period/, rel);
    }
  });
});
