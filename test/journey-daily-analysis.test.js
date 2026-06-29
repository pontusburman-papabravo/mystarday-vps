'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildReport } = require('../src/lib/journey/daily-analysis');
const { finalizeChecks } = require('../src/lib/journey/browser-qa');

describe('journey daily-analysis — buildReport', () => {
  it('aggregates measurement points, failures and actions', () => {
    const metrics = {
      rollout: { activeWave: 5 },
      health: { ok: true, checks: [] },
      phases: [{ journey_phase: 'FIRST_USE', n: 100 }],
      funnel30d: { signups_30d: 20, first_success_30d: 0, pct_first_success: 0 },
      bottlenecks: {
        first_use_no_child_login: 80,
        parent_ack_pending: 2,
        first_use_with_completions_no_phase_progress: 10,
      },
      analytics7d: [],
      ingestGap: { families_with_completion_30d: 20, milestone_first_completion_30d: 5 },
    };
    const browserQa = finalizeChecks([
      { id: 'a', ok: true, title: 'ok' },
      { id: 'b', ok: false, title: 'fail', detail: 'broken', action: 'fix it' },
    ]);

    const report = buildReport(metrics, browserQa);
    assert.ok(report.summary.measurementPoints >= 10);
    assert.ok(report.summary.browserQaPoints === 2);
    assert.ok(report.summary.browserQaFailures === 1);
    assert.ok(report.actions.length >= 2);
    assert.ok(report.sections.some((s) => s.id === 'browser_qa'));
    const handoffAction = report.actions.find((a) => a.title.includes('Handoff'));
    assert.ok(handoffAction);
  });

  it('handles missing browser QA gracefully', () => {
    const report = buildReport({
      rollout: { activeWave: 4 },
      health: { ok: true },
      phases: [],
      funnel30d: {},
      bottlenecks: {},
      analytics7d: [],
      ingestGap: {},
    }, null);
    assert.equal(report.summary.browserQaFailures, 0);
    assert.ok(report.sections.find((s) => s.id === 'browser_qa'));
  });
});

describe('journey browser-qa — finalizeChecks', () => {
  it('counts passes and failures', () => {
    const r = finalizeChecks([
      { id: '1', ok: true, title: 'A' },
      { id: '2', ok: false, title: 'B', detail: 'x', action: 'do y' },
    ]);
    assert.equal(r.measurementPoints, 2);
    assert.equal(r.passed, 1);
    assert.equal(r.failures.length, 1);
    assert.equal(r.failures[0].action, 'do y');
  });
});
