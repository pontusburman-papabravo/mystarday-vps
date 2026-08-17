/**
 * Composed queries for GET /api/admin/start-summary (Fas 2A + Fas 3).
 */
const db = require('../src/lib/db');
const contactMessages = require('./contact-messages');
const adminOperationalAlerts = require('./admin-operational-alerts');
const { familyIsInternalQaSql } = require('../config/internal-qa-families');

const DEFAULT_FOUNDER_LIMIT = 225;

function buildPeriodMetric(row) {
  const last7d = parseInt(row.last7d, 10) || 0;
  const prev7d = parseInt(row.prev7d, 10) || 0;
  const total = parseInt(row.total, 10) || 0;
  const deltaAbs = last7d - prev7d;
  const deltaPct = prev7d === 0 ? null : Math.round((deltaAbs / prev7d) * 1000) / 10;
  return { last7d, prev7d, deltaAbs, deltaPct, total };
}

async function periodMetricFromTable(table) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last7d,
       COUNT(*) FILTER (
         WHERE created_at >= NOW() - INTERVAL '14 days'
           AND created_at < NOW() - INTERVAL '7 days'
       )::int AS prev7d,
       COUNT(*)::int AS total
     FROM ${table}`
  );
  return buildPeriodMetric(rows[0] || {});
}

async function fetchStuckOnboardingCounts() {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS stuck_total,
       COUNT(*) FILTER (WHERE NOT internal_qa)::int AS stuck_product,
       COUNT(*) FILTER (WHERE internal_qa)::int AS stuck_qa
     FROM (
       SELECT f.id,
         (${familyIsInternalQaSql('f')}) AS internal_qa
       FROM family f
       JOIN parent p ON p.family_id = f.id
       WHERE f.archived_at IS NULL
         AND f.created_at >= NOW() - INTERVAL '14 days'
         AND f.created_at <= NOW() - INTERVAL '48 hours'
       GROUP BY f.id, f.name
       HAVING NOT BOOL_OR(p.onboarding_completed)
     ) stuck_families`
  );
  return rows[0] || { stuck_total: 0, stuck_product: 0, stuck_qa: 0 };
}

async function fetchKeyMetrics() {
  const [weekRow, stuckRow, totalFamiliesRow, founderLimitRow] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE f.created_at >= NOW() - INTERVAL '7 days'
         )::int AS signups_7d,
         COUNT(*) FILTER (
           WHERE f.created_at >= NOW() - INTERVAL '14 days'
             AND f.created_at < NOW() - INTERVAL '7 days'
         )::int AS signups_prev_7d,
         COUNT(*) FILTER (
           WHERE f.created_at >= (date_trunc('day', NOW() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm')
         )::int AS signups_today,
         COUNT(*) FILTER (
           WHERE f.created_at >= NOW() - INTERVAL '7 days'
             AND s.schema_saved_at IS NOT NULL
         )::int AS schema_saved,
         COUNT(*) FILTER (
           WHERE f.created_at >= NOW() - INTERVAL '7 days'
             AND s.child_access_completed_at IS NOT NULL
         )::int AS child_access,
         COUNT(*) FILTER (
           WHERE f.created_at >= NOW() - INTERVAL '7 days'
             AND s.first_completion_at IS NOT NULL
         )::int AS first_completion,
         COUNT(*) FILTER (
           WHERE f.created_at >= NOW() - INTERVAL '7 days'
             AND s.p0_activated_within_48h
         )::int AS p0_48h
       FROM family f
       LEFT JOIN family_activation_state s ON s.family_id = f.id
       WHERE f.archived_at IS NULL`
    ),
    fetchStuckOnboardingCounts(),
    db.query(
      `SELECT COUNT(*)::int AS total FROM family WHERE archived_at IS NULL`
    ),
    db.query(
      `SELECT value FROM app_settings WHERE key = 'founder_family_limit' LIMIT 1`
    ),
  ]);

  const week = weekRow.rows[0] || {};
  const signups7d = week.signups_7d || 0;
  const signupsPrev7d = week.signups_prev_7d || 0;
  const p0_48h = week.p0_48h || 0;
  const childAccess = week.child_access || 0;
  const firstCompletion = week.first_completion || 0;
  const totalFamilies = totalFamiliesRow.rows[0]?.total || 0;
  const founderRaw = founderLimitRow.rows[0]?.value;
  const founderParsed = parseInt(founderRaw, 10);
  const founderLimit = Number.isFinite(founderParsed) && founderParsed > 0
    ? founderParsed
    : DEFAULT_FOUNDER_LIMIT;

  function rate(n, d) {
    if (!d) return null;
    return Math.round((n / d) * 1000) / 10;
  }

  return {
    signupsToday: week.signups_today || 0,
    signups7d,
    signupsDelta: signups7d - signupsPrev7d,
    p0_48h,
    p0RatePct: rate(p0_48h, signups7d),
    p0TargetPct: 25,
    schemaSaved7d: week.schema_saved || 0,
    schemaRatePct: rate(week.schema_saved || 0, signups7d),
    childAccess7d: childAccess,
    childAccessRatePct: rate(childAccess, signups7d),
    firstCompletion7d: firstCompletion,
    firstCompletionRatePct: rate(firstCompletion, signups7d),
    starAfterAccessRatePct: rate(firstCompletion, childAccess || null),
    stuckOnboarding: stuckRow.stuck_product || 0,
    stuckOnboardingQa: stuckRow.stuck_qa || 0,
    stuckOnboardingTotal: stuckRow.stuck_total || 0,
    totalFamilies,
    founderSlotsLeft: Math.max(0, founderLimit - totalFamilies),
    founderLimit,
  };
}

async function newFamiliesMetric() {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE archived_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'
       )::int AS last7d,
       COUNT(*) FILTER (
         WHERE archived_at IS NULL
           AND created_at >= NOW() - INTERVAL '14 days'
           AND created_at < NOW() - INTERVAL '7 days'
       )::int AS prev7d,
       COUNT(*) FILTER (WHERE archived_at IS NULL)::int AS total
     FROM family`
  );
  return buildPeriodMetric(rows[0] || {});
}

