'use strict';

const { localeFromPublicPath, normalizeWebPath, localeByCode } = require('../../config/web-locales');

/**
 * Catch-all classification for public HTML.
 * Unknown two-letter locales and unknown tails under a real locale
 * must not fall through to the English homepage.
 */
function publicNotFoundKind(pathname) {
  const path = normalizeWebPath(pathname);
  if (/^\/[a-z]{2}$/.test(path) && !localeByCode(path.slice(1))) return 'unknown-locale';
  const locale = localeFromPublicPath(path);
  if (locale && path !== locale.pathPrefix) return 'unknown-locale-path';
  return null;
}

function publicNotFoundHtml(kind, pathname) {
  const path = normalizeWebPath(pathname);
  const dutch = path === '/nl' || path.startsWith('/nl/');
  if (dutch) {
    return '<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8">'
      + '<meta name="robots" content="noindex, follow">'
      + '<title>Pagina niet gevonden</title></head><body>'
      + '<h1>Pagina niet gevonden</h1>'
      + '<p><a href="/nl">Naar de Nederlandstalige site</a></p></body></html>';
  }
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="robots" content="noindex, follow">'
    + '<title>Page not found</title></head><body>'
    + `<h1>Page not found</h1><p>${kind === 'unknown-locale' ? 'This language is not available.' : 'This page is not available.'}</p>`
    + '</body></html>';
}

module.exports = {
  publicNotFoundKind,
  publicNotFoundHtml,
};
