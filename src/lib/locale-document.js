'use strict';

const { localeByCode, publishedLocales } = require('../../config/web-locales');
const { chromeFor } = require('../../config/web-locale-chrome');
const { marketsForLocale, campaignPath, marketDisplayName } = require('../../config/web-markets');
const { pathFor } = require('../../config/web-content-keys');
const { absolutePublicUrl, swedishOrigin, englishOrigin } = require('./public-seo');
const { localeSwitchTarget } = require('./locale-switch');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLd(page, canonical) {
  const graph = [];
  if (page.faqs && page.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: page.faqs.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }
  if (!graph.length) return '';
  const payload = graph.length === 1
    ? { '@context': 'https://schema.org', ...graph[0] }
    : { '@context': 'https://schema.org', '@graph': graph };
  void canonical;
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

function absoluteLocaleHome(localeCode) {
  const path = pathFor('home', localeCode) || '/';
  if (localeCode === 'sv') return path === '/' ? `${swedishOrigin()}/` : `${swedishOrigin()}${path}`;
  return `${englishOrigin()}${path}`;
}

const MARKET_LINK_LIMIT = 8;

const OG_LOCALE = Object.freeze({
  bg: 'bg_BG',
  hr: 'hr_HR',
  cs: 'cs_CZ',
  da: 'da_DK',
  nl: 'nl_NL',
  en: 'en_IE',
  et: 'et_EE',
  fi: 'fi_FI',
  fr: 'fr_FR',
  de: 'de_DE',
  el: 'el_GR',
  hu: 'hu_HU',
  ga: 'ga_IE',
  it: 'it_IT',
  lv: 'lv_LV',
  lt: 'lt_LT',
  mt: 'mt_MT',
  pl: 'pl_PL',
  pt: 'pt_PT',
  ro: 'ro_RO',
  sk: 'sk_SK',
  sl: 'sl_SI',
  es: 'es_ES',
  sv: 'sv_SE',
  nb: 'nb_NO',
  is: 'is_IS',
});

function languageNav(localeCode, pathname) {
  const links = publishedLocales().map((locale) => ({
    code: locale.code,
    label: locale.nativeName,
  }));
  return links.map((link) => {
    const target = localeSwitchTarget(pathname, link.code) || absoluteLocaleHome(link.code);
    const href = absolutePublicUrl(target);
    const current = link.code === localeCode ? ' aria-current="page"' : '';
    return `<a href="${escapeHtml(href)}" hreflang="${escapeHtml(link.code)}" data-locale-switch="${escapeHtml(link.code)}"${current}>${escapeHtml(link.label)}</a>`;
  }).join('\n');
}

function marketNav(localeCode, activeMarket) {
  const markets = marketsForLocale(localeCode);
  if (!markets.length) return '';
  const label = chromeFor(localeCode).marketLabel;
  if (markets.length > MARKET_LINK_LIMIT) {
    const options = markets.map((market) => {
      const href = campaignPath(market, localeCode);
      const selected = activeMarket === market.code ? ' selected' : '';
      return `<option value="${escapeHtml(href)}"${selected}>${escapeHtml(marketDisplayName(market, localeCode))}</option>`;
    }).join('');
    return `<label class="landing-market-switch">${escapeHtml(label)} <select data-market-switch aria-label="${escapeHtml(label)}" onchange="if(this.value)location.href=this.value">${options}</select></label>`;
  }
  const links = markets.map((market) => {
    const href = campaignPath(market, localeCode);
    const current = activeMarket === market.code ? ' aria-current="page"' : '';
    return `<a href="${escapeHtml(href)}"${current}>${escapeHtml(marketDisplayName(market, localeCode))}</a>`;
  }).join('\n');
  return `<nav class="landing-market-switch" aria-label="${escapeHtml(label)}">${links}</nav>`;
}

function renderLocaleDocument(localeCode, page, pathname) {
  const locale = localeByCode(localeCode);
  const chrome = chromeFor(localeCode);
  if (!locale || !chrome || !page) throw new Error(`Cannot render ${localeCode}`);
  const canonical = absolutePublicUrl(pathname);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const h1 = escapeHtml(page.h1);
  const market = page.marketCode || '';
  const marketAttr = market ? ` data-en-market="${escapeHtml(market)}" data-web-market="${escapeHtml(market)}"` : '';
  const footer = [
    `<a href="${escapeHtml(pathFor('home', localeCode))}">${escapeHtml(chrome.footer || chrome.home)}</a>`,
    `<a href="${escapeHtml(pathFor('faq', localeCode))}">${escapeHtml(chrome.faq || 'FAQ')}</a>`,
    `<a href="${escapeHtml(pathFor('privacy', localeCode))}">${escapeHtml(chrome.privacy || 'Privacy')}</a>`,
    `<a href="${escapeHtml(pathFor('terms', localeCode))}">${escapeHtml(chrome.terms || 'Terms')}</a>`,
  ].join(' · ');
  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale.htmlLang)}" data-web-locale="${escapeHtml(locale.code)}"${marketAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${escapeHtml(page.ogTitle || page.h1)}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:locale" content="${escapeHtml(OG_LOCALE[locale.code] || 'en_IE')}">
  <link rel="stylesheet" href="/css/landing.css?v=21">
  <link rel="stylesheet" href="/css/seo-article.css?v=2">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${jsonLd(page, canonical)}
</head>
<body class="seo-article-page locale-page">
  <header class="en-market-top">
    <a class="en-market-brand" href="${escapeHtml(locale.pathPrefix || '/')}">${escapeHtml(chrome.home)}</a>
    <nav class="en-market-lang" aria-label="${escapeHtml(chrome.languageLabel)}" data-public-lang-switcher="1">
      ${languageNav(locale.code, pathname)}
    </nav>
    ${marketNav(locale.code, market)}
  </header>
  <main class="landing-section--white">
    <article class="seo-article en-market-inner">
      <h1>${h1}</h1>
      ${page.body}
    </article>
  </main>
  <footer class="locale-footer"><p>${footer}</p></footer>
  <script src="/js/utm-capture.js?v=1.2.0"></script>
  <script src="/js/public-locale-alternates.js?v=1"></script>
  <script src="/js/public-lang-switcher.js?v=5"></script>
  <script src="/js/landing-events.js?v=9"></script>
</body>
</html>`;
}

module.exports = {
  renderLocaleDocument,
};
