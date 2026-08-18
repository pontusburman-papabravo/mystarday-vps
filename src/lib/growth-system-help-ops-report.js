'use strict';

/**
 * Ops email report for growth_system_help_v1 global rollout.
 * Sends to GROWTH_SYSTEM_HELP_REPORT_EMAIL (default: configured EMAIL_FROM) when activity
 * or alert thresholds warrant it — not on a fixed digest schedule.
 */

const db = require('./db');
const appSettings = require('../../db/app-settings');
const { sendEmail } = require('./email');
const config = require('./config');
const { FLAG_KEY } = require('./growth-system-help');

const STATE_KEY = 'growth_system_help_ops_report_state';
const SUPPORT_MESSAGE_PREFIX = '[Systemhjälp — Rapportera problem]';
const OUTCOME_WINDOW_MS = 72 * 60 * 60 * 1000;
const TECH_ERROR_EVENT = 'system_help_api_error';

const EVENT_TYPES = Object.freeze([
  'system_help_shown',
  'system_help_engaged',
  'system_help_support_requested',
  'system_help_progressed',
]);

const SUMMARY_EVENT_TYPES = Object.freeze([
  'system_help_engaged',
  'system_help_support_requested',
  'system_help_progressed',
]);

function reportEmail() {
  const raw = process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL;
  return (raw && raw.trim()) || config.email.from;
}

function rollbackSupportMinReports() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_ROLLBACK_SUPPORT_MIN_REPORTS);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

function rollbackSupportMinShown() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_ROLLBACK_SUPPORT_MIN_SHOWN);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function rollbackSupportRate() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_ROLLBACK_SUPPORT_RATE);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.2;
}

function noProgressRollbackMinOutcomes() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_ROLLBACK_NO_PROGRESS_MIN_OUTCOMES);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function noProgressRollbackRate() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_ROLLBACK_NO_PROGRESS_RATE);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.8;
}

