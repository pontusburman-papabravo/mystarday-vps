'use strict';

/**
 * Apply explicit locale from login/register UI after successful authentication.
 * Pre-auth switcher choice must win over stale family.preferred_locale (e.g. en-GB beta).
 * Only canonical sv-SE / en-GB values are persisted; invalid input is ignored.
 */

const db = require('./db');
const { normalizeLocale, validateLocale } = require('./locale');
const { SELECTION_SOURCES } = require('./locale-selection');
const { canSelectEnglishLocale } = require('./i18n-flags');
const { enableEnglishAppForFamily } = require('./i18n-enable-english');

/**
 * @param {{ familyId: string, explicitLocale?: string|null, language?: string|null }} params
 * @returns {Promise<string>} canonical preferred_locale after apply (never throws)
 */
async function applyLoginLocaleChoice({ familyId, explicitLocale, language }) {
  const requested = normalizeLocale(explicitLocale || language);
  if (!requested || !familyId) {
    const currentRow = familyId
      ? await db.query(
        `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
        [familyId]
      )
      : { rows: [] };
    return validateLocale(currentRow.rows[0]?.preferred_locale);
  }

  const currentRow = await db.query(
    `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
    [familyId]
  );
  const current = validateLocale(currentRow.rows[0]?.preferred_locale);

  if (requested === current) {
    return current;
  }

  try {
    if (requested === 'en-GB') {
      const maySelectEnglish = await canSelectEnglishLocale(familyId);
      if (!maySelectEnglish) {
        return current;
      }
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
  } catch (err) {
    console.error('[i18n] applyLoginLocaleChoice failed for family', familyId, ':', err.message);
    return current;
  }
}

module.exports = {
  applyLoginLocaleChoice,
};