async function fetchMessageSummary() {
  const [counts, latestRows] = await Promise.all([
    contactMessages.getMessageCounts(),
    contactMessages.getLatestFollowUpMessages(5),
  ]);

  const latest = latestRows.map((row) => {
    const preview = String(row.message || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const linkedFamily = row.family_id
      ? { type: 'explicit', familyId: row.family_id, familyName: row.family_name }
      : { type: 'none' };
    const followUpReason = row.status === 'new' ? 'unread' : row.status === 'read' ? 'read_without_note' : 'in_progress';
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      messagePreview: preview,
      createdAt: row.created_at,
      isRead: row.status !== 'new',
      status: row.status,
      followUpReason,
      linkedFamily,
    };
  });

  return {
    unreadCount: parseInt(counts.meddelanden_unread_count, 10) || 0,
    needsFollowUpCount: parseInt(counts.meddelanden_needs_follow_up_count, 10) || 0,
    latest,
    disclaimer: null,
  };
}

/** Read persisted alerts only — live advisor refresh runs on the daily scheduler. */
async function fetchRecommendations() {
  const operationalRows = await adminOperationalAlerts.listActive(5);
  return adminOperationalAlerts.toRecommendationCards(operationalRows);
}

async function fetchActivityFeed(limit = 8) {
  const { rows } = await db.query(
    `
    SELECT type, id, title, meta, created_at, route FROM (
      SELECT
        'family_created'::text AS type,
        f.id::text AS id,
        'Ny familj: ' || COALESCE(f.name, 'Namnlös') AS title,
        NULL::text AS meta,
        f.created_at,
        '#familjer'::text AS route
      FROM family f
      WHERE f.archived_at IS NULL

      UNION ALL

      SELECT
        'contact_message_created',
        cm.id::text,
        COALESCE(cm.name, cm.email, 'Meddelande'),
        cm.message_type,
        cm.created_at,
        '#arenden'
      FROM contact_message cm

      UNION ALL

      SELECT
        'newsletter_sent',
        n.id::text,
        'Nyhetsbrev: ' || LEFT(n.subject, 80),
        n.sent_count::text || ' mottagare',
        n.sent_at,
        '#nyhetsbrev'
      FROM newsletters n
      WHERE n.status = 'sent' AND n.sent_at IS NOT NULL

      UNION ALL

      SELECT
        'dagens_nyhet_published',
        d.id::text,
        'Dagens nyhet: ' || LEFT(d.title, 80),
        NULL,
        COALESCE(d.published_at, d.publish_at, d.created_at),
        '#dagens-nyhet'
      FROM dagens_nyhet d
      WHERE d.status = 'published'
    ) feed
    WHERE created_at IS NOT NULL
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return rows.map((row) => ({
    type: row.type,
    id: row.id,
    title: row.title,
    meta: row.meta || undefined,
    createdAt: row.created_at,
    route: row.route,
  }));
}

const QUICK_ACTIONS = [
  { label: 'Familjer', route: '#familjer' },
  { label: 'Ärenden', route: '#arenden' },
  { label: 'Paketintresse', route: '#paketintresse' },
  { label: 'Pedagogintresse', route: '#pedagogintresse' },
  { label: 'Produktanalys', route: '#produktanalys' },
  { label: 'Nyhetsbrev', route: '#nyhetsbrev' },
];

async function buildStartSummary() {
  const [
    keyMetrics,
    messages,
    activity,
    recommendations,
  ] = await Promise.all([
    fetchKeyMetrics(),
    fetchMessageSummary(),
    fetchActivityFeed(8),
    fetchRecommendations(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    keyMetrics,
    messages,
    activity,
    recommendations,
    quickActions: QUICK_ACTIONS,
  };
}

module.exports = {
  buildPeriodMetric,
  periodMetricFromTable,
  newFamiliesMetric,
  fetchStuckOnboardingCounts,
  fetchKeyMetrics,
  fetchMessageSummary,
  fetchActivityFeed,
  fetchRecommendations,
  buildStartSummary,
  QUICK_ACTIONS,
};
