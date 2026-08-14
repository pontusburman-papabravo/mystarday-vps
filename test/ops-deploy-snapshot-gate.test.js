'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.join(__dirname, '..');

describe('deploy database URL contract', () => {
  test('missing DATABASE_URL fails with DATABASE_URL_MISSING', async () => {
    const { resolveDeployDatabaseUrl } = await import('../scripts/ops/lib/deploy-database-url.mjs');
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.ENV_FILE;
    delete env.APP_OPS_APP_ENV;
    const prev = process.env;
    for (const k of Object.keys(env)) process.env[k] = env[k];
    delete process.env.DATABASE_URL;
    try {
      assert.throws(() => resolveDeployDatabaseUrl({ appRoot: '/nonexistent-app' }), (err) => {
        return err.code === 'DATABASE_URL_MISSING';
      });
    } finally {
      process.env = prev;
    }
  });

  test('loads DATABASE_URL from app .env file', async () => {
    const { resolveDeployDatabaseUrl } = await import('../scripts/ops/lib/deploy-database-url.mjs');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-db-'));
    const envFile = path.join(tmp, '.env');
    fs.writeFileSync(
      envFile,
      'DATABASE_URL=postgresql://deploy_test:secret@localhost:5432/deploy_test_db\n',
      'utf8'
    );
    const prevUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const { databaseUrl, source } = resolveDeployDatabaseUrl({ appRoot: tmp });
      assert.equal(databaseUrl.includes('deploy_test_db'), true);
      assert.equal(source, envFile);
    } finally {
      if (prevUrl !== undefined) process.env.DATABASE_URL = prevUrl;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('redactDeploySecrets masks postgres URLs', async () => {
    const { redactDeploySecrets } = await import('../scripts/ops/lib/deploy-database-url.mjs');
    const raw = 'failed: postgresql://user:pass@host.example/db';
    const redacted = redactDeploySecrets(raw);
    assert.doesNotMatch(redacted, /pass@host/);
    assert.match(redacted, /\[REDACTED\]/);
  });
});

describe('migration-aware snapshot compare', () => {
  const baseTables = () => ({
    family: { exists: true, row_count: 10, row_fingerprint_sha256: 'f1' },
    child: { exists: true, row_count: 12, row_fingerprint_sha256: 'c1' },
    daily_log: { exists: true, row_count: 100, row_fingerprint_sha256: 'dl1' },
    reward: { exists: true, row_count: 5, row_fingerprint_sha256: 'r1' },
    reward_redemption: { exists: true, row_count: 3, row_fingerprint_sha256: 'rr1' },
    _migrations: { exists: true, row_count: 5, row_fingerprint_sha256: 'm1' },
    feature_flag: {
      exists: true,
      row_count: 2,
      row_fingerprint_sha256: 'ff1',
      flag_rows: [
        { key: 'win_back_auto_approve', enabled: true },
        { key: 'legacy_flag', enabled: false },
      ],
    },
  });

  test('identical snapshots pass post-deploy-runtime', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const snap = {
      database_identity_hash: 'abc',
      applied_migration_names: ['m1'],
      tables: baseTables(),
    };
    const result = compareDbSnapshots(snap, structuredClone(snap), { mode: 'post-deploy-runtime' });
    assert.equal(result.ok, true);
  });

  test('declared new feature flag default OFF passes post-migration', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810140000002_waitlist_funnel_fields'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push('1810150000000_activation_first_success_v1_flag');
    after.tables._migrations.row_count = 6;
    after.tables.feature_flag.row_count = 3;
    after.tables.feature_flag.flag_rows.push({ key: 'activation_first_success_v1', enabled: false });
    after.tables.feature_flag.row_fingerprint_sha256 = 'ff2';

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
  });

  test('unexpected change to existing flag enabled fails', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: [],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push('1810150000000_activation_first_success_v1_flag');
    after.tables.feature_flag.flag_rows = after.tables.feature_flag.flag_rows.map((r) =>
      r.key === 'legacy_flag' ? { ...r, enabled: true } : r
    );
    after.tables.feature_flag.flag_rows.push({ key: 'activation_first_success_v1', enabled: false });

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, false);
    assert.ok(result.drift.some((d) => d.issue === 'enabled_changed'));
  });

  test('migration contract allows feature_flag insert enabled true when declared', async () => {
    const { validateFeatureFlagMigrationDiff } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const { expectedFeatureFlagInserts } = await import('../scripts/ops/lib/migration-snapshot-manifest.mjs');
    const names = ['1810200000000_journey_retention_home_v1'];
    const expected = expectedFeatureFlagInserts(names, REPO_ROOT);
    const diff = {
      inserts: [{ key: 'journey_retention_home_v1', enabled: true }],
      enabledChanges: [],
      deletes: [],
    };
    const result = validateFeatureFlagMigrationDiff(diff, expected);
    assert.equal(result.ok, true, JSON.stringify(result.drift));
  });

  test('unexpected family row_count drift fails post-migration', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: [],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push('1810150000000_activation_first_success_v1_flag');
    after.tables.family.row_count = 11;
    after.tables.feature_flag.flag_rows.push({ key: 'activation_first_success_v1', enabled: false });

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, false);
    assert.ok(result.drift.some((d) => d.table === 'family'));
  });

  test('zero migrations tolerate live row-count drift in post-migration compare', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810150000000_activation_first_success_v1_flag'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.tables.family.row_count = 9;

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
    assert.ok(result.toleratedLiveDataDrift?.some((d) => d.table === 'family' && d.field === 'row_count'));
  });

  test('zero migrations tolerate live row-count drift in post-deploy-runtime compare', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810150000000_activation_first_success_v1_flag'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.tables.reward.row_count = 42;

    const result = compareDbSnapshots(before, after, {
      mode: 'post-deploy-runtime',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
    assert.ok(result.toleratedLiveDataDrift?.some((d) => d.table === 'reward'));
  });

  test('zero migrations still fail on schema existence drift', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810150000000_activation_first_success_v1_flag'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.tables.family = { exists: false };

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, false);
    assert.ok(result.drift.some((d) => d.issue === 'existence_mismatch' && d.table === 'family'));
    assert.equal(result.toleratedLiveDataDrift?.length || 0, 0);
  });

  test('run 31797036689 zero-migration incident tolerates concurrent prod data drift', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810290000000_standard_library_v11_foundation'],
      tables: {
        ...baseTables(),
        weekly_schedule_item: {
          exists: true,
          row_count: 18998,
          row_fingerprint_sha256: '37557d0f110fb8a6b42a16cccd7d9c4b4e121cfb15e839fce4845d67e087ea2d',
        },
        daily_log_item: {
          exists: true,
          row_count: 164525,
          row_fingerprint_sha256: 'e518a99b7638430e880ec2f2a3acff098ca57193e3a9b55398926b1d341db583',
        },
      },
    };
    const after = structuredClone(before);
    after.tables.weekly_schedule_item.row_count = 18984;
    after.tables.weekly_schedule_item.row_fingerprint_sha256 =
      '4e7e89cb56bb1d5ec937be9f01d2dfe86c1b25228eadefd883b1a33e42102c05';
    after.tables.daily_log_item.row_count = 164524;
    after.tables.daily_log_item.row_fingerprint_sha256 =
      '0c4aec7108607616461813b531ae0b4c4a5a894f65a908464973a0584444f718';

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
    assert.ok(
      result.toleratedLiveDataDrift?.some((d) => d.table === 'weekly_schedule_item' && d.field === 'row_count')
    );
    assert.ok(
      result.toleratedLiveDataDrift?.some((d) => d.table === 'daily_log_item' && d.field === 'row_count')
    );
    assert.equal(result.drift.length, 0);
  });

  test('multiple business tables with row-count drift pass generically without allowlist', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810150000000_activation_first_success_v1_flag'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.tables.child.row_count = 99;
    after.tables.reward_redemption.row_count = 7;
    after.tables.daily_log.row_count = 500;

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
    assert.equal(result.toleratedLiveDataDrift?.length, 3);
  });

  test('multiple migrations in one deploy aggregate flag inserts', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810140000002_waitlist_funnel_fields'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push(
      '1810140000003_growth_feedback_loop_flags',
      '1810150000000_activation_first_success_v1_flag'
    );
    const newFlags = [
      'growth_feedback_v1',
      'growth_referral_cta_v1',
      'growth_stuck_cohorts_v1',
      'growth_waitlist_funnel_v1',
      'activation_first_success_v1',
    ];
    for (const key of newFlags) {
      after.tables.feature_flag.flag_rows.push({ key, enabled: false });
    }
    after.tables.feature_flag.row_count += newFlags.length;

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
  });

  test('unknown migration without contract fails post-migration', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: [],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push('9999999999999_unknown_migration');

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, false);
    assert.ok(result.drift.some((d) => d.issue === 'migration_contract_missing'));
  });

  test('family_feature_override migration passes with schema-only contract', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const { loadMigrationSnapshotContract } = await import(
      '../scripts/ops/lib/migration-snapshot-manifest.mjs'
    );
    const name = '1810160000000_family_feature_override';
    const contract = loadMigrationSnapshotContract(name, REPO_ROOT);
    assert.ok(contract);
    assert.equal(contract.schemaOnly, true);
    assert.equal(contract.backwardCompatible, true);
    assert.equal(contract.featureFlagInserts?.length || 0, 0);

    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810150000000_activation_first_success_v1_flag'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push(name);
    after.tables._migrations.row_count = 6;

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
  });

  test('standard_library_v11_foundation migration passes with schema-only contract', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const { loadMigrationSnapshotContract } = await import(
      '../scripts/ops/lib/migration-snapshot-manifest.mjs'
    );
    const name = '1810290000000_standard_library_v11_foundation';
    const contract = loadMigrationSnapshotContract(name, REPO_ROOT);
    assert.ok(contract);
    assert.equal(contract.schemaOnly, true);
    assert.equal(contract.backwardCompatible, true);
    assert.equal(contract.featureFlagInserts?.length || 0, 0);

    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810280000000_family_device_daily_ux_v1'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push(name);
    after.tables._migrations.row_count += 1;

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, true, JSON.stringify(result.drift));
  });

  test('family_feature_override migration rejects unexpected feature_flag insert', async () => {
    const { compareDbSnapshots } = await import('../scripts/ops/lib/compare-snapshots.mjs');
    const before = {
      database_identity_hash: 'abc',
      applied_migration_names: ['1810150000000_activation_first_success_v1_flag'],
      tables: baseTables(),
    };
    const after = structuredClone(before);
    after.applied_migration_names.push('1810160000000_family_feature_override');
    after.tables.feature_flag.flag_rows.push({ key: 'rogue_flag', enabled: false });

    const result = compareDbSnapshots(before, after, {
      mode: 'post-migration',
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.ok, false);
    assert.ok(result.drift.some((d) => d.issue === 'unexpected_insert'));
  });
});

