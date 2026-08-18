'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  EVENT_TYPES,
  evaluateReportDecision,
  buildEmailSubject,
  buildEmailBody,
} = require('../src/lib/growth-system-help-ops-report');

function baseMetrics(overrides = {}) {
  return {
    collected_at: '2026-08-18T14:00:00.000Z',
    global_enabled: true,
    override_count: 0,
    analytics_totals: {
      system_help_shown: 5,
      system_help_engaged: 3,
      system_help_support_requested: 1,
      system_help_progressed: 1,
    },
    analytics_24h: {
      system_help_shown: 2,
      system_help_engaged: 1,
      system_help_support_requested: 0,
      system_help_progressed: 0,
    },
    support_open_count: 0,
    support_reports_24h: 0,
    latest_support_message_id: 46,
    help_state: {
      families_shown: 4,
      families_engaged: 3,
      families_no_progress: 0,
    },
    outcome_signals: {
      shown_24h: 2,
      progressed_24h: 0,
      no_progress_marked_72h: 0,
    },
    ...overrides,
  };
}

describe('growth-system-help-ops-report', () => {
  it('seeds baseline on first run without sending', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics(),
      previousState: null,
    });
    assert.equal(decision.shouldSend, false);
    assert.equal(decision.seedOnly, true);
  });

  it('sends when analytics totals increase', () => {
    const metrics = baseMetrics({
      analytics_totals: {
        system_help_shown: 6,
        system_help_engaged: 3,
        system_help_support_requested: 1,
        system_help_progressed: 1,
      },
    });
    const decision = evaluateReportDecision({
      metrics,
      previousState: {
        analytics_totals: baseMetrics().analytics_totals,
        latest_support_message_id: 46,
      },
    });
    assert.equal(decision.shouldSend, true);
    assert.equal(decision.deltas.system_help_shown, 1);
    assert.equal(decision.shouldRollback, false);
  });

  it('sends on new support report id', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ latest_support_message_id: 47 }),
      previousState: {
        analytics_totals: baseMetrics().analytics_totals,
        latest_support_message_id: 46,
      },
    });
    assert.equal(decision.shouldSend, true);
    assert.ok(decision.alerts.some((a) => a.code === 'new_support_report'));
  });

  it('triggers rollback on support spike threshold', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ support_reports_24h: 3 }),
      previousState: {
        analytics_totals: baseMetrics().analytics_totals,
        latest_support_message_id: 46,
      },
    });
    assert.equal(decision.shouldRollback, true);
    assert.equal(decision.shouldSend, true);
  });

  it('triggers rollback on high no-progress rate', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        outcome_signals: {
          shown_24h: 12,
          progressed_24h: 0,
          no_progress_marked_72h: 10,
        },
      }),
      previousState: {
        analytics_totals: baseMetrics().analytics_totals,
        latest_support_message_id: 46,
      },
    });
    assert.equal(decision.shouldRollback, true);
    assert.ok(decision.alerts.some((a) => a.code === 'high_no_progress_rate'));
  });

  it('formats email subject and body with deltas', () => {
    const metrics = baseMetrics({
      analytics_totals: {
        system_help_shown: 6,
        system_help_engaged: 3,
        system_help_support_requested: 1,
        system_help_progressed: 1,
      },
    });
    const decision = evaluateReportDecision({
      metrics,
      previousState: {
        analytics_totals: baseMetrics().analytics_totals,
        latest_support_message_id: 46,
      },
    });
    const subject = buildEmailSubject({ metrics, decision, rollbackPerformed: false });
    const body = buildEmailBody({ metrics, decision, rollbackPerformed: false });
    assert.match(subject, /Ny aktivitet/);
    assert.match(body, /system_help_shown: 6/);
    assert.match(body, /Systemhjälp v1/);
  });

  it('covers all tracked event types', () => {
    assert.equal(EVENT_TYPES.length, 4);
  });
});
