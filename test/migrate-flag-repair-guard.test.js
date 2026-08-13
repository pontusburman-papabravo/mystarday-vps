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

test('migrate.js does not run unconditional feature_flag repair', () => {
  const src = fs.readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  assert.doesNotMatch(src, /ensureFeatureFlagSeeds/);
  assert.doesNotMatch(src, /snapshotContract\?\.featureFlagInserts/);
});

test('local flag repair refuses non-local DATABASE_URL', () => {
  assert.equal(isRepairAllowedDatabase('postgresql://u:p@db.example.com:5432/prod'), false);
  assert.throws(
    () => assertRepairAllowed('postgresql://u:p@db.example.com:5432/prod'),
    (err) => err.code === 'REPAIR_REFUSED'
  );
});

test('local flag repair allows localhost DATABASE_URL', () => {
  assert.equal(isRepairAllowedDatabase('postgresql://u:p@localhost:5432/stjarndag'), true);
  assert.equal(isRepairAllowedDatabase('postgresql://u:p@127.0.0.1:5432/stjarndag'), true);
});

test('repairMissingFeatureFlagSeeds refuses remote host without connecting', async () => {
  await assert.rejects(
    () => repairMissingFeatureFlagSeeds('postgresql://u:p@neon.tech:5432/prod'),
    (err) => err.code === 'REPAIR_REFUSED'
  );
});
