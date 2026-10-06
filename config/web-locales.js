'use strict';

/**
 * Public-web locale registry.
 * locale = language. market = country. They are not the same thing.
 * Swedish stays on the .se root. Other public languages live on the app host.
 * A language is a registry row plus content, not a new router.
 * seoEnabled is separate from market.marketingActive.
 */

const PUBLISHED = Object.freeze({
  sv: true,
  en: true,
  nl: true,
  de: true,
  fr: true,
  es: true,
  it: true,
  pl: true,
  da: true,
  fi: true,
  nb: true,
  is: true,
  pt: true,
  cs: true,
  sk: true,
  sl: true,
  hr: true,
  hu: true,
  ro: true,
  bg: true,
  el: true,
  et: true,
  lv: true,
  lt: true,
});

const LOCALE_META = Object.freeze({
  bg: Object.freeze(['Bulgarian', 'Български']),
  hr: Object.freeze(['Croatian', 'Hrvatski']),
  cs: Object.freeze(['Czech', 'Čeština']),
  da: Object.freeze(['Danish', 'Dansk']),
  nl: Object.freeze(['Dutch', 'Nederlands']),
  en: Object.freeze(['English', 'English']),
  et: Object.freeze(['Estonian', 'Eesti']),
  fi: Object.freeze(['Finnish', 'Suomi']),
  fr: Object.freeze(['French', 'Français']),
  de: Object.freeze(['German', 'Deutsch']),
  el: Object.freeze(['Greek', 'Ελληνικά']),
  hu: Object.freeze(['Hungarian', 'Magyar']),
  ga: Object.freeze(['Irish', 'Gaeilge']),
  it: Object.freeze(['Italian', 'Italiano']),
  lv: Object.freeze(['Latvian', 'Latviešu']),
  lt: Object.freeze(['Lithuanian', 'Lietuvių']),
  mt: Object.freeze(['Maltese', 'Malti']),
  pl: Object.freeze(['Polish', 'Polski']),
  pt: Object.freeze(['Portuguese', 'Português']),
  ro: Object.freeze(['Romanian', 'Română']),
  sk: Object.freeze(['Slovak', 'Slovenčina']),
  sl: Object.freeze(['Slovenian', 'Slovenščina']),
  es: Object.freeze(['Spanish', 'Español']),
  sv: Object.freeze(['Swedish', 'Svenska']),
  nb: Object.freeze(['Norwegian Bokmål', 'Norsk bokmål']),
  is: Object.freeze(['Icelandic', 'Íslenska']),
});

/** EU official languages plus Norwegian Bokmål and Icelandic. */
const WEB_LOCALE_CODES = Object.freeze([
  'bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'de', 'el', 'hu',
  'ga', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv',
  'nb', 'is',
]);

/** A seoEnabled path locale must have these content keys before it is indexed. */
const REQUIRED_SEO_CONTENT = Object.freeze([
  'home',
  'howItWorks',
  'visualSchedule',
  'morningRoutine',
  'weeklySchedule',
  'neurodiverseRoutines',
  'rewardSystem',
  'resources',
  'faq',
  'privacy',
  'terms',
]);

function hreflangFor(code) {
  if (code === 'sv') return Object.freeze(['sv-SE']);
  return Object.freeze([code]);
}

function buildLocale(code) {
  const meta = LOCALE_META[code];
  const published = PUBLISHED[code] === true;
  const swedish = code === 'sv';
  return Object.freeze({
    code,
    enabled: true,
    publicWeb: published,
    seoEnabled: published,
    name: meta[0],
    nativeName: meta[1],
    htmlLang: code,
    hreflang: hreflangFor(code),
    pathPrefix: swedish ? '' : `/${code}`,
    host: swedish ? 'se' : 'app',
    fallback: swedish,
    defaultPublic: code === 'en',
    contentTypes: published
      ? Object.freeze(['home', 'guide', 'faq', 'legal', 'resources'])
      : Object.freeze([]),
    block: published ? null : 'LOCALE_BLOCKED',
  });
}

const LOCALES = Object.freeze(Object.fromEntries(
  WEB_LOCALE_CODES.map((code) => [code, buildLocale(code)]),
));

function localeByCode(code) {
  if (!code) return null;
  return LOCALES[String(code).toLowerCase()] || null;
}

function publicPathLocales() {
  return Object.values(LOCALES).filter((locale) => locale.enabled && locale.publicWeb && locale.pathPrefix);
}

function publishedLocales() {
  return Object.values(LOCALES)
    .filter((locale) => locale.publicWeb && locale.seoEnabled)
    .sort((a, b) => {
      const rank = (locale) => (locale.fallback ? 0 : (locale.defaultPublic ? 1 : 2));
      return rank(a) - rank(b) || a.code.localeCompare(b.code);
    });
}

function normalizeWebPath(pathname) {
  let p = String(pathname || '/').split('?')[0].split('#')[0];
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p.endsWith('.html')) p = p.slice(0, -5);
  return p || '/';
}

function localeFromPublicPath(pathname) {
  const p = normalizeWebPath(pathname);
  const prefixed = publicPathLocales()
    .slice()
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  for (const locale of prefixed) {
    if (p === locale.pathPrefix || p.startsWith(`${locale.pathPrefix}/`)) return locale;
  }
  return null;
}

module.exports = {
  WEB_LOCALE_CODES,
  LOCALES,
  REQUIRED_SEO_CONTENT,
  localeByCode,
  publicPathLocales,
  publishedLocales,
  normalizeWebPath,
  localeFromPublicPath,
};
