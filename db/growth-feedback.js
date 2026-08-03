'use strict';

const db = require('../src/lib/db');

const VALID_PROMPT_KEYS = new Set([
  'first_value',
  'three_routine_days',
  'stuck_blocker',
  'onboarding_no_child_access',
  'account_delete',
]);

async function hasAnswered(familyId, promptKey) {
  const result = await db.query(
    `SELECT 1 FROM family_growth_feedback
     WHERE family_id = $1 AND prompt_key = $2
     LIMIT 1`,
    [familyId, promptKey]
  );
  return result.rowCount > 0;
}

async function listAnsweredPromptKeys(familyId) {
  const result = await db.query(
    `SELECT prompt_key FROM family_growth_feedback WHERE family_id = $1`,
    [familyId]
  );
  return result.rows.map((r) => r.prompt_key);
}

/**
 * Insert feedback once per (family, prompt). Idempotent on conflict.
 * @returns {Promise<object|null>} inserted row or null if duplicate
 */
async function insertFeedback({
  familyId,
  promptKey,
  answer,
  comment = null,
  context = {},
  locale = null,
  platform = null,
}) {
  if (!VALID_PROMPT_KEYS.has(promptKey)) {
    throw new Error('invalid_prompt_key');
  }
  const result = await db.query(
    `INSERT INTO family_growth_feedback (
       family_id, prompt_key, answer, comment, context, locale, platform
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (family_id, prompt_key) DO NOTHING
     RETURNING id, family_id, prompt_key, answer, created_at`,
    [
      familyId,
      promptKey,
      answer,
      comment,
      JSON.stringify(context || {}),
      locale,
      platform,
    ]
  );
  return result.rows[0] || null;
}

module.exports = {
  VALID_PROMPT_KEYS,
  hasAnswered,
  listAnsweredPromptKeys,
  insertFeedback,
};
