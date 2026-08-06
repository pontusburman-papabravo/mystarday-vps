/**
 * Declared snapshot mutations per migration (deploy-time only).
 * New migrations may export snapshotContract from migrations/*.js — merged with this registry.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {Record<string, { backwardCompatible?: boolean, schemaOnly?: boolean, featureFlagInserts?: { key: string, enabled: boolean }[] }>} */
export const MIGRATION_SNAPSHOT_REGISTRY = {
  '1810140000000_family_acquisition_attribution': {
    backwardCompatible: true,
    schemaOnly: true,
  },
  '1810140000001_family_growth_feedback': {
    backwardCompatible: true,
    schemaOnly: true,
  },
  '1810140000002_waitlist_funnel_fields': {
    backwardCompatible: true,
    schemaOnly: true,
  },
  '1810140000003_growth_feedback_loop_flags': {
    backwardCompatible: true,
    featureFlagInserts: [
      { key: 'growth_feedback_v1', enabled: false },
      { key: 'growth_referral_cta_v1', enabled: false },
      { key: 'growth_stuck_cohorts_v1', enabled: false },
      { key: 'growth_waitlist_funnel_v1', enabled: false },
    ],
  },
  '1810150000000_activation_first_success_v1_flag': {
    backwardCompatible: true,
    featureFlagInserts: [{ key: 'activation_first_success_v1', enabled: false }],
  },
  '1810160000000_family_feature_override': {
    backwardCompatible: true,
    schemaOnly: true,
  },
  '1810180000000_trusted_device_v1': {
    backwardCompatible: true,
    schemaOnly: true,
    featureFlagInserts: [{ key: 'trusted_device_v1', enabled: false }],
  },
};

/**
 * @param {string} migrationName
 * @param {string} [repoRoot]
 */
export function loadMigrationSnapshotContract(migrationName, repoRoot = process.cwd()) {
  const fromRegistry = MIGRATION_SNAPSHOT_REGISTRY[migrationName];
  const migrationsDir = path.join(repoRoot, 'migrations');
  let fromFile = null;
  if (fs.existsSync(migrationsDir)) {
    const file = fs.readdirSync(migrationsDir).find((f) => {
      if (!f.endsWith('.js')) return false;
      try {
        const mod = require(path.join(migrationsDir, f));
        return (mod.name || f.replace(/\.js$/, '')) === migrationName;
      } catch {
        return false;
      }
    });
    if (file) {
      const mod = require(path.join(migrationsDir, file));
      if (mod.snapshotContract && typeof mod.snapshotContract === 'object') {
        fromFile = mod.snapshotContract;
      }
    }
  }
  if (!fromRegistry && !fromFile) return null;
  return {
    backwardCompatible: true,
    ...fromRegistry,
    ...fromFile,
    featureFlagInserts: [
      ...(fromRegistry?.featureFlagInserts || []),
      ...(fromFile?.featureFlagInserts || []),
    ],
  };
}

/**
 * @param {string[]} migrationNames
 * @param {string} [repoRoot]
 */
export function aggregateMigrationContracts(migrationNames, repoRoot) {
  const contracts = [];
  const missing = [];
  for (const name of migrationNames) {
    const c = loadMigrationSnapshotContract(name, repoRoot);
    if (!c) {
      missing.push(name);
      continue;
    }
    contracts.push({ name, contract: c });
  }
  return { contracts, missing };
}

/**
 * @param {string[]} migrationNames
 * @param {string} [repoRoot]
 */
export function expectedFeatureFlagInserts(migrationNames, repoRoot) {
  const inserts = [];
  for (const name of migrationNames) {
    const c = loadMigrationSnapshotContract(name, repoRoot);
    if (!c?.featureFlagInserts) continue;
    for (const row of c.featureFlagInserts) {
      inserts.push({ ...row, migration: name });
    }
  }
  return inserts;
}

/**
 * @param {string[]} migrationNames
 * @param {string} [repoRoot]
 */
export function migrationsAreBackwardCompatible(migrationNames, repoRoot) {
  if (migrationNames.length === 0) return true;
  const { missing, contracts } = aggregateMigrationContracts(migrationNames, repoRoot);
  if (missing.length > 0) return false;
  return contracts.every((c) => c.contract.backwardCompatible !== false);
}