describe('deploy rollback policy', () => {
  test('failure before migrate → BLOCKED_BEFORE_MIGRATION', async () => {
    const { classifyDeployFailure, DEPLOY_OUTCOME } = await import(
      '../scripts/ops/lib/deploy-rollback-policy.mjs'
    );
    const r = classifyDeployFailure({
      failedPhase: 'pre_snapshot',
      migrationsAppliedThisDeploy: false,
    });
    assert.equal(r.outcome, DEPLOY_OUTCOME.BLOCKED_BEFORE_MIGRATION);
    assert.equal(r.mayRollbackCode, true);
  });

  test('backward-compatible migration + runtime failure → SAFE_CODE_ROLLBACK', async () => {
    const { classifyDeployFailure, DEPLOY_OUTCOME } = await import(
      '../scripts/ops/lib/deploy-rollback-policy.mjs'
    );
    const r = classifyDeployFailure({
      failedPhase: 'post_deploy_runtime',
      migrationsAppliedThisDeploy: true,
      newMigrationNames: ['1810150000000_activation_first_success_v1_flag'],
      repoRoot: REPO_ROOT,
    });
    assert.equal(r.outcome, DEPLOY_OUTCOME.SAFE_CODE_ROLLBACK);
    assert.equal(r.mayRollbackCode, true);
  });

  test('unknown migration after migrate → FORWARD_FIX_REQUIRED', async () => {
    const { classifyDeployFailure, DEPLOY_OUTCOME } = await import(
      '../scripts/ops/lib/deploy-rollback-policy.mjs'
    );
    const r = classifyDeployFailure({
      failedPhase: 'post_migration_compare',
      migrationsAppliedThisDeploy: true,
      newMigrationNames: ['9999999999999_unknown_migration'],
      repoRoot: REPO_ROOT,
    });
    assert.equal(r.outcome, DEPLOY_OUTCOME.FORWARD_FIX_REQUIRED);
    assert.equal(r.mayRollbackCode, false);
  });
});

