'use strict';

const db = require('./db');
const { ACT1_ONBOARDING_FLAG_KEYS } = require('./activation-flags');

const P0_TARGET_PCT = 25;
const NEVER_ACTIVATED_WARN_PCT = 35;
const ACT1_ADOPTION_WARN_PCT = 40;

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

function todaySlug(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Collect activation health metrics (read-only).
 */
async function collectMetrics() {
  const [
    totals,
    weekSignups,
    funnelWeek,
    flags,
    incompleteOnboarding,
    events30d,
  ] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*)::int AS families,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM daily_log_item dli
            JOIN daily_log dl ON dl.id = dli.daily_log_id
            JOIN child c ON c.id = dl.child_id
            WHERE c.family_id = f.id AND dli.completed = true
          )
        )::int AS ever_activated,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM login_event le WHERE le.family_id = f.id
          ) AND NOT EXISTS (
            SELECT 1 FROM daily_log_item dli
            JOIN daily_log dl ON dl.id = dli.daily_log_id
            JOIN child c ON c.id = dl.child_id
            WHERE c.family_id = f.id AND dli.completed = true
          )
        )::int AS never_signal
      FROM family f
      WHERE f.archived_at IS NULL
    `),
    db.query(`
      SELECT
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (WHERE s.activation_variant IN ('template_only', 'template_plus_ai'))::int AS act1_variant,
        COUNT(*) FILTER (WHERE s.p0_activated_within_48h)::int AS p0_48h,
        COUNT(*) FILTER (WHERE s.schema_saved_at IS NOT NULL)::int AS schema_saved,
        COUNT(*) FILTER (WHERE s.child_access_completed_at IS NOT NULL)::int AS child_access,
        COUNT(*) FILTER (WHERE s.first_completion_at IS NOT NULL)::int AS first_completion
      FROM family f
      LEFT JOIN family_activation_state s ON s.family_id = f.id
      WHERE f.archived_at IS NULL
        AND f.created_at >= NOW() - INTERVAL '7 days'
    `),
    db.query(`
      SELECT
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (WHERE s.schema_saved_at IS NOT NULL)::int AS schema_saved,
        COUNT(*) FILTER (WHERE s.child_access_completed_at IS NOT NULL)::int AS child_access,
        COUNT(*) FILTER (WHERE s.first_completion_at IS NOT NULL)::int AS first_completion,
        COUNT(*) FILTER (WHERE s.p0_activated_within_48h)::int AS p0_48h
      FROM family f
      LEFT JOIN family_activation_state s ON s.family_id = f.id
      WHERE f.archived_at IS NULL
        AND f.created_at >= date_trunc('week', NOW())
    `),
    db.query(`
      SELECT key, enabled FROM feature_flag
      WHERE key LIKE 'activation_%' OR key = 'referral_program'
      ORDER BY key
    `),
    db.query(`
      SELECT COUNT(DISTINCT f.id)::int AS n
      FROM family f
      JOIN parent p ON p.family_id = f.id
      WHERE f.archived_at IS NULL
        AND f.created_at >= NOW() - INTERVAL '14 days'
        AND f.created_at <= NOW() - INTERVAL '48 hours'
        AND NOT EXISTS (
          SELECT 1 FROM parent p2
          WHERE p2.family_id = f.id AND p2.onboarding_completed = true
        )
    `),
    db.query(`
      SELECT event_type, COUNT(*)::int AS n
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND event_type IN (
          'activation_onboarding_started',
          'starter_plan_saved',
          'child_access_completed',
          'first_completion_recorded',
          'activation_achieved_48h'
        )
      GROUP BY 1
    `),
  ]);

  const t = totals.rows[0] || {};
  const w = weekSignups.rows[0] || {};
  const fw = funnelWeek.rows[0] || {};
  const eventMap = {};
  for (const row of events30d.rows) eventMap[row.event_type] = row.n;

  return {
    families: t.families || 0,
    everActivated: t.ever_activated || 0,
    everActivatedPct: pct(t.ever_activated, t.families),
    neverSignal: t.never_signal || 0,
    neverSignalPct: pct(t.never_signal, t.families),
    weekSignups: w.signups || 0,
    weekAct1Variant: w.act1_variant || 0,
    weekAct1AdoptionPct: pct(w.act1_variant, w.signups),
    weekP0_48h: w.p0_48h || 0,
    weekP0RatePct: pct(w.p0_48h, w.signups),
    weekSchemaSaved: w.schema_saved || 0,
    weekChildAccess: w.child_access || 0,
    weekFirstCompletion: w.first_completion || 0,
    cohortWeekSignups: fw.signups || 0,
    cohortWeekP0RatePct: pct(fw.p0_48h, fw.signups),
    incompleteOnboarding14d: incompleteOnboarding.rows[0]?.n || 0,
    flags: flags.rows,
    events30d: eventMap,
  };
}

function findFunnelLeak(metrics) {
  const steps = [
    { key: 'signup', n: metrics.weekSignups, label: 'registrering' },
    { key: 'schema', n: metrics.weekSchemaSaved, label: 'schema sparat' },
    { key: 'access', n: metrics.weekChildAccess, label: 'barnåtkomst' },
    { key: 'star', n: metrics.weekFirstCompletion, label: 'första stjärnan' },
  ];
  let worst = null;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const cur = steps[i];
    if (prev.n < 3) continue;
    const dropPct = pct(prev.n - cur.n, prev.n);
    if (!worst || dropPct > worst.dropPct) {
      worst = {
        from: prev.label,
        to: cur.label,
        dropPct,
        fromN: prev.n,
        toN: cur.n,
      };
    }
  }
  return worst;
}

/**
 * Build actionable alert proposals from metrics.
 * @param {object} [metrics] — from collectMetrics(); fetched if omitted
 * @returns {Promise<object[]>}
 */
async function buildRecommendations(metrics) {
  const m = metrics || await collectMetrics();
  const alerts = [];
  const date = new Date().toISOString().slice(0, 10);

  const act1FlagSet = new Set(ACT1_ONBOARDING_FLAG_KEYS);
  const flagsOff = (m.flags || []).filter((f) => act1FlagSet.has(f.key) && !f.enabled);
  if (flagsOff.length) {
    alerts.push({
      slug: `activation-flags-off-${date}`,
      category: 'activation',
      severity: 'critical',
      title: 'ACT-1-flaggor är avstängda',
      body: `Följande ACT-1 onboarding-flaggor är OFF: ${flagsOff.map((f) => f.key).join(', ')}. Nya familjer får inte ACT-1-flödet.`,
      action_route: '#funktioner',
      metrics: { flagsOff: flagsOff.map((f) => f.key) },
    });
  }

  if (m.weekSignups >= 3 && m.weekP0RatePct < P0_TARGET_PCT) {
    alerts.push({
      slug: `activation-low-p0-${date}`,
      category: 'activation',
      severity: m.weekP0RatePct < 10 ? 'critical' : 'warning',
      title: `Låg P0-aktivering: ${m.weekP0RatePct}% (mål ${P0_TARGET_PCT}%)`,
      body: `Senaste 7 dagarna: ${m.weekP0_48h}/${m.weekSignups} familjer nådde schema + barnåtkomst + första stjärna inom 48h. Prioritera ACT-1-tratten, inte betalning.`,
      action_route: '#analytics',
      metrics: {
        weekSignups: m.weekSignups,
        weekP0_48h: m.weekP0_48h,
        weekP0RatePct: m.weekP0RatePct,
        targetPct: P0_TARGET_PCT,
      },
    });
  }

  if (m.neverSignalPct >= NEVER_ACTIVATED_WARN_PCT) {
    alerts.push({
      slug: `activation-never-started-${date}`,
      category: 'activation',
      severity: 'warning',
      title: `${m.neverSignalPct}% har aldrig startat`,
      body: `${m.neverSignal} familjer har ingen login- eller completion-signal. Problemet är aktivering (time-to-first-star), inte retention vecka 3+.`,
      action_route: '#analytics',
      metrics: {
        neverSignal: m.neverSignal,
        neverSignalPct: m.neverSignalPct,
        families: m.families,
      },
    });
  }

  if (m.weekSignups >= 5 && m.weekAct1AdoptionPct < ACT1_ADOPTION_WARN_PCT) {
    alerts.push({
      slug: `activation-low-act1-ui-${date}`,
      category: 'activation',
      severity: 'warning',
      title: `Bara ${m.weekAct1AdoptionPct}% når ACT-1-mallen`,
      body: `${m.weekAct1Variant}/${m.weekSignups} nya familjer senaste veckan har variant template_only/ai. Kontrollera att onboarding-starter-plan laddas (cache/SW) och att registrering leder till /onboarding.`,
      action_route: '#familjer',
      metrics: {
        weekAct1Variant: m.weekAct1Variant,
        weekSignups: m.weekSignups,
        weekAct1AdoptionPct: m.weekAct1AdoptionPct,
      },
    });
  }

  const leak = findFunnelLeak(m);
  if (leak && leak.dropPct >= 40 && leak.fromN >= 3) {
    alerts.push({
      slug: `activation-funnel-leak-${date}`,
      category: 'activation',
      severity: 'info',
      title: `Största läckaget: ${leak.from} → ${leak.to}`,
      body: `${leak.dropPct}% tappar mellan ${leak.from} och ${leak.to} (${leak.toN}/${leak.fromN} senaste 7d). Fokusera förbättring där.`,
      action_route: '#analytics',
      metrics: leak,
    });
  }

  if (m.incompleteOnboarding14d >= 5) {
    alerts.push({
      slug: `activation-incomplete-onboarding-${date}`,
      category: 'activation',
      severity: 'info',
      title: `${m.incompleteOnboarding14d} familjer fast i onboarding`,
      body: 'Registrerade för 2–14 dagar sedan men har inte slutfört onboarding. Överväg nudge-mejl (activation_nudge_v1) eller manuell uppföljning.',
      action_route: '#familjer',
      metrics: { incompleteOnboarding14d: m.incompleteOnboarding14d },
    });
  }

  const started = m.events30d.activation_onboarding_started || 0;
  if (m.weekSignups >= 5 && started === 0) {
    alerts.push({
      slug: `activation-no-events-${date}`,
      category: 'activation',
      severity: 'critical',
      title: 'Inga ACT-1-events på 30 dagar',
      body: 'activation_onboarding_started har 0 träffar trots nya registreringar. Analytics eller klientflaggor kan vara trasiga.',
      action_route: '#analytics',
      metrics: { events30d: m.events30d },
    });
  }

  if (!alerts.length && m.weekSignups > 0) {
    alerts.push({
      slug: `activation-ok-${date}`,
      category: 'activation',
      severity: 'info',
      title: 'Aktiveringen ser stabil ut',
      body: `Senaste 7d: ${m.weekSignups} registreringar, P0 ${m.weekP0RatePct}%, ACT-1 ${m.weekAct1AdoptionPct}%. Inga kritiska avvikelser just nu.`,
      action_route: '#analytics',
      metrics: {
        weekSignups: m.weekSignups,
        weekP0RatePct: m.weekP0RatePct,
        weekAct1AdoptionPct: m.weekAct1AdoptionPct,
      },
    });
  }

  return alerts;
}

/**
 * Run analysis and persist alerts to admin_operational_alert.
 */
async function runActivationAdvisor({ pruneDays = 30 } = {}) {
  const adminAlerts = require('../../db/admin-operational-alerts');
  const metrics = await collectMetrics();
  const recommendations = await buildRecommendations(metrics);
  const saved = [];

  for (const alert of recommendations) {
    const row = await adminAlerts.upsertAlert(alert);
    saved.push(row);
  }

  const pruned = await adminAlerts.pruneOlderThanDays(pruneDays);
  return { metrics, recommendations, saved, pruned };
}

module.exports = {
  collectMetrics,
  buildRecommendations,
  runActivationAdvisor,
  P0_TARGET_PCT,
};
