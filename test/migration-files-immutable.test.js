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
  for (const file of changed) {
    if (mainSet.has(file)) {
      assert.fail(
        `Migration file ${file} exists on origin/main and was modified — add a new migration instead`
      );
    }
  }
});
