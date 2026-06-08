/**
 * Analytics admin routes.
 * Owns: analytics KPI queries, snapshot management, funnel + feature data.
 * Does NOT own: family data, push, flags, or any non-analytics tables.
 */

const express = require('express');
const db = require('../../lib/db');
const analytics = require('../../../db/analytics');

const router = express.Router();

// ─── GET /api/admin/analytics/kpis ───────────────────────
// Live KPI figures (recomputed on each call — fast enough for admin use)
router.get('/analytics/kpis', async (req, res) => {
  try {
    const kpis = await analytics.computeLiveKpis();
    res.json(kpis);
  } catch (err) {
    console.error('[ADMIN analytics] kpis error:', err);
    res.status(500).json({ error: 'Kunde inte hämta KPI:er' });
  }
});

// ─── GET /api/admin/analytics/snapshots ──────────────────
// Returns last N days of daily snapshots (default 14, max 90)
router.get('/analytics/snapshots', async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 14));
    const rows = await analytics.getRecentSnapshots(days);
    res.json(rows);
  } catch (err) {
    console.error('[ADMIN analytics] snapshots error:', err);
    res.status(500).json({ error: 'Kunde inte hämta snapshots' });
  }
});

// ─── GET /api/admin/analytics/funnel ─────────────────────
// Onboarding funnel step counts
router.get('/analytics/funnel', async (req, res) => {
  try {
    const steps = await analytics.getFunnelCounts();
    res.json(steps);
  } catch (err) {
    console.error('[ADMIN analytics] funnel error:', err);
    res.status(500).json({ error: 'Kunde inte hämta tratt-data' });
  }
});

// ─── GET /api/admin/analytics/features ───────────────────
// Feature popularity (last 30 days)
router.get('/analytics/features', async (req, res) => {
  try {
    const features = await analytics.getFeaturePopularity();
    res.json(features);
  } catch (err) {
    console.error('[ADMIN analytics] features error:', err);
    res.status(500).json({ error: 'Kunde inte hämta feature-data' });
  }
});

// ─── GET /api/admin/analytics/family-dynamics ─────────────
// Multi-parent stats and engagement correlation
router.get('/analytics/family-dynamics', async (req, res) => {
  try {
    const data = await analytics.getFamilyDynamics();
    res.json(data);
  } catch (err) {
    console.error('[ADMIN analytics] family-dynamics error:', err);
    res.status(500).json({ error: 'Kunde inte hämta familjdynamik' });
  }
});

// ─── GET /api/admin/analytics/heatmap ────────────────────
// Activity heatmap: hour × weekday (last 30 days)
router.get('/analytics/heatmap', async (req, res) => {
  try {
    const data = await analytics.getActivityHeatmap();
    res.json(data);
  } catch (err) {
    console.error('[ADMIN analytics] heatmap error:', err);
    res.status(500).json({ error: 'Kunde inte hämta aktivitetsvärmekarta' });
  }
});

// ─── GET /api/admin/analytics/warnings ─────────────────
// Ghost families + dropped engagement + weekly churn trend
router.get('/analytics/warnings', async (req, res) => {
  try {
    const data = await analytics.getWarningFamilies();
    res.json(data);
  } catch (err) {
    console.error('[ADMIN analytics] warnings error:', err);
    res.status(500).json({ error: 'Kunde inte hämta varningsflaggor' });
  }
});

// ─── GET /api/admin/analytics/retention-cohort ──────────
// Weekly cohort retention curve (W0 → M3)
router.get('/analytics/retention-cohort', async (req, res) => {
  try {
    const data = await analytics.getRetentionCurve();
    res.json(data);
  } catch (err) {
    console.error('[ADMIN analytics] retention-cohort error:', err);
    res.status(500).json({ error: 'Kunde inte hämta retention-kurva' });
  }
});

// ─── GET /api/admin/analytics/trends ────────────────────
// Historical KPI trend data (7/30/90 day range)
router.get('/analytics/trends', async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    const data = await analytics.getTrendData(days);
    res.json(data);
  } catch (err) {
    console.error('[ADMIN analytics] trends error:', err);
    res.status(500).json({ error: 'Kunde inte hämta trenddata' });
  }
});

