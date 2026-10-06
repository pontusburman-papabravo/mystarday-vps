'use strict';

/**
 * Public-web market registry.
 * EU27 + Norway + Iceland are the 29 open web markets.
 * Canada stays as the existing English campaign market and is not one of the 29.
 * Commercial entitlement, store URLs and registration gates stay in their
 * existing modules. This file only points at them.
 * marketingActive is ads/launch copy. It does not decide indexability or routing.
 * locale !== market. A shared spelling (nl/NL, fr/FR) is a coincidence.
 */

const {
  APPLE_APP_STORE_IE_URL,
  APPLE_APP_STORE_CA_URL,
  APPLE_APP_STORE_GEO_NEUTRAL_URL,
  getIrelandPlayStoreUrl,
  getPlayStoreUrl,
} = require('./store-links');
const { getMarketCommercialPolicy, ENTITLEMENT } = require('../src/lib/market-commercial-policy');
const { gateKeyForCountry, GATE_DEFAULTS } = require('../src/lib/market-region');
const { LOCALES, localeByCode, normalizeWebPath } = require('./web-locales');

/**
 * code, English name, native name, path segment, locales (default first), labels.
 * Every market includes English so a public market URL exists before that
 * language's own pages are translated.
 */
const MARKET_ROWS = Object.freeze([
  ['AT', 'Austria', 'Österreich', 'at', ['de', 'en'], { de: 'Österreich', en: 'Austria' }],
  ['BE', 'Belgium', 'België', 'be', ['nl', 'fr', 'de', 'en'], { nl: 'België', fr: 'Belgique', de: 'Belgien', en: 'Belgium' }],
  ['BG', 'Bulgaria', 'България', 'bg', ['bg', 'en'], { bg: 'България', en: 'Bulgaria' }],
  ['HR', 'Croatia', 'Hrvatska', 'hr', ['hr', 'en'], { hr: 'Hrvatska', en: 'Croatia' }],
  ['CY', 'Cyprus', 'Κύπρος', 'cy', ['el', 'en'], { el: 'Κύπρος', en: 'Cyprus' }],
  ['CZ', 'Czechia', 'Česko', 'cz', ['cs', 'en'], { cs: 'Česko', en: 'Czechia' }],
  ['DK', 'Denmark', 'Danmark', 'dk', ['da', 'en'], { da: 'Danmark', en: 'Denmark' }],
  ['EE', 'Estonia', 'Eesti', 'ee', ['et', 'en'], { et: 'Eesti', en: 'Estonia' }],
  ['FI', 'Finland', 'Suomi', 'fi', ['fi', 'sv', 'en'], { fi: 'Suomi', sv: 'Finland', en: 'Finland' }],
  ['FR', 'France', 'France', 'fr', ['fr', 'en'], { fr: 'France', en: 'France' }],
  ['DE', 'Germany', 'Deutschland', 'de', ['de', 'en'], { de: 'Deutschland', en: 'Germany' }],
  ['GR', 'Greece', 'Ελλάδα', 'gr', ['el', 'en'], { el: 'Ελλάδα', en: 'Greece' }],
  ['HU', 'Hungary', 'Magyarország', 'hu', ['hu', 'en'], { hu: 'Magyarország', en: 'Hungary' }],
  ['IE', 'Ireland', 'Ireland', 'ie', ['en', 'ga'], { en: 'Ireland', ga: 'Éire' }],
  ['IT', 'Italy', 'Italia', 'it', ['it', 'en'], { it: 'Italia', en: 'Italy' }],
  ['LV', 'Latvia', 'Latvija', 'lv', ['lv', 'en'], { lv: 'Latvija', en: 'Latvia' }],
  ['LT', 'Lithuania', 'Lietuva', 'lt', ['lt', 'en'], { lt: 'Lietuva', en: 'Lithuania' }],
  ['LU', 'Luxembourg', 'Luxembourg', 'lu', ['fr', 'de', 'en'], { fr: 'Luxembourg', de: 'Luxemburg', en: 'Luxembourg' }],
  ['MT', 'Malta', 'Malta', 'mt', ['mt', 'en'], { mt: 'Malta', en: 'Malta' }],
  ['NL', 'Netherlands', 'Nederland', 'nl', ['nl', 'en'], { nl: 'Nederland', en: 'Netherlands' }],
  ['PL', 'Poland', 'Polska', 'pl', ['pl', 'en'], { pl: 'Polska', en: 'Poland' }],
  ['PT', 'Portugal', 'Portugal', 'pt', ['pt', 'en'], { pt: 'Portugal', en: 'Portugal' }],
  ['RO', 'Romania', 'România', 'ro', ['ro', 'en'], { ro: 'România', en: 'Romania' }],
  ['SK', 'Slovakia', 'Slovensko', 'sk', ['sk', 'en'], { sk: 'Slovensko', en: 'Slovakia' }],
  ['SI', 'Slovenia', 'Slovenija', 'si', ['sl', 'en'], { sl: 'Slovenija', en: 'Slovenia' }],
  ['ES', 'Spain', 'España', 'es', ['es', 'en'], { es: 'España', en: 'Spain' }],
  ['SE', 'Sweden', 'Sverige', 'se', ['sv', 'en'], { sv: 'Sverige', en: 'Sweden' }],
  ['NO', 'Norway', 'Norge', 'no', ['nb', 'en'], { nb: 'Norge', en: 'Norway' }],
  ['IS', 'Iceland', 'Ísland', 'is', ['is', 'en'], { is: 'Ísland', en: 'Iceland' }],
]);

const EU_WEB_MARKET_CODES = Object.freeze(MARKET_ROWS.map((row) => row[0]));

