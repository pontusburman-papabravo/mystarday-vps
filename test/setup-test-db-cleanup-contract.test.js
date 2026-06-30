'use strict';

/**
 * Contract: every integration test that calls setupTestDb() must release the
 * PostgreSQL advisory lock via db.cleanup(), or parallel test:gate workers hang.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname);

test('setupTestDb integration tests always call db.cleanup()', () => {
  const offenders = [];

  for (const name of fs.readdirSync(TEST_DIR)) {
    if (!name.endsWith('.test.js')) continue;
    const filePath = path.join(TEST_DIR, name);
    const src = fs.readFileSync(filePath, 'utf8');
    if (!src.includes('setupTestDb(')) continue;
    if (!src.includes('db.cleanup()')) {
      offenders.push(name);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `These tests call setupTestDb() without db.cleanup(): ${offenders.join(', ')}`
  );
});
