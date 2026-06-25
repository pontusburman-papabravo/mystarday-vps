'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SCHEDULERS = [
  'deletion-scheduler.js',
  'push-reminder-scheduler.js',
  'win-back-scheduler.js',
  'retention-reengagement-scheduler.js',
  'custody-handoff-scheduler.js',
  'nyhet-scheduler.js',
  'activation-program-scheduler.js',
  'activation-program-email-scheduler.js',
  'library-notifications.js',
];

describe('scheduler advisory locks (K2+K3)', () => {
  for (const file of SCHEDULERS) {
    it(`${file} uses db.getClient() for pg_try_advisory_lock`, () => {
      const src = fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8');
      assert.ok(src.includes('db.getClient()'), `${file} must lock on a dedicated connection`);
      assert.ok(src.includes('pg_try_advisory_lock'), `${file} must use advisory locks`);
      assert.ok(src.includes('pg_advisory_unlock'), `${file} must release the lock on the same connection`);
      assert.ok(!src.includes('lockAcquired = true'), `${file} must not fail-open on lock errors`);
      assert.ok(!src.includes('return true; // fail-open'), `${file} must not fail-open on lock errors`);
    });
  }
});
