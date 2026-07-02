'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('H2† authz middleware mounted', () => {
  it('daily-logs/logs.js uses requireLogAccess on :logId routes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/daily-logs/logs.js'), 'utf8');
    assert.match(src, /requireLogAccess\('logId'\)/);
    assert.doesNotMatch(src, /getLogAccess\(req\.user\.id/);
  });

  it('daily-logs/items.js uses requireItemAccess on :itemId routes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/daily-logs/items.js'), 'utf8');
    const matches = src.match(/requireItemAccess\('itemId'\)/g) || [];
    assert.ok(matches.length >= 4, 'expected requireItemAccess on item CRUD routes');
    assert.doesNotMatch(src, /getItemAccess\(req\.user\.id, req\.params\.itemId\)/);
  });
});
