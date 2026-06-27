'use strict';

const db = require('./db');

const FLAG_KEY = 'first_success_engine_api';

/**
 * Engine API kill switch. Default ON when flag row missing.
 * When OFF, clients should fall back to /api/family/readiness.
 * @param {string} [familyId]
 */
async function isEngineApiEnabled(_familyId) {
  if (process.env.FIRST_SUCCESS_ENGINE_API === 'false') return false;
  try {
    const result = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1',
      [FLAG_KEY]
    );
    if (!result.rows[0]) return true;
    return Boolean(result.rows[0].enabled);
  } catch (err) {
    console.error('[first-success-engine-flag] DB error, defaulting enabled:', err.message);
    return true;
  }
}

module.exports = {
  FLAG_KEY,
  isEngineApiEnabled,
};
