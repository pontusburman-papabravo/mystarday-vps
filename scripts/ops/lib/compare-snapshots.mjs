/**
 * Compare pre/post deploy snapshots. Migration table count may increase; business tables should not drift from migration alone.
 */
const BUSINESS_TABLES = [
  'family',
  'parent',
  'child',
  'parent_child',
  'weekly_schedule',
  'weekly_schedule_item',
  'daily_log',
  'daily_log_item',
  'reward',
  'reward_redemption',
  'feature_flag',
];

export function compareDbSnapshots(before, after, options = {}) {
  const allowMigrationDrift = options.allowMigrationDrift !== false;
  const drift = [];

  if (!options.ignoreIdentityHash && before.database_identity_hash !== after.database_identity_hash) {
    drift.push({
      field: 'database_identity_hash',
      before: before.database_identity_hash,
      after: after.database_identity_hash,
    });
  }

  for (const table of BUSINESS_TABLES) {
    const b = before.tables?.[table];
    const a = after.tables?.[table];
    if (!b?.exists && !a?.exists) continue;
    if (!b?.exists || !a?.exists) {
      drift.push({ table, issue: 'existence_mismatch', before: !!b?.exists, after: !!a?.exists });
      continue;
    }
    if (b.row_count !== a.row_count) {
      drift.push({ table, field: 'row_count', before: b.row_count, after: a.row_count });
    }
    if (
      b.row_fingerprint_sha256 &&
      a.row_fingerprint_sha256 &&
      b.row_fingerprint_sha256 !== a.row_fingerprint_sha256
    ) {
      drift.push({
        table,
        field: 'row_fingerprint_sha256',
        before: b.row_fingerprint_sha256,
        after: a.row_fingerprint_sha256,
      });
    }
  }

  const migBefore = before.tables?._migrations;
  const migAfter = after.tables?._migrations;
  if (migBefore?.exists && migAfter?.exists && allowMigrationDrift) {
    if (migAfter.row_count < migBefore.row_count) {
      drift.push({
        table: '_migrations',
        field: 'row_count',
        before: migBefore.row_count,
        after: migAfter.row_count,
        issue: 'migration_count_decreased',
      });
    }
  }

  return { ok: drift.length === 0, drift };
}
