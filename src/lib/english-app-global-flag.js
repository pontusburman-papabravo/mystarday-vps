'use strict';

/**
 * Global English availability kill switch (feature_flag).
 * When enabled, all families may select en-GB without per-family english_app allowlist.
 * Default OFF — enable explicitly after smoke (see ADR-021).
 */

const db = require('./db');

const GLOBAL_FLAG_KEY = 'english_app_global_enabled';

/**
 * @returns {Promise<boolean>}
 */
async function isEnglishAppGlobalEnabled() {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [GLOBAL_FLAG_KEY]
    );
    if (!result.rows.length) return false;
    return result.rows[0].enabled === true;
  } catch (err) {
    console.error('[english-app-global-flag] read failed:', err.message);
    return false;
  }
}

module.exports = {
  GLOBAL_FLAG_KEY,
  isEnglishAppGlobalEnabled,
};
