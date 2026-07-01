'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

describe('schema_saved backfill migration', () => {
  it('backfills from weekly_schedule.created_at when milestone missing', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1808940000000_backfill_schema_saved_at.js'),
      'utf8'
    );
    assert.match(src, /schema_saved_at IS NULL/);
    assert.match(src, /MIN\(ws\.created_at\)/);
    assert.match(src, /p0_activated_within_48h/);
  });
});

describe('seed-child-default-schedule milestone', () => {
  it('sets schema_saved via updateActivationState after successful seed', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/lib/seed-child-default-schedule.js'),
      'utf8'
    );
    assert.match(src, /updateActivationState\(familyId, 'schema_saved'/);
    assert.match(src, /child_default_schedule_seed/);
  });
});

describe('activation funnel schema step', () => {
  it('routine_ready counts schema_saved_at only (no weekly_schedule fallback)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/activation-funnel.js'), 'utf8');
    assert.match(src, /schema_saved_at IS NOT NULL/);
    assert.doesNotMatch(src, /weekly_schedule/);
  });
});
