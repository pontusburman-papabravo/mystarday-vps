'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  engineCtxFromPatternRow,
  isCustodyHandoffEve,
} = require('../src/lib/custody-notify');

const ROOT = path.join(__dirname, '..');

function weeksPatternCtx(anchor = '2026-06-01') {
  const pattern = {
    anchor_date: anchor,
    interval_weeks: 2,
    week_a_home_id: 'a',
    week_b_home_id: 'b',
    pattern_type: 'alternate_weeks',
    configuration: { home_a: 'a', home_b: 'b' },
  };
  const homesById = {
    a: { id: 'a', label: 'Hos A', color: '#22C55E' },
    b: { id: 'b', label: 'Hos B', color: '#4F46E5' },
  };
  return engineCtxFromPatternRow(pattern, homesById);
}

describe('custody-notify (Phase 4.4)', () => {
  it('modules use engine, not custody-resolver', () => {
    for (const rel of [
      'src/lib/custody-notify.js',
      'src/lib/custody-handoff-scheduler.js',
      'src/lib/push-reminder-scheduler.js',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.doesNotMatch(src, /custody-resolver/);
      assert.doesNotMatch(src, /getWeekVariantForDate/);
    }
    const notify = fs.readFileSync(path.join(ROOT, 'src/lib/custody-notify.js'), 'utf8');
    assert.match(notify, /resolveCustodyDateSync/);
    const handoff = fs.readFileSync(path.join(ROOT, 'src/lib/custody-handoff-scheduler.js'), 'utf8');
    assert.match(handoff, /resolveCustodyDateSync/);
    const push = fs.readFileSync(path.join(ROOT, 'src/lib/push-reminder-scheduler.js'), 'utf8');
    assert.match(push, /getNotifyParentIdsForChildDate/);
  });

  it('isCustodyHandoffEve detects active home change tomorrow', () => {
    const ctx = weeksPatternCtx();
    assert.equal(isCustodyHandoffEve(ctx, '2026-06-07'), true);
    assert.equal(isCustodyHandoffEve(ctx, '2026-06-04'), false);
  });

  it('isCustodyHandoffEve is false without schedule', () => {
    const ctx = engineCtxFromPatternRow({}, {});
    assert.equal(isCustodyHandoffEve(ctx, '2026-06-07'), false);
  });

  it('getNotifyParentIds returns [] when activeHome unresolved (no custody-specific notify)', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/custody-notify.js'), 'utf8');
    assert.match(src, /resolved\.source === 'fallback'/);
    assert.match(src, /return \[\]/);
  });
});
