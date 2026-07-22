'use strict';

const db = require('./db');
const { recordActivationMilestone } = require('./activation-p0');

/**
 * Record P0 first completion when family has no prior completed items.
 * @returns {Promise<boolean>} true when first_completion_at was newly written
 */
async function maybeRecordFirstCompletion(familyId, metadata = {}) {
  if (!familyId) return false;
  try {
    const prior = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId]
    );
    if ((prior.rows[0]?.n || 0) !== 1) return false;
    const { newlyRecorded } = await recordActivationMilestone(familyId, 'first_completion', {
      metadata,
    });
    return newlyRecorded;
  } catch (err) {
    console.error('[ACTIVATION-P0] maybeRecordFirstCompletion error:', err.message);
    return false;
  }
}

module.exports = { maybeRecordFirstCompletion };
