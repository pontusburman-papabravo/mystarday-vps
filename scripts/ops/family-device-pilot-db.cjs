'use strict';

const familyOverrides = require('../../db/family-feature-overrides');
const overrideCache = require('../../src/lib/activation-flag-family-cache');
const {
  PILOT_FLAG_KEYS,
  assertFamilyDevicePilotFamily,
} = require('../../src/lib/family-device-pilot-guard');

async function snapshotGlobalPilotFlags(db) {
  const { rows } = await db.query(
    `SELECT key, enabled FROM feature_flag WHERE key = ANY($1::text[])`,
    [PILOT_FLAG_KEYS]
  );
  const map = Object.fromEntries(PILOT_FLAG_KEYS.map((k) => [k, false]));
  for (const row of rows) map[row.key] = Boolean(row.enabled);
  return map;
}

function globalFlagsUnchanged(before, after) {
  for (const key of PILOT_FLAG_KEYS) {
    if (Boolean(before[key]) !== Boolean(after[key])) return false;
  }
  return true;
}

async function enablePilotOverrides(db, familyId, email, reason = 'family-device-prod-pilot') {
  await assertFamilyDevicePilotFamily(db, familyId, email);
  for (const featureKey of PILOT_FLAG_KEYS) {
    familyOverrides.assertOverrideFeatureKey(featureKey);
    await familyOverrides.upsertOverride(familyId, featureKey, true, {
      reason,
      source: 'family-device-prod-pilot',
      createdBy: 'family-device-prod-pilot',
    });
    overrideCache.invalidateFamilyOverrideCache(familyId, featureKey);
  }
}

async function disablePilotOverrides(db, familyId, email) {
  await assertFamilyDevicePilotFamily(db, familyId, email);
  for (const featureKey of PILOT_FLAG_KEYS) {
    await familyOverrides.removeOverride(familyId, featureKey);
    overrideCache.invalidateFamilyOverrideCache(familyId, featureKey);
  }
}

async function countPilotOverrides(db, familyId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_feature_override
     WHERE family_id = $1 AND feature_key = ANY($2::text[])`,
    [familyId, PILOT_FLAG_KEYS]
  );
  return rows[0]?.n ?? 0;
}

async function revokeAllTrustedDevices(db, familyId) {
  await db.query(
    `UPDATE family_trusted_device SET revoked_at = NOW()
     WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId]
  );
}

async function deletePilotFamily(db, familyId, email) {
  await assertFamilyDevicePilotFamily(db, familyId, email);
  await disablePilotOverrides(db, familyId, email);
  await revokeAllTrustedDevices(db, familyId);

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
    await client.query('DELETE FROM family_trusted_device WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM parent_session_handoff WHERE family_id = $1', [familyId]);
    await client.query('DELETE FROM family_feature_override WHERE family_id = $1', [familyId]);
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
  PILOT_FLAG_KEYS,
  snapshotGlobalPilotFlags,
  globalFlagsUnchanged,
  enablePilotOverrides,
  disablePilotOverrides,
  countPilotOverrides,
  revokeAllTrustedDevices,
  deletePilotFamily,
};
