'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  EVENT_TYPES,
  evaluateReportDecision,
  buildEmailSubject,
  buildEmailBody,
  formatSupportReportBlock,
  formatDeltaLine,
  hasShownOnlyDelta,
  outcomeBreakdownDelta,
  isNoProgressOnlySummary,
} = require('../src/lib/growth-system-help-ops-report');

function baseMetrics(overrides = {}) {
  return {
    collected_at: '2026-08-18T14:00:00.000Z',
    global_enabled: true,
    override_count: 0,
    analytics_totals: {
      system_help_shown: 12,
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
    support_open_count: 1,
    support_reports_24h: 1,
    support_reports_total: 1,
    latest_support_message_id: 46,
    support_rate: 1 / 12,
    tech_errors_1h: 0,
    analytics_outcome_totals: { progressed: 1, no_progress: 0 },
    analytics_outcome_24h: { progressed: 0, no_progress: 0 },
    recent_completed_outcomes: [],
    help_state: {
      families_shown: 4,
      families_engaged: 3,
      families_no_progress: 0,
    },
    outcome_cohort: {
      window_hours: 72,
      completed_outcomes: 0,
      no_progress_outcomes: 0,
      progressed_outcomes: 1,
      no_progress_rate: 0,
    },
    ...overrides,
  };
}

function previousState(overrides = {}) {
  return {
    analytics_totals: baseMetrics().analytics_totals,
    analytics_outcome_totals: { progressed: 1, no_progress: 0 },
    latest_support_message_id: 46,
    outcome_summary_sent: false,
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

  it('does not email on shown-only delta', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        analytics_totals: {
          ...baseMetrics().analytics_totals,
          system_help_shown: 13,
        },
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldSend, false);
    assert.equal(hasShownOnlyDelta(decision.deltas), true);
  });

  it('emails activity summary on engaged delta', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        analytics_totals: {
          ...baseMetrics().analytics_totals,
          system_help_engaged: 4,
        },
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldSend, true);
    assert.equal(decision.emailKind, 'activity_summary');
    assert.equal(decision.shouldRollback, false);
  });

  it('emails on new support report without rollback', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ latest_support_message_id: 47 }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldSend, true);
    assert.equal(decision.emailKind, 'support_report');
    assert.equal(decision.shouldRollback, false);
  });

  it('rolls back on support signal when reports, shown and rate thresholds met', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        analytics_totals: {
          system_help_shown: 12,
          system_help_engaged: 3,
          system_help_support_requested: 3,
          system_help_progressed: 1,
        },
        support_reports_total: 3,
        support_rate: 3 / 12,
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, true);
    assert.ok(decision.alerts.some((a) => a.code === 'support_signal_rollback'));
  });

  it('does not rollback when support rate is below threshold', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        support_reports_total: 2,
        support_rate: 1 / 12,
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, false);
  });

  it('rolls back on 72h-completed no_progress cohort only', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        outcome_cohort: {
          window_hours: 72,
          completed_outcomes: 10,
          no_progress_outcomes: 8,
          progressed_outcomes: 2,
          no_progress_rate: 0.8,
        },
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, true);
    assert.ok(decision.alerts.some((a) => a.code === 'high_no_progress_rate'));
  });

  it('does not rollback no_progress before min completed outcomes', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        outcome_cohort: {
          window_hours: 72,
          completed_outcomes: 5,
          no_progress_outcomes: 5,
          progressed_outcomes: 0,
          no_progress_rate: 1,
        },
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, false);
  });

  it('rolls back after multiple technical api errors in window', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ tech_errors_1h: 3 }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, true);
    assert.ok(decision.alerts.some((a) => a.code === 'technical_api_errors'));
  });

  it('does not rollback on a single technical api error', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ tech_errors_1h: 1 }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, false);
  });

  it('sends first outcome summary email', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        outcome_cohort: {
          window_hours: 72,
          completed_outcomes: 10,
          no_progress_outcomes: 2,
          progressed_outcomes: 8,
          no_progress_rate: 0.2,
        },
      }),
      previousState: previousState({ outcome_summary_sent: false }),
    });
    assert.equal(decision.shouldSend, true);
    assert.equal(decision.emailKind, 'outcome_summary');
    assert.equal(decision.firstOutcomeSummary, true);
  });

  it('formats rollback subject', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ tech_errors_1h: 3 }),
      previousState: previousState(),
    });
    const subject = buildEmailSubject({ decision, rollbackPerformed: true });
    const body = buildEmailBody({ metrics: baseMetrics(), decision, rollbackPerformed: true });
    assert.match(subject, /ROLLBACK/);
    assert.match(body, /Outcome-kohort/);
  });

  it('includes reporter details in support report email', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({ latest_support_message_id: 47 }),
      previousState: previousState(),
    });
    const metrics = baseMetrics({
      latest_support_message_id: 47,
      new_support_reports: [{
        id: 47,
        name: 'Test Förälder',
        email: 'test@example.com',
        created_at: '2026-08-18T15:13:20.550Z',
        family_id: '11111111-1111-1111-1111-111111111111',
        family_name: 'Testfamiljen',
        metadata: {
          blocking_step: 'no_child',
          help_type: 'onboarding',
          surface: 'help_panel',
          route: '/onboarding',
          platform: 'web',
        },
      }],
    });
    const subject = buildEmailSubject({ decision, rollbackPerformed: false, metrics });
    const body = buildEmailBody({ metrics, decision, rollbackPerformed: false });
    assert.match(subject, /Test Förälder/);
    assert.match(subject, /test@example.com/);
    assert.match(body, /Nya support-rapporter:/);
    assert.match(body, /#47 — Test Förälder <test@example.com>/);
    assert.match(body, /Testfamiljen/);
    assert.match(body, /blocking_step: no_child/);
    assert.match(body, /admin:.*#incidenter/);
  });

  it('formats support report block with metadata', () => {
    const block = formatSupportReportBlock({
      id: 12,
      name: 'Anna',
      email: 'anna@example.com',
      created_at: '2026-08-18T12:00:00.000Z',
      family_id: 'abc',
      family_name: 'Familjen A',
      metadata: { blocking_step: 'no_schedule', platform: 'ios' },
    });
    assert.match(block, /#12 — Anna <anna@example.com>/);
    assert.match(block, /blocking_step: no_schedule/);
    assert.match(block, /platform: ios/);
  });

  it('covers all tracked event types', () => {
    assert.equal(EVENT_TYPES.length, 4);
  });

  it('treats no_progress finalization as Outcome: no_progress, not a win', () => {
    const metrics = baseMetrics({
      analytics_totals: {
        system_help_shown: 2,
        system_help_engaged: 1,
        system_help_support_requested: 1,
        system_help_progressed: 1,
      },
      analytics_24h: {
        system_help_shown: 0,
        system_help_engaged: 0,
        system_help_support_requested: 0,
        system_help_progressed: 1,
      },
      analytics_outcome_totals: { progressed: 0, no_progress: 1 },
      analytics_outcome_24h: { progressed: 0, no_progress: 1 },
      support_open_count: 0,
      support_reports_24h: 0,
      support_reports_total: 0,
      support_rate: 0.5,
      help_state: {
        families_shown: 1,
        families_engaged: 0,
        families_no_progress: 1,
      },
      outcome_cohort: {
        window_hours: 72,
        completed_outcomes: 1,
        no_progress_outcomes: 1,
        progressed_outcomes: 0,
        no_progress_rate: 1,
      },
      recent_completed_outcomes: [{
        family_id: '11111111-1111-1111-1111-111111111111',
        blocking_step: 'schema_no_child_login',
        help_type: 'preview_child_login_help',
        progression_outcome: 'no_progress',
        system_help_shown_at: '2026-08-26T12:00:00.000Z',
      }],
    });
    const decision = evaluateReportDecision({
      metrics,
      previousState: previousState({
        analytics_totals: {
          system_help_shown: 2,
          system_help_engaged: 1,
          system_help_support_requested: 1,
          system_help_progressed: 0,
        },
        analytics_outcome_totals: { progressed: 0, no_progress: 0 },
      }),
    });
    assert.equal(decision.shouldSend, true);
    assert.equal(decision.shouldRollback, false);
    assert.equal(decision.emailKind, 'no_progress_outcome');
    assert.equal(decision.noProgressOnly, true);
    assert.deepEqual(decision.outcomeDeltas, { progressed: 0, no_progress: 1 });

    const subject = buildEmailSubject({ decision, rollbackPerformed: false, metrics });
    const body = buildEmailBody({ metrics, decision, rollbackPerformed: false });
    assert.equal(subject, '[Systemhjälp] Outcome: no_progress');
    assert.match(body, /\+1 system_help_progressed \(\+1 no_progress\)/);
    assert.match(body, /totalt no_progress: 1/);
    assert.match(body, /totalt progressed: 0/);
    assert.match(body, /klick i appen/);
    assert.match(body, /nuvarande episod/);
    assert.match(body, /Senaste färdiga outcomes:/);
    assert.match(body, /no_progress · schema_no_child_login/);
    assert.doesNotMatch(body, /ÅTGÄRD: Global flagga/);
  });

  it('keeps activity_summary when engage arrives with a no_progress close', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        analytics_totals: {
          ...baseMetrics().analytics_totals,
          system_help_engaged: 4,
          system_help_progressed: 2,
        },
        analytics_outcome_totals: { progressed: 1, no_progress: 1 },
      }),
      previousState: previousState({
        analytics_totals: baseMetrics().analytics_totals,
        analytics_outcome_totals: { progressed: 1, no_progress: 0 },
      }),
    });
    assert.equal(decision.emailKind, 'activity_summary');
    assert.equal(decision.noProgressOnly, false);
  });

  it('does not rollback a single completed no_progress outcome', () => {
    const decision = evaluateReportDecision({
      metrics: baseMetrics({
        outcome_cohort: {
          window_hours: 72,
          completed_outcomes: 1,
          no_progress_outcomes: 1,
          progressed_outcomes: 0,
          no_progress_rate: 1,
        },
      }),
      previousState: previousState(),
    });
    assert.equal(decision.shouldRollback, false);
    assert.equal(decision.alerts.some((a) => a.code === 'high_no_progress_rate'), false);
  });

  it('annotates progressed delta with outcome split', () => {
    const line = formatDeltaLine(
      { system_help_progressed: 1 },
      { progressed: 0, no_progress: 1 }
    );
    assert.equal(line, '+1 system_help_progressed (+1 no_progress)');
  });

  it('attributes first-run progressed delta only when mix is unambiguous', () => {
    assert.deepEqual(
      outcomeBreakdownDelta(
        { analytics_outcome_totals: { progressed: 0, no_progress: 1 } },
        {},
        1
      ),
      { progressed: 0, no_progress: 1 }
    );
    assert.deepEqual(
      outcomeBreakdownDelta(
        { analytics_outcome_totals: { progressed: 2, no_progress: 3 } },
        {},
        1
      ),
      { progressed: 0, no_progress: 0 }
    );
    assert.equal(
      isNoProgressOnlySummary(
        { system_help_engaged: 0, system_help_support_requested: 0, system_help_progressed: 1 },
        { progressed: 0, no_progress: 1 }
      ),
      true
    );
  });
});
