/**
 * Activation program aha-moment logic (Fas 2).
 * Invariants: docs/activation-program-invariants.md
 */

const db = require('./db');
const { getEffectiveProgramDay } = require('./activation-program');
const analytics = require('../../db/analytics');

const CHILD_FIRST_COMPLETION = 'child_first_completion';
const PARENT_FIRST_COMPLETION_SEEN = 'parent_first_completion_seen';

function computeHoursSinceCompletion(completedAt, now = new Date()) {
  if (!completedAt) return 0;
  const completed = completedAt instanceof Date ? completedAt : new Date(completedAt);
  const ms = now.getTime() - completed.getTime();
  const hours = Math.max(ms / 3_600_000, 0);
  return Math.round(hours * 10) / 10;
}

async function hasProgramAnalyticsEvent(familyId, eventType, programId, client = db) {
  const result = await client.query(
    `SELECT 1 FROM analytics_events
     WHERE family_id = $1
       AND event_type = $2
       AND metadata->>'program_id' = $3
     LIMIT 1`,
    [familyId, eventType, String(programId)]
  );
  return result.rows.length > 0;
}

async function getFamilyTimezone(familyId, client = db) {
  const result = await client.query(
    'SELECT timezone FROM family WHERE id = $1',
    [familyId]
  );
  return result.rows[0]?.timezone || 'Europe/Stockholm';
}

/**
 * Fire-and-forget: first child completion per program run (invariant #8).
 * Called from child check-off path only.
 */
async function maybeTrackChildFirstCompletion({
  familyId,
  program,
  childId,
  dailyLogItemId,
  activityName,
  timezone,
}, client = db) {
  if (!familyId || !program?.id) return false;

  const already = await hasProgramAnalyticsEvent(
    familyId,
    CHILD_FIRST_COMPLETION,
    program.id,
    client
  );
  if (already) return false;

  const tz = timezone || await getFamilyTimezone(familyId, client);
  const effectiveDay = getEffectiveProgramDay(program, tz);

  await analytics.track(familyId, CHILD_FIRST_COMPLETION, {
    program_id: String(program.id),
    child_id: String(childId),
    daily_log_item_id: String(dailyLogItemId),
    activity_name: activityName,
    effective_day: effectiveDay,
    program_type: program.program_type,
  });
  return true;
}

async function listUnseenCompletions(parentId, familyId, client = db) {
  const result = await client.query(
    `SELECT dli.id AS daily_log_item_id,
            dli.name AS activity_name,
            dli.completed_at,
            c.id AS child_id,
            c.name AS child_name
     FROM daily_log_item dli
     JOIN daily_log dl ON dl.id = dli.daily_log_id
     JOIN child c ON c.id = dl.child_id
     WHERE c.family_id = $1
       AND dli.completed = true
       AND dli.completed_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM parent_seen_completion psc
         WHERE psc.parent_id = $2 AND psc.daily_log_item_id = dli.id
       )
     ORDER BY dli.completed_at ASC`,
    [familyId, parentId]
  );
  return result.rows;
}

/**
 * Emit parent_first_completion_seen once per program (invariant #9).
 */
async function maybeTrackParentFirstCompletionSeen({
  familyId,
  program,
  childId,
  dailyLogItemId,
  activityName,
  completedAt,
  timezone,
}, client = db) {
  if (!familyId || !program?.id) return false;

  const already = await hasProgramAnalyticsEvent(
    familyId,
    PARENT_FIRST_COMPLETION_SEEN,
    program.id,
    client
  );
  if (already) return false;

  const tz = timezone || await getFamilyTimezone(familyId, client);
  const effectiveDay = getEffectiveProgramDay(program, tz);

  await analytics.track(familyId, PARENT_FIRST_COMPLETION_SEEN, {
    program_id: String(program.id),
    child_id: String(childId),
    daily_log_item_id: String(dailyLogItemId),
    activity_name: activityName,
    effective_day: effectiveDay,
    hours_since_completion: computeHoursSinceCompletion(completedAt),
    program_type: program.program_type,
  });
  return true;
}

function mapCompletionRow(row, now = new Date()) {
  return {
    daily_log_item_id: row.daily_log_item_id,
    child_id: row.child_id,
    child_name: row.child_name,
    activity_name: row.activity_name,
    hours_since_completion: computeHoursSinceCompletion(row.completed_at, now),
  };
}

module.exports = {
  CHILD_FIRST_COMPLETION,
  PARENT_FIRST_COMPLETION_SEEN,
  computeHoursSinceCompletion,
  hasProgramAnalyticsEvent,
  getFamilyTimezone,
  maybeTrackChildFirstCompletion,
  listUnseenCompletions,
  maybeTrackParentFirstCompletionSeen,
  mapCompletionRow,
};
