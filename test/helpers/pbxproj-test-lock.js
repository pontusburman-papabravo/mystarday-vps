'use strict';

const fs = require('fs');
const path = require('path');

const LOCK = path.join(__dirname, '../../ios/App/App.xcodeproj/project.pbxproj.test-lock');
const WAIT_MS = 20000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Serializes tests that read or temporarily rewrite ios project.pbxproj.
 * Node's test runner executes files in parallel, and widget tests poison
 * that shared file for a single case. Every snapshot, rewrite, and restore
 * of the shared project must happen inside withPbxLock. A suite before/after
 * that touches the file outside the lock races with the other writers.
 */
function withPbxLock(fn) {
  const start = Date.now();
  for (;;) {
    let fd;
    try {
      fd = fs.openSync(LOCK, 'wx');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() - start > WAIT_MS) {
        throw new Error('Timed out waiting for project.pbxproj test lock');
      }
      sleep(25);
      continue;
    }
    try {
      return fn();
    } finally {
      fs.closeSync(fd);
      try { fs.unlinkSync(LOCK); } catch (_) { /* another waiter may already see it gone */ }
    }
  }
}

module.exports = { withPbxLock };
