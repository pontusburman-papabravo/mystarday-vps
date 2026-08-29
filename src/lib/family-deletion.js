'use strict';

const avatarStorage = require('./avatar-storage');
const { revokeAllActiveLinksForParent } = require('../../db/parent-child-links');
const { revokeAllRefreshTokens } = require('./refresh-tokens');
const {
  assertAuthorizedMemberDelete,
  lockParentChildRowsForChildren,
  assertNoChildWithoutAdmin,
} = require('./family-member-children-authz');
const { notifyParentAccessRevoked } = require('./parent-access-sse');

/**
 * Distinct parent ids with active primary/shared child links in the family.
 * @param {import('pg').PoolClient} client
 * @param {string} familyId
 * @param {string|null} excludeParentId
 */
async function listAuthorizedAdministrativeAdultIds(client, familyId, excludeParentId = null) {
  const params = [familyId];
  let excludeSql = '';
  if (excludeParentId) {
    params.push(excludeParentId);
    excludeSql = ` AND pc.parent_id <> $${params.length}`;
  }
  const { rows } = await client.query(
    `SELECT DISTINCT pc.parent_id
     FROM parent_child pc
     INNER JOIN child c ON c.id = pc.child_id AND c.family_id = $1
     WHERE pc.revoked_at IS NULL
       AND pc.role IN ('primary', 'shared')${excludeSql}
     ORDER BY pc.parent_id`,
    params
  );
  return rows.map((row) => row.parent_id);
}

/**
 * @param {import('pg').PoolClient} client
 */
async function callerHasAdministrativeAuthority(client, parentId, familyId) {
  const adults = await listAuthorizedAdministrativeAdultIds(client, familyId);
  return adults.includes(parentId);
}

/**
 * Family parents who are not pedagog-only (no active links, or at least one
 * primary/shared). Used only when the family has zero children.
 * @param {{ query: Function }} executor
 */
async function listNonPedagogFamilyParentIds(executor, familyId, excludeParentId = null) {
  const params = [familyId];
  let excludeSql = '';
  if (excludeParentId) {
    params.push(excludeParentId);
    excludeSql = ` AND p.id <> $${params.length}`;
  }
  const { rows } = await executor.query(
    `SELECT p.id
     FROM parent p
     WHERE p.family_id = $1${excludeSql}
       AND NOT (
         EXISTS (
           SELECT 1 FROM parent_child pc
           WHERE pc.parent_id = p.id AND pc.revoked_at IS NULL
         )
         AND NOT EXISTS (
           SELECT 1 FROM parent_child pc
           WHERE pc.parent_id = p.id
             AND pc.revoked_at IS NULL
             AND pc.role IN ('primary', 'shared')
         )
       )
     ORDER BY p.id`,
    params
  );
  return rows.map((row) => row.id);
}

/**
 * Read-only UX consequence for Settings. Execution must re-evaluate in-transaction.
 * @param {{ query: Function }} executor
 * @returns {Promise<{ mode: 'self' | 'family' | 'denied' }>}
 */
async function countFamilyChildren(executor, familyId) {
  const { rows } = await executor.query(
    'SELECT COUNT(*)::int AS n FROM child WHERE family_id = $1',
    [familyId]
  );
  return rows[0]?.n || 0;
}

async function deletionConsequenceForCaller(executor, parentId, familyId) {
  const adults = await listAuthorizedAdministrativeAdultIds(executor, familyId);
  if (adults.includes(parentId)) {
    const otherAdults = adults.filter((id) => id !== parentId);
    return { mode: otherAdults.length === 0 ? 'family' : 'self' };
  }
  if (adults.length > 0) {
    return { mode: 'denied' };
  }
  if (await countFamilyChildren(executor, familyId) > 0) {
    return { mode: 'denied' };
  }
  const holders = await listNonPedagogFamilyParentIds(executor, familyId);
  if (!holders.includes(parentId)) {
    return { mode: 'denied' };
  }
  const otherHolders = holders.filter((id) => id !== parentId);
  return { mode: otherHolders.length === 0 ? 'family' : 'self' };
}

/**
 * Transaction-scoped lock before deciding family vs self vs denied.
 * Locks the family row and all parent_child rows for the family's children
 * (same helper as member-delete) so consequence is evaluated on frozen authority.
 * @param {import('pg').PoolClient} client
 */
async function lockFamilyDeletionAuthority(client, familyId) {
  await client.query('SELECT id FROM family WHERE id = $1 FOR UPDATE', [familyId]);
  const childResult = await client.query(
    'SELECT id FROM child WHERE family_id = $1 ORDER BY id',
    [familyId]
  );
  await lockParentChildRowsForChildren(client, childResult.rows.map((row) => row.id));
}

/**
 * Permanently delete a family and all dependent rows (no avatar cleanup).
 * Caller must BEGIN/COMMIT around this; avatars are deleted post-commit.
 * @param {import('pg').PoolClient} client
 * @param {string} familyId
 */
