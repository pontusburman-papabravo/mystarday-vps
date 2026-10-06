'use strict';

const { contentByPath, pathFor } = require('../../config/web-content-keys');
const { localeByCode } = require('../../config/web-locales');

const HOMES = Object.freeze({
  sv: '/',
  en: '/en',
  nl: '/nl',
});

function localeSwitchTarget(pathname, targetLocale) {
  const locale = localeByCode(targetLocale);
  if (!locale) return null;
  const entry = contentByPath(pathname);
  if (entry && entry.paths[locale.code]) return entry.paths[locale.code];
  return pathFor('home', locale.code) || HOMES[locale.code] || null;
}

module.exports = {
  HOMES,
  localeSwitchTarget,
};
