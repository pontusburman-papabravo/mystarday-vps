'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  isRepairAllowedDatabase,
  assertRepairAllowed,
  repairMissingFeatureFlagSeeds,
} = require('../scripts/lib/pre-public-release-gate/local-flag-repair.cjs');
const { REFUSED_CODE } = require('../scripts/lib/test-database-safety.cjs');

const DISPOSABLE = 'postgresql://test:test@localhost:5432/stjarndag_test';
const PROD_LOCAL = 'postgresql://stjarndag:secret@localhost:5432/stjarndag';

function testEnv(extra = {}) {
  return {
    NODE_ENV: 'test', // pragma: allowlist secret
    TEST_DB_DESTRUCTIVE_CONFIRM: '1',
    ...extra,
  };
}

test('migrate.js does not run unconditional feature_flag repair', () => {
  const src = fs.readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  assert.doesNotMatch(src, /ensureFeatureFlagSeeds/);
  assert.doesNotMatch(src, /snapshotContract\?\.featureFlagInserts/);
});

test('local flag repair refuses remote DATABASE_URL', () => {
  assert.equal(isRepairAllowedDatabase('postgresql://u:p@db.example.com:5432/prod', testEnv()), false);
  assert.throws(
    () => assertRepairAllowed('postgresql://u:p@db.example.com:5432/prod', testEnv()),
    (err) => err.code === 'REPAIR_REFUSED'
  );
});

test('local flag repair refuses localhost prod database name', () => {
  assert.equal(isRepairAllowedDatabase(PROD_LOCAL, testEnv({ DATABASE_URL: PROD_LOCAL })), false);
  assert.throws(
    () => assertRepairAllowed(PROD_LOCAL, testEnv({ DATABASE_URL: PROD_LOCAL })),
    (err) => err.code === 'REPAIR_REFUSED'
  );
});

test('local flag repair allows validated disposable TEST_DATABASE_URL', () => {
  assert.equal(isRepairAllowedDatabase(DISPOSABLE, testEnv()), true);
});

test('repairMissingFeatureFlagSeeds refuses prod host without connecting', async () => {
  await assert.rejects(
    () => repairMissingFeatureFlagSeeds(PROD_LOCAL, { env: testEnv({ DATABASE_URL: PROD_LOCAL }) }),
    (err) => err.code === 'REPAIR_REFUSED'
  );
});

test('setupTestDb source requires test-database-safety before lock', () => {
  const src = fs.readFileSync(path.join(ROOT, 'test/helpers/setup.js'), 'utf8');
  assert.match(src, /assertDestructiveTestDatabaseAllowed/);
  assert.doesNotMatch(src, /process\.env\.DATABASE_URL\s*\|\|\s*process\.env\.TEST_DATABASE_URL/);
});

test('migrate.js applies test-database-safety when NODE_ENV=test', () => {
  const src = fs.readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  assert.match(src, /buildDestructiveTestChildEnv/);
});
