'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

test('applied migration files match origin/main (no silent edits)', () => {
  let diff;
  try {
    diff = execSync('git diff origin/main -- migrations/', {
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

  const mainSet = new Set(mainList);
  // 181047 never applied on live VPS (seed reused $5 for DATE closes_at and
  // TIMESTAMPTZ contest_closes_at → "inconsistent types deduced for parameter $5").
  // In-place fix is required so the failed up() can succeed on deploy.
  const allowedInPlaceFixes = new Set(['1810470000000_host_2026_survey.js']);
  for (const file of changed) {
    if (mainSet.has(file) && !allowedInPlaceFixes.has(file)) {
      assert.fail(
        `Migration file ${file} exists on origin/main and was modified — add a new migration instead`
      );
    }
  }
});
