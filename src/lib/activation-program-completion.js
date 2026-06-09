/**
 * Child/parent completion hooks for activation program.
 */

const programDb = require('../../db/parent-activation-program');
const seenDb = require('../../db/parent-seen-completion');
const {
  getEffectiveProgramDay,
} = require('./activation-program');
const analytics = require('./activation-program-analytics');

/**
 * Emit child_first_completion on first child check-off after program start.
 */
async function maybeTrackChildFirstCompletion(familyId, childId, dailyLogItemId, activityName) {
  try {
    const program = await programDb.getActiveByFamily(familyId);
    if (!program) return;

    const count = await seenDb.countChildCompletionsSince(familyId, program.started_at);
    if (count !== 1) return;

    const timezone = await programDb.getFamilyTimezone(familyId);
    const effectiveDay = getEffectiveProgramDay(program, timezone);

    analytics.trackChildFirstCompletion(familyId, {
      child_id: childId,
      daily_log_item_id: dailyLogItemId,
      activity_name: activityName,
      effective_day: effectiveDay,
      program_type: program.program_type,
    });
  } catch (err) {
    console.error('[activation] child_first_completion failed:', err.message);
  }
}

module.exports = { maybeTrackChildFirstCompletion };
