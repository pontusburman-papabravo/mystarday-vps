'use strict';

const db = require('./db');
const { reconcileP0State } = require('./activation-p0-core');

const PARENT_EMAIL_CONSTRAINT = 'parent_email_lower_idx';
const WEEKLY_SCHEDULE_DOW_CONSTRAINT = 'idx_weekly_schedule_child_dow_variant';

/**
 * Atomically set first_completion_at when still null (same DB transaction as completion).
 * @param {import('pg').PoolClient} client
 * @param {string} familyId
 * @returns {Promise<boolean>} true when this call newly set first_completion_at
 */
async function tryAtomicFirstCompletionInTx(client, familyId) {
  if (!familyId) return false;

  await client.query(
    `INSERT INTO family_activation_state (family_id, signup_at, activation_variant)
     VALUES ($1, NOW(), 'legacy')
     ON CONFLICT (family_id) DO NOTHING`,
    [familyId]
  );

  const upd = await client.query(
    `UPDATE family_activation_state
     SET first_completion_at = COALESCE(first_completion_at, NOW()),
         updated_at = NOW()
     WHERE family_id = $1 AND first_completion_at IS NULL
     RETURNING family_id, signup_at, child_created_at, schema_saved_at,
               child_access_completed_at, first_completion_at, p0_activated_at`,
    [familyId]
  );
  if (upd.rows.length === 0) return false;

  const state = upd.rows[0];
  const reconciled = reconcileP0State(state, new Date());
  if (reconciled.p0ActivatedAt && !state.p0_activated_at) {
    await client.query(
      `UPDATE family_activation_state
       SET p0_activated_at = $2,
           p0_activated_within_48h = $3,
           updated_at = NOW()
       WHERE family_id = $1`,
      [familyId, reconciled.p0ActivatedAt, reconciled.p0ActivatedWithin48h]
    );
  }
  return true;
}

/**
 * Post-commit side effects for a newly recorded first completion.
 * @param {string} familyId
 * @param {object} metadata
 */
function emitFirstCompletionRecorded(familyId, metadata = {}) {
  if (!familyId) return;
  try {
    require('../../db/analytics').track(familyId, 'first_completion_recorded', metadata);
  } catch (err) {
    console.error('[ACTIVATION-P0] first_completion_recorded analytics failed:', err.message);
  }
}

function isParentEmailUniqueViolation(err) {
  return err?.code === '23505' && String(err.constraint || '') === PARENT_EMAIL_CONSTRAINT;
}

function isWeeklyScheduleDowUniqueViolation(err) {
  return err?.code === '23505' && String(err.constraint || '') === WEEKLY_SCHEDULE_DOW_CONSTRAINT;
}

/**
 * @deprecated Use tryAtomicFirstCompletionInTx inside the completion transaction.
 */
async function maybeRecordFirstCompletion(familyId, metadata = {}) {
  if (!familyId) return false;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const newly = await tryAtomicFirstCompletionInTx(client, familyId);
    await client.query('COMMIT');
    if (newly) emitFirstCompletionRecorded(familyId, metadata);
    return newly;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ACTIVATION-P0] maybeRecordFirstCompletion error:', err.message);
    return false;
  } finally {
    client.release();
  }
}

module.exports = {
  tryAtomicFirstCompletionInTx,
  emitFirstCompletionRecorded,
  maybeRecordFirstCompletion,
  isParentEmailUniqueViolation,
  isWeeklyScheduleDowUniqueViolation,
  PARENT_EMAIL_CONSTRAINT,
  WEEKLY_SCHEDULE_DOW_CONSTRAINT,
};
