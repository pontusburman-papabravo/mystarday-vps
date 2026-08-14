'use strict';

const familyOverrides = require('../../db/family-feature-overrides');
const overrideCache = require('../../src/lib/activation-flag-family-cache');
const {
  FAMILY_DEVICE_PILOT_FLAG_KEYS,
  WIDGET_PILOT_FLAG_KEYS,
  FIXTURE_FAMILY_NAME,
  assertFamilyDevicePilotFamily,
  assertFamilyDevicePilotFlagKey,
  classifyDisposablePilotFixtureOwnership,
  isFamilyDevicePilotDisposableEmail,
} = require('../../src/lib/family-device-pilot-guard');

/** Shared ops lock for prod pilot + stale cleanup (same session-bound advisory lock). */
const FD_PILOT_OPS_LOCK_KEY = 90498901;

const STALE_PILOT_EMAIL_SQL = `LOWER(p.email) ~ '^fd-pilot-[0-9]{10,}@example\\.com$'`;

async function snapshotGlobalPilotFlags(db) {
  const { rows } = await db.query(
    `SELECT key, enabled FROM feature_flag WHERE key = ANY($1::text[])`,
    [FAMILY_DEVICE_PILOT_FLAG_KEYS]
  );
  const map = Object.fromEntries(FAMILY_DEVICE_PILOT_FLAG_KEYS.map((k) => [k, false]));
  for (const row of rows) map[row.key] = Boolean(row.enabled);
  return map;
}

function globalFlagsUnchanged(before, after) {
  for (const key of FAMILY_DEVICE_PILOT_FLAG_KEYS) {
    if (Boolean(before[key]) !== Boolean(after[key])) return false;
  }
  return true;
}

async function countWidgetOverrides(db, familyId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_feature_override
     WHERE family_id = $1 AND feature_key = ANY($2::text[])`,
    [familyId, WIDGET_PILOT_FLAG_KEYS]
  );
  return rows[0]?.n ?? 0;
}

async function assertNoWidgetOverrides(db, familyId) {
  const n = await countWidgetOverrides(db, familyId);
  if (n > 0) {
    const err = new Error('Family Device pilot refused: widget family overrides present');
    err.code = 'FD_PILOT_WIDGET_OVERRIDE_FORBIDDEN';
    throw err;
  }
}

async function enablePilotOverrides(
  db,
  familyId,
  email,
  reason = 'family-device-prod-pilot',
  keys = FAMILY_DEVICE_PILOT_FLAG_KEYS
) {
  await assertFamilyDevicePilotFamily(db, familyId, email);
  await assertNoWidgetOverrides(db, familyId);
  for (const featureKey of keys) {
    assertFamilyDevicePilotFlagKey(featureKey);
    familyOverrides.assertOverrideFeatureKey(featureKey);
    await familyOverrides.upsertOverride(familyId, featureKey, true, {
      reason,
      source: 'family-device-prod-pilot',
      createdBy: 'family-device-prod-pilot',
    });
    overrideCache.invalidateFamilyOverrideCache(familyId, featureKey);
  }
  await assertNoWidgetOverrides(db, familyId);
}

async function disablePilotOverrides(db, familyId, email) {
  await assertFamilyDevicePilotFamily(db, familyId, email);
  for (const featureKey of FAMILY_DEVICE_PILOT_FLAG_KEYS) {
    await familyOverrides.removeOverride(familyId, featureKey);
    overrideCache.invalidateFamilyOverrideCache(familyId, featureKey);
  }
}

async function countPilotOverrides(db, familyId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_feature_override
     WHERE family_id = $1 AND feature_key = ANY($2::text[])`,
    [familyId, FAMILY_DEVICE_PILOT_FLAG_KEYS]
  );
  return rows[0]?.n ?? 0;
}

async function listEmailMatchedFdPilotFamilies(db) {
  const { rows } = await db.query(
    `SELECT DISTINCT f.id AS family_id, p.email, f.name AS family_name
     FROM family f
     JOIN parent p ON p.family_id = f.id
     WHERE ${STALE_PILOT_EMAIL_SQL}
     ORDER BY p.email ASC`
  );
  return rows;
}

async function enumerateStalePilotCandidates(db) {
  const raw = await listEmailMatchedFdPilotFamilies(db);
  const candidates = [];
  const refused = [];
  const ambiguous = [];

  for (const row of raw) {
    const verdict = await classifyDisposablePilotFixtureOwnership(db, row.family_id);
    const entry = {
      family_id: row.family_id,
      email: row.email,
      family_name: row.family_name,
      ownership: verdict.status,
      reason: verdict.reason,
      parent_count: verdict.parent_count,
      parent_name: verdict.parent_name,
    };
    if (verdict.status === 'ELIGIBLE') candidates.push(entry);
    else if (verdict.status === 'AMBIGUOUS_PILOT_OWNERSHIP') ambiguous.push(entry);
    else refused.push(entry);
  }

  return { candidates, refused, ambiguous };
}