// ─── GET /api/admin/analytics/newsletter-effect ─────────
// Per-dispatch stats + activity lift vs baseline
router.get('/analytics/newsletter-effect', async (req, res) => {
  try {
    const data = await analytics.getNewsletterEffect();
    res.json(data);
  } catch (err) {
    console.error('[ADMIN analytics] newsletter-effect error:', err);
    res.status(500).json({ error: 'Kunde inte hämta nyhetsbrevseffekt' });
  }
});
// ─── POST /api/admin/analytics/snapshot ──────────────────
// Manually trigger today's snapshot write (useful on deploy)
router.post('/analytics/snapshot', async (req, res) => {
  try {
    const kpis = await analytics.computeLiveKpis();
    const today = new Date().toISOString().slice(0, 10);
    await analytics.upsertDailySnapshot({ date: today, ...kpis });
    res.json({ success: true, date: today, snapshot: kpis });
  } catch (err) {
    console.error('[ADMIN analytics] snapshot trigger error:', err);
    res.status(500).json({ error: 'Kunde inte skriva snapshot' });
  }
});

// ─── GET /api/admin/analytics/overview ────────────────────
// Returns all data for the overview tab in a single request (KPIs + funnel + features).
// Frontend calls this for the overview section before switching to other tabs.
router.get('/analytics/overview', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [kpisResult, snapshotsResult, funnelResult, featuresResult] = await Promise.all([
      db.query(`
        SELECT
          COUNT(DISTINCT f.id) AS total_families,
          COUNT(DISTINCT CASE WHEN ae.created_at >= $1 THEN ae.family_id END) AS active_families_24h,
          COUNT(DISTINCT CASE WHEN ae.created_at >= $1 THEN ae.family_id END) AS active_families_7d,
          COALESCE(SUM(CASE WHEN ae.event_type = 'star_granted' THEN 1 ELSE 0 END), 0) AS total_stars_given,
          COALESCE(SUM(CASE WHEN ae.event_type = 'reward_redeemed' THEN 1 ELSE 0 END), 0) AS total_rewards_claimed,
          COUNT(DISTINCT CASE WHEN ae.event_type = 'pwa_installed' THEN ae.family_id END) AS pwa_installed_count,
          COUNT(DISTINCT es.id) AS newsletter_subscriber_count
        FROM family f
        LEFT JOIN analytics_events ae ON ae.family_id = f.id
        LEFT JOIN email_subscriptions es ON es.family_id = f.id AND es.subscribed = true
      `, [sevenDaysAgo]),
      db.query(`
        SELECT date, active_families_24h, active_families_7d, total_stars_given,
               total_rewards_claimed, conversion_rate, pwa_installed_count, newsletter_subscribers_count
        FROM analytics_daily_snapshots
        WHERE date >= $1
        ORDER BY date ASC
        LIMIT 30
      `, [sevenDaysAgo]),
      db.query(`
        WITH fc AS (SELECT family_id, MIN(DATE(created_at)) AS d FROM parent GROUP BY family_id),
             ca AS (SELECT family_id, MIN(DATE(created_at)) AS d FROM child GROUP BY family_id)
        SELECT 'Registrerade familjer' AS step, COUNT(*) AS count FROM fc
        UNION ALL SELECT 'Lagt till barn', COUNT(*) FROM ca
        UNION ALL SELECT 'Förste barn lagd', COUNT(*) FROM ca
      `),
      db.query(`
        SELECT event_type AS label, COUNT(*) AS total_uses, COUNT(DISTINCT family_id) AS unique_families
        FROM analytics_events
        WHERE created_at >= $1
        GROUP BY event_type ORDER BY total_uses DESC LIMIT 20
      `, [sevenDaysAgo]),
    ]);

    const kpis = kpisResult.rows[0] || {};
    const activeFamilies = parseInt(kpis.active_families_24h || 0, 10);
    const totalFamilies = parseInt(kpis.total_families || 0, 10);
    const conversionRate = totalFamilies > 0 ? ((activeFamilies / totalFamilies) * 100).toFixed(1) : '0.0';

    res.json({
      kpis: {
        active_families_24h: parseInt(kpis.active_families_24h || 0, 10),
        active_families_7d: parseInt(kpis.active_families_7d || 0, 10),
        total_stars_given: parseInt(kpis.total_stars_given || 0, 10),
        total_rewards_claimed: parseInt(kpis.total_rewards_claimed || 0, 10),
        conversion_rate: parseFloat(conversionRate),
        pwa_installed_count: parseInt(kpis.pwa_installed_count || 0, 10),
        newsletter_subscribers_count: parseInt(kpis.newsletter_subscriber_count || 0, 10),
      },
      snapshots: snapshotsResult.rows,
      funnel: funnelResult.rows.map(r => ({ step: r.step, count: parseInt(r.count || 0, 10) })),
      features: featuresResult.rows,
    });
  } catch (err) {
    console.error('[ADMIN-ANALYTICS] Overview error:', err);
    res.status(500).json({ error: 'Kunde inte hämta analytics data.' });
  }
});

module.exports = router;
