'use strict';

const { getFamilyPreferredLocale } = require('./family-locale');
const { DEFAULT_LOCALE, childUiLocaleForFamily } = require('./locale');

/**
 * Child UI locale is the family locale. The english_child_experience flag
 * is not consulted.
 * @param {string|null|undefined} familyLocale
 * @param {boolean} [englishChildEnabled] retained for callers; ignored
 * @returns {string}
 */
function resolveChildUiLocale(familyLocale, englishChildEnabled = false) {
  return childUiLocaleForFamily(familyLocale || DEFAULT_LOCALE, englishChildEnabled);
}

/**
 * Content locale for child-facing reward/goal APIs (matches child UI bundle).
 * @param {string} familyId
 * @returns {Promise<string>}
 */
async function resolveChildContentLocaleForFamily(familyId) {
  const familyLocale = await getFamilyPreferredLocale(familyId);
  return resolveChildUiLocale(familyLocale);
}

module.exports = {
  resolveChildUiLocale,
  resolveChildContentLocaleForFamily,
};