async function countGlobalStaleFdPilotRows(db) {
  const classified = await enumerateStalePilotCandidates(db);
  if (!classified.candidates.length) {
    return { families: 0, overrides: 0, rows: [], refused: classified.refused, ambiguous: classified.ambiguous };
  }
  const ids = classified.candidates.map((r) => r.family_id);
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM family_feature_override
     WHERE family_id = ANY($1::uuid[]) AND feature_key = ANY($2::text[])`,
    [ids, FAMILY_DEVICE_PILOT_FLAG_KEYS]
  );
  return {
    families: classified.candidates.length,
    overrides: rows[0]?.n ?? 0,
    rows: classified.candidates,
    refused: classified.refused,
    ambiguous: classified.ambiguous,
  };
}

async function tryAcquireFamilyDevicePilotLock(db, client) {
  const conn = client || db;
  const { rows } = await conn.query('SELECT pg_try_advisory_lock($1) AS ok', [FD_PILOT_OPS_LOCK_KEY]);
  return rows[0]?.ok === true;
}

async function releaseFamilyDevicePilotLock(db, client) {
  const conn = client || db;
  await conn.query('SELECT pg_advisory_unlock($1)', [FD_PILOT_OPS_LOCK_KEY]);
}

async function withFamilyDevicePilotLock(db, fn) {
  const client = await db.getClient();
  try {
    const locked = await tryAcquireFamilyDevicePilotLock(db, client);
    if (!locked) {
      return { locked: false, result: null, code: 'PILOT_LOCK_BUSY' };
    }
    const result = await fn(client);
    return { locked: true, result, code: null };
  } finally {
    await releaseFamilyDevicePilotLock(db, client).catch(() => {});
    client.release();
  }
}

async function deleteValidatedPilotSnapshot(db, snapshotCandidates) {
  const deletedFamilyIds = [];
  const errors = [];
  for (const row of snapshotCandidates) {
    try {
      await deletePilotFamily(db, row.family_id, row.email);
      deletedFamilyIds.push(row.family_id);
    } catch (err) {
      errors.push({ family_id: row.family_id, email: row.email, error: err.message, code: err.code || null });
    }
  }
  return { deletedFamilyIds, errors };
}

/**
 * Stale fd-pilot cleanup. Under apply, deletes EXACTLY snapshot.candidates — no re-query broadening.
 * @param {{ apply?: boolean, snapshot?: { candidates, refused, ambiguous } }} opts
 */
async function cleanupStaleFdPilotFamilies(db, opts = {}) {
  const apply = opts.apply === true;
  const snapshot = opts.snapshot || (await enumerateStalePilotCandidates(db));

  if (!apply) {
    const overrideCounts = snapshot.candidates.length
      ? (
          await db.query(
            `SELECT COUNT(*)::int AS n FROM family_feature_override
             WHERE family_id = ANY($1::uuid[]) AND feature_key = ANY($2::text[])`,
            [snapshot.candidates.map((r) => r.family_id), FAMILY_DEVICE_PILOT_FLAG_KEYS]
          )
        ).rows[0]?.n ?? 0
      : 0;
    return {
      mode: 'dry-run',
      dryRun: true,
      candidates: snapshot.candidates,
      refused: snapshot.refused,
      ambiguous: snapshot.ambiguous,
      candidateCount: snapshot.candidates.length,
      refusedCount: snapshot.refused.length,
      ambiguousCount: snapshot.ambiguous.length,
      overrides: overrideCounts,
      deletedFamilyIds: [],
      ok: snapshot.ambiguous.length === 0,
    };
  }

  if (snapshot.ambiguous.length > 0) {
    return {
      mode: 'apply',
      dryRun: false,
      candidates: snapshot.candidates,
      refused: snapshot.refused,
      ambiguous: snapshot.ambiguous,
      candidateCount: snapshot.candidates.length,
      deletedFamilyIds: [],
      deletedCount: 0,
      errors: snapshot.ambiguous.map((row) => ({
        family_id: row.family_id,
        email: row.email,
        error: 'AMBIGUOUS_PILOT_OWNERSHIP',
        code: 'AMBIGUOUS_PILOT_OWNERSHIP',
      })),
      ok: false,
      blocker: 'AMBIGUOUS_PILOT_OWNERSHIP',
    };
  }

  const { deletedFamilyIds, errors } = await deleteValidatedPilotSnapshot(db, snapshot.candidates);
  const after = await countGlobalStaleFdPilotRows(db);
  return {
    mode: 'apply',
    dryRun: false,
    candidates: snapshot.candidates,
    refused: snapshot.refused,
    ambiguous: snapshot.ambiguous,
    candidateCount: snapshot.candidates.length,
    deletedFamilyIds,
    deletedCount: deletedFamilyIds.length,
    errors,
    staleFdPilotFamilies: after.families,
    staleFdPilotOverrides: after.overrides,
    ok:
      after.families === 0 &&
      after.overrides === 0 &&
      after.ambiguous.length === 0 &&
      errors.length === 0,
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
  FAMILY_DEVICE_PILOT_FLAG_KEYS,
  WIDGET_PILOT_FLAG_KEYS,
  FIXTURE_FAMILY_NAME,
  FD_PILOT_OPS_LOCK_KEY,
  snapshotGlobalPilotFlags,
  globalFlagsUnchanged,
  enablePilotOverrides,
  disablePilotOverrides,
  countPilotOverrides,
  countWidgetOverrides,
  assertNoWidgetOverrides,
  listEmailMatchedFdPilotFamilies,
  enumerateStalePilotCandidates,
  countGlobalStaleFdPilotRows,
  tryAcquireFamilyDevicePilotLock,
  releaseFamilyDevicePilotLock,
  withFamilyDevicePilotLock,
  tryAcquireStalePilotLock: tryAcquireFamilyDevicePilotLock,
  releaseStalePilotLock: releaseFamilyDevicePilotLock,
  withStalePilotLock: withFamilyDevicePilotLock,
  cleanupStaleFdPilotFamilies,
  deleteValidatedPilotSnapshot,
  revokeAllTrustedDevices,
  deletePilotFamily,
  isFamilyDevicePilotDisposableEmail,
};
