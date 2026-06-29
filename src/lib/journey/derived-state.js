'use strict';

/**
 * Journey-owned communication state (ADR retention-migration-plan §3).
 * AT_RISK / CHURNED are derived at read time — not stored as journey_phase.
 */

const db = require('../db');
const familyMilestones = require('../../../db/family-milestones');

const PHASE_ORDER = [
  'DISCOVERING',
  'SETTING_UP',
  'FIRST_USE',
  'BUILDING_ROUTINE',
  'ESTABLISHED_ROUTINE',
  'EXPANDING',
  'INDEPENDENCE',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function phaseIndex(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  return idx >= 0 ? idx : PHASE_ORDER.indexOf('SETTING_UP');
}

function wholeDaysBetween(earlier, later) {
  if (!earlier || !later) return null;
  const a = earlier instanceof Date ? earlier : new Date(earlier);
  const b = later instanceof Date ? later : new Date(later);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

async function getActivitySnapshot(familyId, client = db) {
  const result = await client.query(
    `SELECT
       f.created_at AS family_created_at,
       f.journey_phase,
       EXISTS (
         SELECT 1 FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         JOIN child c ON c.id = dl.child_id
         WHERE c.family_id = f.id AND dli.completed = true
       ) AS ever_completed,
       (
         SELECT MAX(COALESCE(dli.completed_at, dli.completed_date::timestamptz))
         FROM daily_log_item dli
         JOIN daily_log dl ON dl.id = dli.daily_log_id
         JOIN child c ON c.id = dl.child_id
         WHERE c.family_id = f.id AND dli.completed = true
       ) AS last_completion_at
     FROM family f
     WHERE f.id = $1 AND f.archived_at IS NULL`,
    [familyId]
  );
  return result.rows[0] || null;
}

/**
 * @param {string} familyId
 * @param {Date} [now]
 * @returns {Promise<{
 *   familyId: string,
 *   phase: string,
 *   state: string,
 *   everCompleted: boolean,
 *   lastCompletionAt: Date|null,
 *   daysSinceCompletion: number|null,
 *   daysSinceSignup: number|null,
 * }|null>}
 */
async function getFamilyCommunicationState(familyId, now = new Date(), client = db) {
  if (!familyId) return null;

  const snap = await getActivitySnapshot(familyId, client);
  if (!snap) return null;

  const phase = snap.journey_phase
    || (await familyMilestones.getJourneyPhase(familyId, client));

  const everCompleted = snap.ever_completed === true;
  const lastCompletionAt = snap.last_completion_at
    ? new Date(snap.last_completion_at)
    : null;
  const daysSinceCompletion = lastCompletionAt
    ? wholeDaysBetween(lastCompletionAt, now)
    : null;
  const daysSinceSignup = wholeDaysBetween(snap.family_created_at, now);

  const buildingOrLater = phaseIndex(phase) >= phaseIndex('BUILDING_ROUTINE');

  const neverCompletedChurned = !everCompleted && daysSinceSignup != null && daysSinceSignup >= 30;

  const atRisk = (everCompleted || buildingOrLater)
    && (daysSinceCompletion == null || daysSinceCompletion >= 7);

  const churned = neverCompletedChurned
    || (atRisk && daysSinceCompletion != null && daysSinceCompletion >= 30);

  let state = phase;
  if (churned) state = 'CHURNED';
  else if (atRisk) state = 'AT_RISK';

  return {
    familyId,
    phase,
    state,
    everCompleted,
    lastCompletionAt,
    daysSinceCompletion,
    daysSinceSignup,
  };
}

module.exports = {
  PHASE_ORDER,
  phaseIndex,
  wholeDaysBetween,
  getActivitySnapshot,
  getFamilyCommunicationState,
};
