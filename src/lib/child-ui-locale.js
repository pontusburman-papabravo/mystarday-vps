'use strict';

const { getFamilyPreferredLocale } = require('./family-locale');
const { isEnglishChildExperienceEnabled } = require('./i18n-flags');
const { DEFAULT_LOCALE, childUiLocaleForFamily } = require('./locale');

/**
 * Resolve which locale bundle the child UI should use.
 * English child UI requires en-GB family locale AND english_child_experience ON.
 * @param {string|null|undefined} familyLocale
 * @param {boolean} [englishChildEnabled]
 * @returns {string}
 */
function resolveChildUiLocale(familyLocale, englishChildEnabled = false) {
  return childUiLocaleForFamily(familyLocale || DEFAULT_LOCALE, englishChildEnabled);
}

/**
 * Content locale for child-facing reward/goal APIs (matches child UI bundle).
 * @param {string} familyId
 * @returns {Promise<'sv-SE'|'en-GB'>}
 */
async function resolveChildContentLocaleForFamily(familyId) {
  const familyLocale = await getFamilyPreferredLocale(familyId);
  const englishChild = await isEnglishChildExperienceEnabled(familyId);
  return resolveChildUiLocale(familyLocale, englishChild);
}

module.exports = {
  resolveChildUiLocale,
  resolveChildContentLocaleForFamily,
};
