'use strict';

/**
 * Global kill switch for the one-time English beta offer to existing families.
 * New-user registration language choice is unaffected.
 */

const db = require('./db');

const OFFER_FLAG_KEY = 'english_language_offer';

async function isEnglishLanguageOfferEnabled() {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [OFFER_FLAG_KEY]
    );
    if (!result.rows.length) return true;
    return result.rows[0].enabled === true;
  } catch (err) {
    console.error('[locale-offer-flag] read failed:', err.message);
    return true;
  }
}

module.exports = {
  OFFER_FLAG_KEY,
  isEnglishLanguageOfferEnabled,
};