function publicCampaignLocales(localeCodes) {
  return localeCodes.filter((code) => {
    const locale = LOCALES[code];
    return !!(locale && locale.enabled && locale.publicWeb && locale.pathPrefix);
  });
}

function freezeMarket(row, extra) {
  const [code, name, nativeName, pathSegment, locales, labels] = row;
  return Object.freeze({
    code,
    enabled: true,
    locales: Object.freeze(locales.slice()),
    defaultLocale: locales[0],
    campaignLocales: Object.freeze(publicCampaignLocales(locales)),
    webAvailable: true,
    marketingActive: extra.marketingActive === true,
    euWeb: extra.euWeb === true,
    name,
    nativeName,
    labels: Object.freeze(labels),
    pathSegment,
    appleUrl: extra.appleUrl,
    play: extra.play,
  });
}

const MARKETS = Object.freeze({
  ...Object.fromEntries(MARKET_ROWS.map((row) => {
    const code = row[0];
    const extra = code === 'IE'
      ? { marketingActive: true, euWeb: true, appleUrl: APPLE_APP_STORE_IE_URL, play: 'ie' }
      : { marketingActive: false, euWeb: true, appleUrl: APPLE_APP_STORE_GEO_NEUTRAL_URL, play: 'generic' };
    return [code, freezeMarket(row, extra)];
  })),
  CA: Object.freeze({
    code: 'CA',
    enabled: true,
    locales: Object.freeze(['en']),
    defaultLocale: 'en',
    campaignLocales: Object.freeze(['en']),
    webAvailable: true,
    marketingActive: true,
    euWeb: false,
    name: 'Canada',
    nativeName: 'Canada',
    labels: Object.freeze({ en: 'Canada' }),
    pathSegment: 'ca',
    appleUrl: APPLE_APP_STORE_CA_URL,
    play: 'soon',
  }),
});

function euWebMarkets() {
  return EU_WEB_MARKET_CODES.map((code) => MARKETS[code]);
}

function marketByCode(code) {
  if (!code) return null;
  return MARKETS[String(code).trim().toUpperCase()] || null;
}

function marketDisplayName(market, localeCode) {
  if (!market) return '';
  const labels = market.labels || {};
  if (labels[localeCode]) return labels[localeCode];
  if (localeCode === 'en') return market.name;
  return market.nativeName;
}

function campaignPath(market, localeCode) {
  const locale = localeByCode(localeCode);
  if (!market || !locale || !locale.pathPrefix) return null;
  if (!market.campaignLocales.includes(locale.code)) return null;
  return `${locale.pathPrefix}/${market.pathSegment}`;
}

/**
 * Public entry points for a market.
 * Sweden's language home stays on the Swedish host. Swedish has no /sv prefix,
 * so Finland's Swedish locale does not invent /sv/fi.
 */
function marketPublicEntries(market) {
  if (!market) return [];
  const paths = [];
  if (market.code === 'SE') paths.push('/');
  for (const localeCode of market.campaignLocales) {
    const target = campaignPath(market, localeCode);
    if (target) paths.push(target);
  }
  return paths;
}

function marketForPublicPath(pathname) {
  const p = normalizeWebPath(pathname);
  for (const market of Object.values(MARKETS)) {
    if (!market.enabled) continue;
    for (const localeCode of market.campaignLocales) {
      if (campaignPath(market, localeCode) === p) {
        return { market, locale: localeByCode(localeCode) };
      }
    }
  }
  return null;
}

function marketsForLocale(localeCode) {
  const locale = localeByCode(localeCode);
  if (!locale) return [];
  return Object.values(MARKETS).filter((market) => (
    market.enabled && market.webAvailable && market.campaignLocales.includes(locale.code)
  ));
}

function playUrlForMarket(market) {
  if (!market || market.play === 'soon') return null;
  if (market.play === 'ie') return getIrelandPlayStoreUrl();
  if (market.play === 'generic') return getPlayStoreUrl();
  return null;
}

/**
 * Read-only view of the existing commercial policy. Does not define a new offer.
 */
function marketCommercialFacts(code) {
  const policy = getMarketCommercialPolicy(code);
  const gateKey = gateKeyForCountry(code);
  return Object.freeze({
    countryCode: policy.countryCode,
    entitlement: policy.entitlement,
    trialDays: policy.trialDays,
    requiresBillingReady: policy.requiresBillingReady,
    complimentary: policy.entitlement === ENTITLEMENT.COMPLIMENTARY_UNTIL,
    registrationGate: gateKey,
    registrationOpenByDefault: GATE_DEFAULTS[gateKey] === true,
  });
}

function localeMarketQueryPath(pathname, query) {
  const p = normalizeWebPath(pathname);
  const locale = localeByCode(p.slice(1));
  if (!locale || p !== locale.pathPrefix) return null;
  const source = query || {};
  const raw = String(source.country || source.market || '').trim();
  if (!/^[A-Za-z]{2}$/.test(raw)) return null;
  const market = marketByCode(raw);
  const target = market && campaignPath(market, locale.code);
  if (!target) return null;
  const params = new URLSearchParams();
  Object.keys(source).forEach((key) => {
    if (key === 'country' || key === 'market') return;
    const value = source[key];
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item == null) return;
      params.append(key, String(item));
    });
  });
  const q = params.toString();
  return target + (q ? `?${q}` : '');
}

module.exports = {
  EU_WEB_MARKET_CODES,
  MARKETS,
  euWebMarkets,
  marketByCode,
  marketDisplayName,
  campaignPath,
  marketPublicEntries,
  marketForPublicPath,
  marketsForLocale,
  playUrlForMarket,
  marketCommercialFacts,
  localeMarketQueryPath,
};
