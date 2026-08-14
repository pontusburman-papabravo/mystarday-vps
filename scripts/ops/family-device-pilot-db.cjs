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

async function enablePilotOverrides(
  db,
  familyId,
  email,
  reason = 'family-device-prod-pilot',
  keys = PILOT_FLAG_KEYS
) {
  await assertFamilyDevicePilotFamily(db, familyId, email);
  for (const featureKey of keys) {
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

const STALE_PILOT_EMAIL_SQL = `LOWER(p.email) ~ '^fd-pilot-[0-9]{10,}@example\\.com$'`;

async function listStaleFdPilotFamilies(db) {
  const { rows } = await db.query(
    `SELECT DISTINCT f.id AS family_id, p.email
     FROM family f
     JOIN parent p ON p.family_id = f.id
     WHERE ${STALE_PILOT_EMAIL_SQL}
     ORDER BY p.email ASC`
  );
  return rows;
}

async function countGlobalStaleFdPilotRows(db) {
  const families = await listStaleFdPilotFamilies(db);
  if (!families.length) {
    return { families: 0, overrides: 0, rows: [] };
  }
  const ids = families.map((r) => r.family_id);
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_feature_override
     WHERE family_id = ANY($1::uuid[]) AND feature_key = ANY($2::text[])`,
    [ids, PILOT_FLAG_KEYS]
  );
  return {
    families: families.length,
    overrides: rows[0]?.n ?? 0,
    rows: families,
  };
}

/** Advisory lock — blocks concurrent stale cleanup while a prod pilot runs. */
const STALE_PILOT_LOCK_KEY = 90498901;

async function tryAcquireStalePilotLock(db, client) {
  const conn = client || db;
  const { rows } = await conn.query('SELECT pg_try_advisory_lock($1) AS ok', [STALE_PILOT_LOCK_KEY]);
  return rows[0]?.ok === true;
}

async function releaseStalePilotLock(db, client) {
  const conn = client || db;
  await conn.query('SELECT pg_advisory_unlock($1)', [STALE_PILOT_LOCK_KEY]);
}

async function withStalePilotLock(db, fn) {
  const client = await db.getClient();
  try {
    const locked = await tryAcquireStalePilotLock(db, client);
    if (!locked) {
      return { locked: false, result: null };
    }
    const result = await fn(client);
    return { locked: true, result };
  } finally {
    await releaseStalePilotLock(db, client).catch(() => {});
    client.release();
  }
}

async function cleanupStaleFdPilotFamilies(db, { apply = false, activeFamilyIds = [] } = {}) {
  const stale = await listStaleFdPilotFamilies(db);
  const active = new Set((activeFamilyIds || []).map(String));
  const targets = stale.filter((row) => !active.has(String(row.family_id)));

  if (!apply) {
    const overrideCounts = targets.length
      ? (
          await db.query(
            `SELECT COUNT(*)::int AS n FROM family_feature_override
             WHERE family_id = ANY($1::uuid[]) AND feature_key = ANY($2::text[])`,
            [targets.map((r) => r.family_id), PILOT_FLAG_KEYS]
          )
        ).rows[0]?.n ?? 0
      : 0;
    return {
      dryRun: true,
      families: targets.length,
      overrides: overrideCounts,
      deleted: 0,
      rows: targets,
    };
  }

  let deleted = 0;
  const errors = [];
  for (const row of targets) {
    try {
      await deletePilotFamily(db, row.family_id, row.email);
      deleted += 1;
    } catch (err) {
      errors.push({ family_id: row.family_id, error: err.message });
    }
  }
  const after = await countGlobalStaleFdPilotRows(db);
  return {
    dryRun: false,
    families: after.families,
    overrides: after.overrides,
    deleted,
    errors,
    ok: after.families === 0 && after.overrides === 0 && errors.length === 0,
  };
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
  listStaleFdPilotFamilies,
  countGlobalStaleFdPilotRows,
  tryAcquireStalePilotLock,
  releaseStalePilotLock,
  withStalePilotLock,
  cleanupStaleFdPilotFamilies,
  revokeAllTrustedDevices,
  deletePilotFamily,
};
