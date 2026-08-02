'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SCHEDULER_REGISTRY } = require('../src/lib/scheduler-registry');

const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

test('server.js starts every scheduler in SCHEDULER_REGISTRY', () => {
  for (const entry of SCHEDULER_REGISTRY) {
    assert.match(
      serverSrc,
      new RegExp(`${entry.start}\\(\\)`),
      `missing ${entry.start}() in server.js`
    );
    assert.match(
      serverSrc,
      new RegExp(`${entry.stop}\\(\\)`),
      `missing ${entry.stop}() in server.js termination handler`
    );
  }
});

test('registry has unique ids and advisory lock ids where declared', () => {
  const ids = new Set();
  const locks = new Set();
  for (const entry of SCHEDULER_REGISTRY) {
    assert.ok(!ids.has(entry.id), `duplicate scheduler id ${entry.id}`);
    ids.add(entry.id);
    if (entry.advisoryLockId != null) {
      assert.ok(!locks.has(entry.advisoryLockId), `duplicate lock ${entry.advisoryLockId}`);
      locks.add(entry.advisoryLockId);
    }
  }
});
