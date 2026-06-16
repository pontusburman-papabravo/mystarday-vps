'use strict';

const db = require('../src/lib/db');
const { FOR_DIG_GOALS, INTENT_LABELS } = require('../src/lib/for-dig-config');

const OUTCOME_EMOJI = { 4: '😊', 3: '🙂', 2: '😐', 1: '🙁' };

async function insertFeedback({
  familyId,
  parentId,
  childId,
  goalSlug,
  phase,
  intentReason,
  outcomeScore,
  freeText,
}) {
  if (phase === 'outcome' && freeText) {
    const existing = await db.query(
      `SELECT id FROM for_dig_goal_feedback
       WHERE family_id = $1 AND child_id = $2 AND goal_slug = $3 AND phase = 'outcome'`,
      [familyId, childId, goalSlug]
    );
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE for_dig_goal_feedback
         SET outcome_score = COALESCE($1, outcome_score), free_text = COALESCE($2, free_text)
         WHERE id = $3`,
        [outcomeScore, freeText || null, existing.rows[0].id]
      );
      return existing.rows[0].id;
    }
  }

  const result = await db.query(
    `INSERT INTO for_dig_goal_feedback
       (family_id, parent_id, child_id, goal_slug, phase, intent_reason, outcome_score, free_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      familyId,
      parentId,
      childId || null,
      goalSlug,
      phase,
      intentReason || null,
      outcomeScore || null,
      freeText || null,
    ]
  );
  return result.rows[0].id;
}

async function clearFeedbackForReactivation(familyId, childId, goalSlug) {
  await db.query(
    `DELETE FROM for_dig_goal_feedback
     WHERE family_id = $1 AND child_id = $2 AND goal_slug = $3
       AND phase IN ('intent', 'outcome')`,
    [familyId, childId, goalSlug]
  );
}

async function logInstall(goalSlug, familyId, childId) {
  await db.query(
    `INSERT INTO for_dig_goal_install (goal_slug, family_id, child_id, installed_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (goal_slug, family_id, child_id)
     DO UPDATE SET installed_at = NOW()`,
    [goalSlug, familyId, childId]
  );
}

async function getInstallsForFamily(familyId) {
  const result = await db.query(
    `SELECT goal_slug, child_id, installed_at
     FROM for_dig_goal_install
     WHERE family_id = $1`,
    [familyId]
  );
  return result.rows;
}

async function getPopularGoals(days = 90, minCount = 5) {
  const result = await db.query(
    `SELECT goal_slug, COUNT(DISTINCT family_id)::int AS install_count
     FROM for_dig_goal_install
     WHERE installed_at >= NOW() - ($1::int || ' days')::interval
     GROUP BY goal_slug
     HAVING COUNT(DISTINCT family_id) >= $2
     ORDER BY install_count DESC`,
    [days, minCount]
  );
  return result.rows;
}

async function getPendingOutcomes(familyId, parentId) {
  const result = await db.query(
    `SELECT i.goal_slug, i.child_id, i.installed_at AS activated_at,
            c.name AS child_name
     FROM for_dig_goal_install i
     JOIN child c ON c.id = i.child_id
     JOIN parent_child pc ON pc.child_id = c.id AND pc.parent_id = $2 AND pc.revoked_at IS NULL
     WHERE i.family_id = $1
       AND i.installed_at <= NOW() - INTERVAL '7 days'
       AND EXISTS (
         SELECT 1 FROM for_dig_goal_feedback f
         WHERE f.family_id = i.family_id
           AND f.child_id = i.child_id
           AND f.goal_slug = i.goal_slug
           AND f.phase = 'intent'
       )
       AND NOT EXISTS (
         SELECT 1 FROM for_dig_goal_feedback f
         WHERE f.family_id = i.family_id
           AND f.child_id = i.child_id
           AND f.goal_slug = i.goal_slug
           AND f.phase = 'outcome'
       )
     ORDER BY i.installed_at ASC
     LIMIT 5`,
    [familyId, parentId]
  );

  return result.rows.map((row) => {
    const goal = FOR_DIG_GOALS.find((g) => g.slug === row.goal_slug);
    return {
      goal_slug: row.goal_slug,
      goal_title: goal ? goal.title : row.goal_slug,
      child_id: row.child_id,
      child_name: row.child_name,
      activated_at: row.activated_at,
    };
  });
}

