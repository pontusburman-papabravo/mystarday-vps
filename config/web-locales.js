'use strict';

/**
 * Public-web locale registry.
 * locale = language. market = country. They are not the same thing.
 * Swedish stays on the .se root. Path locales (/en, /nl) live on the app host.
 * A new language is a registry row plus content, not a new router.
 */

const LOCALES = Object.freeze({
  sv: Object.freeze({
    code: 'sv',
    enabled: true,
    publicWeb: true,
    seoEnabled: true,
    name: 'Swedish',
    nativeName: 'Svenska',
    htmlLang: 'sv',
    hreflang: Object.freeze(['sv-SE']),
    pathPrefix: '',
    host: 'se',
    fallback: true,
    contentTypes: Object.freeze(['home', 'guide', 'faq', 'legal', 'resources']),
  }),
  en: Object.freeze({
    code: 'en',
    enabled: true,
    publicWeb: true,
    seoEnabled: true,
    name: 'English',
    nativeName: 'English',
    htmlLang: 'en',
    hreflang: Object.freeze(['en-IE', 'en-CA']),
    pathPrefix: '/en',
    host: 'app',
    fallback: false,
    defaultPublic: true,
    contentTypes: Object.freeze(['home', 'guide', 'faq', 'legal', 'resources']),
  }),
  nl: Object.freeze({
    code: 'nl',
    enabled: true,
    publicWeb: true,
    seoEnabled: true,
    name: 'Dutch',
    nativeName: 'Nederlands',
    htmlLang: 'nl',
    hreflang: Object.freeze(['nl-NL']),
    pathPrefix: '/nl',
    host: 'app',
    fallback: false,
    contentTypes: Object.freeze(['home', 'guide', 'faq', 'legal', 'resources']),
  }),
});

/** A seoEnabled path locale must have these content keys. */
const REQUIRED_SEO_CONTENT = Object.freeze([
  'home',
  'faq',
  'visualSchedule',
  'privacy',
  'terms',
]);

function localeByCode(code) {
  if (!code) return null;
  return LOCALES[String(code).toLowerCase()] || null;
}

function publicPathLocales() {
  return Object.values(LOCALES).filter((locale) => locale.enabled && locale.publicWeb && locale.pathPrefix);
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
  LOCALES,
  REQUIRED_SEO_CONTENT,
  localeByCode,
  publicPathLocales,
  normalizeWebPath,
  localeFromPublicPath,
};
