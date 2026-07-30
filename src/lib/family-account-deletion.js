'use strict';

/**
 * Transactional family teardown for DELETE /api/family/delete-account.
 * Table names for dynamic deletes are allowlisted only.
 */

const { deleteAvatarsForFamily } = require('./avatar-service');

/** Present in code before baseline/migrations; safe to skip if never created (prod drift). */
const OPTIONAL_CHILD_SCOPED_TABLES = new Set(['pin_notification_log']);

const CHILD_SCOPED_TABLES = [
  'pin_lockout',
  'pin_notification_log',
  'pin_audit_log',
];

async function tableExists(client, tableName) {
  const result = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.exists);
}

async function deleteChildScopedTable(client, tableName, familyId) {
  if (!CHILD_SCOPED_TABLES.includes(tableName)) {
    throw new Error(`deleteChildScopedTable: table not allowlisted: ${tableName}`);
  }
  if (OPTIONAL_CHILD_SCOPED_TABLES.has(tableName) && !(await tableExists(client, tableName))) {
    return;
  }
  await client.query(
    `DELETE FROM ${tableName} WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
}

/**
 * Delete all family-owned rows. Caller must BEGIN/COMMIT and pass the same client.
 */
async function deleteFamilyAccountData(client, familyId) {
  await client.query(
    `
      DELETE FROM rating WHERE daily_log_item_id IN (
        SELECT dli.id FROM daily_log_item dli
        JOIN daily_log dl ON dli.daily_log_id = dl.id
        JOIN child c ON dl.child_id = c.id WHERE c.family_id = $1
      )`,
    [familyId]
  );
  await client.query(
    `
      DELETE FROM daily_log_item WHERE daily_log_id IN (
        SELECT dl.id FROM daily_log dl JOIN child c ON dl.child_id = c.id
        WHERE c.family_id = $1
      )`,
    [familyId]
  );
  await client.query(`DELETE FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [
    familyId,
  ]);

  await client.query(
    `DELETE FROM reward_redemption WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)`,
    [familyId]
  );

  await client.query(
    `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
      SELECT ws.id FROM weekly_schedule ws JOIN child c ON ws.child_id = c.id WHERE c.family_id = $1
    )`,
    [familyId]
  );
  await client.query(`DELETE FROM weekly_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [
    familyId,
  ]);
  await client.query(
    `DELETE FROM special_day_schedule_item WHERE special_day_schedule_id IN (
      SELECT sds.id FROM special_day_schedule sds JOIN child c ON sds.child_id = c.id WHERE c.family_id = $1
    )`,
    [familyId]
  );
  await client.query(
    `DELETE FROM special_day_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );

  await client.query(`DELETE FROM streak WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM parent_note WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [
    familyId,
  ]);
  await client.query(`DELETE FROM pedagog_notes WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [
    familyId,
  ]);
  await client.query(
    `DELETE FROM child_observation WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(`DELETE FROM general_observations WHERE family_id = $1`, [familyId]);

  await client.query(`DELETE FROM reward WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM activity_template WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM category WHERE family_id = $1`, [familyId]);

  for (const table of CHILD_SCOPED_TABLES) {
    await deleteChildScopedTable(client, table, familyId);
  }

  await client.query(`DELETE FROM family_invite WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM pedagog_invite WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM professional_share_link WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM system_messages WHERE family_id = $1`, [familyId]);
  await client.query(
    `DELETE FROM win_back_email_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM push_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM notification_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM email_verification WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM password_reset WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM notification_preference WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM parent_child WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`,
    [familyId]
  );
  await client.query(
    `DELETE FROM email_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`,
    [familyId]
  );

  await deleteAvatarsForFamily(familyId);

  await client.query(`DELETE FROM child WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM parent WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM family WHERE id = $1`, [familyId]);
}

module.exports = {
  deleteFamilyAccountData,
  deleteChildScopedTable,
  OPTIONAL_CHILD_SCOPED_TABLES,
};
