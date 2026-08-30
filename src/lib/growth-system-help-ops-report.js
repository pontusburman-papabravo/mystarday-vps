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
const PROGRESSED_EVENT = 'system_help_progressed';
const RECENT_OUTCOME_LIMIT = 5;

/** metadata.outcome values that mean the family actually moved. */
const PROGRESSED_OUTCOMES = Object.freeze([
  'progressed_24h',
  'progressed_72h',
  'progressed_after_72h',
]);

const EVENT_TYPES = Object.freeze([
  'system_help_shown',
  'system_help_engaged',
  'system_help_support_requested',
  PROGRESSED_EVENT,
]);

const SUMMARY_EVENT_TYPES = Object.freeze([
  'system_help_engaged',
  'system_help_support_requested',
  PROGRESSED_EVENT,
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
  return Number.isFinite(n) && n > 0 ? n : 3;
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

async function queryNewSupportReports(previousId, latestId) {
  const prev = Number(previousId) || 0;
  const latest = Number(latestId) || 0;
  if (latest <= prev) return [];

  const { rows } = await db.query(
    `SELECT
       cm.id,
       cm.name,
       cm.email,
       cm.created_at,
       cm.family_id,
       cm.metadata,
       f.name AS family_name
     FROM contact_message cm
     LEFT JOIN family f ON f.id = cm.family_id
     WHERE cm.message LIKE $1
       AND cm.id > $2
       AND cm.id <= $3
     ORDER BY cm.id ASC`,
    [`${SUPPORT_MESSAGE_PREFIX}%`, prev, latest]
  );
  return rows;
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
         WHERE system_help_shown_at IS NOT NULL
           AND system_help_shown_at <= $1
           AND progression_outcome IN ('progressed_24h', 'progressed_72h')
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

/**
 * Split system_help_progressed events by metadata.outcome.
 * finalizeNoProgressOutcomes reuses that event name with outcome=no_progress.
 */
async function queryProgressedOutcomeCounts(since = null) {
  const params = [PROGRESSED_EVENT, PROGRESSED_OUTCOMES];
  let sql = `SELECT
       count(*) FILTER (
         WHERE COALESCE(metadata->>'outcome', '') = 'no_progress'
       )::int AS no_progress,
       count(*) FILTER (
         WHERE COALESCE(metadata->>'outcome', '') = ANY($2::text[])
       )::int AS progressed,
       count(*)::int AS total
     FROM analytics_events
     WHERE event_type = $1`;
  if (since) {
    sql += ' AND created_at > $3';
    params.push(since);
  }
  const { rows } = await db.query(sql, params);
  return rows[0] || { no_progress: 0, progressed: 0, total: 0 };
}

async function queryRecentCompletedOutcomes(outcomeWindowEnd, limit = RECENT_OUTCOME_LIMIT) {
  const { rows } = await db.query(
    `SELECT family_id, blocking_step, help_type, progression_outcome,
            system_help_shown_at, next_milestone_at, updated_at
     FROM family_system_help_state
     WHERE system_help_shown_at IS NOT NULL
       AND system_help_shown_at <= $1
       AND progression_outcome IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT $2`,
    [outcomeWindowEnd, limit]
  );
  return rows;
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
    outcomeTotals,
    outcome24h,
    recentCompletedOutcomes,
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
    queryProgressedOutcomeCounts(),
    queryProgressedOutcomeCounts(since24h),
    queryRecentCompletedOutcomes(outcomeWindowEnd),
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
    analytics_outcome_totals: {
      progressed: outcomeTotals.progressed || 0,
      no_progress: outcomeTotals.no_progress || 0,
    },
    analytics_outcome_24h: {
      progressed: outcome24h.progressed || 0,
      no_progress: outcome24h.no_progress || 0,
    },
    recent_completed_outcomes: recentCompletedOutcomes,
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
 * Split system_help_progressed event delta into progressed vs no_progress.
 * If previous state has no breakdown yet, attribute the event delta only when
 * the current mix is unambiguous (one side is zero).
 */
function outcomeBreakdownDelta(metrics, previousState, progressedEventDelta) {
  const cur = metrics?.analytics_outcome_totals || { progressed: 0, no_progress: 0 };
  const prev = previousState?.analytics_outcome_totals;
  if (prev) {
    return {
      progressed: (cur.progressed || 0) - (prev.progressed || 0),
      no_progress: (cur.no_progress || 0) - (prev.no_progress || 0),
    };
  }
  const progressed = cur.progressed || 0;
  const noProgress = cur.no_progress || 0;
  if (progressedEventDelta <= 0) {
    return { progressed: 0, no_progress: 0 };
  }
  if (noProgress > 0 && progressed === 0) {
    return { progressed: 0, no_progress: progressedEventDelta };
  }
  if (progressed > 0 && noProgress === 0) {
    return { progressed: progressedEventDelta, no_progress: 0 };
  }
  return { progressed: 0, no_progress: 0 };
}

function isNoProgressOnlySummary(delta, outcomeDeltas) {
  if ((delta.system_help_engaged || 0) > 0) return false;
  if ((delta.system_help_support_requested || 0) > 0) return false;
  if ((delta[PROGRESSED_EVENT] || 0) <= 0) return false;
  return (outcomeDeltas.no_progress || 0) > 0 && (outcomeDeltas.progressed || 0) <= 0;
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
      outcomeDeltas: { progressed: 0, no_progress: 0 },
      alerts,
      reasons: ['initial_baseline_seed'],
      noProgressOnly: false,
    };
  }

  const { delta } = diffCounts(metrics.analytics_totals, previousState.analytics_totals);
  const outcomeDeltas = outcomeBreakdownDelta(
    metrics,
    previousState,
    delta[PROGRESSED_EVENT] || 0
  );

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
  const noProgressOnly = isNoProgressOnlySummary(delta, outcomeDeltas);

  if (noProgressOnly) {
    reasons.push('no_progress_outcome');
  } else if (meaningfulSummary) {
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
  else if (noProgressOnly) emailKind = 'no_progress_outcome';
  else if (meaningfulSummary) emailKind = 'activity_summary';

  return {
    shouldSend,
    shouldRollback,
    seedOnly: false,
    emailKind,
    deltas: delta,
    outcomeDeltas,
    alerts,
    reasons,
    firstOutcomeSummary,
    noProgressOnly,
  };
}

function formatDeltaLine(deltas, outcomeDeltas = null) {
  return EVENT_TYPES
    .filter((k) => (deltas[k] || 0) > 0)
    .map((k) => {
      if (k === PROGRESSED_EVENT && outcomeDeltas) {
        const bits = [];
        if ((outcomeDeltas.progressed || 0) > 0) {
          bits.push(`+${outcomeDeltas.progressed} progressed`);
        }
        if ((outcomeDeltas.no_progress || 0) > 0) {
          bits.push(`+${outcomeDeltas.no_progress} no_progress`);
        }
        if (bits.length) {
          return `+${deltas[k]} ${k} (${bits.join(', ')})`;
        }
      }
      return `+${deltas[k]} ${k}`;
    })
    .join(', ');
}

function formatRecentOutcomeLine(row) {
  const shown = row.system_help_shown_at instanceof Date
    ? row.system_help_shown_at.toISOString()
    : (row.system_help_shown_at || '—');
  return `  ${row.progression_outcome} · ${row.blocking_step || '—'} · shown ${shown} · family ${row.family_id}`;
}

function adminIncidentsUrl() {
  const base = String(config.email?.baseUrl || process.env.APP_URL || '').replace(/\/$/, '');
  return base ? `${base}/admin#incidenter` : '/admin#incidenter';
}

function formatSupportReportBlock(report) {
  const meta = report.metadata && typeof report.metadata === 'object'
    ? report.metadata
    : {};
  const lines = [
    `  #${report.id} — ${report.name || '—'} <${report.email || '—'}>`,
    `    tid (UTC): ${report.created_at instanceof Date
      ? report.created_at.toISOString()
      : (report.created_at || '—')}`,
    `    familj: ${report.family_name || '—'} (${report.family_id || '—'})`,
  ];
  if (meta.blocking_step) lines.push(`    blocking_step: ${meta.blocking_step}`);
  if (meta.help_type) lines.push(`    help_type: ${meta.help_type}`);
  if (meta.surface) lines.push(`    surface: ${meta.surface}`);
  if (meta.route) lines.push(`    route: ${meta.route}`);
  if (meta.platform) lines.push(`    platform: ${meta.platform}`);
  lines.push(`    admin: ${adminIncidentsUrl()} (sök #${report.id})`);
  return lines.join('\n');
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
    '  (klick i appen — inte samma sak som inskickad support-rapport)',
  ];

  const outcomeTotals = metrics.analytics_outcome_totals || { progressed: 0, no_progress: 0 };
  const outcome24h = metrics.analytics_outcome_24h || { progressed: 0, no_progress: 0 };
  lines.push(
    '',
    'system_help_progressed uppdelat (metadata.outcome):',
    `  totalt progressed: ${outcomeTotals.progressed || 0}`,
    `  totalt no_progress: ${outcomeTotals.no_progress || 0}`,
    `  24h progressed: ${outcome24h.progressed || 0}`,
    `  24h no_progress: ${outcome24h.no_progress || 0}`
  );

  if (metrics.new_support_reports?.length) {
    lines.push('', 'Nya support-rapporter:');
    for (const report of metrics.new_support_reports) {
      lines.push(formatSupportReportBlock(report));
    }
  }

  lines.push(
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
    '  (Hjälp-state = nuvarande episod; analytics = totalt över episoder)'
  );

  const recent = metrics.recent_completed_outcomes || [];
  if (recent.length) {
    lines.push('', 'Senaste färdiga outcomes:');
    for (const row of recent) {
      lines.push(formatRecentOutcomeLine(row));
    }
  }

  const deltaLine = formatDeltaLine(decision.deltas, decision.outcomeDeltas);
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

function buildEmailSubject({ decision, rollbackPerformed, metrics }) {
  if (rollbackPerformed) {
    return '[Systemhjälp] ROLLBACK — global flagga OFF';
  }
  switch (decision.emailKind) {
    case 'support_report': {
      const latest = metrics?.new_support_reports?.[metrics.new_support_reports.length - 1];
      if (latest?.name || latest?.email) {
        const who = [latest.name, latest.email ? `<${latest.email}>` : null].filter(Boolean).join(' ');
        return `[Systemhjälp] Ny support-rapport — ${who}`;
      }
      return '[Systemhjälp] Ny support-rapport';
    }
    case 'warning':
      return '[Systemhjälp] VARNING — tröskel närmar sig';
    case 'outcome_summary':
      return '[Systemhjälp] Första outcome-sammanställning';
    case 'no_progress_outcome':
      return '[Systemhjälp] Outcome: no_progress';
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
    analytics_outcome_totals: metrics.analytics_outcome_totals || { progressed: 0, no_progress: 0 },
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

  if (
    previousState
    && metrics.latest_support_message_id > (previousState.latest_support_message_id || 0)
  ) {
    metrics.new_support_reports = await queryNewSupportReports(
      previousState.latest_support_message_id || 0,
      metrics.latest_support_message_id
    );
  } else {
    metrics.new_support_reports = [];
  }

  let sent = false;
  if (decision.shouldSend && !dryRun) {
    const subject = buildEmailSubject({ decision, rollbackPerformed, metrics });
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
  queryNewSupportReports,
  evaluateReportDecision,
  buildEmailBody,
  buildEmailSubject,
  formatSupportReportBlock,
  runGrowthSystemHelpOpsReport,
  performRollback,
  loadPreviousState,
  saveState,
  hasMeaningfulActivityDelta,
  hasShownOnlyDelta,
  outcomeBreakdownDelta,
  isNoProgressOnlySummary,
  formatDeltaLine,
  formatRecentOutcomeLine,
  PROGRESSED_EVENT,
  PROGRESSED_OUTCOMES,
};
