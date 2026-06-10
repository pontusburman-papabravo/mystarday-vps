'use strict';

/**
 * Family event engine — derives family memory from activity completions.
 * NO UI writes. Called only from server-side completion handlers.
 */
const db = require('./db');
const { featureAccess } = require('./feature-access');

const FEATURE_SLUG = 'familjehallen_v0';

/**
 * Record a family contribution derived from ActivityCompletedEvent.
 * Updates: family_event, family_chest, family_project progress.
 */
async function recordActivityContribution({
  familyId,
  childId,
  childName,
  activityId,
  activityName,
  starValue,
}) {
  if (!familyId) return null;

  const enabled = await featureAccess(familyId, FEATURE_SLUG);
  if (!enabled) return null;

  const stars = Math.max(0, parseInt(starValue, 10) || 0);
  const payload = {
    activityId,
    activityName: activityName || 'Aktivitet',
    starValue: stars,
    childId,
    childName: childName || 'Barn',
  };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO family_event (family_id, child_id, type, payload)
       VALUES ($1, $2, 'activity_contribution', $3)`,
      [familyId, childId, JSON.stringify(payload)]
    );

    if (stars > 0) {
      await client.query(
        `INSERT INTO family_chest (family_id, total_stars, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (family_id) DO UPDATE SET
           total_stars = family_chest.total_stars + EXCLUDED.total_stars,
           updated_at = NOW()`,
        [familyId, stars]
      );
    }

    const projectUpdate = await client.query(
      `UPDATE family_project
       SET current_value = LEAST(target_value, current_value + $2),
           status = CASE
             WHEN current_value + $2 >= target_value THEN 'completed'
             ELSE status
           END,
           updated_at = NOW()
       WHERE family_id = $1 AND status = 'active'
       RETURNING id, title, current_value, target_value, status`,
      [familyId, stars]
    );

    for (const proj of projectUpdate.rows) {
      if (proj.status === 'completed') {
        await client.query(
          `INSERT INTO family_event (family_id, child_id, type, payload)
           VALUES ($1, $2, 'project_completed', $3)`,
          [
            familyId,
            childId,
            JSON.stringify({ projectId: proj.id, title: proj.title }),
          ]
        );
      }
    }

    await client.query('COMMIT');
    return { familyId, starValue: stars, projectsUpdated: projectUpdate.rows.length };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FAMILY-EVENT] recordActivityContribution error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Hook for daily-log completion handlers (child + parent paths).
 * Fire-and-forget safe — logs errors, never throws to caller.
 */
async function handleActivityCompleted(itemId, childId, wasAlreadyCompleted) {
  if (wasAlreadyCompleted) return null;
  try {
    const result = await db.query(
      `SELECT dli.name, dli.star_value, c.family_id, c.name AS child_name
       FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       JOIN child c ON c.id = dl.child_id
       WHERE dli.id = $1 AND dl.child_id = $2`,
      [itemId, childId]
    );
    const row = result.rows[0];
    if (!row?.family_id) return null;
    return await recordActivityContribution({
      familyId: row.family_id,
      childId,
      childName: row.child_name,
      activityId: itemId,
      activityName: row.name,
      starValue: row.star_value,
    });
  } catch (err) {
    console.error('[FAMILY-EVENT] handleActivityCompleted error:', err.message);
    return null;
  }
}

module.exports = {
  recordActivityContribution,
  handleActivityCompleted,
  FEATURE_SLUG,
};
