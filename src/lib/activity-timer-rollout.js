'use strict';

/**
 * Dark launch: aktivitetstimer v2 (helskärm, paus) endast för allowlistade familjer.
 * Default: pontus@burman.cc (founder). Sätt ACTIVITY_TIMER_V2_DISABLED=true för kill switch.
 */

const DEFAULT_ALLOWLIST = 'pontus@burman.cc';

function getAllowlist() {
  const raw = process.env.ACTIVITY_TIMER_V2_ALLOWLIST || DEFAULT_ALLOWLIST;
  return raw
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

function isRolloutDisabled() {
  return process.env.ACTIVITY_TIMER_V2_DISABLED === 'true';
}

async function familyHasActivityTimerV2(familyId) {
  if (!familyId || isRolloutDisabled()) return false;
  const allowlist = getAllowlist();
  if (!allowlist.length) return false;
  const db = require('./db');
  const result = await db.query(
    `SELECT 1 FROM parent
     WHERE family_id = $1 AND LOWER(email) = ANY($2::text[])
     LIMIT 1`,
    [familyId, allowlist]
  );
  return result.rows.length > 0;
}

module.exports = {
  getAllowlist,
  familyHasActivityTimerV2,
  isRolloutDisabled,
};
