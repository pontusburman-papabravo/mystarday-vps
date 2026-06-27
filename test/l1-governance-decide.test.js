'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  recommendDecision,
  buildLogLine,
  defaultAnswersFromMetrics,
} = require('../src/lib/l1-governance-decide');

describe('l1-governance-decide', () => {
  it('recommends ACCEPT-UNKNOWN when all green', () => {
    const rec = recommendDecision({
      intent_ok: true,
      non_adoption_baseline: true,
      qualitative_drift: false,
      competition_drift: false,
      edge_case: false,
    }, { metrics: {}, learning_day: 14 });
    assert.equal(rec.decision_type, 'ACCEPT-UNKNOWN');
    assert.equal(rec.state, 'STABLE');
  });

  it('recommends INVESTIGATE on qualitative drift', () => {
    const rec = recommendDecision({
      intent_ok: true,
      non_adoption_baseline: true,
      qualitative_drift: true,
      competition_drift: false,
      edge_case: false,
    }, { metrics: {}, learning_day: 10 });
    assert.equal(rec.decision_type, 'INVESTIGATE');
  });

  it('buildLogLine formats ACCEPT-UNKNOWN', () => {
    const line = buildLogLine('coach_primary_v1', 'ACCEPT-UNKNOWN', {
      intent_ok: true,
      non_adoption_baseline: true,
      qualitative_drift: false,
      competition_drift: false,
    }, 'test');
    assert.match(line, /ACCEPT-UNKNOWN/);
    assert.match(line, /intent:ok/);
    assert.match(line, /@test/);
  });

  it('defaultAnswersFromMetrics is conservative early in LEARNING', () => {
    const a = defaultAnswersFromMetrics({
      coach_clicks_7d: 0,
      conflicts_7d: 0,
      child_access_completed_7d: 0,
    }, 3);
    assert.equal(a.intent_ok, true);
    assert.equal(a.qualitative_drift, false);
  });
});

describe('l1-governance-health', () => {
  const { computeGovernanceHealth } = require('../src/lib/l1-governance-health');

  it('flags recommendation gravity when follow rate high', () => {
    const h = computeGovernanceHealth([
      { decision_type: 'HOLD', answers: { followed_recommendation: true } },
      { decision_type: 'ACCEPT-UNKNOWN', answers: { followed_recommendation: true } },
    ], { coach_clicks_7d: 1, child_access_completed_7d: 0, readiness_clicks_7d: 0 });
    assert.equal(h.gravity_warning, 'recommendation_gravity');
  });
});

describe('l1-go-live-checklist', () => {
  const {
    buildDefaultChecklist,
    mergeChecklist,
    checklistProgress,
  } = require('../src/lib/l1-go-live-checklist');

  it('builds 10 default items with due dates', () => {
    const cl = buildDefaultChecklist('2026-06-01T00:00:00.000Z');
    assert.equal(cl.items.length, 10);
    assert.equal(cl.items[0].key, 'engine_readonly');
    assert.ok(cl.items[0].due_at);
  });

  it('mergeChecklist preserves checked state', () => {
    const base = buildDefaultChecklist('2026-06-01T00:00:00.000Z');
    base.items[0].checked = true;
    base.items[0].checked_at = '2026-06-02T10:00:00.000Z';
    const merged = mergeChecklist(base, '2026-06-01T00:00:00.000Z');
    assert.equal(merged.items[0].checked, true);
    assert.equal(merged.items[0].checked_at, '2026-06-02T10:00:00.000Z');
  });

  it('checklistProgress counts completion', () => {
    const cl = buildDefaultChecklist('2026-06-01T00:00:00.000Z');
    cl.items[0].checked = true;
    const p = checklistProgress(cl.items);
    assert.equal(p.done, 1);
    assert.equal(p.total, 10);
    assert.equal(p.all_complete, false);
  });
});