function techErrorRollbackThreshold() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_ROLLBACK_TECH_ERRORS_1H);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function outcomeSummaryMinCompleted() {
  const n = Number(process.env.GROWTH_SYSTEM_HELP_OUTCOME_SUMMARY_MIN);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

async function queryEventCounts(since = null) {
  const counts = {};
  for (const eventType of EVENT_TYPES) {
    const params = [eventType];
    let sql = 'SELECT count(*)::int AS c FROM analytics_events WHERE event_type = $1';
    if (since) {
      sql += ' AND created_at > $2';
      params.push(since);
    }
    const { rows } = await db.query(sql, params);
    counts[eventType] = rows[0]?.c ?? 0;
  }
  return counts;
}

async function queryTechErrorsSince(since) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS c FROM analytics_events
     WHERE event_type = $1 AND created_at > $2`,
    [TECH_ERROR_EVENT, since]
  );
  return rows[0]?.c ?? 0;
}

async function queryCompletedOutcomes(outcomeWindowEnd) {
  const { rows } = await db.query(
    `SELECT
       count(*) FILTER (
         WHERE system_help_shown_at IS NOT NULL
           AND system_help_shown_at <= $1
           AND progression_outcome IS NOT NULL
       )::int AS completed_outcomes,
       count(*) FILTER (
         WHERE system_help_shown_at IS NOT NULL
           AND system_help_shown_at <= $1
           AND progression_outcome = 'no_progress'
       )::int AS no_progress_outcomes,
       count(*) FILTER (
         WHERE progression_outcome IN ('progressed_24h', 'progressed_72h')
       )::int AS progressed_outcomes
     FROM family_system_help_state`,
    [outcomeWindowEnd]
  );
  return rows[0] || {
    completed_outcomes: 0,
    no_progress_outcomes: 0,
    progressed_outcomes: 0,
  };
}

async function collectMetrics(now = new Date()) {
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since1h = new Date(now.getTime() - 60 * 60 * 1000);
  const outcomeWindowEnd = new Date(now.getTime() - OUTCOME_WINDOW_MS);

  const [
    globalFlag,
    overrides,
    totals,
    last24h,
    support,
    supportLatest,
    helpState,
    completedOutcomes,
    techErrors1h,
    supportReportsTotal,
  ] = await Promise.all([
    db.query('SELECT enabled, updated_at FROM feature_flag WHERE key = $1 LIMIT 1', [FLAG_KEY]),
    db.query('SELECT count(*)::int AS c FROM family_feature_override WHERE feature_key = $1', [FLAG_KEY]),
    queryEventCounts(),
    queryEventCounts(since24h),
    db.query(
      `SELECT count(*)::int AS open_count,
              count(*) FILTER (WHERE created_at > $2 AND status IS DISTINCT FROM 'archived')::int AS reports_24h
       FROM contact_message
       WHERE message LIKE $1 AND status IS DISTINCT FROM 'archived'`,
      [`${SUPPORT_MESSAGE_PREFIX}%`, since24h]
    ),
    db.query(
      `SELECT coalesce(max(id), 0)::int AS latest_id
       FROM contact_message
       WHERE message LIKE $1`,
      [`${SUPPORT_MESSAGE_PREFIX}%`]
    ),
    db.query(
      `SELECT
         count(*) FILTER (WHERE system_help_shown_at IS NOT NULL)::int AS families_shown,
         count(*) FILTER (WHERE system_help_engaged_at IS NOT NULL)::int AS families_engaged,
         count(*) FILTER (WHERE progression_outcome = 'no_progress')::int AS families_no_progress
       FROM family_system_help_state`
    ),
    queryCompletedOutcomes(outcomeWindowEnd),
    queryTechErrorsSince(since1h),
    db.query(
      `SELECT count(*)::int AS c FROM contact_message
       WHERE message LIKE $1 AND status IS DISTINCT FROM 'archived'`,
      [`${SUPPORT_MESSAGE_PREFIX}%`]
    ),
  ]);

  const shown = totals.system_help_shown || 0;
  const supportRequested = totals.system_help_support_requested || 0;

  return {
    collected_at: now.toISOString(),
    global_enabled: Boolean(globalFlag.rows[0]?.enabled),
    global_updated_at: globalFlag.rows[0]?.updated_at || null,
    override_count: overrides.rows[0]?.c ?? 0,
    analytics_totals: totals,
    analytics_24h: last24h,
    support_open_count: support.rows[0]?.open_count ?? 0,
    support_reports_24h: support.rows[0]?.reports_24h ?? 0,
    support_reports_total: supportReportsTotal.rows[0]?.c ?? 0,
    latest_support_message_id: supportLatest.rows[0]?.latest_id ?? 0,
    help_state: helpState.rows[0] || {
      families_shown: 0,
      families_engaged: 0,
      families_no_progress: 0,
    },
    outcome_cohort: {
      window_hours: 72,
      completed_outcomes: completedOutcomes.completed_outcomes,
      no_progress_outcomes: completedOutcomes.no_progress_outcomes,
      progressed_outcomes: completedOutcomes.progressed_outcomes,
      no_progress_rate: completedOutcomes.completed_outcomes > 0
        ? completedOutcomes.no_progress_outcomes / completedOutcomes.completed_outcomes
        : 0,
    },
    support_rate: shown > 0 ? supportRequested / shown : 0,
    tech_errors_1h: techErrors1h,
  };
}

function diffCounts(current, previous) {
  const delta = {};
  let any = false;
  for (const key of EVENT_TYPES) {
    const cur = current?.[key] ?? 0;
    const prev = previous?.[key] ?? 0;
    const d = cur - prev;
    delta[key] = d;
    if (d > 0) any = true;
  }
  return { delta, any };
}

function hasMeaningfulActivityDelta(delta) {
  return SUMMARY_EVENT_TYPES.some((k) => (delta[k] || 0) > 0);
}

function hasShownOnlyDelta(delta) {
  const shownDelta = delta.system_help_shown || 0;
  if (shownDelta <= 0) return false;
  return !hasMeaningfulActivityDelta(delta);
}

/**
 * Pure decision logic — unit tested.
 * @param {{ metrics: object, previousState: object|null, now?: Date }} input
 */
function evaluateReportDecision({ metrics, previousState, now = new Date() }) {
  const alerts = [];
  const reasons = [];

  if (!previousState) {
    return {
      shouldSend: false,
      shouldRollback: false,
      seedOnly: true,
      emailKind: null,
      deltas: Object.fromEntries(EVENT_TYPES.map((k) => [k, 0])),
      alerts,
      reasons: ['initial_baseline_seed'],
    };
  }

  const { delta } = diffCounts(metrics.analytics_totals, previousState.analytics_totals);

  const newSupportId = metrics.latest_support_message_id > (previousState.latest_support_message_id || 0);
  if (newSupportId) {
    alerts.push({ level: 'info', code: 'new_support_report' });
    reasons.push('new_support_report');
  }

  if (metrics.tech_errors_1h >= techErrorRollbackThreshold()) {
    alerts.push({ level: 'critical', code: 'technical_api_errors' });
    reasons.push('technical_api_errors');
  }

  const shown = metrics.analytics_totals.system_help_shown || 0;
  const supportRate = metrics.support_rate || 0;
  const supportReports = metrics.support_reports_total || 0;

  const supportRollbackReady =
    supportReports >= rollbackSupportMinReports()
    && shown >= rollbackSupportMinShown()
    && supportRate >= rollbackSupportRate();

  if (supportRollbackReady) {
    alerts.push({ level: 'critical', code: 'support_signal_rollback' });
    reasons.push('support_signal_rollback');
  } else if (
    supportReports >= rollbackSupportMinReports() - 1
    || (shown >= rollbackSupportMinShown() && supportRate >= rollbackSupportRate() * 0.75)
  ) {
    alerts.push({ level: 'warn', code: 'support_signal_warning' });
    reasons.push('support_signal_warning');
  }

  const completed = metrics.outcome_cohort?.completed_outcomes || 0;
  const noProgressRate = metrics.outcome_cohort?.no_progress_rate || 0;
  const noProgressRollbackReady =
    completed >= noProgressRollbackMinOutcomes()
    && noProgressRate >= noProgressRollbackRate();

  if (noProgressRollbackReady) {
    alerts.push({ level: 'critical', code: 'high_no_progress_rate' });
    reasons.push('high_no_progress_rate');
  }

  const firstOutcomeSummary =
    completed >= outcomeSummaryMinCompleted()
    && !previousState.outcome_summary_sent;

  if (firstOutcomeSummary) {
    reasons.push('first_outcome_summary');
  }

  const meaningfulSummary = hasMeaningfulActivityDelta(delta);

  if (meaningfulSummary) {
    reasons.push('activity_summary');
  }

  const shouldRollback = alerts.some((a) => a.level === 'critical');
  const shouldSend = Boolean(
    newSupportId
    || shouldRollback
    || alerts.some((a) => a.level === 'warn')
    || firstOutcomeSummary
    || meaningfulSummary
  );

  let emailKind = null;
  if (shouldRollback) emailKind = 'rollback';
  else if (newSupportId) emailKind = 'support_report';
  else if (alerts.some((a) => a.level === 'warn')) emailKind = 'warning';
  else if (firstOutcomeSummary) emailKind = 'outcome_summary';
  else if (meaningfulSummary) emailKind = 'activity_summary';

  return {
    shouldSend,
    shouldRollback,
    seedOnly: false,
    emailKind,
    deltas: delta,
    alerts,
    reasons,
    firstOutcomeSummary,
  };
}

function formatDeltaLine(deltas) {
  return EVENT_TYPES
    .filter((k) => (deltas[k] || 0) > 0)
    .map((k) => `+${deltas[k]} ${k}`)
    .join(', ');
}

function buildEmailBody({ metrics, decision, rollbackPerformed }) {
  const lines = [
    'Systemhjälp v1 — ops-rapport',
    '',
    `Tid (UTC): ${metrics.collected_at}`,
    `Global flagga: ${metrics.global_enabled ? 'ON' : 'OFF'}`,
    `Family overrides: ${metrics.override_count}`,
    '',
    'Analytics (totalt):',
    ...EVENT_TYPES.map((k) => `  ${k}: ${metrics.analytics_totals[k] ?? 0}`),
    '',
    'Analytics (senaste 24h):',
    ...EVENT_TYPES.map((k) => `  ${k}: ${metrics.analytics_24h[k] ?? 0}`),
    '',
    `Support-rapporter (öppna): ${metrics.support_open_count}`,
    `Support-rapporter (24h): ${metrics.support_reports_24h}`,
    `Support-rapporter (totalt): ${metrics.support_reports_total}`,
    `support_requested/shown: ${(metrics.support_rate * 100).toFixed(1)}%`,
    '',
    'Outcome-kohort (72h-fönster avslutat):',
    `  färdiga outcomes: ${metrics.outcome_cohort.completed_outcomes}`,
    `  no_progress: ${metrics.outcome_cohort.no_progress_outcomes}`,
    `  progressed: ${metrics.outcome_cohort.progressed_outcomes}`,
    `  no_progress-andel: ${(metrics.outcome_cohort.no_progress_rate * 100).toFixed(1)}%`,
    '',
    `Tekniska API-fel (1h): ${metrics.tech_errors_1h}`,
    '',
    'Hjälp-state:',
    `  familjer med shown: ${metrics.help_state.families_shown}`,
    `  familjer med engaged: ${metrics.help_state.families_engaged}`,
    `  no_progress (state): ${metrics.help_state.families_no_progress}`,
  ];

  const deltaLine = formatDeltaLine(decision.deltas);
  if (deltaLine) {
    lines.push('', `Ny aktivitet sedan senaste rapport: ${deltaLine}`);
  }

  if (decision.alerts.length) {
    lines.push('', 'Alerts:');
    for (const a of decision.alerts) {
      lines.push(`  [${a.level}] ${a.code}`);
    }
  }

  if (rollbackPerformed) {
    lines.push('', 'ÅTGÄRD: Global flagga satt till OFF (automatisk rollback).');
  }

  if (decision.reasons.length) {
    lines.push('', `Trigger: ${decision.reasons.join(', ')}`);
  }

  lines.push('', '— growth_system_help_ops_report');
  return lines.join('\n');
}

function buildEmailSubject({ decision, rollbackPerformed }) {
  if (rollbackPerformed) {
    return '[Systemhjälp] ROLLBACK — global flagga OFF';
  }
  switch (decision.emailKind) {
    case 'support_report':
      return '[Systemhjälp] Ny support-rapport';
    case 'warning':
      return '[Systemhjälp] VARNING — tröskel närmar sig';
    case 'outcome_summary':
      return '[Systemhjälp] Första outcome-sammanställning';
    case 'activity_summary':
      return '[Systemhjälp] Aktivitetssammanfattning';
    default:
      return '[Systemhjälp] Ops-rapport';
  }
}

async function loadPreviousState() {
  const raw = await appSettings.getSetting(STATE_KEY);
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveState(metrics, extra = {}) {
  const payload = {
    analytics_totals: metrics.analytics_totals,
    latest_support_message_id: metrics.latest_support_message_id,
    last_report_at: extra.last_report_at || null,
    last_rollback_at: extra.last_rollback_at || null,
    outcome_summary_sent: extra.outcome_summary_sent ?? false,
  };
  await appSettings.upsertSetting(STATE_KEY, payload);
  return payload;
}

async function performRollback(now = new Date()) {
  await db.query(
    `UPDATE feature_flag SET enabled = false, updated_at = NOW() WHERE key = $1`,
    [FLAG_KEY]
  );
  await db.query('DELETE FROM family_feature_override WHERE feature_key = $1', [FLAG_KEY]);
  return { rolled_back_at: now.toISOString(), flag: FLAG_KEY };
}

/**
 * @param {{ now?: Date, dryRun?: boolean }} [opts]
 */
async function runGrowthSystemHelpOpsReport(opts = {}) {
  const now = opts.now || new Date();
  const dryRun = Boolean(opts.dryRun);
  const metrics = await collectMetrics(now);
  const previousState = await loadPreviousState();
  const decision = evaluateReportDecision({ metrics, previousState, now });

  if (decision.seedOnly) {
    if (!dryRun) {
      await saveState(metrics, {
        outcome_summary_sent: (metrics.outcome_cohort?.completed_outcomes || 0) >= outcomeSummaryMinCompleted(),
      });
    }
    return {
      sent: false,
      seeded: true,
      metrics,
      decision,
    };
  }

  if (!metrics.global_enabled && !decision.shouldRollback) {
    if (!dryRun) {
      await saveState(metrics, {
        outcome_summary_sent: previousState?.outcome_summary_sent || false,
      });
    }
    return {
      sent: false,
      skipped: 'global_off',
      metrics,
      decision,
    };
  }

  let rollbackPerformed = false;
  if (decision.shouldRollback && !dryRun) {
    await performRollback(now);
    rollbackPerformed = true;
    metrics.global_enabled = false;
    metrics.override_count = 0;
  }

  let sent = false;
  if (decision.shouldSend && !dryRun) {
    const subject = buildEmailSubject({ decision, rollbackPerformed });
    const body = buildEmailBody({ metrics, decision, rollbackPerformed });
    await sendEmail({
      to: reportEmail(),
      subject,
      body,
      tags: [{ name: 'category', value: 'growth_system_help_ops' }],
    });
    sent = true;
  }

  if (!dryRun) {
    await saveState(metrics, {
      last_report_at: sent ? now.toISOString() : previousState?.last_report_at || null,
      last_rollback_at: rollbackPerformed ? now.toISOString() : previousState?.last_rollback_at || null,
      outcome_summary_sent: Boolean(
        previousState?.outcome_summary_sent
        || decision.firstOutcomeSummary
        || (metrics.outcome_cohort?.completed_outcomes || 0) >= outcomeSummaryMinCompleted()
      ),
    });
  }

  return {
    sent,
    dryRun,
    rollbackPerformed,
    metrics,
    decision,
    to: reportEmail(),
  };
}

module.exports = {
  STATE_KEY,
  EVENT_TYPES,
  TECH_ERROR_EVENT,
  SUPPORT_MESSAGE_PREFIX,
  reportEmail,
  collectMetrics,
  evaluateReportDecision,
  buildEmailBody,
  buildEmailSubject,
  runGrowthSystemHelpOpsReport,
  performRollback,
  loadPreviousState,
  saveState,
  hasMeaningfulActivityDelta,
  hasShownOnlyDelta,
};
