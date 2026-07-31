'use strict';

const { getFamilyPreferredLocale } = require('./family-locale');
const { isEnglishChildExperienceEnabled } = require('./i18n-flags');
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