async function hardDeleteFamilyData(client, familyId) {
  await client.query(`
    DELETE FROM rating WHERE daily_log_item_id IN (
      SELECT dli.id FROM daily_log_item dli
      JOIN daily_log dl ON dli.daily_log_id = dl.id
      JOIN child c ON dl.child_id = c.id WHERE c.family_id = $1
    )`, [familyId]);
  await client.query(`
    DELETE FROM daily_log_item WHERE daily_log_id IN (
      SELECT dl.id FROM daily_log dl JOIN child c ON dl.child_id = c.id
      WHERE c.family_id = $1
    )`, [familyId]);
  await client.query(`DELETE FROM daily_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);

  await client.query(`DELETE FROM reward_redemption WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM reward_redemption WHERE reward_id IN (SELECT id FROM reward WHERE family_id = $1)`, [familyId]);

  await client.query(`DELETE FROM weekly_schedule_item WHERE weekly_schedule_id IN (
    SELECT ws.id FROM weekly_schedule ws JOIN child c ON ws.child_id = c.id WHERE c.family_id = $1
  )`, [familyId]);
  await client.query(`DELETE FROM weekly_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM special_day_schedule_item WHERE special_day_schedule_id IN (
    SELECT sds.id FROM special_day_schedule sds JOIN child c ON sds.child_id = c.id WHERE c.family_id = $1
  )`, [familyId]);
  await client.query(`DELETE FROM special_day_schedule WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);

  await client.query(`DELETE FROM streak WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM parent_note WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM pedagog_notes WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM child_observation WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM general_observations WHERE family_id = $1`, [familyId]);

  await client.query(`DELETE FROM reward WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM activity_template WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM category WHERE family_id = $1`, [familyId]);

  await client.query(`DELETE FROM pin_lockout WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM pin_notification_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM pin_audit_log WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);

  await client.query(`DELETE FROM family_invite WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM pedagog_invite WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM professional_share_link WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM system_messages WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM win_back_email_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM push_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM notification_log WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM refresh_token WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM email_verification WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM password_reset WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(
    `DELETE FROM waitlist w
     WHERE EXISTS (
       SELECT 1 FROM parent p
       WHERE p.family_id = $1
         AND LOWER(TRIM(p.email)) = LOWER(TRIM(w.email))
     )`,
    [familyId]
  );
  await client.query(`DELETE FROM notification_preference WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM parent_child WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM parent_child WHERE child_id IN (SELECT id FROM child WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM email_subscriptions WHERE parent_id IN (SELECT id FROM parent WHERE family_id = $1)`, [familyId]);
  await client.query(`DELETE FROM analytics_events WHERE family_id = $1`, [familyId]);

  await client.query(`DELETE FROM child WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM parent WHERE family_id = $1`, [familyId]);
  await client.query(`DELETE FROM family WHERE id = $1`, [familyId]);
}

/**
 * Remove one parent from a surviving family (self-leave / co-parent removal semantics).
 * @param {import('pg').PoolClient} client
 */
async function removeParentFromFamily(client, { parentId, familyId, revokedBy }) {
  const childResult = await client.query(
    'SELECT id FROM child WHERE family_id = $1 ORDER BY id',
    [familyId]
  );
  const familyChildIds = childResult.rows.map((r) => r.id);
  await lockParentChildRowsForChildren(client, familyChildIds);

  const deleteAuthz = await assertAuthorizedMemberDelete(
    client,
    revokedBy,
    familyId,
    parentId
  );
  if (!deleteAuthz.ok) {
    const err = new Error(deleteAuthz.message || 'Åtkomst nekad');
    err.code = deleteAuthz.code || 'FORBIDDEN';
    throw err;
  }

  const orphanCheck = await assertNoChildWithoutAdmin(
    client,
    familyId,
    parentId,
    []
  );
  if (!orphanCheck.ok) {
    const err = new Error(orphanCheck.message || 'Åtkomst nekad');
    err.code = orphanCheck.code || 'LAST_ADMIN';
    throw err;
  }

  await revokeAllActiveLinksForParent(client, parentId, revokedBy);
  await client.query('DELETE FROM notification_preference WHERE parent_id = $1', [parentId]);
  await client.query('DELETE FROM parent WHERE id = $1', [parentId]);
}

/**
 * Capture avatar object keys before destructive row deletes. Must run on the
 * same transaction client so COMMIT/ROLLBACK still owns the rows.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<string[]>}
 */
async function collectFamilyAvatarStorageKeys(client, familyId) {
  const { rows: childRows } = await client.query(
    `SELECT avatar_storage_key FROM child
     WHERE family_id = $1 AND avatar_storage_key IS NOT NULL`,
    [familyId]
  );
  const { rows: parentRows } = await client.query(
    `SELECT avatar_storage_key FROM parent
     WHERE family_id = $1 AND avatar_storage_key IS NOT NULL`,
    [familyId]
  );
  const keys = new Set();
  for (const row of childRows) keys.add(row.avatar_storage_key);
  for (const row of parentRows) keys.add(row.avatar_storage_key);
  return [...keys];
}

/**
 * @param {import('pg').PoolClient} client
 * @returns {Promise<string|null>}
 */
async function collectParentAvatarStorageKey(client, parentId) {
  const { rows } = await client.query(
    `SELECT avatar_storage_key FROM parent
     WHERE id = $1 AND avatar_storage_key IS NOT NULL`,
    [parentId]
  );
  return rows[0]?.avatar_storage_key || null;
}

/**
 * Best-effort object delete after successful COMMIT. Failure is logged.
 * @param {string[]} keys
 */
async function cleanupAvatarStorageKeysAfterCommit(keys) {
  const list = (keys || []).filter(Boolean);
  try {
    for (const key of list) {
      await avatarStorage.deletePrivateObject(key);
    }
  } catch (err) {
    console.warn('[FAMILY] post-commit avatar cleanup failed', err.message);
  }
}

/**
 * @param {string} parentId
 */
async function invalidateParentSessions(parentId, familyId) {
  notifyParentAccessRevoked(parentId, familyId);
  await revokeAllRefreshTokens({ userId: parentId, userType: 'parent' });
}

module.exports = {
  listAuthorizedAdministrativeAdultIds,
  callerHasAdministrativeAuthority,
  deletionConsequenceForCaller,
  lockFamilyDeletionAuthority,
  hardDeleteFamilyData,
  removeParentFromFamily,
  collectFamilyAvatarStorageKeys,
  collectParentAvatarStorageKey,
  cleanupAvatarStorageKeysAfterCommit,
  invalidateParentSessions,
};
