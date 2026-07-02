'use strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';

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
    assert.ok(src.includes('evaluateCommunicationGate'), 'must call Journey Gate before send');
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

  it('uses stockholm-time for next-run scheduling (L3)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/lib/win-back-scheduler.js'),
      'utf8'
    );
    assert.ok(src.includes("require('./stockholm-time')"), 'should use shared Stockholm helpers');
    assert.ok(!src.includes('lastSundayOfMonth'), 'manual DST table removed');
  });

  it('is not mounted in server.js (Steg 3 legacy cleanup)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(!src.includes('startWinBackScheduler'));
  });
});
