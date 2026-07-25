'use strict';

const db = require('./db');
const { validateLocale } = require('./locale');

/**
 * @param {string|null|undefined} locale
 * @returns {boolean}
 */
function isEnglishFamilyLocale(locale) {
  return validateLocale(locale) === 'en-GB';
}

/**
 * @param {string} familyId
 * @returns {Promise<string>}
 */
async function getFamilyPreferredLocale(familyId) {
  if (!familyId) return 'sv-SE';
  const result = await db.query(
    `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
    [familyId]
  );
  return validateLocale(result.rows[0]?.preferred_locale) || 'sv-SE';
}

module.exports = {
  isEnglishFamilyLocale,
  getFamilyPreferredLocale,
};
