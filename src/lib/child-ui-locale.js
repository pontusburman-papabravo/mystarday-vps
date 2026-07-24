'use strict';

const { validateLocale, DEFAULT_LOCALE } = require('./locale');

/**
 * Resolve which locale bundle the child UI should use.
 * English child UI requires en-GB family locale AND english_child_experience ON.
 * @param {string|null|undefined} familyLocale
 * @param {boolean} [englishChildEnabled]
 * @returns {'sv-SE'|'en-GB'}
 */
function resolveChildUiLocale(familyLocale, englishChildEnabled = false) {
  const canonical = validateLocale(familyLocale || DEFAULT_LOCALE);
  if (canonical === 'en-GB' && englishChildEnabled === true) {
    return 'en-GB';
  }
  return 'sv-SE';
}

module.exports = {
  resolveChildUiLocale,
};
