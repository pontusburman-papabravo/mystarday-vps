'use strict';

const db = require('./db');

const FLAG_NATIVE = 'native_widget_enabled';
const FLAG_COMPLETION = 'widget_completion_enabled';

async function isFlagEnabled(key, familyId) {
  try {
    const global = await db.query('SELECT enabled FROM feature_flag WHERE key = $1', [key]);
    if (!global.rows[0]?.enabled) return false;
    if (!familyId) return true;
    const override = await db.query(
      `SELECT enabled FROM family_feature_override
       WHERE family_id = $1 AND feature_key = $2`,
      [familyId, key]
    );
    if (override.rows[0]) return override.rows[0].enabled === true;
    return true;
  } catch (err) {
    console.error('[WIDGET] flag check failed:', key, err.message);
    return false;
  }
}

async function isNativeWidgetEnabled(familyId) {
  return isFlagEnabled(FLAG_NATIVE, familyId);
}

async function isWidgetCompletionEnabled(familyId) {
  const nativeOn = await isNativeWidgetEnabled(familyId);
  if (!nativeOn) return false;
  return isFlagEnabled(FLAG_COMPLETION, familyId);
}

module.exports = {
  FLAG_NATIVE,
  FLAG_COMPLETION,
  isNativeWidgetEnabled,
  isWidgetCompletionEnabled,
};