async function getAdminStats() {
  const goals = [];
  for (const goal of FOR_DIG_GOALS) {
    const stats = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE phase = 'intent')::int AS intent_count,
         COUNT(*) FILTER (WHERE phase = 'outcome')::int AS outcome_count,
         COUNT(*) FILTER (WHERE phase = 'suggestion')::int AS suggestion_count,
         COUNT(*) FILTER (WHERE phase = 'outcome' AND outcome_score >= 3)::int AS outcome_positive,
         COUNT(*) FILTER (WHERE phase = 'outcome' AND outcome_score = 2)::int AS outcome_neutral,
         COUNT(*) FILTER (WHERE phase = 'outcome' AND outcome_score = 1)::int AS outcome_negative
       FROM for_dig_goal_feedback
       WHERE goal_slug = $1`,
      [goal.slug]
    );

    const intentBreakdown = await db.query(
      `SELECT intent_reason, COUNT(*)::int AS count
       FROM for_dig_goal_feedback
       WHERE goal_slug = $1 AND phase = 'intent' AND intent_reason IS NOT NULL
       GROUP BY intent_reason`,
      [goal.slug]
    );

    const breakdown = {};
    for (const row of intentBreakdown.rows) {
      breakdown[row.intent_reason] = row.count;
    }

    const installCount = await db.query(
      `SELECT COUNT(DISTINCT family_id)::int AS count
       FROM for_dig_goal_install
       WHERE goal_slug = $1
         AND installed_at >= NOW() - INTERVAL '90 days'`,
      [goal.slug]
    );

    goals.push({
      slug: goal.slug,
      title: goal.title,
      icon: goal.icon,
      intent_count: stats.rows[0].intent_count,
      outcome_count: stats.rows[0].outcome_count,
      suggestion_count: stats.rows[0].suggestion_count,
      outcome_positive: stats.rows[0].outcome_positive,
      outcome_neutral: stats.rows[0].outcome_neutral,
      outcome_negative: stats.rows[0].outcome_negative,
      intent_breakdown: breakdown,
      install_count_90d: installCount.rows[0].count,
    });
  }

  const totals = await db.query(
    `SELECT
       COUNT(DISTINCT family_id)::int AS families_with_feedback,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS responses_7d
     FROM for_dig_goal_feedback`
  );

  return {
    goals,
    totals: totals.rows[0] || { families_with_feedback: 0, responses_7d: 0 },
  };
}

async function listResponses({ goalSlug, phase, outcomeMin, limit = 50, offset = 0 }) {
  const conditions = ['1=1'];
  const values = [];
  let idx = 1;

  if (goalSlug) {
    conditions.push(`f.goal_slug = $${idx++}`);
    values.push(goalSlug);
  }
  if (phase) {
    conditions.push(`f.phase = $${idx++}`);
    values.push(phase);
  }
  if (outcomeMin) {
    conditions.push(`f.outcome_score >= $${idx++}`);
    values.push(parseInt(outcomeMin, 10));
  }

  values.push(limit, offset);

  const result = await db.query(
    `SELECT f.id, f.created_at, f.goal_slug, f.phase, f.intent_reason,
            f.outcome_score, f.free_text, f.child_id, f.family_id,
            c.name AS child_name, c.birthday AS child_birthday,
            COALESCE(p.name, '(inget namn)') AS parent_name,
            p.email AS parent_email
     FROM for_dig_goal_feedback f
     LEFT JOIN child c ON c.id = f.child_id
     LEFT JOIN parent p ON p.id = f.parent_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM for_dig_goal_feedback f WHERE ${conditions.join(' AND ')}`,
    values.slice(0, -2)
  );

  const rows = result.rows.map((row) => {
    const goal = FOR_DIG_GOALS.find((g) => g.slug === row.goal_slug);
    let childAge = null;
    if (row.child_birthday) {
      const b = new Date(row.child_birthday);
      const today = new Date();
      childAge = today.getFullYear() - b.getFullYear();
    }
    return {
      id: row.id,
      created_at: row.created_at,
      goal_slug: row.goal_slug,
      goal_title: goal ? goal.title : row.goal_slug,
      phase: row.phase,
      intent_reason: row.intent_reason,
      intent_label: row.intent_reason ? (INTENT_LABELS[row.intent_reason] || row.intent_reason) : null,
      outcome_score: row.outcome_score,
      outcome_emoji: row.outcome_score ? OUTCOME_EMOJI[row.outcome_score] : null,
      free_text: row.free_text,
      child_name: row.child_name,
      child_age: childAge,
      parent_name: row.parent_name,
      parent_email: row.parent_email,
      family_id: row.family_id,
    };
  });

  return { rows, total: countResult.rows[0].total };
}

module.exports = {
  insertFeedback,
  clearFeedbackForReactivation,
  logInstall,
  getInstallsForFamily,
  getPendingOutcomes,
  getAdminStats,
  listResponses,
};
