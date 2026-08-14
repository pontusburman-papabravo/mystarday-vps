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
 * Schema drift must block deploy even when no migrations ran this deploy.
 * @param {object} item
 */
export function isSchemaDriftItem(item) {
  if (item.field === 'database_identity_hash') return true;
  if (item.issue === 'existence_mismatch') return true;
  if (item.table === '_migrations' && item.issue === 'migration_count_decreased') return true;
  if (item.table === '_migrations' && item.field === 'row_count') return true;
  return false;
}

/**
 * Mutable business-table drift expected under live prod traffic.
 * @param {object} item
 */
export function isLiveDataDriftItem(item) {
  if (item.issue === 'tolerated_live_data_drift') return true;
  if (item.field === 'row_count' || item.field === 'row_fingerprint_sha256') return true;
  if (
    item.table === 'feature_flag' &&
    ['enabled_changed', 'unexpected_insert', 'unexpected_delete', 'insert_enabled_mismatch', 'flag_rows_changed'].includes(
      item.issue
    )
  ) {
    return true;
  }
  return false;
}

/**
 * @param {object} beforeTable
 * @param {object} afterTable
 * @param {string} table
 * @param {{ tolerateLiveDataDrift?: boolean }} options
 */
export function compareTrackedTableDrift(beforeTable, afterTable, table, options = {}) {
  const blocking = [];
  const tolerated = [];
  const tolerateLiveDataDrift = options.tolerateLiveDataDrift === true;

  if (!beforeTable?.exists && !afterTable?.exists) {
    return { blocking, tolerated };
  }
  if (!beforeTable?.exists || !afterTable?.exists) {
    blocking.push({
      table,
      issue: 'existence_mismatch',
      before: !!beforeTable?.exists,
      after: !!afterTable?.exists,
    });
    return { blocking, tolerated };
  }

  if (beforeTable.row_count !== afterTable.row_count) {
    const item = {
      table,
      field: 'row_count',
      before: beforeTable.row_count,
      after: afterTable.row_count,
    };
    if (tolerateLiveDataDrift && table !== '_migrations') {
      tolerated.push({ ...item, issue: 'tolerated_live_data_drift' });
    } else {
      blocking.push(item);
    }
  }

  if (
    beforeTable.row_fingerprint_sha256 &&
    afterTable.row_fingerprint_sha256 &&
    beforeTable.row_fingerprint_sha256 !== afterTable.row_fingerprint_sha256
  ) {
    const item = {
      table,
      field: 'row_fingerprint_sha256',
      before: beforeTable.row_fingerprint_sha256,
      after: afterTable.row_fingerprint_sha256,
    };
    if (tolerateLiveDataDrift && table !== '_migrations') {
      tolerated.push({ ...item, issue: 'tolerated_live_data_drift' });
    } else {
      blocking.push(item);
    }
  }

  return { blocking, tolerated };
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
  const toleratedLiveDataDrift = [];

  if (!options.ignoreIdentityHash && before.database_identity_hash !== after.database_identity_hash) {
    drift.push({
      field: 'database_identity_hash',
      before: before.database_identity_hash,
      after: after.database_identity_hash,
    });
  }

  let newMigrationNames = options.newMigrationNames;
  if ((mode === 'post-migration' || mode === 'post-deploy-runtime') && !newMigrationNames) {
    newMigrationNames = listNewMigrationNames(before, after);
  }

  const hasNewMigrations = (newMigrationNames || []).length > 0;
  const tolerateLiveDataDrift =
    !hasNewMigrations && (mode === 'post-migration' || mode === 'post-deploy-runtime');

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
      const tableDrift = compareTrackedTableDrift(before.tables?.[table], after.tables?.[table], table, {
        tolerateLiveDataDrift,
      });
      drift.push(...tableDrift.blocking);
      toleratedLiveDataDrift.push(...tableDrift.tolerated);
    }
  } else {
    for (const table of BUSINESS_TABLES) {
      const tableDrift = compareTrackedTableDrift(before.tables?.[table], after.tables?.[table], table, {
        tolerateLiveDataDrift,
      });
      drift.push(...tableDrift.blocking);
      toleratedLiveDataDrift.push(...tableDrift.tolerated);
      if (table === 'feature_flag' && mode === 'strict' && before.tables?.[table]?.exists && after.tables?.[table]?.exists) {
        const flagDiff = diffFeatureFlagRows(
          before.tables[table].flag_rows,
          after.tables[table].flag_rows
        );
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

  return {
    ok: drift.length === 0,
    drift,
    toleratedLiveDataDrift,
    newMigrationNames: newMigrationNames || [],
  };
}
