'use strict';

const db = require('./db');

const FLAG_KEY = 'trusted_device_v1';

async function isTrustedDeviceEnabled(familyId) {
  try {
    const global = await db.query(
      'SELECT enabled FROM feature_flag WHERE key = $1',
      [FLAG_KEY]
    );
    if (!global.rows[0]?.enabled) return false;
    if (!familyId) return true;
    const override = await db.query(
      `SELECT enabled FROM family_feature_override
       WHERE family_id = $1 AND feature_key = $2`,
      [familyId, FLAG_KEY]
    );
    if (override.rows[0]) return override.rows[0].enabled === true;
    return true;
  } catch (err) {
    console.error('[TRUSTED-DEVICE] flag check failed:', err.message);
    return false;
  }
}

module.exports = {
  FLAG_KEY,
  isTrustedDeviceEnabled,
};
