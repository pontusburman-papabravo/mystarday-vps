'use strict';

const { assertActivityTimerPilotFamily } = require('../../src/lib/activity-timer-pilot-guard');

async function snapshotChildTimerSettings(db, familyId) {
  const { rows } = await db.query(
    `SELECT id, activity_timers_enabled FROM child WHERE family_id = $1 ORDER BY created_at ASC`,
    [familyId]
  );
  return rows.map((r) => ({
    id: r.id,
    activity_timers_enabled: r.activity_timers_enabled === true,
  }));
}

async function restoreChildTimerSettings(db, familyId, email, snapshot) {
  await assertActivityTimerPilotFamily(db, familyId, email);
  for (const row of snapshot || []) {
    await db.query(
      `UPDATE child SET activity_timers_enabled = $1 WHERE id = $2 AND family_id = $3`,
      [!!row.activity_timers_enabled, row.id, familyId]
    );
  }
}

async function deletePilotFamily(db, familyId, email) {
  await assertActivityTimerPilotFamily(db, familyId, email);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const children = await client.query('SELECT id FROM child WHERE family_id = $1', [familyId]);
    for (const child of children.rows) {
      await client.query(
        `DELETE FROM daily_log_item WHERE daily_log_id IN (
           SELECT id FROM daily_log WHERE child_id = $1
         )`,
        [child.id]
      );
      await client.query('DELETE FROM daily_log WHERE child_id = $1', [child.id]);
      await client.query(
        `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
           SELECT id FROM weekly_schedule WHERE child_id = $1
         )`,
        [child.id]
      );
      await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [child.id]);
      await client.query('DELETE FROM streak WHERE child_id = $1', [child.id]);
      await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [child.id]);
    }
    await client.query(
      `DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)
       OR parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
      [familyId]
    );
    await client.query('DELETE FROM child WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM reward WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM activity_template WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM category WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM family_invite WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM family_features WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM family_subscriptions WHERE family_id = $1', [familyId]);
    await client.query(
      'DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)',
      [familyId]
    );
    await client.query('DELETE FROM parent WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM family WHERE id = $1', [familyId]);
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  snapshotChildTimerSettings,
  restoreChildTimerSettings,
  deletePilotFamily,
};
