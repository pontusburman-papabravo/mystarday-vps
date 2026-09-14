'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { isSilentAppliedMigrationEdit } = require('./helpers/migration-immutability');

const REPO_ROOT = path.join(__dirname, '..');

// Three-dot: only this branch's changes since merge-base. Two-dot treats
// migrations added on origin/main after the fork as in-place edits.
const IMMUTABLE_MIGRATION_DIFF = 'git diff origin/main...HEAD -- migrations/';

test('behind-main new migration is not an in-place edit', () => {
  assert.equal(
    isSilentAppliedMigrationEdit({ onMain: true, onHead: false, existedAtMergeBase: false }),
    false
  );
});

test('editing or deleting a merge-base migration is an in-place edit', () => {
  assert.equal(
    isSilentAppliedMigrationEdit({ onMain: true, onHead: true, existedAtMergeBase: true }),
    true
  );
  assert.equal(
    isSilentAppliedMigrationEdit({ onMain: true, onHead: false, existedAtMergeBase: true }),
    true
  );
});

test('new migration only on the branch is allowed', () => {
  assert.equal(
    isSilentAppliedMigrationEdit({ onMain: false, onHead: true, existedAtMergeBase: false }),
    false
  );
});

test('immutability diff is three-dot so later main migrations are not false FAILs', () => {
  assert.equal(IMMUTABLE_MIGRATION_DIFF, 'git diff origin/main...HEAD -- migrations/');
});

test('applied migration files match origin/main (no silent edits)', () => {
  let diff;
  try {
    diff = execSync(IMMUTABLE_MIGRATION_DIFF, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch (err) {
    if (err.status === 128) {
      return;
    }
    throw err;
  }

  if (!diff) return;

  const changed = diff
    .split('\n')
    .filter((line) => line.startsWith('diff --git'))
    .map((line) => line.replace(/^diff --git a\/migrations\//, '').split(' ')[0]);

  const mainList = execSync('git ls-tree -r --name-only origin/main migrations/', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((p) => p.replace(/^migrations\//, ''));

  let mergeBaseFiles = new Set();
  try {
    const mergeBase = execSync('git merge-base origin/main HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    mergeBaseFiles = new Set(
      execSync(`git ls-tree -r --name-only ${mergeBase} migrations/`, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((p) => p.replace(/^migrations\//, ''))
    );
  } catch (err) {
    if (err.status !== 128) throw err;
  }

  const mainSet = new Set(mainList);
  // 181047 never applied on live VPS (seed reused $5 for DATE closes_at and
  // TIMESTAMPTZ contest_closes_at → "inconsistent types deduced for parameter $5").
  // In-place fix is required so the failed up() can succeed on deploy.
  const allowedInPlaceFixes = new Set(['1810470000000_host_2026_survey.js']);
  for (const file of changed) {
    const onHead = fs.existsSync(path.join(REPO_ROOT, 'migrations', file));
    const silent = isSilentAppliedMigrationEdit({
      onMain: mainSet.has(file),
      onHead,
      existedAtMergeBase: mergeBaseFiles.has(file),
    });
    if (silent && !allowedInPlaceFixes.has(file)) {
      assert.fail(
        `Migration file ${file} exists on origin/main and was modified — add a new migration instead`
      );
    }
  }
});
