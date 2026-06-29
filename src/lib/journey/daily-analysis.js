'use strict';

const db = require('../db');
const appConfig = require('../../../db/app-config');
const rollout = require('./rollout');

const CONFIG_KEY = 'JOURNEY_DAILY_ANALYSIS_LATEST';
const HISTORY_CONFIG_KEY = 'JOURNEY_DAILY_ANALYSIS_HISTORY';
const HISTORY_MAX_POINTS = 90;

/**
 * Compact snapshot for trend graphs (stored per run).
 * @param {object} report
 */
function extractHistoryPoint(report) {
  const s = report.summary || {};
  const b = report.metrics?.bottlenecks || {};
  const f = report.metrics?.funnel30d || {};
  return {
    generatedAt: report.generatedAt,
    measurementPoints: s.measurementPoints ?? 0,
    failuresFound: s.failuresFound ?? 0,
    browserQaPoints: s.browserQaPoints ?? 0,
    browserQaFailures: s.browserQaFailures ?? 0,
    actionCount: (report.actions || []).length,
    activeWave: s.activeWave ?? 0,
    firstUseNoChildLogin: b.first_use_no_child_login ?? 0,
    parentAckPending: b.parent_ack_pending ?? 0,
    firstSuccess30d: f.first_success_30d ?? 0,
    signups30d: f.signups_30d ?? 0,
    pctFirstSuccess: f.pct_first_success ?? 0,
  };
}

