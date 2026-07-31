'use strict';

/**
 * E3c — daily-logs authz contract (N/A for code changes after D1c + E3b).
 * Parent-facing routers must use centralized authz helpers; no raw parent_child JOINs.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DL = path.join(ROOT, 'src/routes/daily-logs');

function read(name) {
  return fs.readFileSync(path.join(DL, name), 'utf8');
}

describe('E3c — daily-logs authz helper usage (contract)', () => {
  it('parent router uses getChildAccess, not raw parent_child', () => {
    const src = read('parent.js');
    assert.match(src, /getChildAccess/);
    assert.doesNotMatch(src, /parent_child/);
  });

  it('items router uses getItemAccess', () => {
    const src = read('items.js');
    assert.match(src, /getItemAccess/);
    assert.doesNotMatch(src, /parent_child/);
  });

  it('logs router uses requireLogAccess middleware', () => {
    const src = read('logs.js');
    assert.match(src, /requireLogAccess/);
    assert.doesNotMatch(src, /parent_child/);
  });

  it('child-self router uses child ownership helper, not parent authz', () => {
    const src = read('child-self.js');
    assert.match(src, /getChildOwnedLogItem/);
    assert.match(src, /requireChild/);
    assert.doesNotMatch(src, /getChildAccess|getItemAccess|getLogAccess/);
    assert.doesNotMatch(src, /parent_child/);
  });
});
