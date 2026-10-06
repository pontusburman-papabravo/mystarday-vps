'use strict';

/**
 * Search Console plan for the public web.
 * Rows come from seoEnabled content and from market pages.
 * Market pages are listed so they are visibly noindex. They are not crawl targets.
 */

const { WEB_LOCALE_CODES, LOCALES } = require('../../config/web-locales');
const {
  EU_WEB_MARKET_CODES,
  MARKETS,
  campaignPath,
  marketPublicEntries,
} = require('../../config/web-markets');
const { CONTENT_KEYS, contentByPath } = require('../../config/web-content-keys');
const { localeSeoGaps } = require('./locale-seo-contract');
const { SEO_INDEXABLE_PATHS } = require('./seo-pages');
const { hreflangAlternates } = require('./public-seo');

/**
 * Committed plan uses pathnames. The Swedish host owns paths with no public
 * language prefix. The app host owns /en, /nl and later language prefixes.
 * Full origins are not written here.
 */
const HIGH_PRIORITY_KEYS = new Set([
  'home',
  'visualSchedule',
  'morningRoutine',
  'weeklySchedule',
  'neurodiverseRoutines',
]);

function isAppPath(pathname) {
  return /^\/[a-z]{2}(\/|$)/.test(pathname);
}

function absoluteUrl(pathname) {
  return pathname === '/' ? '/' : pathname;
}

function hreflangCell(pathname) {
  return hreflangAlternates(pathname).map(([tag]) => tag).join('|');
}

function localeOfPath(pathname) {
  if (isAppPath(pathname)) return pathname.split('/')[1];
  return 'sv';
}

function planRows() {
  const rows = [];
  const seen = new Set();

  function add(row) {
    if (seen.has(row.url)) return;
    seen.add(row.url);
    rows.push(row);
  }

  for (const entry of CONTENT_KEYS) {
    for (const [localeCode, pathname] of Object.entries(entry.paths)) {
      const locale = LOCALES[localeCode];
      if (!locale || !locale.seoEnabled || !pathname) continue;
      const indexable = SEO_INDEXABLE_PATHS.has(pathname);
      add({
        locale: localeCode,
        market: '',
        url: absoluteUrl(pathname),
        content_key: entry.key,
        indexable: indexable ? 'true' : 'false',
        canonical: absoluteUrl(pathname),
        hreflang: indexable ? hreflangCell(pathname) : '',
        sitemap: indexable ? 'yes' : 'no',
        priority: indexable && HIGH_PRIORITY_KEYS.has(entry.key) ? 'high' : 'normal',
      });
    }
  }

  for (const pathname of [...SEO_INDEXABLE_PATHS].sort()) {
    if (seen.has(absoluteUrl(pathname))) continue;
    const entry = contentByPath(pathname);
    add({
      locale: localeOfPath(pathname),
      market: '',
      url: absoluteUrl(pathname),
      content_key: entry ? entry.key : '',
      indexable: 'true',
      canonical: absoluteUrl(pathname),
      hreflang: hreflangCell(pathname),
      sitemap: 'yes',
      priority: 'normal',
    });
  }

  for (const market of Object.values(MARKETS)) {
    for (const localeCode of market.campaignLocales) {
      const pathname = campaignPath(market, localeCode);
      if (!pathname) continue;
      add({
        locale: localeCode,
        market: market.code,
        url: absoluteUrl(pathname),
        content_key: '',
        indexable: 'false',
        canonical: absoluteUrl(pathname),
        hreflang: '',
        sitemap: 'no',
        priority: 'low',
      });
    }
  }

  return rows;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv() {
  const header = [
    'locale', 'market', 'url', 'content_key', 'indexable', 'canonical', 'hreflang', 'sitemap', 'priority',
  ];
  const lines = [header.join(',')];
  for (const row of planRows()) {
    lines.push(header.map((key) => csvEscape(row[key])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function localeReadiness() {
  return WEB_LOCALE_CODES.map((code) => {
    const locale = LOCALES[code];
    if (code === 'sv') {
      const urlCount = [...SEO_INDEXABLE_PATHS].filter((pathname) => !isAppPath(pathname)).length;
      return {
        locale: code,
        complete: true,
        seoEnabled: true,
        urlCount,
        blocking: '',
      };
    }
    const gaps = localeSeoGaps(code);
    const urlCount = locale.code === 'sv'
      ? [...SEO_INDEXABLE_PATHS].filter((pathname) => !/^\/[a-z]{2}(\/|$)/.test(pathname)).length
      : (locale.pathPrefix
        ? [...SEO_INDEXABLE_PATHS].filter((pathname) => (
          pathname === locale.pathPrefix || pathname.startsWith(`${locale.pathPrefix}/`)
        )).length
        : 0);
    return {
      locale: code,
      complete: gaps.length === 0,
      seoEnabled: locale.seoEnabled === true,
      urlCount,
      blocking: gaps.length ? `LOCALE_BLOCKED ${gaps.join(' ')}` : '',
    };
  });
}

function marketTable() {
  return EU_WEB_MARKET_CODES.map((code) => {
    const market = MARKETS[code];
    return {
      market: market.code,
      locales: market.locales.join(' '),
      defaultLocale: market.defaultLocale,
      webAvailable: market.webAvailable,
      marketingActive: market.marketingActive,
      urls: marketPublicEntries(market).map(absoluteUrl).join(' '),
    };
  });
}

module.exports = {
  HIGH_PRIORITY_KEYS,
  absoluteUrl,
  planRows,
  toCsv,
  localeReadiness,
  marketTable,
};
