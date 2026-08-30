'use strict';

const familyDeletion = require('./family-deletion');
const { lockParentChildRowsForChildren } = require('./family-member-children-authz');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DENIED = {
  ok: false,
  status: 403,
  error: 'Åtkomst nekad. Du har inte behörighet att ta bort barnet.',
};

const NOT_FOUND = {
  ok: false,
  status: 404,
  error: 'Barn hittades inte',
};

/**
 * Active primary link to THIS child. Historical/revoked/shared/pedagog/other-child
 * roles do not authorize.
 * @param {import('pg').PoolClient} client
 */
async function callerHasActivePrimaryForChild(client, parentId, childId) {
  const { rows } = await client.query(
    `SELECT 1 FROM parent_child
     WHERE parent_id = $1
       AND child_id = $2
       AND role = 'primary'
       AND revoked_at IS NULL`,
    [parentId, childId]
  );
  return rows.length > 0;
}

/**
 * Capture the child's avatar object key before destructive row deletes.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<string|null>}
 */
async function collectChildAvatarStorageKey(client, childId) {
  const { rows } = await client.query(
    `SELECT avatar_storage_key FROM child
     WHERE id = $1 AND avatar_storage_key IS NOT NULL`,
    [childId]
  );
  return rows[0]?.avatar_storage_key || null;
}

/**
 * Hard-delete child-owned rows. Avatars are not deleted here.
 * Union of both previous DELETE paths plus child-scoped tables those paths
 * omitted that would fail FK checks or leave child-owned data.
 * @param {import('pg').PoolClient} client
 */
async function hardDeleteChildData(client, childId) {
  await client.query(
    `DELETE FROM rating WHERE daily_log_item_id IN (
       SELECT dli.id FROM daily_log_item dli
       JOIN daily_log dl ON dl.id = dli.daily_log_id
       WHERE dl.child_id = $1
     )`,
    [childId]
  );
  await client.query(
    `DELETE FROM daily_log_item WHERE daily_log_id IN (
       SELECT id FROM daily_log WHERE child_id = $1
     )`,
    [childId]
  );
  await client.query('DELETE FROM daily_log WHERE child_id = $1', [childId]);

  await client.query('DELETE FROM reward_redemption WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM streak WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM parent_note WHERE child_id = $1', [childId]);

  await client.query(
    `DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
       SELECT id FROM weekly_schedule WHERE child_id = $1
     )`,
    [childId]
  );
  await client.query('DELETE FROM weekly_schedule WHERE child_id = $1', [childId]);

  await client.query(
    `DELETE FROM special_day_schedule_item WHERE special_day_schedule_id IN (
       SELECT id FROM special_day_schedule WHERE child_id = $1
     )`,
    [childId]
  );
  await client.query('DELETE FROM special_day_schedule WHERE child_id = $1', [childId]);

  await client.query('DELETE FROM pedagog_notes WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM child_observation WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM pin_lockout WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM pin_notification_log WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM pin_audit_log WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM schedule_date_exclusion WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM professional_share_link WHERE child_id = $1', [childId]);

  await client.query('DELETE FROM parent_child WHERE child_id = $1', [childId]);
  await client.query('DELETE FROM child WHERE id = $1', [childId]);
}

/**
 * Pending invites store child UUIDs in arrays with no FK. Empty family
 * child_ids means "all remaining children" on accept — never leave that
 * after deleting the only invited child. Accepted rows are left alone.
 * @param {import('pg').PoolClient} client
 */
async function cleanupPendingInviteChildRefs(client, childId) {
  await client.query(
    `SELECT id FROM family_invite
     WHERE accepted = false AND $1::uuid = ANY(child_ids)
     ORDER BY id
     FOR UPDATE`,
    [childId]
  );
  await client.query(
    `SELECT id FROM pedagog_invite
     WHERE accepted = false AND $1::uuid = ANY(child_ids)
     ORDER BY id
     FOR UPDATE`,
    [childId]
  );

  await client.query(
    `UPDATE family_invite
     SET child_ids = array_remove(child_ids, $1::uuid)
     WHERE accepted = false
       AND $1::uuid = ANY(child_ids)
       AND cardinality(array_remove(child_ids, $1::uuid)) > 0`,
    [childId]
  );
  await client.query(
    `DELETE FROM family_invite
     WHERE accepted = false
       AND $1::uuid = ANY(child_ids)
       AND cardinality(array_remove(child_ids, $1::uuid)) = 0`,
    [childId]
  );

  await client.query(
    `UPDATE pedagog_invite
     SET child_ids = array_remove(child_ids, $1::uuid)
     WHERE accepted = false
       AND $1::uuid = ANY(child_ids)
       AND cardinality(array_remove(child_ids, $1::uuid)) > 0`,
    [childId]
  );
  await client.query(
    `DELETE FROM pedagog_invite
     WHERE accepted = false
       AND $1::uuid = ANY(child_ids)
       AND cardinality(array_remove(child_ids, $1::uuid)) = 0`,
    [childId]
  );
}

/**
 * Transaction-scoped child deletion. Caller owns the client and must COMMIT
 * only via this function. Denied/not-found paths ROLLBACK.
 *
 * @param {import('pg').PoolClient} client
 * @param {{ callerParentId: string, callerFamilyId: string, childId: string }} args
 */
async function performChildDeletionInTransaction(client, { callerParentId, callerFamilyId, childId }) {
  if (!UUID_RE.test(String(childId || '')) || !callerParentId || !callerFamilyId) {
    return { ...NOT_FOUND };
  }

  await client.query('BEGIN');
  try {
    const childResult = await client.query(
      'SELECT id, family_id FROM child WHERE id = $1 FOR UPDATE',
      [childId]
    );
    if (childResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ...NOT_FOUND };
    }
    if (childResult.rows[0].family_id !== callerFamilyId) {
      await client.query('ROLLBACK');
      return { ...NOT_FOUND };
    }

    await lockParentChildRowsForChildren(client, [childId]);

    const authorized = await callerHasActivePrimaryForChild(client, callerParentId, childId);
    if (!authorized) {
      await client.query('ROLLBACK');
      return { ...DENIED };
    }

    const key = await module.exports.collectChildAvatarStorageKey(client, childId);
    await module.exports.cleanupPendingInviteChildRefs(client, childId);
    await module.exports.hardDeleteChildData(client, childId);
    await client.query('COMMIT');
    return {
      ok: true,
      status: 200,
      capturedAvatarKeys: key ? [key] : [],
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function cleanupAvatarStorageKeysAfterCommit(keys) {
  return familyDeletion.cleanupAvatarStorageKeysAfterCommit(keys);
}

module.exports = {
  callerHasActivePrimaryForChild,
  collectChildAvatarStorageKey,
  cleanupPendingInviteChildRefs,
  hardDeleteChildData,
  performChildDeletionInTransaction,
  cleanupAvatarStorageKeysAfterCommit,
};
