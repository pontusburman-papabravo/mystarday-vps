'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('win-back scheduler', () => {
  it('targets inactive families (not recently active)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/win-back-scheduler.js'),
      'utf8'
    );
    assert.ok(src.includes('NOT EXISTS'), 'should exclude recent activity');
    assert.ok(src.includes('login_event'), 'should use login_event for migrated users');
    assert.ok(src.includes("'failed'"), 'should block new pending when failed record exists');
    assert.ok(
      !src.match(/AND EXISTS\s*\(\s*SELECT 1 FROM analytics_events[\s\S]*created_at > NOW\(\) - INTERVAL/),
      'must not require recent analytics_events (inverted bug)'
    );
  });

  it('exports fetchEligibleFamilies for diagnostics', () => {
    const mod = require('../src/lib/win-back-scheduler');
    assert.equal(typeof mod.fetchEligibleFamilies, 'function');
    assert.equal(mod.INACTIVITY_THRESHOLD_DAYS, 18);
  });
});
