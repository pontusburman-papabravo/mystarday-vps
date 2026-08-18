'use strict';

const db = require('../src/lib/db');

async function getByFamilyId(familyId) {
  const result = await db.query(
    `SELECT family_id, signup_at, child_created_at, schema_saved_at, child_access_completed_at,
            handoff_film_completed_at,
            first_completion_at, p0_activated_at, p0_activated_within_48h,
            activation_variant, step_deferrals, updated_at
     FROM family_activation_state
     WHERE family_id = $1`,
    [familyId]
  );
  return result.rows[0] || null;
}

async function insertState(familyId, signupAt, activationVariant = 'legacy') {
  const result = await db.query(
    `INSERT INTO family_activation_state (family_id, signup_at, activation_variant)
     VALUES ($1, $2, $3)
     ON CONFLICT (family_id) DO NOTHING
     RETURNING family_id, signup_at, child_created_at, schema_saved_at, child_access_completed_at,
               handoff_film_completed_at,
               first_completion_at, p0_activated_at, p0_activated_within_48h,
               activation_variant, step_deferrals, updated_at`,
    [familyId, signupAt, activationVariant]
  );
  if (result.rows[0]) return result.rows[0];
  return getByFamilyId(familyId);
}

async function patchState(familyId, fields) {
  const sets = [];
  const values = [familyId];
  let idx = 2;
  for (const [col, val] of Object.entries(fields)) {
    sets.push(`${col} = $${idx++}`);
    values.push(val);
  }
  sets.push('updated_at = now()');
  const result = await db.query(
    `UPDATE family_activation_state
     SET ${sets.join(', ')}
     WHERE family_id = $1
     RETURNING family_id, signup_at, child_created_at, schema_saved_at, child_access_completed_at,
               handoff_film_completed_at,
               first_completion_at, p0_activated_at, p0_activated_within_48h,
               activation_variant, step_deferrals, updated_at`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Atomically set one activation step defer entry (allowlisted action key only).
 * @param {string} familyId
 * @param {string} actionKey — validated against allowlist before call
 * @param {string} deferredAt ISO timestamp
 * @param {string} until ISO timestamp
 */
async function setStepDeferral(familyId, actionKey, deferredAt, until) {
  const entry = JSON.stringify({ deferred_at: deferredAt, until });
  const result = await db.query(
    `UPDATE family_activation_state
     SET step_deferrals = jsonb_set(
           COALESCE(step_deferrals, '{}'::jsonb),
           ARRAY[$2]::text[],
           $3::jsonb,
           true
         ),
         updated_at = now()
     WHERE family_id = $1
     RETURNING step_deferrals`,
    [familyId, actionKey, entry]
  );
  if (result.rowCount === 0) {
    const fam = await db.query('SELECT created_at FROM family WHERE id = $1', [familyId]);
    if (!fam.rows[0]) return null;
    await insertState(familyId, fam.rows[0].created_at);
    const retry = await db.query(
      `UPDATE family_activation_state
       SET step_deferrals = jsonb_set(
             COALESCE(step_deferrals, '{}'::jsonb),
             ARRAY[$2]::text[],
             $3::jsonb,
             true
           ),
           updated_at = now()
       WHERE family_id = $1
       RETURNING step_deferrals`,
      [familyId, actionKey, entry]
    );
    return retry.rows[0]?.step_deferrals || null;
  }
  return result.rows[0]?.step_deferrals || null;
}

module.exports = {
  getByFamilyId,
  insertState,
  patchState,
  setStepDeferral,
};
