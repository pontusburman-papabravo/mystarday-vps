'use strict';

/**
 * Apply explicit locale from login/register UI before issuing session.
 * Pre-auth switcher choice must win over stale family.preferred_locale (e.g. en-GB beta).
 */

const db = require('./db');
const { normalizeLocale, validateLocale } = require('./locale');
const { SELECTION_SOURCES } = require('./locale-selection');
const { enableEnglishAppForFamily } = require('./i18n-enable-english');

/**
 * @param {{ familyId: string, explicitLocale?: string|null, language?: string|null }} params
 * @returns {Promise<string>} canonical preferred_locale after apply
 */
async function applyLoginLocaleChoice({ familyId, explicitLocale, language }) {
  const requested = normalizeLocale(explicitLocale || language);

  const currentRow = await db.query(
    `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
    [familyId]
  );
  const current = validateLocale(currentRow.rows[0]?.preferred_locale);

  if (!requested || requested === current) {
    return current;
  }

  if (requested === 'en-GB') {
    await enableEnglishAppForFamily(familyId);
  }

  await db.query(
    `UPDATE family
     SET preferred_locale = $1,
         previous_locale = $2,
         locale_selected_at = NOW(),
         locale_selection_source = $3
     WHERE id = $4`,
    [requested, current, SELECTION_SOURCES.LOGIN, familyId]
  );

  return requested;
}

module.exports = {
  applyLoginLocaleChoice,
};
