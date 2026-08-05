'use strict';

/**
 * Aktivitetstimer v2 (helskärm, paus) styrs av barnets master `activity_timers_enabled`.
 * `ACTIVITY_TIMER_V2_DISABLED=true` = kill switch (rollback).
 * `familyHasActivityTimerV2` behålls för äldre ops/scripts (founder allowlist).
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

/** Child daily-log: v2 UX when master switch is on (R2). */
function activityTimerV2EnabledForChild(activityTimersEnabled) {
  return activityTimersEnabled === true && !isRolloutDisabled();
}

module.exports = {
  getAllowlist,
  familyHasActivityTimerV2,
  activityTimerV2EnabledForChild,
  isRolloutDisabled,
};
