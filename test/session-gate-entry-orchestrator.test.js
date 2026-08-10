'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('SessionGate + AppEntryOrchestrator (Fas 2B contract J)', () => {
  it('defers gate while entry orchestrator pending', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(gate, /shouldDeferSessionGate/);
    assert.match(orch, /__DEFER_SESSION_GATE_FOR_ENTRY__/);
  });

  it('child-home authoritative decision redirects to child path not child-login', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    assert.match(gate, /destination === 'child-home'/);
    assert.match(gate, /getAppliedDecision/);
    assert.match(gate, /isDecisionApplied/);
  });

  it('orchestrator navigates once via replace', () => {
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(orch, /navigateOnce/);
    assert.match(orch, /NAV_GUARD_KEY/);
    assert.match(orch, /location\.replace/);
  });

  it('bootstrap delegates to orchestrator before legacy restore', () => {
    const boot = fs.readFileSync(path.join(ROOT, 'public/js/trusted-device-bootstrap.js'), 'utf8');
    assert.match(boot, /AppEntryOrchestrator\.runColdStart/);
    assert.match(boot, /ORCHESTRATOR_OFF/);
  });

  it('when orchestrator is active, session gate prefers applied decision over DeviceMode', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'public/js/session-gate.js'), 'utf8');
    const idx = gate.indexOf('function isChildViewAuthoritative');
    assert.ok(idx > 0);
    const fn = gate.slice(idx, idx + 700);
    assert.match(fn, /AppEntryOrchestrator\.isActive/);
    assert.match(fn, /getAppliedViewContext/);
    const deviceIdx = fn.indexOf('DeviceMode');
    const orchIdx = fn.indexOf('AppEntryOrchestrator');
    assert.ok(orchIdx >= 0 && (deviceIdx < 0 || orchIdx < deviceIdx),
      'orchestrator branch must be evaluated before DeviceMode fallback');
  });
});

describe('app-entry API route mounted', () => {
  it('auth index mounts app-entry router', () => {
    const idx = fs.readFileSync(path.join(ROOT, 'src/routes/auth/index.js'), 'utf8');
    assert.match(idx, /app-entry/);
  });
});
