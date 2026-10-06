'use strict';

const { localeFromPublicPath, normalizeWebPath, localeByCode } = require('../../config/web-locales');
const { chromeFor } = require('../../config/web-locale-chrome');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Catch-all classification for public HTML.
 * Unknown two-letter locales and unknown tails under a real locale
 * must not fall through to the English homepage.
 */
function publicNotFoundKind(pathname) {
  const path = normalizeWebPath(pathname);
  const first = path.split('/').filter(Boolean)[0] || '';
  if (/^[a-z]{2}$/.test(first)) {
    const locale = localeByCode(first);
    // Registered languages that are not published, and /sv, stay 404.
    // They must not fall through to the English homepage.
    if (!locale || !locale.publicWeb || !locale.pathPrefix) return 'unknown-locale';
    if (path !== locale.pathPrefix) return 'unknown-locale-path';
    return null;
  }
  const locale = localeFromPublicPath(path);
  if (locale && path !== locale.pathPrefix) return 'unknown-locale-path';
  return null;
}

function publicNotFoundHtml(kind, pathname) {
  const path = normalizeWebPath(pathname);
  const first = path.split('/').filter(Boolean)[0] || '';
  const locale = localeByCode(first);
  const chrome = locale && chromeFor(locale.code);
  if (locale && locale.publicWeb && locale.code !== 'en' && chrome && chrome.notFoundTitle) {
    return '<!DOCTYPE html><html lang="' + escapeHtml(locale.htmlLang) + '"><head><meta charset="utf-8">'
      + '<meta name="robots" content="noindex, follow">'
      + '<title>' + escapeHtml(chrome.notFoundTitle) + '</title></head><body>'
      + '<h1>' + escapeHtml(chrome.notFoundH1 || chrome.notFoundTitle) + '</h1>'
      + '<p><a href="' + escapeHtml(locale.pathPrefix) + '">' + escapeHtml(chrome.notFoundLink || chrome.home) + '</a></p></body></html>';
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
