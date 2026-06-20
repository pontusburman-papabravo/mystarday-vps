/**
 * Composed queries for GET /api/admin/start-summary (Fas 2A + Fas 3).
 */
const db = require('../src/lib/db');
const contactMessages = require('./contact-messages');

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
    unreadCount: parseInt(counts.unread_count, 10) || 0,
    needsFollowUpCount: parseInt(counts.needs_follow_up_count, 10) || 0,
    latest,
    disclaimer: null,
  };
}

async function fetchRecommendations() {
  const { rows } = await db.query(`
    SELECT COUNT(*)::int AS c FROM contact_message WHERE status = 'new'
  `);
  const unread = rows[0]?.c || 0;
  const cards = [];
  if (unread > 0) {
    cards.push({
      type: 'unread_messages',
      title: `${unread} olästa meddelanden`,
      body: 'Öppna inboxen och markera det viktigaste först.',
      route: '#meddelanden?inbox=unread',
      priority: 1,
    });
  }
  const { rows: leadRows } = await db.query(`
    SELECT (
      (SELECT COUNT(*)::int FROM package_interest WHERE lead_status = 'ny') +
      (SELECT COUNT(*)::int FROM professional_interest WHERE lead_status = 'ny') +
      (SELECT COUNT(*)::int FROM waitlist WHERE lead_status = 'ny')
    ) AS c
  `);
  const newLeads = leadRows[0]?.c || 0;
  if (newLeads > 0) {
    cards.push({
      type: 'new_leads',
      title: `${newLeads} nya leads i pipeline`,
      body: 'Granska paketintresse, pedagogintresse och waitlist.',
      route: '#tillvaxt-pipeline',
      priority: 2,
    });
  }
  return cards.sort((a, b) => a.priority - b.priority);
}

async function fetchActivityFeed(limit = 20) {
  const { rows } = await db.query(
    `
    SELECT type, id, title, meta, created_at, route FROM (
      SELECT
        'package_interest_created'::text AS type,
        pi.id::text AS id,
        COALESCE(f.name, 'Okänd familj') || ' — paketintresse' AS title,
        pi.component AS meta,
        pi.created_at,
        '#paketintresse'::text AS route
      FROM package_interest pi
      JOIN family f ON f.id = pi.family_id

      UNION ALL

      SELECT
        'professional_interest_created',
        pr.id::text,
        COALESCE(pr.name, pr.email, 'Pedagogintresse'),
        pr.role,
        pr.created_at,
        '#pedagogintresse'
      FROM professional_interest pr

      UNION ALL

      SELECT
        'waitlist_created',
        w.id::text,
        COALESCE(w.name, w.email, 'Waitlist'),
        w.email,
        w.created_at,
        '#waitlist'
      FROM waitlist w

      UNION ALL

      SELECT
        'contact_message_created',
        cm.id::text,
        COALESCE(cm.name, cm.email, 'Meddelande'),
        cm.message_type,
        cm.created_at,
        '#meddelanden'
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
  { label: 'Meddelanden', route: '#meddelanden' },
  { label: 'Paketintresse', route: '#paketintresse' },
  { label: 'Pedagogintresse', route: '#pedagogintresse' },
  { label: 'Produktanalys', route: '#produktanalys' },
  { label: 'Nyhetsbrev', route: '#nyhetsbrev' },
];

async function buildStartSummary() {
  const [
    packageInterest,
    professionalInterest,
    waitlist,
    newFamilies,
    messages,
    activity,
    recommendations,
  ] = await Promise.all([
    periodMetricFromTable('package_interest'),
    periodMetricFromTable('professional_interest'),
    periodMetricFromTable('waitlist'),
    newFamiliesMetric(),
    fetchMessageSummary(),
    fetchActivityFeed(20),
    fetchRecommendations(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    growth: {
      packageInterest,
      professionalInterest,
      waitlist,
      newFamilies,
    },
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
  fetchMessageSummary,
  fetchActivityFeed,
  fetchRecommendations,
  buildStartSummary,
  QUICK_ACTIONS,
};
