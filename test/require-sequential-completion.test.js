'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('require_sequential_completion parent toggle', () => {
  it('migration adds child.require_sequential_completion default true', () => {
    const src = read('migrations/1809510000000_require_sequential_completion.js');
    assert.match(src, /require_sequential_completion BOOLEAN NOT NULL DEFAULT true/);
  });

  it('UpdateChildSchema accepts require_sequential_completion', () => {
    const src = read('src/lib/schemas.js');
    assert.match(src, /require_sequential_completion: z\.boolean\(\)\.optional\(\)/);
  });

  it('child-self daily log returns require_sequential_completion', () => {
    const src = read('src/routes/daily-logs/child-self.js');
    assert.match(src, /require_sequential_completion/);
    assert.match(src, /require_sequential_completion: requireSequentialCompletion/);
  });

  it('children PUT persists require_sequential_completion', () => {
    const src = read('src/routes/children.js');
    assert.match(src, /require_sequential_completion !== undefined/);
  });

  it('child dashboard respects requireSequentialCompletion in canToggle', () => {
    const src = read('public/js/child-dashboard-activities.js');
    assert.match(src, /function activityCanToggle/);
    assert.match(src, /!requireSequentialCompletion/);
  });

  it('child-settings exposes parent toggle', () => {
    const src = read('public/js/child-settings.js');
    assert.match(src, /En aktivitet i taget/);
    assert.match(src, /toggle-require_sequential_completion/);
  });
});
