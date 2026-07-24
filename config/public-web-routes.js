'use strict';

/**
 * Public marketing URL pairs (sv path → en path).
 * Logged-in app routes are NOT duplicated under /en.
 */

const PUBLIC_WEB_ROUTES = [
  { sv: '/', en: '/en', fileSv: 'index.html', fileEn: 'en.html' },
  { sv: '/faq', en: '/en/faq', fileSv: 'faq.html', fileEn: 'en-faq.html' },
  { sv: '/kontakt', en: '/en/contact', fileSv: 'kontakt.html', fileEn: 'en-contact.html' },
  { sv: '/privacy', en: '/en/privacy', fileSv: 'privacy.html', fileEn: 'en-privacy.html' },
  { sv: '/terms', en: '/en/terms', fileSv: 'terms.html', fileEn: 'en-terms.html' },
  { sv: '/pricing-info', en: '/en/pricing', fileSv: 'pricing-info.html', fileEn: 'en-pricing.html' },
  { sv: '/register', en: '/en/register', fileSv: 'register.html', fileEn: 'register.html' },
  { sv: '/login', en: '/en/login', fileSv: 'login.html', fileEn: 'login.html' },
  { sv: '/forgot-password', en: '/en/forgot-password', fileSv: 'forgot-password.html', fileEn: 'forgot-password.html' },
];

const EN_ONLY_STATIC = [
  { path: '/en/how-it-works', file: 'en-how-it-works.html' },
];

function allEnglishPaths() {
  return [
    ...PUBLIC_WEB_ROUTES.map((r) => r.en),
    ...EN_ONLY_STATIC.map((r) => r.path),
  ];
}

module.exports = {
  PUBLIC_WEB_ROUTES,
  EN_ONLY_STATIC,
  allEnglishPaths,
};
