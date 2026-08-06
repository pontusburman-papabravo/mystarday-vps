/**
 * Compare pre/post deploy snapshots. Migration table count may increase; business tables should not drift from migration alone.
 */
import {
  aggregateMigrationContracts,
  expectedFeatureFlagInserts,
} from './migration-snapshot-manifest.mjs';

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

/**
 * @param {Array<{ key: string, enabled: boolean }>|undefined} rows
 */
function flagRowMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    map.set(row.key, row.enabled);
  }
  return map;
}

/**
 * @param {Array<{ key: string, enabled: boolean }>|undefined} beforeRows
 * @param {Array<{ key: string, enabled: boolean }>|undefined} afterRows
 */
export function diffFeatureFlagRows(beforeRows, afterRows) {
  const before = flagRowMap(beforeRows);
  const after = flagRowMap(afterRows);
  const inserts = [];
  const enabledChanges = [];
  const deletes = [];
  for (const [key, enabled] of after.entries()) {
    if (!before.has(key)) inserts.push({ key, enabled });
    else if (before.get(key) !== enabled) {
      enabledChanges.push({ key, before: before.get(key), after: enabled });
    }
  }
  for (const key of before.keys()) {
    if (!after.has(key)) deletes.push(key);
  }
  return { inserts, enabledChanges, deletes };
}

/**
 * @param {object} beforeSnap
 * @param {object} afterSnap
 */
export function listNewMigrationNames(beforeSnap, afterSnap) {
  const before = new Set(beforeSnap.applied_migration_names || []);
  const after = afterSnap.applied_migration_names || [];
  return after.filter((name) => !before.has(name));
}

/**
 * @param {object} diff
 * @param {Array<{ key: string, enabled: boolean, migration?: string }>} expectedInserts
 */
export function validateFeatureFlagMigrationDiff(diff, expectedInserts) {
  const drift = [];
  const expectedByKey = new Map(expectedInserts.map((r) => [r.key, r]));

  for (const ch of diff.enabledChanges) {
    drift.push({ table: 'feature_flag', issue: 'enabled_changed', ...ch });
  }
  for (const key of diff.deletes) {
    drift.push({ table: 'feature_flag', issue: 'unexpected_delete', key });
  }

  const unexpectedInserts = [];
  for (const ins of diff.inserts) {
    const exp = expectedByKey.get(ins.key);
    if (!exp) {
      unexpectedInserts.push(ins);
      continue;
    }
    if (ins.enabled !== exp.enabled) {
      drift.push({
        table: 'feature_flag',
        issue: 'insert_enabled_mismatch',
        key: ins.key,
        expected: exp.enabled,
        enabled: ins.enabled,
      });
    }
  }
  if (unexpectedInserts.length > 0) {
    for (const ins of unexpectedInserts) {
      drift.push({ table: 'feature_flag', issue: 'unexpected_insert', key: ins.key, enabled: ins.enabled });
    }
  }

  return { ok: drift.length === 0, drift };
}

/**
 * @param {object} before
 * @param {object} after
 * @param {object} options
 * @param {'strict'|'post-migration'|'post-deploy-runtime'} [options.mode]
 * @param {string[]} [options.newMigrationNames]
 * @param {string} [options.repoRoot]
 */
export function compareDbSnapshots(before, after, options = {}) {
  const mode = options.mode || 'strict';
  const allowMigrationDrift = options.allowMigrationDrift !== false;
  const drift = [];

  if (!options.ignoreIdentityHash && before.database_identity_hash !== after.database_identity_hash) {
    drift.push({
      field: 'database_identity_hash',
      before: before.database_identity_hash,
      after: after.database_identity_hash,
    });
  }

  let newMigrationNames = options.newMigrationNames;
  if (mode === 'post-migration' && !newMigrationNames) {
    newMigrationNames = listNewMigrationNames(before, after);
  }

  if (mode === 'post-migration') {
    const names = newMigrationNames || [];
    if (names.length > 0) {
      const { missing } = aggregateMigrationContracts(names, options.repoRoot);
      if (missing.length > 0) {
        for (const name of missing) {
          drift.push({ issue: 'migration_contract_missing', migration: name });
        }
      }
    }

    const expectedFlags = expectedFeatureFlagInserts(names, options.repoRoot);
    const ffBefore = before.tables?.feature_flag;
    const ffAfter = after.tables?.feature_flag;
    if (ffBefore?.exists && ffAfter?.exists) {
      const flagDiff = diffFeatureFlagRows(ffBefore.flag_rows, ffAfter.flag_rows);
      const ffResult = validateFeatureFlagMigrationDiff(flagDiff, expectedFlags);
      if (!ffResult.ok) drift.push(...ffResult.drift);
    }

    for (const table of BUSINESS_TABLES) {
      if (table === 'feature_flag') continue;
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
  } else {
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
      if (table === 'feature_flag' && mode === 'strict') {
        const flagDiff = diffFeatureFlagRows(b.flag_rows, a.flag_rows);
        if (flagDiff.enabledChanges.length || flagDiff.deletes.length || flagDiff.inserts.length) {
          drift.push({
            table: 'feature_flag',
            issue: 'flag_rows_changed',
            diff: flagDiff,
          });
        }
      }
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

  if (mode === 'post-migration' && (newMigrationNames || []).length === 0) {
    const strict = compareDbSnapshots(before, after, { ...options, mode: 'post-deploy-runtime' });
    if (!strict.ok) drift.push(...strict.drift);
  }

  return { ok: drift.length === 0, drift, newMigrationNames: newMigrationNames || [] };
}
