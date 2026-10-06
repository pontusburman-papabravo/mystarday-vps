'use strict';

/**
 * Page modules for published path locales.
 * Dutch stays in its own file. Later batches register here.
 */

const LOADERS = Object.freeze({
  nl: () => require('./nl/pages').pageFor,
  de: () => require('./de/pages').pageFor,
  fr: () => require('./fr/pages').pageFor,
  es: () => require('./es/pages').pageFor,
  it: () => require('./it/pages').pageFor,
  pl: () => require('./pl/pages').pageFor,
});

function hasLocalePages(localeCode) {
  return Object.prototype.hasOwnProperty.call(LOADERS, localeCode);
}

function pageForLocale(localeCode, key) {
  const load = LOADERS[localeCode];
  if (!load) return null;
  return load()(key);
}

module.exports = {
  hasLocalePages,
  pageForLocale,
};
