'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  HEM_ATTENTION_ORDER,
  hemLoadOutcome,
  hemCoachAllowed,
  hemNothingRequiresAttention,
} = require('../src/lib/hem-attention');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('B2 Hem attention ladder', () => {
  it('locks Safety → Status → Coach → Handoff → Week', () => {
    assert.deepEqual(HEM_ATTENTION_ORDER, ['safety', 'status', 'coach', 'handoff', 'week']);
    const hub = read('public/js/dashboard-home-hub.js');
    const safety = hub.indexOf('data-hem-level="safety"');
    const status = hub.indexOf('data-hem-level="status"');
    const coach = hub.indexOf('data-hem-level="coach"');
    const handoff = hub.indexOf('data-hem-level="handoff"');
    const week = hub.indexOf('data-hem-level="week"');
    assert.ok(safety > 0 && safety < status && status < coach && coach < handoff && handoff < week);
  });

  it('safety + coach → safety wins and coach is blocked', () => {
    assert.equal(hemCoachAllowed(hemLoadOutcome(true, true)), false);
    const orch = read('public/js/home-primary-action.js');
    assert.match(orch, /safetyBlocksCoach/);
    assert.match(orch, /outcome === 'ok_items'/);
    const engine = read('public/js/engine-client.js');
    assert.match(engine, /HomeReadiness\.getLoadOutcome/);
  });

  it('status stays above coach; coach stays above handoff', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.ok(hub.indexOf('data-hem-level="status"') < hub.indexOf('data-hem-level="coach"'));
    assert.ok(hub.indexOf('data-hem-level="coach"') < hub.indexOf('data-hem-level="handoff"'));
  });

  it('no attention items is known-empty, not an error', () => {
    assert.equal(hemNothingRequiresAttention('ok_empty', false), true);
    assert.equal(hemNothingRequiresAttention('error', false), false);
    assert.equal(hemNothingRequiresAttention('ok_empty', true), false);
  });

  it('B1 error is not interpreted as nothing requires attention', () => {
    assert.equal(hemCoachAllowed('error'), false);
    assert.equal(hemNothingRequiresAttention('error', false), false);
    const readiness = read('public/js/home-readiness.js');
    assert.match(readiness, /loadOutcome = 'error'/);
    const orch = read('public/js/home-primary-action.js');
    assert.match(orch, /outcome === 'error'/);
  });

  it('status row only uses family dashboard-stats children', () => {
    const hub = read('public/js/dashboard-home-hub.js');
    assert.match(hub, /stats && stats\.children/);
    assert.doesNotMatch(hub, /\/api\/admin/);
  });
});