describe('deploy release identity', () => {
  test('SHA and cache mismatch fails', async () => {
    const { verifyDeployReleaseIdentity } = await import(
      '../scripts/ops/lib/deploy-release-identity.mjs'
    );
    assert.throws(
      () =>
        verifyDeployReleaseIdentity({
          healthJson: { status: 'healthy', git_sha: 'a'.repeat(40), cache_version: 'stjarndag-v1' },
          expectedSha: 'b'.repeat(40),
          expectedCache: 'stjarndag-v1',
        }),
      /git_sha mismatch/
    );
    assert.throws(
      () =>
        verifyDeployReleaseIdentity({
          healthJson: { status: 'healthy', git_sha: 'c'.repeat(40), cache_version: 'stjarndag-v1' },
          expectedSha: 'c'.repeat(40),
          expectedCache: 'stjarndag-v2',
        }),
      /cache_version mismatch/
    );
  });

  test('reads expected cache from config/cache-version.json', async () => {
    const { readExpectedCacheNameFromRepo } = await import(
      '../scripts/ops/lib/deploy-release-identity.mjs'
    );
    const cache = readExpectedCacheNameFromRepo(REPO_ROOT);
    assert.match(cache, /^stjarndag-v\d+$/);
  });
});

describe('vps-deploy-revision contract (snapshot gate)', () => {
  test('loads app .env before database ops', () => {
    const sh = fs.readFileSync(path.join(REPO_ROOT, 'scripts/vps-deploy-revision.sh'), 'utf8');
    const snapIdx = sh.indexOf('db-integrity-snapshot.mjs');
    const envIdx = sh.indexOf('ensure-deploy-database-env.mjs');
    assert.ok(envIdx > -1 && envIdx < snapIdx);
    assert.match(sh, /compare-db-snapshots\.mjs.*post-migration/);
    assert.match(sh, /post-migrate-/);
    assert.match(sh, /verify-deploy-release-identity\.mjs/);
    assert.match(sh, /post-deploy-runtime/);
  });
});
