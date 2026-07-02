'use strict';

/**
 * M1 — fire-and-forget catch blocks must log errors (no silent swallow).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  'src/routes/daily-logs/items.js',
  'src/routes/daily-logs/child-self.js',
  'src/routes/goals.js',
  'src/routes/schedules/fill-week.js',
  'src/middleware/authz.js',
];

const SILENT_CATCH_RE = /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g;
const SILENT_CATCH_UNDERSCORE_RE = /catch\s*\(\s*_\s*\)\s*\{\s*\}/g;
const SILENT_CATCH_NEXT_RE = /\.catch\(\s*next\s*\)/g;

describe('empty catch logging contract (M1)', () => {
  for (const rel of FILES) {
    it(`${rel} has no silent empty catch blocks`, () => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const silentEmpty = src.match(SILENT_CATCH_RE) || [];
      const silentUnderscore = src.match(SILENT_CATCH_UNDERSCORE_RE) || [];
      const silentNext = rel.endsWith('authz.js') ? (src.match(SILENT_CATCH_NEXT_RE) || []) : [];
      assert.equal(
        silentEmpty.length + silentUnderscore.length + silentNext.length,
        0,
        `silent catch in ${rel}: ${[...silentEmpty, ...silentUnderscore, ...silentNext].join(', ')}`
      );
      assert.match(src, /console\.error/, `${rel} should log errors in catch handlers`);
    });
  }

  it('authz requirePrimaryParent logs before next(err)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/authz.js'), 'utf8');
    assert.match(src, /requirePrimaryParent failed for parent/);
  });
});
