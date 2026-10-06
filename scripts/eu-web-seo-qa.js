'use strict';

/**
 * Final public-web QA for EU27 + Norway + Iceland.
 * Crawls the local app the way a host-aware client would.
 * Does not change product behaviour. Writes the Search Console files
 * when invoked directly.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const { WEB_LOCALE_CODES, LOCALES, REQUIRED_SEO_CONTENT, localeFromPublicPath, localeByCode } = require('../config/web-locales');
const {
  EU_WEB_MARKET_CODES,
  MARKETS,
  campaignPath,
  marketPublicEntries,
  marketForPublicPath,
  marketsForLocale,
} = require('../config/web-markets');
const { CONTENT_KEYS, contentByPath, pathFor, indexablePathsForLocale } = require('../config/web-content-keys');
const { SEO_INDEXABLE_PATHS, SEO_CRAWL_DISALLOW_PATHS, buildRobotsTxt } = require('../src/lib/seo-pages');
const {
  absolutePublicUrl,
  hreflangAlternates,
  englishOrigin,
  swedishOrigin,
} = require('../src/lib/public-seo');
const { buildSitemapXml } = require('../src/lib/sitemap');
const { APP_DOMAIN, MAIN_DOMAIN } = require('../src/lib/domain-redirect');
const { localeMeetsSeoContract, localeSeoGaps } = require('../src/lib/locale-seo-contract');
const { resurserDecision, RESURSER_DECISION_ROWS } = require('../config/resurser-consolidation');
const { chromeFor } = require('../config/web-locale-chrome');

const EU27 = Object.freeze([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);
const EEA_EXTRA = Object.freeze(['NO', 'IS']);
const EXPECTED_MARKETS = Object.freeze([...EU27, ...EEA_EXTRA]);
const INDEX_FIRST = Object.freeze([
  'home',
  'visualSchedule',
  'morningRoutine',
  'weeklySchedule',
  'neurodiverseRoutines',
]);
const MULTI_LOCALE_EXPECT = Object.freeze({
  BE: ['nl', 'fr', 'de', 'en'],
  FI: ['fi', 'sv', 'en'],
  LU: ['fr', 'de', 'en'],
  IE: ['en', 'ga'],
  MT: ['mt', 'en'],
});
const PILOTS = Object.freeze(['/en', '/en/ie', '/en/ca', '/nl', '/nl/nl']);
const SWEDISH_MARKERS = Object.freeze([
  'stjärn', 'bildstöd', 'förälder', 'användarvillkor', 'integritetspolicy',
  'veckoschema', 'morgonrutin', 'kostnadsfritt', 'så här',
]);
const TOKEN_RE = /__TOKEN__|__PLACEHOLDER__|\bTODO\b|\bFIXME\b|lorem ipsum|\{\{/;
const SCRIPT_RE = {
  bg: /\p{Script=Cyrillic}/u,
  el: /\p{Script=Greek}/u,
};

function ensureTestEnv() {
  if (process.env.TEST_DATABASE_VALIDATED === '1' && process.env.RATE_LIMIT_ENABLED === 'false') return;
  const { buildDestructiveTestChildEnv } = require('./lib/test-database-safety.cjs');
  Object.assign(process.env, buildDestructiveTestChildEnv(process.env));
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
}

function decode(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return decode(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function visibleText(html) {
  const without = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav\b[^>]*data-public-lang-switcher="1"[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ');
  const main = without.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
  return stripTags(main ? main[1] : without);
}

function tagText(html, tag) {
  const match = String(html || '').match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? stripTags(match[1]) : '';
}

function metaContent(html, key) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:name|property)=["']([^"']+)["']/i);
    if (!name || name[1].toLowerCase() !== key.toLowerCase()) continue;
    const content = tag.match(/\bcontent=["']([^"']*)["']/i);
    return content ? decode(content[1]) : '';
  }
  return '';
}

function canonicalHref(html) {
  const tags = String(html || '').match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel=["']canonical["']/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    return href ? href[1] : '';
  }
  return '';
}

function hreflangLinks(html) {
  const tags = String(html || '').match(/<link\b[^>]*>/gi) || [];
  const rows = [];
  for (const tag of tags) {
    if (!/\brel=["']alternate["']/i.test(tag) || !/\bhreflang=/i.test(tag)) continue;
    const lang = tag.match(/\bhreflang=["']([^"']+)["']/i);
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    if (lang && href) rows.push([lang[1], href[1]]);
  }
  return rows;
}

function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = re.exec(html);
  while (match) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (err) {
      blocks.push({ __parseError: err.message });
    }
    match = re.exec(html);
  }
  return blocks;
}

function walkNodes(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => walkNodes(item, visit));
    return;
  }
  visit(node);
  for (const value of Object.values(node)) walkNodes(value, visit);
}

function htmlLang(html) {
  const match = String(html || '').match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function dataAttr(html, name) {
  const match = String(html || '').match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

function fingerprints(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 48);
}

function hostForPath(pathname) {
  return localeFromPublicPath(pathname) ? APP_DOMAIN : MAIN_DOMAIN;
}

function localeCodeForPath(pathname) {
  return localeFromPublicPath(pathname)?.code || 'sv';
}

function robotsBlocks(robotsTxt, pathname) {
  const rules = String(robotsTxt || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^disallow:/i.test(line))
    .map((line) => line.slice(line.indexOf(':') + 1).trim());
  return rules.some((rule) => rule && (pathname === rule || pathname.startsWith(rule)));
}

function sitemapLocs(xml) {
  return [...String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function samePairs(left, right) {
  const a = left.map(([lang, href]) => `${lang} ${href}`).sort();
  const b = right.map(([lang, href]) => `${lang} ${href}`).sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function requestOnce(port, urlPath, host) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method: 'GET',
      headers: { Host: host, Accept: 'text/html' },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          location: res.headers.location || '',
          cacheControl: res.headers['cache-control'] || '',
          contentType: res.headers['content-type'] || '',
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.setTimeout(20000, () => req.destroy(new Error(`timeout ${host}${urlPath}`)));
    req.on('error', reject);
    req.end();
  });
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function auditMarkets() {
  const seen = new Map();
  const duplicate = [];
  const wrongIso = [];
  const wrongDefault = [];
  const invalidLocale = [];
  for (const code of EU_WEB_MARKET_CODES) {
    if (seen.has(code)) duplicate.push(code);
    seen.set(code, true);
    const market = MARKETS[code];
    if (!market) continue;
    if (market.pathSegment !== code.toLowerCase()) wrongIso.push(`${code}->${market.pathSegment}`);
    if (market.defaultLocale !== market.locales[0]) wrongDefault.push(code);
    if (!market.locales.includes(market.defaultLocale)) wrongDefault.push(`${code}:default-missing`);
    for (const localeCode of market.locales) {
      if (!LOCALES[localeCode]) invalidLocale.push(`${code}:${localeCode}`);
    }
  }
  const missing = EXPECTED_MARKETS.filter((code) => !seen.has(code));
  const extra = EU_WEB_MARKET_CODES.filter((code) => !EXPECTED_MARKETS.includes(code));
  const multi = {};
  for (const [code, expected] of Object.entries(MULTI_LOCALE_EXPECT)) {
    const market = MARKETS[code];
    multi[code] = {
      locales: market.locales.slice(),
      expected,
      match: market.locales.join(',') === expected.join(','),
      campaignPaths: market.campaignLocales.map((localeCode) => campaignPath(market, localeCode)),
    };
  }
  return {
    euEea: EU_WEB_MARKET_CODES.length,
    missing,
    extra,
    duplicate,
    wrongIso,
    wrongDefault,
    invalidLocale,
    canadaInTwentyNine: EU_WEB_MARKET_CODES.includes('CA'),
    canadaSeparate: !!(MARKETS.CA && MARKETS.CA.euWeb === false && MARKETS.CA.campaignLocales.join(',') === 'en'),
    canadaPath: campaignPath(MARKETS.CA, 'en'),
    multi,
    swedishCampaignOmitted: ['SE', 'FI'].filter((code) => !MARKETS[code].campaignLocales.includes('sv')),
  };
}

function auditLocales() {
  const rows = WEB_LOCALE_CODES.map((code) => {
    const locale = LOCALES[code];
    const gaps = localeSeoGaps(code);
    const indexable = code === 'sv'
      ? [...SEO_INDEXABLE_PATHS].filter((item) => !localeFromPublicPath(item))
      : [...SEO_INDEXABLE_PATHS].filter((item) => localeFromPublicPath(item)?.code === code);
    return {
      locale: code,
      configured: !!locale,
      complete: gaps.length === 0,
      seoEnabled: !!(locale && locale.seoEnabled),
      published: !!(locale && locale.publicWeb),
      root: code === 'sv' ? `${swedishOrigin()}/` : `${englishOrigin()}${locale.pathPrefix}`,
      indexableCount: indexable.length,
      blocking: gaps.length ? gaps.join(',') : '',
    };
  });
  return {
    configured: rows.length,
    seoEnabled: rows.filter((row) => row.seoEnabled).length,
    complete: rows.filter((row) => row.complete).length,
    blocked: rows.filter((row) => row.blocking),
    rows,
  };
}

function auditStaticGraph() {
  const appXml = buildSitemapXml({ host: APP_DOMAIN });
  const seXml = buildSitemapXml({ host: MAIN_DOMAIN });
  const appLocs = sitemapLocs(appXml);
  const seLocs = sitemapLocs(seXml);
  const marketPaths = [];
  for (const market of Object.values(MARKETS)) {
    for (const localeCode of market.campaignLocales) {
      const target = campaignPath(market, localeCode);
      if (target) marketPaths.push(target);
    }
  }
  const marketInSitemap = marketPaths.filter((item) => SEO_INDEXABLE_PATHS.has(item));
  const noindexBack = RESURSER_DECISION_ROWS.filter((row) => row.decision === 'noindex' && SEO_INDEXABLE_PATHS.has(row.path));
  const redirectBack = RESURSER_DECISION_ROWS.filter((row) => row.decision === 'redirect' && SEO_INDEXABLE_PATHS.has(row.path));
  const perLocale = {};
  for (const code of WEB_LOCALE_CODES) perLocale[code] = 0;
  for (const item of SEO_INDEXABLE_PATHS) {
    perLocale[localeCodeForPath(item)] += 1;
  }
  const contentKeyUrls = new Set();
  for (const code of WEB_LOCALE_CODES) {
    for (const key of REQUIRED_SEO_CONTENT) {
      const target = pathFor(key, code);
      if (target) contentKeyUrls.add(target);
    }
  }
  const explosion = WEB_LOCALE_CODES.length * Object.keys(MARKETS).length * CONTENT_KEYS.length;
  const clusters = new Map();
  for (const entry of CONTENT_KEYS) {
    const pages = [];
    for (const code of WEB_LOCALE_CODES) {
      const target = entry.paths[code];
      if (!target || !SEO_INDEXABLE_PATHS.has(target)) continue;
      pages.push({ locale: code, path: target, pairs: hreflangAlternates(target) });
    }
    clusters.set(entry.key, pages);
  }
  const hreflang = {
    clusters: clusters.size,
    broken: [],
    orphaned: [],
    duplicate: [],
    marketTargets: [],
    xDefault: [],
  };
  for (const [key, pages] of clusters) {
    const byPath = new Map(pages.map((page) => [absolutePublicUrl(page.path), page]));
    for (const page of pages) {
      const tags = page.pairs.map(([tag]) => tag);
      if (new Set(tags).size !== tags.length) hreflang.duplicate.push(`${key}:${page.path}`);
      const self = page.pairs.find(([, href]) => href === absolutePublicUrl(page.path));
      const expectedTag = LOCALES[page.locale].hreflang[0];
      if (!self || self[0] !== expectedTag) hreflang.broken.push(`${key}:${page.path}:self`);
      for (const [tag, href] of page.pairs) {
        if (tag === 'x-default') continue;
        let targetPath = '';
        try { targetPath = new URL(href).pathname; } catch { targetPath = ''; }
        if (marketForPublicPath(targetPath) && !SEO_INDEXABLE_PATHS.has(targetPath)) {
          hreflang.marketTargets.push(href);
        }
        if (!byPath.has(href)) hreflang.orphaned.push(`${key}:${tag}:${href}`);
        else {
          const back = byPath.get(href).pairs.some(([, backHref]) => backHref === absolutePublicUrl(page.path));
          if (!back) hreflang.broken.push(`${key}:${page.path}<->${href}`);
        }
      }
      const xDefault = page.pairs.find(([tag]) => tag === 'x-default');
      const english = pages.find((item) => item.locale === 'en');
      const expectedDefault = english ? absolutePublicUrl(english.path) : absolutePublicUrl(page.path);
      if (!xDefault || xDefault[1] !== expectedDefault) hreflang.xDefault.push(`${key}:${page.path}`);
    }
  }
  const howItWorks = clusters.get('howItWorks') || [];
  return {
    indexableTotal: SEO_INDEXABLE_PATHS.size,
    perLocale,
    contentKeyUrls: contentKeyUrls.size,
    appSitemap: appLocs.length,
    seSitemap: seLocs.length,
    explosionIfMarketCartesian: explosion,
    marketPaths: marketPaths.length,
    marketInSitemap: marketInSitemap.length,
    noindexResurserBackInIndex: noindexBack.length,
    redirectResurserBackInIndex: redirectBack.length,
    seSitemapHasAppLocale: seLocs.some((loc) => /\/(en|nl|de|fr|ga|mt)(\/|$)/.test(new URL(loc).pathname) && new URL(loc).host === MAIN_DOMAIN),
    appSitemapHostWrong: appLocs.filter((loc) => new URL(loc).host !== APP_DOMAIN).length,
    seSitemapHostWrong: seLocs.filter((loc) => new URL(loc).host !== MAIN_DOMAIN).length,
    hreflang: {
      clusters: hreflang.clusters,
      broken: hreflang.broken.length,
      orphaned: hreflang.orphaned.length,
      duplicate: hreflang.duplicate.length,
      marketTargets: hreflang.marketTargets.length,
      xDefaultMismatches: hreflang.xDefault.length,
      samples: {
        broken: hreflang.broken.slice(0, 8),
        orphaned: hreflang.orphaned.slice(0, 8),
        xDefault: hreflang.xDefault.slice(0, 8),
      },
      xDefaultPolicy: 'x-default is the English URL of the same contentKey. English-only documents point x-default at themselves.',
      howItWorksLocales: howItWorks.map((page) => page.locale).sort(),
      howItWorksOmitsSwedish: !howItWorks.some((page) => page.locale === 'sv') && pathFor('howItWorks', 'sv') == null,
    },
    robots: {
      se: buildRobotsTxt({ host: MAIN_DOMAIN }),
      app: buildRobotsTxt({ host: APP_DOMAIN }),
    },
  };
}

function structuredDataIssues(html, locale) {
  const issues = [];
  const blocks = jsonLdBlocks(html);
  for (const block of blocks) {
    if (block.__parseError) {
      issues.push(`jsonld-parse:${block.__parseError}`);
      continue;
    }
    walkNodes(block, (node) => {
      const type = node['@type'];
      const types = Array.isArray(type) ? type : [type];
      if (types.includes('AggregateRating') || types.includes('Review') || types.includes('Rating')) {
        issues.push('fake-rating');
      }
      if (node.offers || types.includes('Offer')) {
        const offer = node.offers || node;
        const price = offer && offer.price;
        if (price === 0 || price === '0') issues.push('misleading-price-0');
        if (locale !== 'sv' && price != null) issues.push(`unexpected-offer:${price}`);
      }
      });
  }
  return issues;
}

function languageIssues(html, locale, englishText, swedishText) {
  const issues = [];
  const text = visibleText(html);
  const title = tagText(html, 'title');
  const h1 = tagText(html, 'h1');
  const description = metaContent(html, 'description');
  if (!title || !h1 || !description) issues.push('empty-meta');
  const blob = `${title}\n${h1}\n${description}\n${text}`;
  if (TOKEN_RE.test(blob)) issues.push('placeholder');
  if (locale !== 'en') {
    for (const sentence of fingerprints(englishText)) {
      if (text.includes(sentence) || title.includes(sentence) || h1.includes(sentence)) {
        issues.push('english-fallback');
        break;
      }
    }
  }
  if (locale !== 'sv') {
    for (const sentence of fingerprints(swedishText)) {
      if (text.includes(sentence)) {
        issues.push('swedish-leftover');
        break;
      }
    }
    for (const marker of SWEDISH_MARKERS) {
      if (text.toLowerCase().includes(marker)) {
        issues.push(`swedish-marker:${marker}`);
        break;
      }
    }
  }
  if (SCRIPT_RE[locale] && text && !SCRIPT_RE[locale].test(text)) issues.push('script-mismatch');
  const ld = JSON.stringify(jsonLdBlocks(html));
  if (TOKEN_RE.test(ld)) issues.push('jsonld-placeholder');
  if (locale !== 'en') {
    for (const sentence of fingerprints(englishText)) {
      if (ld.includes(sentence)) {
        issues.push('jsonld-english');
        break;
      }
    }
  }
  return issues;
}

function legalIssues(html, locale, contentKey) {
  const text = visibleText(html);
  const flags = [];
  if (TOKEN_RE.test(text)) flags.push('placeholder');
  if (!/Papa Bravo/.test(text)) flags.push('missing-papa-bravo');
  if (contentKey === 'privacy' && !/\bIMY\b/.test(text) && !/Integritetsskyddsmyndigheten/.test(text)) {
    flags.push('LEGAL_REVIEW_REQUIRED:authority');
  }
  if (contentKey === 'terms' && (!/\b59\b/.test(text) || !/\b590\b/.test(text))) flags.push('LEGAL_REVIEW_REQUIRED:sek-price');
  const otherMoney = text.match(/\b\d+\s*(?:€|EUR|USD|£)\b/g) || [];
  if (otherMoney.length) flags.push(`LEGAL_REVIEW_REQUIRED:other-currency:${otherMoney[0]}`);
  if (locale !== 'en' && locale !== 'sv' && /Privacy Policy|Terms of Service|This policy describes/.test(text)) {
    flags.push('mixed-language');
  }
  return flags;
}

function faqVisibility(html) {
  const visible = visibleText(html);
  const missing = [];
  let questions = 0;
  for (const block of jsonLdBlocks(html)) {
    if (block.__parseError) continue;
    walkNodes(block, (node) => {
      const type = node['@type'];
      const types = Array.isArray(type) ? type : [type];
      if (!types.includes('FAQPage')) return;
      const rows = Array.isArray(node.mainEntity) ? node.mainEntity : [];
      for (const question of rows) {
        const name = String((question && question.name) || '').replace(/\s+/g, ' ').trim();
        if (!name) continue;
        questions += 1;
        if (!visible.includes(name)) missing.push(name);
      }
    });
  }
  return { questions, missing };
}

async function crawl(port) {
  const indexable = [...SEO_INDEXABLE_PATHS].sort();
  const marketPaths = [];
  for (const market of Object.values(MARKETS)) {
    for (const entry of marketPublicEntries(market)) {
      if (entry === '/') continue;
      marketPaths.push(entry);
    }
  }
  const uniqueMarkets = [...new Set(marketPaths)].sort();
  const jobs = [
    ...indexable.map((item) => ({ kind: 'indexable', path: item })),
    ...uniqueMarkets.map((item) => ({ kind: 'market', path: item })),
  ];
  const fetched = new Map();
  await mapPool(jobs, 8, async (job) => {
    const host = hostForPath(job.path);
    const response = await requestOnce(port, job.path, host);
    fetched.set(job.path, { ...job, host, ...response });
  });

  const englishByKey = new Map();
  const swedishByKey = new Map();
  for (const entry of CONTENT_KEYS) {
    const enPath = entry.paths.en;
    const svPath = entry.paths.sv;
    if (enPath && fetched.has(enPath)) englishByKey.set(entry.key, visibleText(fetched.get(enPath).body));
    if (svPath && fetched.has(svPath)) swedishByKey.set(entry.key, visibleText(fetched.get(svPath).body));
  }

  const appSitemap = new Set(sitemapLocs(buildSitemapXml({ host: APP_DOMAIN })));
  const seSitemap = new Set(sitemapLocs(buildSitemapXml({ host: MAIN_DOMAIN })));
  const sitemap = new Set([...appSitemap, ...seSitemap]);
  const rows = [];
  const linkRefs = [];
  const faqNotes = [];

  for (const [urlPath, page] of fetched) {
    const locale = localeCodeForPath(urlPath);
    const expectedLocale = LOCALES[locale];
    const entry = contentByPath(urlPath);
    const marketHit = marketForPublicPath(urlPath);
    const issues = [];
    const canonical = canonicalHref(page.body);
    const expectedCanonical = absolutePublicUrl(urlPath);
    const robots = metaContent(page.body, 'robots');
    const pairs = hreflangLinks(page.body);
    const title = tagText(page.body, 'title');
    const h1 = tagText(page.body, 'h1');
    const description = metaContent(page.body, 'description');
    const visible = visibleText(page.body);
    const featureGated = urlPath === '/pedagoger-och-terapeuter' && page.status === 302;
    const appShell = urlPath === '/register';
    if (featureGated) {
      rows.push({
        path: urlPath,
        kind: page.kind,
        status: page.status,
        locale,
        bytes: Buffer.byteLength(page.body),
        scripts: 0,
        ok: true,
        issues: [],
        note: 'feature-gate-off-in-this-database',
      });
      continue;
    }
    if (page.status !== 200) issues.push(`status:${page.status}`);
    if (page.location) issues.push(`redirect:${page.location}`);
    if (canonical !== expectedCanonical) issues.push(`canonical:${canonical || 'missing'}`);
    if (canonical.includes('?')) issues.push('canonical-query');
    const lang = htmlLang(page.body);
    const langOk = lang === expectedLocale.htmlLang || (expectedLocale.htmlLang === 'en' && lang === 'en-GB');
    if (!langOk) issues.push(`lang:${lang || 'missing'}`);
    if (!title) issues.push('title');
    if (!appShell && !h1) issues.push('h1');
    if (!appShell && !description) issues.push('description');
    if (page.kind === 'indexable' && !appShell) {
      const ogUrl = metaContent(page.body, 'og:url');
      if (!metaContent(page.body, 'og:title') || !metaContent(page.body, 'og:description') || (ogUrl && ogUrl !== expectedCanonical)) {
        issues.push('open-graph');
      }
    }
    const expectedPairs = hreflangAlternates(urlPath);
    if (page.kind === 'indexable') {
      if (/noindex/i.test(robots)) issues.push('unexpected-noindex');
      if (!sitemap.has(expectedCanonical)) issues.push('missing-sitemap');
      if (!samePairs(pairs, expectedPairs)) issues.push('hreflang-rendered');
      const tags = pairs.map(([tag]) => tag);
      if (new Set(tags).size !== tags.length) issues.push('hreflang-duplicate');
    } else {
      if (!/noindex/i.test(robots) || /nofollow/i.test(robots)) issues.push(`robots:${robots || 'missing'}`);
      if (sitemap.has(expectedCanonical)) issues.push('market-in-sitemap');
      if (pairs.length) issues.push('market-hreflang');
      const marked = dataAttr(page.body, 'data-web-market') || dataAttr(page.body, 'data-en-market');
      if (marketHit && marked !== marketHit.market.code) issues.push(`market:${marked || 'missing'}`);
      if (dataAttr(page.body, 'data-web-locale') && dataAttr(page.body, 'data-web-locale') !== locale) {
        issues.push('locale-attr');
      }
    }
    if (entry && page.kind === 'indexable') {
      issues.push(...languageIssues(page.body, locale, englishByKey.get(entry.key) || '', swedishByKey.get(entry.key) || ''));
    } else if (page.kind === 'indexable') {
      if (TOKEN_RE.test(`${title}\n${visible}`)) issues.push('placeholder');
    }
    issues.push(...structuredDataIssues(page.body, locale));
    const faq = faqVisibility(page.body);
    if (faq.missing.length && dataAttr(page.body, 'data-web-locale')) issues.push('faq-not-visible');
    else if (faq.missing.length) faqNotes.push({ path: urlPath, missing: faq.missing.length, questions: faq.questions });
    if (entry && (entry.key === 'privacy' || entry.key === 'terms')) {
      for (const flag of legalIssues(page.body, locale, entry.key)) issues.push(`legal:${flag}`);
    }
    const hrefs = [...page.body.matchAll(/<(?:a|option)\b[^>]*(?:href|value)=["']([^"']+)["']/gi)].map((match) => match[1]);
    linkRefs.push({ from: urlPath, hrefs, locale });
    rows.push({
      path: urlPath,
      kind: page.kind,
      status: page.status,
      locale,
      bytes: Buffer.byteLength(page.body),
      scripts: (page.body.match(/<script\b[^>]*\bsrc=/gi) || []).length,
      ok: issues.length === 0,
      issues,
    });
  }

  const known = new Map(rows.map((row) => [row.path, row]));
  const extras = new Map();
  const AUTH_PATHS = new Set(['/login', '/child-login', '/register', '/en/login', '/en/register', '/en/forgot-password', '/forgot-password']);
  function classifyHref(from, href) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return null;
    const absolute = /^https?:/i.test(href);
    let url;
    try {
      url = new URL(href, absolutePublicUrl(from));
    } catch {
      return { problem: 'bad-href', href };
    }
    if (url.host !== APP_DOMAIN && url.host !== MAIN_DOMAIN) return null;
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    if (/\.(css|js|svg|png|webp|ico|woff2?|xml|txt)$/i.test(pathname)) return null;
    if (!absolute && pathname === '/' && localeFromPublicPath(from)) {
      return { problem: 'app-root-instead-of-swedish-home', href, pathname };
    }
    return { pathname, host: url.host, search: url.search, absolute, auth: AUTH_PATHS.has(pathname) };
  }

  const inbound = new Map();
  const linkProblems = [];
  for (const ref of linkRefs) {
    for (const href of ref.hrefs) {
      const target = classifyHref(ref.from, href);
      if (!target) continue;
      if (target.problem) {
        linkProblems.push({ from: ref.from, href, problem: target.problem });
        continue;
      }
      const expectedHost = hostForPath(target.pathname);
      if (target.absolute && !target.auth && target.host !== expectedHost) {
        linkProblems.push({ from: ref.from, href, problem: 'wrong-host' });
      }
      if (target.search && (target.search.includes('country=') || target.search.includes('market='))) {
        linkProblems.push({ from: ref.from, href, problem: 'market-query' });
      }
      inbound.set(target.pathname, (inbound.get(target.pathname) || 0) + (target.pathname === ref.from ? 0 : 1));
      if (!known.has(target.pathname) && !extras.has(target.pathname)) extras.set(target.pathname, expectedHost);
    }
  }

  await mapPool([...extras.keys()], 8, async (pathname) => {
    const response = await requestOnce(port, pathname, extras.get(pathname));
    if (response.status === 404) linkProblems.push({ href: pathname, problem: '404' });
    else if (response.status >= 300 && response.status < 400) linkProblems.push({ href: pathname, problem: `redirect:${response.status}`, location: response.location });
    else if (response.status !== 200) linkProblems.push({ href: pathname, problem: `status:${response.status}` });
  });

  const coreOrphans = [];
  for (const code of WEB_LOCALE_CODES) {
    for (const key of REQUIRED_SEO_CONTENT) {
      const target = pathFor(key, code);
      if (!target || !SEO_INDEXABLE_PATHS.has(target)) continue;
      if ((inbound.get(target) || 0) === 0) coreOrphans.push(target);
    }
  }

  const switchProblems = [];
  for (const [urlPath, page] of fetched) {
    if (dataAttr(page.body, 'data-web-locale')) {
      const switches = [...page.body.matchAll(/data-locale-switch="([^"]+)"/g)].map((match) => match[1]);
      const missing = WEB_LOCALE_CODES.filter((code) => !switches.includes(code));
      if (missing.length) switchProblems.push(`${urlPath}:switcher:${missing.join('+')}`);
    }
    const options = [...page.body.matchAll(/<option\b[^>]*value=["']([^"']+)["']/gi)].map((match) => match[1]);
    const marketLinks = [...page.body.matchAll(/<(?:nav|label)\b[^>]*landing-market-switch[\s\S]*?<\/(?:nav|label)>/gi)].join(' ');
    const marketHrefs = [...marketLinks.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
    for (const value of [...options, ...marketHrefs]) {
      let pathname = value;
      try { pathname = new URL(value, absolutePublicUrl(urlPath)).pathname; } catch { pathname = value; }
      pathname = pathname.replace(/\/$/, '') || '/';
      if (pathname === '/') continue;
      const hit = marketForPublicPath(pathname);
      if (!hit) switchProblems.push(`${urlPath}:invalid-market:${pathname}`);
      else if (!fetched.has(pathname)) switchProblems.push(`${urlPath}:market-missing:${pathname}`);
    }
  }

  return { rows, linkProblems, coreOrphans, switchProblems, fetchedCount: fetched.size, faqNotes };
}

async function auditLive(port) {
  const crawled = await crawl(port);
  const querySamples = [];
  for (const sample of ['/', '/en', '/nl']) {
    const response = await requestOnce(port, `${sample === '/' ? '/' : sample}?utm_source=qa`, hostForPath(sample));
    const canonical = canonicalHref(response.body);
    querySamples.push({
      path: sample,
      status: response.status,
      canonical,
      ok: response.status === 200 && canonical === absolutePublicUrl(sample) && !canonical.includes('?'),
    });
  }
  const robots = {};
  for (const host of [APP_DOMAIN, MAIN_DOMAIN]) {
    const response = await requestOnce(port, '/robots.txt', host);
    const origin = host === APP_DOMAIN ? englishOrigin() : swedishOrigin();
    robots[host] = {
      status: response.status,
      sitemap: (response.body.match(/Sitemap:\s*(\S+)/) || [])[1] || '',
      allowRoot: /^Allow: \/$/m.test(response.body),
      disallowMatchesPolicy: SEO_CRAWL_DISALLOW_PATHS.every((item) => response.body.includes(`Disallow: ${item}`)),
      blocksMarket: robotsBlocks(response.body, '/de/at') || robotsBlocks(response.body, '/en/ie') || robotsBlocks(response.body, '/nl/nl'),
      blocksLocaleHome: robotsBlocks(response.body, '/de') || robotsBlocks(response.body, '/en'),
      expectedSitemap: `${origin}/sitemap.xml`,
    };
  }
  const sitemaps = {};
  for (const host of [APP_DOMAIN, MAIN_DOMAIN]) {
    const response = await requestOnce(port, '/sitemap.xml', host);
    const locs = sitemapLocs(response.body);
    const errors = [];
    for (const loc of locs) {
      const url = new URL(loc);
      if (url.host !== host) errors.push(`host:${loc}`);
      if (url.search) errors.push(`query:${loc}`);
      const pathname = url.pathname.replace(/\/$/, '') || '/';
      if (!SEO_INDEXABLE_PATHS.has(pathname)) errors.push(`not-indexable:${pathname}`);
      if (marketForPublicPath(pathname) && !SEO_INDEXABLE_PATHS.has(pathname)) errors.push(`market:${pathname}`);
    }
    sitemaps[host] = { status: response.status, count: locs.length, errors: errors.length, sample: errors.slice(0, 8) };
  }
  const noindexRow = RESURSER_DECISION_ROWS.find((row) => row.decision === 'noindex');
  const redirectRow = RESURSER_DECISION_ROWS.find((row) => row.decision === 'redirect');
  const resurser = {};
  if (noindexRow) {
    const response = await requestOnce(port, noindexRow.path, MAIN_DOMAIN);
    resurser.noindex = {
      path: noindexRow.path,
      status: response.status,
      robots: metaContent(response.body, 'robots'),
      inSitemap: sitemapLocs(buildSitemapXml({ host: MAIN_DOMAIN })).includes(absolutePublicUrl(noindexRow.path)),
    };
  }
  if (redirectRow) {
    const response = await requestOnce(port, redirectRow.path, APP_DOMAIN);
    resurser.redirect = {
      path: redirectRow.path,
      status: response.status,
      location: response.location,
      owner: redirectRow.owner,
    };
  }
  const alternates = await requestOnce(port, '/js/public-locale-alternates.js', APP_DOMAIN);
  const de = crawled.rows.find((row) => row.path === '/de');
  const en = crawled.rows.find((row) => row.path === '/en');
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
  const cacheName = (sw.match(/const CACHE_NAME = '([^']+)'/) || [])[1] || '';
  const precachesLocaleHtml = WEB_LOCALE_CODES
    .filter((code) => code !== 'sv')
    .some((code) => sw.includes(`'/${code}'`) || sw.includes(`"/${code}"`));
  return {
    crawl: crawled,
    querySamples,
    robots,
    sitemaps,
    resurser,
    performance: {
      deHtmlBytes: de ? de.bytes : 0,
      enHtmlBytes: en ? en.bytes : 0,
      deScripts: de ? de.scripts : 0,
      alternatesJsBytes: Buffer.byteLength(alternates.body),
      alternatesStatus: alternates.status,
      alternatesCache: alternates.cacheControl,
      cacheName,
      serverRendered: !!(de && de.bytes > 1000),
      precachesLocaleHtml,
      localePayload: 'One shared alternates script and a 26-link switcher. Locale HTML does not embed the other languages.',
    },
  };
}

function summarise(staticGraph, live, markets, locales) {
  const rows = live.crawl.rows;
  const issues = rows.filter((row) => !row.ok);
  const canonicalMismatches = issues.filter((row) => row.issues.some((item) => item.startsWith('canonical'))).length;
  const hreflangErrors = staticGraph.hreflang.broken
    + staticGraph.hreflang.orphaned
    + staticGraph.hreflang.duplicate
    + staticGraph.hreflang.marketTargets
    + staticGraph.hreflang.xDefaultMismatches
    + issues.filter((row) => row.issues.some((item) => item.startsWith('hreflang'))).length;
  const mixed = issues.filter((row) => row.issues.some((item) => /english-fallback|swedish-|script-mismatch|jsonld-english|mixed-language/.test(item)));
  const legal = issues.filter((row) => row.issues.some((item) => item.startsWith('legal:')));
  const blockers = [];
  const push = (ok, message) => { if (!ok) blockers.push(message); };
  push(markets.euEea === 29 && markets.missing.length === 0 && markets.extra.length === 0, 'market registry is not EU27+NO+IS');
  push(markets.duplicate.length === 0 && markets.wrongIso.length === 0 && markets.wrongDefault.length === 0 && markets.invalidLocale.length === 0, 'market ISO, default locale, or locale combination is wrong');
  push(markets.canadaSeparate && !markets.canadaInTwentyNine, 'Canada is inside the 29');
  push(locales.configured === 26 && locales.seoEnabled === 26 && locales.complete === 26, 'a locale is not published and complete');
  push(issues.length === 0, `${issues.length} crawled URLs failed`);
  push(canonicalMismatches === 0, `${canonicalMismatches} canonical mismatches`);
  push(staticGraph.hreflang.broken === 0 && staticGraph.hreflang.orphaned === 0, 'hreflang graph is broken');
  push(staticGraph.marketInSitemap === 0, 'market URLs are in the sitemap');
  push(live.sitemaps[APP_DOMAIN].errors === 0 && live.sitemaps[MAIN_DOMAIN].errors === 0, 'sitemap URL failed');
  push(live.crawl.linkProblems.length === 0, `${live.crawl.linkProblems.length} internal link problems`);
  push(live.crawl.coreOrphans.length === 0, `${live.crawl.coreOrphans.length} orphan core pages`);
  push(live.crawl.switchProblems.length === 0, 'language or market switch is wrong');
  push(live.querySamples.every((sample) => sample.ok), 'query canonical failed');
  push(!live.robots[APP_DOMAIN].blocksMarket && !live.robots[MAIN_DOMAIN].blocksMarket, 'robots blocks a noindex market page');
  push(live.robots[APP_DOMAIN].disallowMatchesPolicy && live.robots[MAIN_DOMAIN].disallowMatchesPolicy, 'robots policy drifted');
  push(staticGraph.noindexResurserBackInIndex === 0 && staticGraph.redirectResurserBackInIndex === 0, 'retired Swedish resources are indexable again');
  push(!live.performance.precachesLocaleHtml && live.performance.alternatesJsBytes < 200000 && live.performance.deHtmlBytes < 250000, 'locale payload regression');
  push(mixed.length === 0, `${mixed.length} mixed-language pages`);
  const hardLegal = legal.filter((row) => row.issues.some((item) => /placeholder|mixed-language|missing-papa-bravo/.test(item)));
  push(hardLegal.length === 0, `${hardLegal.length} legal pages failed integrity`);
  return {
    blockers,
    canonicalMismatches,
    hreflangErrors,
    mixedLanguage: mixed.length,
    legalFlags: legal.map((row) => ({ path: row.path, issues: row.issues.filter((item) => item.startsWith('legal:')) })),
    urlIssues: issues.map((row) => ({ path: row.path, kind: row.kind, issues: row.issues })),
    verdict: blockers.length ? 'BLOCKED_FOR_EU_WEB_ROLLOUT' : 'READY_FOR_EU_WEB_ROLLOUT',
  };
}

function rolloutRows() {
  const rows = [];
  for (const code of WEB_LOCALE_CODES) {
    for (const entry of CONTENT_KEYS) {
      const target = entry.paths[code];
      if (!target || !SEO_INDEXABLE_PATHS.has(target)) continue;
      rows.push(rolloutRow(code, target, entry.key));
    }
    if (code === 'en' || code === 'sv') {
      const extras = [...SEO_INDEXABLE_PATHS].filter((item) => localeCodeForPath(item) === code && !contentByPath(item));
      for (const item of extras.sort()) rows.push(rolloutRow(code, item, 'additional'));
    }
  }
  return rows;
}

function rolloutRow(locale, urlPath, contentKey) {
  const request = INDEX_FIRST.includes(contentKey) ? 'yes' : 'no';
  const notes = [];
  if (contentKey === 'howItWorks') notes.push('Swedish has no howItWorks document; the cluster omits sv-SE');
  if (contentKey === 'additional') notes.push('Discover from the sitemap. Do not request indexing.');
  if (request === 'yes') notes.push('Inspect and request indexing.');
  return {
    locale,
    url: absolutePublicUrl(urlPath),
    content_key: contentKey,
    priority: request === 'yes' ? 'high' : 'normal',
    sitemap: 'yes',
    expected_hreflang: LOCALES[locale].hreflang[0],
    request_indexing: request,
    notes: notes.join(' '),
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function rolloutCsv(rows) {
  const header = ['locale', 'url', 'content_key', 'priority', 'sitemap', 'expected_hreflang', 'request_indexing', 'notes'];
  const lines = [header.join(',')];
  for (const row of rows) lines.push(header.map((key) => csvEscape(row[key])).join(','));
  return `${lines.join('\n')}\n`;
}

function rolloutMarkdown(rows) {
  const inspect = rows.filter((row) => row.request_indexing === 'yes');
  const byLocale = new Map();
  for (const row of inspect) {
    if (!byLocale.has(row.locale)) byLocale.set(row.locale, []);
    byLocale.get(row.locale).push(row);
  }
  const order = ['sv', 'en', 'nl', ...WEB_LOCALE_CODES.filter((code) => !['sv', 'en', 'nl'].includes(code)).sort()];
  const sections = order.filter((code) => byLocale.has(code)).map((code) => {
    const lines = byLocale.get(code).map((row) => `- ${row.url}`);
    return `### ${code}\n\n${lines.join('\n')}`;
  });
  const se = swedishOrigin();
  const app = englishOrigin();
  const swedishList = (byLocale.get('sv') || []).map((row) => `   - ${row.url}`).join('\n');
  return `# Search Console rollout\n\nUse this after the public web is deployed. Market URLs such as \`/en/ie\`, \`/de/at\` and \`/nl/nl\` stay \`noindex, follow\`. Do not request indexing for them.\n\n\`x-default\` points at the English URL of the same content key. \`howItWorks\` has no Swedish twin. That gap is expected.\n\n## 1. ${se.replace('https://', '')}\n\n1. Open the \`${se.replace('https://', '')}\` property.\n2. Submit \`${se}/sitemap.xml\`.\n3. Inspect these Swedish URLs first. Confirm the Google-selected canonical is the .se URL and the page is indexable.\n${swedishList}\n4. In Page indexing, review:\n   - Crawled – currently not indexed\n   - Discovered – currently not indexed\n   - Duplicate without user-selected canonical\n   - Google-selected canonical is different\n5. A .se URL whose canonical is on the app host, or the reverse, is a defect. Do not request indexing until the canonical matches the property.\n\n## 2. ${app.replace('https://', '')}\n\n1. Open the \`${app.replace('https://', '')}\` property.\n2. Submit \`${app}/sitemap.xml\`.\n3. Inspect the five URLs below for each locale, in this order: \`en\`, \`nl\`, then the remaining locales.\n4. For each URL confirm HTTP 200, self-canonical on the app host, the expected hreflang tag, and that market pages are absent from the alternate list.\n5. Request indexing only for those five URLs per locale. Leave FAQ, legal, resources and the other guides to the sitemap.\n6. Open the hreflang report. A missing \`sv-SE\` on how-it-works is expected. A market URL or a noindex URL in the alternate set is not.\n\n## 3. Five URLs to inspect first\n\n${sections.join('\n\n')}\n\n## 4. How to read the index reports\n\n- **Crawled – currently not indexed.** Open the URL, confirm canonical and hreflang, then request indexing only when it is one of the five URLs above.\n- **Discovered – currently not indexed.** Leave it if the sitemap already lists it. Request indexing only for the five URLs.\n- **Duplicate.** Compare the user-declared canonical with the URL you submitted. The declared canonical wins.\n- **Google-selected canonical.** It must be the same host and path as the sitemap loc. A market path or another language means the cluster is wrong.\n\n## 5. Do not do\n\n- Do not submit \`/en/ie\`, \`/en/ca\`, \`/nl/nl\` or any other market path for indexing.\n- Do not add a sitemap that multiplies locales by countries.\n- Do not point hreflang at a \`noindex\` URL.\n`;
}

function allowPublicUrl(text) {
  const markers = [englishOrigin(), swedishOrigin(), APP_DOMAIN, MAIN_DOMAIN];
  return String(text).split('\n').map((line) => (
    markers.some((marker) => marker && line.includes(marker)) && !line.includes('pragma: allowlist secret')
      ? `${line} <!-- pragma: allowlist secret -->`
      : line
  )).join('\n');
}

function stripPublicOrigin(value) {
  if (typeof value === 'string') {
    return value
      .split(englishOrigin()).join('')
      .split(swedishOrigin()).join('')
      .split(APP_DOMAIN).join('app')
      .split(MAIN_DOMAIN).join('se');
  }
  if (Array.isArray(value)) return value.map(stripPublicOrigin);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [stripPublicOrigin(key), stripPublicOrigin(item)]));
  }
  return value;
}

function writeArtifacts(report, rows) {
  const dir = path.join(__dirname, '../docs/seo');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'eu-web-qa-report.json'), `${JSON.stringify(stripPublicOrigin(report), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'search-console-rollout.csv'), allowPublicUrl(rolloutCsv(rows)));
  fs.writeFileSync(path.join(dir, 'search-console-rollout.md'), allowPublicUrl(rolloutMarkdown(rows)));
}

async function runAudit() {
  ensureTestEnv();
  const markets = auditMarkets();
  const locales = auditLocales();
  const graph = auditStaticGraph();
  const { createApp } = require('../app');
  const { listenApp } = require('../test/helpers/http');
  const server = await listenApp(createApp);
  try {
    const live = await auditLive(server.server.address().port);
    const summary = summarise(graph, live, markets, locales);
    const pilots = {};
    for (const item of PILOTS) {
      const row = live.crawl.rows.find((entry) => entry.path === item);
      pilots[item] = row ? { status: row.status, ok: row.ok, issues: row.issues } : { ok: false, issues: ['missing'] };
    }
    const report = {
      verdict: summary.verdict,
      markets: {
        euEea: markets.euEea,
        missing: markets.missing,
        extra: markets.extra,
        duplicate: markets.duplicate,
        wrongIso: markets.wrongIso,
        wrongDefault: markets.wrongDefault,
        invalidLocale: markets.invalidLocale,
        canadaSeparate: markets.canadaSeparate,
        canadaPath: markets.canadaPath,
        multi: markets.multi,
        swedishCampaignOmitted: markets.swedishCampaignOmitted,
      },
      locales: {
        configured: locales.configured,
        seoEnabled: locales.seoEnabled,
        complete: locales.complete,
        blocked: locales.blocked,
        rows: locales.rows,
      },
      counts: {
        indexable: graph.indexableTotal,
        perLocale: graph.perLocale,
        appSitemap: graph.appSitemap,
        seSitemap: graph.seSitemap,
        marketPaths: graph.marketPaths,
        explosionIfMarketCartesian: graph.explosionIfMarketCartesian,
        crawled: live.crawl.fetchedCount,
      },
      canonicalMismatches: summary.canonicalMismatches,
      hreflang: graph.hreflang,
      sitemapErrors: {
        app: live.sitemaps[APP_DOMAIN],
        se: live.sitemaps[MAIN_DOMAIN],
      },
      robots: live.robots,
      links: {
        problems: live.crawl.linkProblems.slice(0, 30),
        problemCount: live.crawl.linkProblems.length,
        coreOrphans: live.crawl.coreOrphans,
        switchProblems: live.crawl.switchProblems.slice(0, 30),
      },
      language: { mixedLanguage: summary.mixedLanguage },
      legalFlags: summary.legalFlags,
      resurser: live.resurser,
      pilots,
      querySamples: live.querySamples,
      performance: live.performance,
      urlIssues: summary.urlIssues,
      faqSchemaWording: live.crawl.faqNotes,
      observations: {
        professionalLanding: 'professionell_landingssida is off in this database, so /pedagoger-och-terapeuter redirects home. The document stays in the sitemap for the flag.',
        register: '/register is the existing account form. Its heading is filled by the page script.',
        platformScripts: 'Public HTML still receives the existing platform script shell. Locale pages do not each download the other 25 languages.',
      },
      blockers: summary.blockers,
    };
    return report;
  } finally {
    await server.close();
  }
}

async function main() {
  const report = await runAudit();
  const rows = rolloutRows();
  writeArtifacts(report, rows);
  console.log(JSON.stringify({
    verdict: report.verdict,
    indexable: report.counts.indexable,
    crawled: report.counts.crawled,
    canonicalMismatches: report.canonicalMismatches,
    hreflangBroken: report.hreflang.broken,
    blockers: report.blockers,
    urlIssues: report.urlIssues.length,
  }, null, 2));
  if (report.verdict !== 'READY_FOR_EU_WEB_ROLLOUT') process.exitCode = 1;
}

module.exports = {
  runAudit,
  rolloutRows,
  writeArtifacts,
  auditMarkets,
  auditLocales,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
