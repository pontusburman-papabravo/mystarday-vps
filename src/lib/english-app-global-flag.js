'use strict';

/**
 * Global English availability kill switch (feature_flag).
 * When enabled, all families may select en-GB without per-family english_app allowlist.
 * Default OFF — enable explicitly after smoke (see ADR-021).
 */

const db = require('./db');

const GLOBAL_FLAG_KEY = 'english_app_global_enabled';
const READ_FAILED_CODE = 'ENGLISH_GLOBAL_FLAG_READ_FAILED';

/**
 * @returns {Promise<boolean>} fail-closed false on DB errors
 */
async function isEnglishAppGlobalEnabled() {
  const state = await readEnglishAppGlobalFlagState();
  return state.enabled;
}

/**
 * Ops/readiness snapshot for /health (fresh DB read each call).
 * @returns {Promise<{
 *   english_global_flag_key: string,
 *   english_global_flag_read_ok: boolean,
 *   english_global_flag_enabled: boolean,
 *   english_global_flag_row_present?: boolean,
 *   english_global_flag_read_error?: string,
 * }>}
 */
async function getEnglishGlobalAvailabilityReadiness() {
  const state = await readEnglishAppGlobalFlagState();
  const base = {
    english_global_flag_key: GLOBAL_FLAG_KEY,
    english_global_flag_read_ok: state.readOk,
    english_global_flag_enabled: state.enabled,
  };
  if (state.readOk) {
    return { ...base, english_global_flag_row_present: state.rowPresent };
  }
  return {
    ...base,
    english_global_flag_read_error: READ_FAILED_CODE,
  };
}

/**
 * @returns {Promise<{ readOk: boolean, enabled: boolean, rowPresent: boolean }>}
 */
async function readEnglishAppGlobalFlagState() {
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [GLOBAL_FLAG_KEY]
    );
    if (!result.rows.length) {
      return { readOk: true, enabled: false, rowPresent: false };
    }
    return {
      readOk: true,
      enabled: result.rows[0].enabled === true,
      rowPresent: true,
    };
  } catch (err) {
    console.error(`[${READ_FAILED_CODE}]`, err.message);
    return { readOk: false, enabled: false, rowPresent: false };
  }
}

module.exports = {
  GLOBAL_FLAG_KEY,
  READ_FAILED_CODE,
  isEnglishAppGlobalEnabled,
  getEnglishGlobalAvailabilityReadiness,
  readEnglishAppGlobalFlagState,
};
