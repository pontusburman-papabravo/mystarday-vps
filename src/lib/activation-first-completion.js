'use strict';

const db = require('./db');
const { updateActivationState } = require('./activation-p0');

/**
 * Record P0 first completion when family has no prior completed items.
 * Fire-and-forget — never throws.
 */
async function maybeRecordFirstCompletion(familyId, metadata = {}) {
  if (!familyId) return;
  try {
    const prior = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE c.family_id = $1 AND dli.completed = true`,
      [familyId]
    );
    if ((prior.rows[0]?.n || 0) !== 1) return;
    await updateActivationState(familyId, 'first_completion', { metadata });
  } catch (err) {
    console.error('[ACTIVATION-P0] maybeRecordFirstCompletion error:', err.message);
  }
}

module.exports = { maybeRecordFirstCompletion };
