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
