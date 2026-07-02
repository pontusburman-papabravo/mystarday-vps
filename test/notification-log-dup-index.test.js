'use strict';

/**
 * M5 — notification_log dup-check index migration exists.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const MIGRATION = path.join(
  __dirname,
  '..',
  'migrations',
  '1809200000000_notification_log_dup_check_idx.js'
);

test('notification_log_dup_check_idx migration defines expected index', () => {
  assert.ok(fs.existsSync(MIGRATION), 'migration file must exist');
  const src = fs.readFileSync(MIGRATION, 'utf8');
  assert.match(src, /notification_log_dup_check_idx/);
  assert.match(src, /ON notification_log \(parent_id, type, created_at DESC\)/);
});