async function appendHistory(report) {
  const point = extractHistoryPoint(report);
  const raw = await appConfig.get(HISTORY_CONFIG_KEY);
  let history = [];
  if (raw) {
    try {
      history = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch {
      history = [];
    }
  }
  history.push(point);
  if (history.length > HISTORY_MAX_POINTS) {
    history = history.slice(-HISTORY_MAX_POINTS);
  }
  await appConfig.set(HISTORY_CONFIG_KEY, JSON.stringify(history), {
    description: 'Family Journey analys — historik för trendgrafer (senaste 90 körningar)',
  });
  return history;
}

async function loadHistory(limit = 30) {
  const raw = await appConfig.get(HISTORY_CONFIG_KEY);
  if (!raw) return [];
  let history = [];
  try {
    history = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
  } catch {
    return [];
  }
  return history.slice(-limit);
}

/**
 * Collect Journey metrics from DB (read-only).
 */
async function collectMetrics() {
  const [
    rolloutStatus,
    health,
    phaseRows,
    funnel30d,
    bottlenecks,
    analytics7d,
    milestoneTotals,
    ingestGap,
  ] = await Promise.all([
    rollout.getRolloutStatus(),
    rollout.runHealthChecks(),
    db.query(`
      SELECT journey_phase, COUNT(*)::int AS n
      FROM family WHERE archived_at IS NULL
      GROUP BY journey_phase ORDER BY n DESC`),
    db.query(`
      WITH cohort AS (
        SELECT f.id, f.created_at FROM family f
        WHERE f.archived_at IS NULL AND f.created_at >= NOW() - interval '30 days'
      ),
      fs AS (
        SELECT family_id, MIN(occurred_at) AS at
        FROM family_milestones WHERE milestone = 'first_success'
        GROUP BY family_id
      )
      SELECT
        COUNT(*)::int AS signups_30d,
        COUNT(fs.family_id)::int AS first_success_30d,
        ROUND(100.0 * COUNT(fs.family_id) / NULLIF(COUNT(*), 0), 1) AS pct_first_success
      FROM cohort c LEFT JOIN fs ON fs.family_id = c.id`),
    db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM family f WHERE f.journey_phase = 'FIRST_USE' AND f.archived_at IS NULL
          AND EXISTS (SELECT 1 FROM family_milestones fm WHERE fm.family_id = f.id AND fm.milestone = 'routine_ready')
          AND NOT EXISTS (SELECT 1 FROM family_milestones fm WHERE fm.family_id = f.id AND fm.milestone = 'child_logged_in')) AS first_use_no_child_login,
        (SELECT COUNT(DISTINCT fm1.family_id)::int FROM family_milestones fm1
          WHERE fm1.milestone = 'child_first_completion'
          AND NOT EXISTS (SELECT 1 FROM family_milestones fm2 WHERE fm2.family_id = fm1.family_id
            AND fm2.milestone IN ('parent_saw_completion', 'first_success'))) AS parent_ack_pending,
        (SELECT COUNT(*)::int FROM family f
          WHERE f.journey_phase = 'FIRST_USE' AND f.archived_at IS NULL
          AND EXISTS (
            SELECT 1 FROM child c JOIN daily_log dl ON dl.child_id = c.id
            JOIN daily_log_item dli ON dli.daily_log_id = dl.id
            WHERE c.family_id = f.id AND dli.completed = true)) AS first_use_with_completions_no_phase_progress`),
    db.query(`
      SELECT event_type, COUNT(*)::int AS n, COUNT(DISTINCT family_id)::int AS families
      FROM analytics_events
      WHERE event_type IN (
        'journey_coach_cta_click', 'child_login_success', 'child_handoff_skipped',
        'engine_coach_cta_click', 'journey_push_projected', 'first_completion_recorded'
      ) AND created_at >= NOW() - interval '7 days'
      GROUP BY event_type ORDER BY n DESC`),
    db.query(`
      SELECT milestone, COUNT(DISTINCT family_id)::int AS families
      FROM family_milestones
      GROUP BY milestone ORDER BY families DESC LIMIT 12`),
    db.query(`
      SELECT
        (SELECT COUNT(DISTINCT c.family_id)::int
         FROM daily_log_item dli JOIN daily_log dl ON dl.id = dli.daily_log_id
         JOIN child c ON c.id = dl.child_id
         WHERE dli.completed = true AND dli.completed_at >= NOW() - interval '30 days') AS families_with_completion_30d,
        (SELECT COUNT(DISTINCT family_id)::int FROM family_milestones
         WHERE milestone = 'child_first_completion' AND occurred_at >= NOW() - interval '30 days') AS milestone_first_completion_30d`),
  ]);

  const b = bottlenecks.rows[0] || {};
  const f = funnel30d.rows[0] || {};
  const gap = ingestGap.rows[0] || {};

  return {
    rollout: {
      activeWave: rolloutStatus.active_wave,
      waveEnabledAt: rolloutStatus.wave_enabled_at,
      phaseDistribution: rolloutStatus.phase_distribution,
    },
    health,
    phases: phaseRows.rows,
    funnel30d: f,
    bottlenecks: b,
    analytics7d: analytics7d.rows,
    milestoneTotals: milestoneTotals.rows,
    ingestGap: gap,
  };
}

/**
 * Build human-readable sections + recommended actions from metrics.
 * @param {object} metrics
 * @param {object|null} browserQa
 */
function buildReport(metrics, browserQa = null) {
  const sections = [];
  const actions = [];
  let measurementPoints = 0;

  const b = metrics.bottlenecks || {};
  const f = metrics.funnel30d || {};
  const rolloutWave = metrics.rollout?.activeWave || 0;

  measurementPoints += 4;
  const rolloutFindings = [
    `Wave ${rolloutWave} aktiv`,
    `Hälsa: ${metrics.health?.ok ? 'OK' : 'PROBLEM'}`,
    `Faser: ${(metrics.phases || []).map((p) => `${p.journey_phase} ${p.n}`).join(', ') || '—'}`,
  ];
  if (!metrics.health?.ok) {
    actions.push({
      priority: 'critical',
      title: 'Åtgärda Journey-hälsokontroll',
      detail: (metrics.health?.checks || []).filter((c) => !c.ok).map((c) => c.detail).join('; '),
      route: '#produktanalys',
    });
  }
  sections.push({
    id: 'rollout',
    title: 'Rollout & fasfördelning',
    severity: metrics.health?.ok ? 'info' : 'critical',
    findings: rolloutFindings,
    metrics: metrics.phases,
  });

  measurementPoints += 3;
  const funnelFindings = [
    `Signups 30d: ${f.signups_30d || 0}`,
    `first_success 30d: ${f.first_success_30d || 0} (${f.pct_first_success ?? 0}%)`,
  ];
  if ((f.signups_30d || 0) > 5 && (f.first_success_30d || 0) === 0) {
    actions.push({
      priority: 'warning',
      title: 'Ingen first_success senaste 30 dagarna',
      detail: 'Handoff + parent-ack-flödet når sällan hela vägen. Prioritera barninloggning och bekräftelsemodal.',
      route: '#produktanalys',
    });
    funnelFindings.push('⚠ Ingen first_success i 30d-cohort');
  }
  sections.push({
    id: 'funnel',
    title: 'North Star — first_success',
    severity: (f.first_success_30d || 0) === 0 && (f.signups_30d || 0) > 10 ? 'warning' : 'info',
    findings: funnelFindings,
  });

  measurementPoints += 3;
  const handoffCount = b.first_use_no_child_login || 0;
  const ackPending = b.parent_ack_pending || 0;
  const ingestMismatch = b.first_use_with_completions_no_phase_progress || 0;
  const bottleneckFindings = [
    `FIRST_USE utan barninloggning: ${handoffCount}`,
    `Parent-ack väntar: ${ackPending} familjer`,
    `FIRST_USE med avprickningar men fast fas: ${ingestMismatch}`,
  ];
  if (handoffCount > 20) {
    actions.push({
      priority: 'critical',
      title: 'Handoff-flaskhals',
      detail: `${handoffCount} familjer har schema klart men barnet har inte loggat in. Synliggör handoff-banner och onboarding-CTA "Låt barnet börja".`,
      route: '#produktanalys',
    });
  }
  if (ackPending > 0) {
    actions.push({
      priority: 'warning',
      title: 'Parent-ack kö',
      detail: `${ackPending} familjer har barn-avprickning utan föräldrabekräftelse. Verifiera journeyParentAck-modal på Hem.`,
      route: '#familjer',
    });
  }
  if (ingestMismatch > 5) {
    actions.push({
      priority: 'warning',
      title: 'Milestone-ingest gap',
      detail: `${ingestMismatch} familjer har avprickningar men sitter kvar i FIRST_USE. Överväg backfill av child_first_completion från daily_log.`,
      route: '#produktanalys',
    });
  }
  const gap = metrics.ingestGap || {};
  if ((gap.families_with_completion_30d || 0) > (gap.milestone_first_completion_30d || 0) * 2) {
    bottleneckFindings.push(
      `Ingest gap 30d: ${gap.milestone_first_completion_30d || 0} milestones vs ${gap.families_with_completion_30d || 0} familjer med completion`
    );
  }
  sections.push({
    id: 'bottlenecks',
    title: 'Flaskhalsar',
    severity: handoffCount > 50 || ackPending > 3 ? 'warning' : 'info',
    findings: bottleneckFindings,
  });

  const coachClicks = (metrics.analytics7d || []).find((r) => r.event_type === 'journey_coach_cta_click');
  const engineClicks = (metrics.analytics7d || []).find((r) => r.event_type === 'engine_coach_cta_click');
  measurementPoints += 2;
  sections.push({
    id: 'engagement',
    title: 'Engagemang (7 dagar)',
    severity: 'info',
    findings: [
      `journey_coach_cta_click: ${coachClicks?.n || 0}`,
      `engine_coach_cta_click: ${engineClicks?.n || 0}`,
      `child_login_success: ${(metrics.analytics7d || []).find((r) => r.event_type === 'child_login_success')?.n || 0}`,
    ],
  });
  if ((engineClicks?.n || 0) > (coachClicks?.n || 0) && (engineClicks?.n || 0) > 0) {
    actions.push({
      priority: 'info',
      title: 'Engine-coach konkurrerar med Journey',
      detail: 'Fler engine_coach_cta_click än journey_coach_cta_click — kontrollera att coach_v1 yieldar korrekt.',
      route: '#produktanalys',
    });
  }

  let browserFailures = [];
  if (browserQa) {
    measurementPoints += browserQa.measurementPoints || 0;
    browserFailures = browserQa.failures || [];
    sections.push({
      id: 'browser_qa',
      title: 'Browser QA — knappar & utseende',
      severity: browserFailures.length ? 'warning' : 'info',
      findings: [
        `Mätpunkter: ${browserQa.measurementPoints || 0}`,
        `Godkända: ${browserQa.passed || 0}`,
        `Fel: ${browserFailures.length}`,
        browserQa.skipped ? `Hoppad över: ${browserQa.skippedReason || 'okänt'}` : null,
      ].filter(Boolean),
      failures: browserFailures,
    });
    for (const fail of browserFailures) {
      if (fail.action) {
        actions.push({
          priority: fail.severity || 'warning',
          title: fail.title || fail.id,
          detail: fail.detail || fail.message,
          route: fail.route || '#overview',
        });
      }
    }
  } else {
    sections.push({
      id: 'browser_qa',
      title: 'Browser QA — knappar & utseende',
      severity: 'info',
      findings: ['Browser QA kördes inte (saknar puppeteer eller inloggningsuppgifter).'],
    });
    actions.push({
      priority: 'info',
      title: 'Aktivera full browser QA',
      detail: 'Sätt JOURNEY_QA_PARENT_EMAIL + JOURNEY_QA_PARENT_PASSWORD på servern och installera puppeteer för automatisk UI-kontroll.',
      route: '#overview',
    });
  }

  const sortedActions = actions.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  });

  const totalFailures = browserFailures.length
    + (metrics.health?.ok ? 0 : 1);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      measurementPoints,
      failuresFound: totalFailures,
      browserQaPoints: browserQa?.measurementPoints || 0,
      browserQaFailures: browserFailures.length,
      activeWave: rolloutWave,
      topAction: sortedActions[0] || null,
    },
    sections,
    actions: sortedActions.slice(0, 8),
    metrics,
    browserQa: browserQa || null,
  };
}

async function runDailyAnalysis({ browserQa } = {}) {
  const metrics = await collectMetrics();
  let qaResult = browserQa;
  if (qaResult === undefined) {
    try {
      const { runJourneyBrowserQa } = require('./browser-qa');
      qaResult = await runJourneyBrowserQa();
    } catch (err) {
      qaResult = {
        measurementPoints: 0,
        passed: 0,
        failures: [],
        skipped: true,
        skippedReason: err.message,
      };
    }
  }
  return buildReport(metrics, qaResult);
}

module.exports = {
  CONFIG_KEY,
  HISTORY_CONFIG_KEY,
  collectMetrics,
  buildReport,
  runDailyAnalysis,
  extractHistoryPoint,
  appendHistory,
  loadHistory,
};
